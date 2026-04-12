// src/services/supabase.js
// Supabase JS client — M2's schema is now confirmed.
// All table names and column names match M2's Supabase schema exactly.
// Service role key is used — this client has full DB access, never expose it.

import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ─── NEEDS TABLE ──────────────────────────────────────────────────────────────

/**
 * Insert a classified need into the needs table.
 * Called after classification and geocoding are complete.
 *
 * @param {object} need
 * @param {string} need.reference_id        — unique ref e.g. "NEED-1234"
 * @param {string} need.title               — short title derived from category
 * @param {string} need.summary             — Claude/Groq summary
 * @param {string} need.category            — FOOD|MEDICAL|SHELTER|WATER|SAFETY|OTHER
 * @param {string} need.urgency             — "low"|"medium"|"high"|"critical"
 * @param {number} need.urgency_score       — 0-100 computed score
 * @param {string} need.ward                — Mumbai ward if resolved
 * @param {object} need.location            — PostGIS point {lat, lng}
 * @param {number} need.affected_count      — from classifier output
 * @param {number} need.report_count        — starts at 1
 * @param {string} need.status              — "open" by default
 * @param {string} need.reporter_phone_hash — hashed reporter phone
 * @param {boolean} need.reporter_consented — from bot flow
 * @returns {Promise<object>} inserted row
 */
export async function insertNeed(need) {
  const { data, error } = await supabase
    .from("needs")
    .insert({
      reference_id:        need.reference_id,
      title:               need.title,
      summary:             need.summary,
      category:            need.category,
      urgency:             need.urgency,
      urgency_score:       need.urgency_score,
      ward:                need.ward ?? null,
      location:            need.location ?? null,
      affected_count:      need.affected_count ?? 0,
      report_count:        need.report_count ?? 1,
      status:              need.status ?? "open",
      embedding:           need.embedding ?? null,
      reporter_phone_hash: need.reporter_phone_hash,
      reporter_consented:  need.reporter_consented ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("❌  insertNeed error:", error.message);
    throw error;
  }
  return data;
}

/**
 * Increment report_count on an existing need (deduplication merge).
 * @param {string} needId
 * @param {number} newCount
 */
export async function incrementReportCount(needId, newCount) {
  const { error } = await supabase
    .from("needs")
    .update({ report_count: newCount })
    .eq("id", needId);

  if (error) {
    console.error("❌  incrementReportCount error:", error.message);
    throw error;
  }
}

// ─── REPORTS TABLE ────────────────────────────────────────────────────────────

/**
 * Insert a raw report into the reports table.
 * Every completed WhatsApp report flow is logged here.
 *
 * @param {object} report
 * @param {string} report.need_id       — FK to needs.id
 * @param {string} report.phone_hash    — hashed reporter phone
 * @param {string} report.raw_message   — original WhatsApp text
 * @param {string} report.language      — detected language code e.g. "hi"
 * @param {string} report.location_text — raw location string from reporter
 */
export async function insertReport(report) {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      need_id:       report.need_id,
      phone_hash:    report.phone_hash,
      raw_message:   report.raw_message,
      language:      report.language ?? "en",
      location_text: report.location_text ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error("❌  insertReport error:", error.message);
    throw error;
  }
  return data;
}

// ─── VOLUNTEERS TABLE ─────────────────────────────────────────────────────────

/**
 * Fetch volunteers near a lat/lng using M2's PostGIS RPC function.
 * Returns opted-in volunteers sorted by distance.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} radiusMeters — default 3km
 * @returns {Promise<Array>}
 */
export async function getVolunteersNear(lat, lng, radiusMeters = 3000) {
  const { data, error } = await supabase.rpc("volunteers_within_radius", {
    lat,
    lng,
    radius_meters: radiusMeters,
  });

  if (error) {
    console.error("❌  getVolunteersNear error:", error.message);
    throw error;
  }
  return data ?? [];
}

/**
 * Fetch a volunteer by phone hash.
 * Used to check if a volunteer is already registered.
 * @param {string} phoneHash
 * @returns {Promise<object|null>}
 */
export async function getVolunteerByPhoneHash(phoneHash) {
  const { data, error } = await supabase
    .from("volunteers")
    .select("*")
    .eq("phone_hash", phoneHash)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("❌  getVolunteerByPhoneHash error:", error.message);
    throw error;
  }
  return data ?? null;
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

/**
 * Write an audit log entry. Never throws — audit failures are non-fatal.
 * @param {object} entry
 * @param {string} entry.user_id    — phone hash or "system"
 * @param {string} entry.action     — e.g. "INSERT_NEED", "ALERT_SENT"
 * @param {string} entry.table_name — e.g. "needs"
 * @param {string} entry.record_id  — UUID of the affected record
 */
export async function writeAuditLog(entry) {
  const { error } = await supabase.from("audit_log").insert({
    user_id:    entry.user_id,
    action:     entry.action,
    table_name: entry.table_name,
    record_id:  entry.record_id,
  });

  if (error) {
    console.warn("⚠️  writeAuditLog error:", error.message);
  }
}