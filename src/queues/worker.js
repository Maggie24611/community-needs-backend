// src/queues/worker.js
// BullMQ Worker — run as separate process: `npm run worker`
// Processes volunteer alert jobs using the full report pipeline.

import "../config/env.js";
import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { processReport } from "../services/reportPipeline.js";
import { getVolunteersNear } from "../services/supabase.js";
import { decryptPhone } from "../services/crypto.js";
import { sendTextMessage } from "../services/whatsapp.js";

const QUEUE_NAME = "volunteer-alerts";

const connection = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD,
  tls:                  {},
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const { userPhone, contactName, reportPayload } = job.data;
    console.log(`⚙️   Processing job ${job.id} for ${userPhone}`);

    // ── Run full pipeline ────────────────────────────────────────────────────
    const { need, geo, urgencyScore } = await processReport({
      userPhone,
      rawText:     reportPayload.rawText,
      consented:   reportPayload.consented ?? false,
      reportCount: 1,
    });

    // ── Fetch nearby volunteers ──────────────────────────────────────────────
    const volunteers = geo
      ? await getVolunteersNear(geo.lat, geo.lng, 3000)
      : [];

    console.log(`👥  Found ${volunteers.length} volunteers nearby`);

    // ── Dispatch WhatsApp alerts ─────────────────────────────────────────────
    let alertedCount = 0;

    for (const volunteer of volunteers) {
      try {
        // decryptPhone returns null for M2 seed/placeholder values — skip them
        const volunteerPhone = decryptPhone(volunteer.phone_encrypted);
        if (!volunteerPhone) continue;

        const alertText =
          `🚨 *Sahyog Alert* — ${need.reference_id}\n` +
          `Category: ${need.category}\n` +
          `Urgency: ${need.urgency.toUpperCase()} (${urgencyScore}/100)\n` +
          `Location: ${geo?.formattedAddress ?? need.ward ?? "Unknown"}\n` +
          `Details: ${need.summary}\n\n` +
          `Reply ACCEPT to respond to this need.`;

        await sendTextMessage(volunteerPhone, alertText);
        alertedCount++;
      } catch (err) {
        console.error(`❌  Failed to alert volunteer:`, err.message);
        // Continue alerting remaining volunteers even if one fails
      }
    }

    console.log(`📤  Alerted ${alertedCount} real volunteers (${volunteers.length - alertedCount} placeholders skipped)`);

    // ── Confirm to reporter ──────────────────────────────────────────────────
    await sendTextMessage(
      userPhone,
      `✅ *Report received!*\n` +
      `Reference: ${need.reference_id}\n` +
      `We've alerted ${alertedCount} volunteer(s) near you.\n` +
      `Thank you, ${contactName}! 🙏`
    );

    return {
      needId:            need.id,
      referenceId:       need.reference_id,
      volunteersAlerted: alertedCount,
    };
  },
  { connection, concurrency: 5 }
);

worker.on("completed", (job, result) => {
  console.log(`✅  Job ${job.id} done — need: ${result.referenceId}, volunteers alerted: ${result.volunteersAlerted}`);
});

worker.on("failed", (job, err) => {
  console.error(`❌  Job ${job?.id} failed:`, err.message);
});

console.log(`👷  BullMQ worker listening on: ${QUEUE_NAME}`); 