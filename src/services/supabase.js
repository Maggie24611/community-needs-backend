// src/services/supabase.js
// Supabase JS client — M2's schema confirmed Day 3.
// RPC functions: volunteers_within_radius, find_similar_needs

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

// ─── DEDUPLICATION RPC ────────────────────────────────────────────────────────

/**
 * Find similar needs using M2's find_similar_needs RPC.
 * Returns needs with similarity > threshold, sorted by similarity desc.
 *
 * @param {object} params
 * @param {number[]} params.queryEmbedding — 384-dim embedding vector
 * @param {string}   params.ward           — Mumbai ward to search within
 * @param {number}   params.threshold      — similarity threshold (0.88)
 * @param {number}   params.count          — max results to return
 * @returns {Promise<Array>}
 */
export async function findSimilarNeeds({ queryEmbedding, ward, threshold = 0.88, count = 1 }) {
  const { data, error } = await supabase.rpc("find_similar_needs", {
    query_embedding: queryEmbedding,
    ward,
    threshold,
    count,
  });

  if (error) {
    console.error("❌  findSimilarNeeds error:", error.message);
    throw error;
  }
  return data ?? [];
}

// ─── REPORTS TABLE ────────────────────────────────────────────────────────────

/**
 * Insert a raw report into the reports table.
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
 * Fetch volunteers near a lat/lng using M2's PostGIS RPC.
 * Returns opted-in volunteers sorted by distance.
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