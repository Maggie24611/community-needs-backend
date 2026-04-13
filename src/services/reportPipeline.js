// src/services/reportPipeline.js
// Complete ingestion pipeline — handles all steps a through j.
// Called by BullMQ worker for every completed report from M4's botFlow.
//
// Steps:
//   a. Classify via Groq (category, urgency, summary, affected_count)
//   b. Geocode location_text → lat/lng via Google Maps
//   c. Generate embedding for deduplication
//   d. Call find_similar_needs RPC — deduplicate if similarity > 0.88
//   e. Insert new need if no duplicate
//   f. Reference ID format: MUM-XXXX
//   g. Call volunteers_within_radius RPC — nearest 3 volunteers
//   h. Add BullMQ alert jobs for each volunteer
//   i. Insert raw report into reports table
//   j. Insert action into audit_log table

import crypto from "crypto";
import { classifyReport }            from "./groq.js";
import { generateEmbedding }         from "./embedding.js";
import { geocodeLocation, buildGeoPoint } from "./geocoding.js";
import { computeUrgencyScore, deriveTitleFromCategory } from "./urgencyScorer.js";
import {
  insertNeed,
  insertReport,
  writeAuditLog,
  getVolunteersNear,
  findSimilarNeeds,
  incrementReportCount,
} from "./supabase.js";
import { enqueueAlertJob } from "../queues/alertQueue.js";

/**
 * Hash a phone number — SHA-256 hex. NOT reversible.
 * Used for phone_hash columns in DB.
 */
export function hashPhone(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

/**
 * Generate reference ID in format MUM-XXXX
 */
export function generateReferenceId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MUM-${num}`;
}

/**
 * Main ingestion pipeline — steps a through j.
 *
 * @param {object} params
 * @param {string} params.userPhone    — reporter's E.164 phone (digits only)
 * @param {string} params.rawText      — full report text from M4's botFlow
 * @param {boolean} params.consented   — consent given in bot flow
 * @param {number}  params.reportCount — usually 1 for new reports
 * @param {string}  params.contactName — WhatsApp display name
 * @returns {Promise<object>} — { need, report, geo, classification, urgencyScore, volunteersQueued }
 */
export async function processReport({
  userPhone,
  rawText,
  consented = false,
  reportCount = 1,
  contactName = "Reporter",
}) {
  console.log(`🔄  Pipeline starting for ${userPhone}`);

  // ── Step a: Classify via Groq ──────────────────────────────────────────────
  console.log("🧠  Step a: Classifying report...");
  const classification = await classifyReport(rawText);
  console.log("✅  Classification:", classification);

  // ── Step b: Geocode location ───────────────────────────────────────────────
  console.log(`📍  Step b: Geocoding "${classification.location_text}"...`);
  const geo = await geocodeLocation(classification.location_text);
  const locationPoint = geo ? buildGeoPoint(geo.lat, geo.lng) : null;
  console.log(geo ? `✅  Geocoded: (${geo.lat}, ${geo.lng})` : "⚠️  Geocoding failed — null coords");

  // ── Step c: Generate embedding ─────────────────────────────────────────────
  console.log("🔢  Step c: Generating embedding...");
  let embedding = null;
  try {
    embedding = await generateEmbedding(rawText);
    console.log("✅  Embedding generated");
  } catch (err) {
    console.warn("⚠️  Embedding failed — skipping deduplication:", err.message);
  }

  // ── Step d: Deduplication via find_similar_needs RPC ──────────────────────
  console.log("🔍  Step d: Checking for duplicates...");
  let existingNeed = null;

  if (embedding && geo?.ward) {
    try {
      const similar = await findSimilarNeeds({
        queryEmbedding: embedding,
        ward:           geo.ward,
        threshold:      0.88,
        count:          1,
      });

      if (similar && similar.length > 0) {
        existingNeed = similar[0];
        console.log(`⚠️  Duplicate found: ${existingNeed.id} — incrementing report_count`);
        await incrementReportCount(existingNeed.id, existingNeed.report_count + 1);
      }
    } catch (err) {
      console.warn("⚠️  Deduplication check failed:", err.message);
    }
  }

  // ── Step e & f: Insert new need if no duplicate ───────────────────────────
  let need;
  if (existingNeed) {
    need = existingNeed;
    console.log(`♻️  Using existing need: ${need.id}`);
  } else {
    console.log("💾  Step e/f: Inserting new need...");

    const referenceId    = generateReferenceId();
    const urgencyScore   = computeUrgencyScore({
      urgency:        classification.urgency,
      report_count:   reportCount,
      affected_count: classification.affected_count,
    });
    const title          = deriveTitleFromCategory(
      classification.category,
      geo?.formattedAddress ?? classification.location_text
    );
    const phoneHash      = hashPhone(userPhone);

    need = await insertNeed({
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
      embedding,
      reporter_phone_hash: phoneHash,
      reporter_consented:  consented,
    });

    console.log(`✅  Need inserted: ${need.id} (${referenceId})`);
  }

  // ── Step g: Get nearest 3 volunteers ──────────────────────────────────────
  console.log("👥  Step g: Fetching nearby volunteers...");
  let volunteers = [];
  if (geo) {
    try {
      volunteers = await getVolunteersNear(geo.lat, geo.lng, 3000);
      // Limit to nearest 3
      volunteers = volunteers.slice(0, 3);
      console.log(`✅  Found ${volunteers.length} volunteer(s) nearby`);
    } catch (err) {
      console.warn("⚠️  volunteers_within_radius failed:", err.message);
    }
  }

  // ── Step h: Enqueue BullMQ alert jobs ─────────────────────────────────────
  console.log("📬  Step h: Queuing volunteer alert jobs...");
  let volunteersQueued = 0;
  for (const volunteer of volunteers) {
    try {
      await enqueueAlertJob({
        volunteer,
        need,
        geo,
        userPhone,
        contactName,
      });
      volunteersQueued++;
    } catch (err) {
      console.error("❌  Failed to enqueue alert job:", err.message);
    }
  }
  console.log(`✅  ${volunteersQueued} alert job(s) queued`);

  // ── Step i: Insert raw report ──────────────────────────────────────────────
  console.log("📝  Step i: Inserting raw report...");
  const phoneHash = hashPhone(userPhone);
  const report = await insertReport({
    need_id:       need.id,
    phone_hash:    phoneHash,
    raw_message:   rawText,
    language:      classification.language,
    location_text: classification.location_text,
  });
  console.log(`✅  Report inserted: ${report.id}`);

  // ── Step j: Audit log ──────────────────────────────────────────────────────
  console.log("📋  Step j: Writing audit log...");
  await writeAuditLog({
    user_id:    phoneHash,
    action:     existingNeed ? "INCREMENT_REPORT_COUNT" : "INSERT_NEED",
    table_name: "needs",
    record_id:  need.id,
  });
  console.log("✅  Audit log written");

  console.log(`🎉  Pipeline complete for ${userPhone} — need: ${need.reference_id}`);

  return {
    need,
    report,
    geo,
    classification,
    volunteersQueued,
    isDuplicate: !!existingNeed,
  };
}