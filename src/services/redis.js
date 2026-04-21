// src/services/redis.js
// Upstash Redis via ioredis.
// ECONNRESET is normal on Upstash free tier — ioredis auto-reconnects.

import Redis from "ioredis";
import { env } from "../config/env.js";

const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

export const redis = new Redis(env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest:    null,
  enableReadyCheck:        false,
  lazyConnect:             false,
  retryStrategy(times) {
    // Reconnect after min(times * 200ms, 2000ms)
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect",           () => console.log("✅  Redis connected"));
redis.on("reconnecting",      () => console.log("🔄  Redis reconnecting..."));
redis.on("error", (err) => {
  // ECONNRESET is expected on Upstash free tier — suppress noisy logs
  if (err.code === "ECONNRESET" || err.message?.includes("ECONNRESET")) {
    console.log("⚠️  Redis ECONNRESET — auto-reconnecting (normal on Upstash)");
  } else {
    console.error("❌  Redis error:", err.message);
  }
});

const sessionKey = (phone) => `session:${phone}`;

export async function getSession(phone) {
  try {
    const raw = await redis.get(sessionKey(phone));
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function setSession(phone, state) {
  try {
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
  } catch (err) {
    console.warn("⚠️  setSession failed:", err.message);
  }
}

export async function clearSession(phone) {
  try {
    await redis.del(sessionKey(phone));
  } catch (err) {
    console.warn("⚠️  clearSession failed:", err.message);
  }
}