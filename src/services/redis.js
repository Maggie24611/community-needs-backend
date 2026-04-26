// src/services/redis.js
// Upstash Redis via @upstash/redis client.
// Switched from ioredis to @upstash/redis for better Upstash compatibility.

import { Redis } from "@upstash/redis";
import { env } from "../config/env.js";

const SESSION_TTL_SECONDS = 60 * 60 * 2; // 2 hours

export const redis = new Redis({
  url:   env.UPSTASH_REDIS_URL,
  token: env.REDIS_PASSWORD,
});

console.log("✅  Redis client initialized (Upstash HTTP)");

const sessionKey = (phone) => `session:${phone}`;

export async function getSession(phone) {
  try {
    const raw = await redis.get(sessionKey(phone));
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("⚠️  getSession failed:", err.message);
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
      { ex: SESSION_TTL_SECONDS }
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