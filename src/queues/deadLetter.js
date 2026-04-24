// src/queues/deadLetter.js
// Dead letter queue — stores jobs that failed all retry attempts.
// Day 9: Added for BullMQ failed job handling.

import { Queue } from "bullmq";
import { env } from "../config/env.js";

const connection = {
  host:                 env.REDIS_HOST,
  port:                 env.REDIS_PORT,
  password:             env.REDIS_PASSWORD,
  tls:                  {},
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,
};

const deadLetterQueue = new Queue("dead-letter", {
  connection,
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
});

/**
 * Send a failed job to the dead letter queue for inspection.
 * @param {Job} job — the failed BullMQ job
 * @param {Error} err — the error that caused failure
 */
export async function sendToDeadLetter(job, err) {
  try {
    await deadLetterQueue.add("failed-job", {
      originalQueue: job.queueName,
      jobId:         job.id,
      jobName:       job.name,
      jobData:       job.data,
      failedReason:  err.message,
      attemptsMade:  job.attemptsMade,
      failedAt:      new Date().toISOString(),
    });
    console.log(`📮  Job ${job.id} sent to dead letter queue`);
  } catch (dlqErr) {
    console.error("❌  Failed to send to dead letter queue:", dlqErr.message);
  }
}