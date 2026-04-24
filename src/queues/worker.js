// src/queues/worker.js — BullMQ report processing worker
// Day 9: Added dead letter queue for failed jobs.
// Pipeline: WhatsApp payload → Groq classify → embed → Supabase insert → alert dispatch

import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { classifyReport } from "../services/groq.js";
import { generateEmbedding } from "../services/embedding.js";
import { geocodeLocation } from "../services/geocoding.js";
import { runAllocationAgent } from "../agents/allocationAgent.js";
import {
  insertNeed,
  insertReport,
  writeAuditLog,
  getVolunteersNear,
  findSimilarNeeds,
  incrementReportCount,
} from "../services/supabase.js";
import { enqueueAlertJob } from "./alertQueue.js";
import { sendToDeadLetter } from "./deadLetter.js";
import { computeUrgencyScore, deriveTitleFromCategory } from "../services/urgencyScorer.js";
import crypto from "crypto";

const QUEUE_NAME = "volunteer-alerts";

const connection = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD,
  tls:                  {},
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};

function hashPhone(phone) {
  if (!phone) return "anonymous";
  return crypto.createHash("sha256").update(String(phone)).digest("hex");
}

function generateReferenceId() {
  return `MUM-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function startReportWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { userPhone, rawText, consented, contactName } = job.data;

      console.log(`[Worker] Processing job ${job.id} from ${userPhone}`);

      // ── Step 1: Classify via Groq ────────────────────────────────────────
      await job.updateProgress(10);
      const classification = await classifyReport(rawText);
      console.log(`[Worker] Classified: ${classification.category} / ${classification.urgency}`);

      // ── Step 2: Geocode ──────────────────────────────────────────────────
      await job.updateProgress(20);
      let geo = null;
      try {
        geo = await geocodeLocation(classification.location_text);
        if (geo) console.log(`[Worker] Geocoded: (${geo.lat}, ${geo.lng})`);
      } catch (err) {
        console.warn("[Worker] Geocoding failed:", err.message);
      }

      // ── Step 3: Generate embedding ───────────────────────────────────────
      await job.updateProgress(30);
      let embedding = null;
      try {
        embedding = await generateEmbedding(rawText);
      } catch (err) {
        console.warn("[Worker] Embedding failed:", err.message);
      }

      // ── Step 4: Deduplication ────────────────────────────────────────────
      await job.updateProgress(40);
      let existingNeed = null;
      if (embedding && geo?.ward) {
        try {
          const similar = await findSimilarNeeds({
            queryEmbedding: embedding,
            ward:           geo.ward,
            threshold:      0.88,
            count:          1,
          });
          if (similar && similar.length > 0) {
            existingNeed = similar[0];
            await incrementReportCount(existingNeed.id, existingNeed.report_count + 1);
            console.log(`[Worker] Duplicate found: ${existingNeed.id}`);
          }
        } catch (err) {
          console.warn("[Worker] Dedup failed:", err.message);
        }
      }

      // ── Step 5: Insert need ──────────────────────────────────────────────
      await job.updateProgress(50);
      let need;
      if (existingNeed) {
        need = existingNeed;
      } else {
        const urgencyScore = computeUrgencyScore({
          urgency:        classification.urgency,
          report_count:   1,
          affected_count: classification.affected_count,
        });
        const title = deriveTitleFromCategory(
          classification.category,
          geo?.formattedAddress ?? classification.location_text
        );
        const phoneHash = hashPhone(userPhone);

        need = await insertNeed({
          reference_id:        generateReferenceId(),
          title,
          summary:             classification.summary,
          category:            classification.category,
          urgency:             classification.urgency,
          urgency_score:       urgencyScore,
          ward:                geo?.ward ?? null,
          lat:                 geo?.lat ?? null,
          lng:                 geo?.lng ?? null,
          affected_count:      classification.affected_count,
          report_count:        1,
          status:              "active",
          embedding,
          reporter_phone_hash: phoneHash,
          reporter_consented:  consented ?? false,
        });
        console.log(`[Worker] Inserted need ${need.id}`);
      }

      // ── Step 6: Insert report ────────────────────────────────────────────
      await job.updateProgress(60);
      const phoneHash = hashPhone(userPhone);
      try {
        const report = await insertReport({
          need_id:       need.id,
          phone_hash:    phoneHash,
          raw_message:   rawText,
          language:      classification.language ?? "en",
          location_text: classification.location_text,
        });
        console.log(`[Worker] Report inserted: ${report.id}`);
      } catch (err) {
        console.warn("[Worker] insertReport failed (non-fatal):", err.message);
      }

      // ── Step 7: Audit log ────────────────────────────────────────────────
      try {
        await writeAuditLog({
          user_id:    phoneHash,
          action:     existingNeed ? "INCREMENT_REPORT_COUNT" : "INSERT_NEED",
          table_name: "needs",
          record_id:  need.id,
        });
      } catch (err) {
        console.warn("[Worker] Audit log failed (non-fatal):", err.message);
      }

      // ── Step 8: Fetch volunteers & queue alerts ──────────────────────────
      await job.updateProgress(70);
      if (geo) {
        try {
          const volunteers = await getVolunteersNear(geo.lat, geo.lng, 3000);
          const top3 = (volunteers || []).slice(0, 3);
          for (const volunteer of top3) {
            await enqueueAlertJob({ volunteer, need, geo, userPhone, contactName });
          }
          console.log(`[Worker] Queued alerts for ${top3.length} volunteer(s)`);
        } catch (err) {
          console.warn("[Worker] Volunteer alert failed (non-fatal):", err.message);
        }
      }

      await job.updateProgress(100);
      return { need_id: need.id, classification };
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on("completed", (job, result) => {
    console.log(`[Worker] ✓ Job ${job.id} done → need_id=${result.need_id}`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    // After all retries exhausted → send to dead letter queue
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await sendToDeadLetter(job, err);
    }
  });

  worker.on("error", (err) => {
    console.error("[Worker] Worker error:", err);
  });

  console.log("[Worker] Report worker started, concurrency=5");
  return worker;
}