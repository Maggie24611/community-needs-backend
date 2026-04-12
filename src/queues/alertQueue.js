// src/queues/alertQueue.js
// Defines the BullMQ Queue and a producer function used by the webhook route.
// The actual job processing logic lives in worker.js.

import { Queue } from "bullmq";
import { env } from "../config/env.js";

const QUEUE_NAME = "volunteer-alerts";

// BullMQ requires ioredis connection options (not a URL string)
const connection = {
  host:     env.REDIS_HOST,
  port:     env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  tls:      {},   // Upstash requires TLS
  maxRetriesPerRequest: null,   // Required by BullMQ
  enableReadyCheck: false,
};

export const alertQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts:     3,
    backoff: {
      type:  "exponential",
      delay: 2000,           // 2s, 4s, 8s
    },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50  },
  },
});

/**
 * Add a volunteer-alert job to the queue.
 * @param {object} jobData
 * @param {string} jobData.userPhone      — reporter's phone (plain, for send ack)
 * @param {string} jobData.contactName    — reporter's WhatsApp display name
 * @param {object} jobData.reportPayload  — raw report from M4's bot flow
 */
export async function enqueueAlertJob(jobData) {
  const job = await alertQueue.add("dispatch-alert", jobData, {
    jobId: `alert-${jobData.userPhone}-${Date.now()}`,
  });
  console.log(`📬  Job ${job.id} added to ${QUEUE_NAME}`);
  return job;
}
