// src/queues/worker.js — BullMQ report processing worker
// Pipeline: WhatsApp payload → Claude classify → embed → Supabase insert → Gemini recommend

import { Worker } from 'bullmq';
import { connection } from './setup.js';
import { sendToDeadLetter } from './deadLetter.js';
import { classifyReport } from '../services/classifier.js';
import { embedText } from '../services/embeddings.js';
import { runGeminiAgent } from '../agents/geminiAgent.js';
import { supabase } from '../services/supabase.js';
import { enrichWithWard } from '../utils/geocoder.js';
import { CONFIG } from '../../config/index.js';

export function startReportWorker() {
  const worker = new Worker(
    CONFIG.QUEUE_REPORTS,
    async (job) => {
      const { sender_id, raw_text, lat, lng, ward, timestamp, source } = job.data;

      console.log(`[Worker] Processing job ${job.id} from ${sender_id}`);

      // ── Step 1: Geo-enrich — resolve ward from lat/lng if missing ──────────
      await job.updateProgress(5);
      const geoPayload = await enrichWithWard({ lat, lng, ward });
      const resolvedWard = geoPayload.ward;

      // ── Step 2: Claude Sonnet Classification ───────────────────────────────
      await job.updateProgress(10);
      const classification = await classifyReport(raw_text, { language: 'auto' });
      console.log(`[Worker] Classified: ${classification.category} / ${classification.urgency}`);

      // ── Step 2: Generate embedding via Groq ────────────────────────────────
      await job.updateProgress(30);
      const embeddingText = `${classification.category}: ${classification.summary}`;
      const embedding = await embedText(embeddingText);

      // ── Step 3: Insert need into Supabase ──────────────────────────────────
      await job.updateProgress(50);

      // Location: SRID=4326;POINT(lng lat) — lng FIRST
      const locationWkt = lat && lng
        ? `SRID=4326;POINT(${lng} ${lat})`
        : null;

      const { data: need, error: needError } = await supabase
        .from('needs')
        .insert({
          description: raw_text,
          summary:     classification.summary,
          category:    classification.category,
          urgency:     classification.urgency,
          status:      'active',
          ward:        classification.ward ?? resolvedWard ?? null,
          location:    locationWkt,
          lat:         lat ?? null,
          lng:         lng ?? null,
          embedding:   embedding,
          source:      source ?? 'whatsapp',
          reporter_id: sender_id,
          metadata: {
            classified_by:  classification.model_used,
            classified_at:  classification.classified_at,
            needs_followup: classification.needs_followup,
            raw_timestamp:  timestamp,
          },
        })
        .select()
        .single();

      if (needError) throw new Error(`Supabase insert (needs): ${needError.message}`);
      console.log(`[Worker] Inserted need ${need.id}`);

      // ── Step 4: Insert into reports table ─────────────────────────────────
      await supabase.from('reports').insert({
        need_id:   need.id,
        raw_text:  raw_text,
        sender_id: sender_id,
        source:    source ?? 'whatsapp',
        received_at: timestamp ?? new Date().toISOString(),
      });

      // ── Step 5: Audit log ─────────────────────────────────────────────────
      await supabase.from('audit_log').insert({
        entity_type: 'need',
        entity_id:   need.id,
        action:      'created',
        actor:       'system:worker',
        metadata: {
          job_id:     job.id,
          queue:      CONFIG.QUEUE_REPORTS,
          classifier: classification.model_used,
        },
      });

      // ── Step 6: Gemini ADK agent recommendation ───────────────────────────
      await job.updateProgress(70);
      if (lat && lng) {
        try {
          const recommendation = await runGeminiAgent(
            { ...need, lat, lng },
            embedding
          );
          console.log(`[Worker] Recommendation generated (confidence: ${recommendation.confidence})`);
        } catch (agentErr) {
          // Non-fatal — log and continue
          console.error(`[Worker] Gemini agent failed (non-fatal):`, agentErr.message);
        }
      } else {
        console.warn(`[Worker] No lat/lng for need ${need.id} — skipping Gemini agent`);
      }

      await job.updateProgress(100);
      return { need_id: need.id, classification };
    },
    {
      connection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[Worker] ✓ Job ${job.id} done → need_id=${result.need_id}`);
  });

  worker.on('failed', async (job, err) => {
    console.error(`[Worker] ✗ Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
    // After all retries exhausted, move to dead-letter queue
    if (job && job.attemptsMade >= (job.opts?.attempts ?? 3)) {
      await sendToDeadLetter(job, err).catch(dlqErr =>
        console.error('[Worker] Failed to send to DLQ:', dlqErr.message)
      );
    }
  });

  worker.on('error', (err) => {
    console.error('[Worker] Worker error:', err);
  });

  console.log('[Worker] Report worker started, concurrency=5');
  return worker;
}