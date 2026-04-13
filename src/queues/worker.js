// src/queues/worker.js
// BullMQ Worker — run as separate process: `npm run worker`
// Processes volunteer alert jobs:
//   a. Decrypt volunteer phone (AES-256)
//   b. Skip PLACEHOLDER_ values
//   c. Send WhatsApp message in Day 3 format

import "../config/env.js";
import { Worker } from "bullmq";
import { env }          from "../config/env.js";
import { decryptPhone } from "../services/crypto.js";
import { sendTextMessage } from "../services/whatsapp.js";
import { writeAuditLog }   from "../services/supabase.js";
import { hashPhone }       from "../services/reportPipeline.js";

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
    const { volunteer, need, geo, userPhone, contactName } = job.data;
    console.log(`⚙️   Processing alert job ${job.id} — need: ${need.reference_id}`);

    // ── Step a & b: Decrypt phone, skip placeholders ─────────────────────────
    const volunteerPhone = decryptPhone(volunteer.phone_encrypted);
    if (!volunteerPhone) {
      console.log(`⚠️  Skipping placeholder volunteer: ${volunteer.id}`);
      return { skipped: true, reason: "placeholder" };
    }

    // ── Step c: Send WhatsApp alert in Day 3 format ───────────────────────────
    // Format: "New need near you in [ward]: [title]. Reply DONE when resolved. Ref: [reference_id]"
    const ward    = geo?.ward ?? need.ward ?? "your area";
    const message =
      `🚨 *New need near you in ${ward}:* ${need.title}.\n\n` +
      `📋 Summary: ${need.summary}\n` +
      `⚡ Urgency: ${need.urgency?.toUpperCase()}\n\n` +
      `Reply *DONE* when resolved.\n` +
      `Ref: *${need.reference_id}*`;

    await sendTextMessage(volunteerPhone, message);
    console.log(`📤  Alert sent to volunteer ${volunteer.id}`);

    // ── Audit log ─────────────────────────────────────────────────────────────
    await writeAuditLog({
      user_id:    hashPhone(userPhone),
      action:     "ALERT_SENT",
      table_name: "volunteers",
      record_id:  volunteer.id,
    });

    return { sent: true, volunteerId: volunteer.id, needId: need.id };
  },
  { connection, concurrency: 5 }
);

worker.on("completed", (job, result) => {
  if (result.skipped) {
    console.log(`⏭️   Job ${job.id} skipped — placeholder volunteer`);
  } else {
    console.log(`✅  Job ${job.id} complete — alert sent to volunteer ${result.volunteerId}`);
  }
});

worker.on("failed", (job, err) => {
  console.error(`❌  Job ${job?.id} failed:`, err.message);
});

console.log(`👷  BullMQ worker listening on: ${QUEUE_NAME}`);