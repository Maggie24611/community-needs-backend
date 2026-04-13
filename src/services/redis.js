// src/services/redis.js
// Upstash Redis via ioredis. Stores bot session state keyed by phone number.
// Sessions are stored as JSON strings with a TTL of 2 hours (idle timeout).

import Redis from "ioredis";
import { env } from "../config/env.js";

const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

// Upstash requires TLS — ioredis handles rediss:// protocol automatically
export const redis = new Redis(env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck:     false,   // Required for Upstash
  lazyConnect:          false,
});

redis.on("connect", () => console.log("✅  Redis connected"));
redis.on("error",   (err) => console.error("❌  Redis error:", err.message));

const sessionKey = (phone) => `session:${phone}`;

/**
 * Load session state for a user. Returns {} if no session exists.
 * @param {string} phone — E.164 phone number (digits only)
 * @returns {Promise<object>}
 */
export async function getSession(phone) {
  const raw = await redis.get(sessionKey(phone));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    console.warn(`⚠️  Corrupt session for ${phone} — resetting`);
    return {};
  }
}

/**
 * Persist updated session state. Resets the TTL on every write.
 * Passing null or {} clears the session.
 * @param {string} phone
 * @param {object} state
 */
export async function setSession(phone, state) {
  if (!state || Object.keys(state).length === 0) {
    await redis.del(sessionKey(phone));
    return;
  }
  await redis.set(
    sessionKey(phone),
    JSON.stringify(state),
    "EX",
    SESSION_TTL_SECONDS
  );
}

/**
 * Explicitly delete a session (e.g. after report submission).
 * @param {string} phone
 */
export async function clearSession(phone) {
  await redis.del(sessionKey(phone));
}
