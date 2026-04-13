// src/queues/alertQueue.js
// BullMQ Queue — volunteer alert jobs.

import { Queue } from "bullmq";
import { env } from "../config/env.js";

const QUEUE_NAME = "volunteer-alerts";

const connection = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD,
  tls:                  {},
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};

export const alertQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50  },
  },
});

/**
 * Enqueue a volunteer alert job.
 *
 * @param {object} jobData
 * @param {object} jobData.volunteer   — volunteer row from Supabase
 * @param {object} jobData.need        — inserted need row
 * @param {object} jobData.geo         — geocoding result { lat, lng, ward, formattedAddress }
 * @param {string} jobData.userPhone   — reporter phone (for audit log)
 * @param {string} jobData.contactName — reporter WhatsApp name
 */
export async function enqueueAlertJob(jobData) {
  const job = await alertQueue.add("dispatch-alert", jobData, {
    jobId: `alert-${jobData.volunteer.id}-${jobData.need.id}-${Date.now()}`,
  });
  console.log(`📬  Alert job ${job.id} queued for volunteer ${jobData.volunteer.id}`);
  return job;
}