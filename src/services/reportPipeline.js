// src/services/reportPipeline.js
// The core pipeline — called by the BullMQ worker for every completed report.
// Orchestrates: classify → score → geocode → insert need → insert report → audit log
//
// This is M1's main integration layer. All services come together here.

import crypto from "crypto";
import { classifyReport }                            from "./groq.js";
import { computeUrgencyScore, generateReferenceId, deriveTitleFromCategory } from "./urgencyScorer.js";
import { geocodeLocation, buildGeoPoint }            from "./geocoding.js";
import { encryptPhone }                              from "./crypto.js";
import { insertNeed, insertReport, writeAuditLog }   from "./supabase.js";

/**
 * Hash a phone number for storage in phone_hash columns.
 * SHA-256, hex encoded. NOT reversible — used for dedup, not for sending messages.
 * @param {string} phone — E.164 digits only
 * @returns {string} hex hash
 */
export function hashPhone(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

/**
 * Main report processing pipeline.
 * Called by BullMQ worker after M4's bot flow completes a report.
 *
 * @param {object} params
 * @param {string} params.userPhone      — reporter's phone (E.164 digits)
 * @param {string} params.rawText        — full report text to classify
 * @param {boolean} params.consented     — did user consent in bot flow
 * @param {number}  params.reportCount   — usually 1 for new reports
 * @returns {Promise<{ need: object, report: object }>}
 */
export async function processReport({ userPhone, rawText, consented = false, reportCount = 1 }) {
  console.log(`🔄  Pipeline starting for ${userPhone}`);

  // ── Step 1: Classify via Groq ──────────────────────────────────────────────
  console.log("🧠  Classifying report...");
  const classification = await classifyReport(rawText);
  console.log("✅  Classification:", classification);

  // ── Step 2: Compute urgency score ──────────────────────────────────────────
  const urgencyScore = computeUrgencyScore({
    urgency:        classification.urgency,
    report_count:   reportCount,
    affected_count: classification.affected_count,
  });
  console.log(`📊  Urgency score: ${urgencyScore}/100`);

  // ── Step 3: Geocode location ───────────────────────────────────────────────
  console.log(`📍  Geocoding: "${classification.location_text}"`);
  const geo = await geocodeLocation(classification.location_text);

  // Build PostGIS point if geocoding succeeded
  const locationPoint = geo ? buildGeoPoint(geo.lat, geo.lng) : null;

  // ── Step 4: Hash reporter phone ────────────────────────────────────────────
  const phoneHash = hashPhone(userPhone);

  // ── Step 5: Generate reference ID and title ────────────────────────────────
  const referenceId = generateReferenceId();
  const title = deriveTitleFromCategory(
    classification.category,
    geo?.formattedAddress ?? classification.location_text
  );

  // ── Step 6: Insert into needs table ───────────────────────────────────────
  console.log("💾  Inserting need into Supabase...");
  const need = await insertNeed({
    reference_id:        referenceId,
    title,
    summary:             classification.summary,
    category:            classification.category,
    urgency:             classification.urgency,
    urgency_score:       urgencyScore,
    ward:                geo?.ward ?? null,
    location:            locationPoint,
    affected_count:      classification.affected_count,
    report_count:        reportCount,
    status:              "open",
    embedding:           null,          // Day 3+ — deduplication
    reporter_phone_hash: phoneHash,
    reporter_consented:  consented,
  });
  console.log(`✅  Need inserted: ${need.id} (${referenceId})`);

  // ── Step 7: Insert into reports table ─────────────────────────────────────
  const report = await insertReport({
    need_id:       need.id,
    phone_hash:    phoneHash,
    raw_message:   rawText,
    language:      classification.language,
    location_text: classification.location_text,
  });
  console.log(`✅  Report inserted: ${report.id}`);

  // ── Step 8: Audit log ──────────────────────────────────────────────────────
  await writeAuditLog({
    user_id:    phoneHash,
    action:     "INSERT_NEED",
    table_name: "needs",
    record_id:  need.id,
  });

  return {
    need,
    report,
    geo,
    classification,
    urgencyScore,
  };
}
