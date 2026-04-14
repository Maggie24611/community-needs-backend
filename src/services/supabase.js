// src/services/supabase.js
// Supabase JS client — M2's schema confirmed Day 4.
// Key fixes:
//   - location column: geography SRID 4326 — format: SRID=4326;POINT(lng lat)
//   - lat and lng are SEPARATE float columns on needs table
//   - volunteers_within_radius params: need_lat, need_lng, radius_meters
//   - find_similar_needs params: query_embedding, match_ward, similarity_threshold, match_count

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
 * M2 confirmed: lat and lng are separate float columns.
 * location column is geography SRID 4326 — lng comes FIRST.
 */
export async function insertNeed(need) {
  // Build geography point — lng FIRST per M2's confirmation
  const locationWKT = (need.lat != null && need.lng != null)
    ? `SRID=4326;POINT(${need.lng} ${need.lat})`
    : null;

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
      location:            locationWKT,
      lat:                 need.lat != null ? parseFloat(need.lat) : null,
      lng:                 need.lng != null ? parseFloat(need.lng) : null,
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
 * M2 confirmed params: query_embedding, match_ward, similarity_threshold, match_count
 */
export async function findSimilarNeeds({ queryEmbedding, ward, threshold = 0.88, count = 1 }) {
  const { data, error } = await supabase.rpc("find_similar_needs", {
    query_embedding:      queryEmbedding,
    match_ward:           ward,
    similarity_threshold: threshold,
    match_count:          count,
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
 * M2 confirmed params: need_lat, need_lng, radius_meters
 */
export async function getVolunteersNear(lat, lng, radiusMeters = 3000) {
  const { data, error } = await supabase.rpc("volunteers_within_radius", {
    need_lat:      lat,
    need_lng:      lng,
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