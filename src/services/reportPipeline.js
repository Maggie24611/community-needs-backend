// src/services/reportPipeline.js
// Complete ingestion pipeline — steps a through j.
// Day 9: Added Supabase timeout handling, better error recovery.

import crypto from "crypto";
import { classifyReport }        from "./groq.js";
import { generateEmbedding }     from "./embedding.js";
import { geocodeLocation }       from "./geocoding.js";
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

export function hashPhone(phone) {
  if (!phone) return "anonymous";
  return crypto.createHash("sha256").update(String(phone)).digest("hex");
}

export function generateReferenceId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MUM-${num}`;
}

/**
 * Wrap any async operation with a timeout.
 * @param {Promise} promise
 * @param {number} ms — timeout in milliseconds
 * @param {string} label — label for error message
 */
async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

export async function processReport({
  userPhone,
  rawText,
  consented = false,
  reportCount = 1,
  contactName = "Reporter",
}) {
  console.log(`🔄  Pipeline starting for ${userPhone}`);

  // Guard against empty input
  if (!rawText || rawText.trim().length < 3) {
    console.warn("⚠️  Pipeline: rawText too short, aborting");
    throw new Error("Report text too short to process");
  }

  // ── Step a: Classify via Groq ──────────────────────────────────────────────
  console.log("🧠  Step a: Classifying with Groq...");
  let classification;
  try {
    classification = await withTimeout(
      classifyReport(rawText),
      15000,
      "Groq classification"
    );
    console.log(`✅  Classification: ${classification.category} / ${classification.urgency}`);
  } catch (err) {
    console.warn("⚠️  Classification failed, using defaults:", err.message);
    classification = {
      category:       "Other",
      urgency:        "Medium",
      summary:        rawText.substring(0, 100),
      affected_count: 1,
      location_text:  "Location not specified",
      language:       "en",
    };
  }

  // ── Step b: Geocode ────────────────────────────────────────────────────────
  console.log(`📍  Step b: Geocoding "${classification.location_text}"...`);
  let geo = null;
  try {
    geo = await withTimeout(
      geocodeLocation(classification.location_text),
      10000,
      "Geocoding"
    );
    console.log(geo ? `✅  Geocoded: (${geo.lat}, ${geo.lng})` : "⚠️  Geocoding returned null");
  } catch (err) {
    console.warn("⚠️  Geocoding failed:", err.message);
  }

  // ── Step c: Embedding ──────────────────────────────────────────────────────
  console.log("🔢  Step c: Generating embedding...");
  let embedding = null;
  try {
    embedding = await withTimeout(
      generateEmbedding(rawText),
      10000,
      "Embedding"
    );
    if (embedding) console.log("✅  Embedding generated");
  } catch (err) {
    console.warn("⚠️  Embedding failed:", err.message);
  }

  // ── Step d: Deduplication ──────────────────────────────────────────────────
  console.log("🔍  Step d: Checking for duplicates...");
  let existingNeed = null;
  if (embedding && geo?.ward) {
    try {
      const similar = await withTimeout(
        findSimilarNeeds({
          queryEmbedding: embedding,
          ward:           geo.ward,
          threshold:      0.88,
          count:          1,
        }),
        8000,
        "Deduplication"
      );
      if (similar && similar.length > 0) {
        existingNeed = similar[0];
        console.log(`⚠️  Duplicate found: ${existingNeed.id}`);
        await withTimeout(
          incrementReportCount(existingNeed.id, existingNeed.report_count + 1),
          5000,
          "incrementReportCount"
        );
      }
    } catch (err) {
      console.warn("⚠️  Dedup failed (non-fatal):", err.message);
    }
  }

  // ── Step e & f: Insert need ────────────────────────────────────────────────
  let need;
  if (existingNeed) {
    need = existingNeed;
    console.log(`♻️  Using existing need: ${need.id}`);
  } else {
    console.log("💾  Step e/f: Inserting new need...");
    const referenceId  = generateReferenceId();
    const urgencyScore = computeUrgencyScore({
      urgency:        classification.urgency,
      report_count:   reportCount,
      affected_count: classification.affected_count,
    });
    const title     = deriveTitleFromCategory(
      classification.category,
      geo?.formattedAddress ?? classification.location_text
    );
    const phoneHash = hashPhone(userPhone);

    try {
      need = await withTimeout(
        insertNeed({
          reference_id:        referenceId,
          title,
          summary:             classification.summary,
          category:            classification.category,
          urgency:             classification.urgency,
          urgency_score:       urgencyScore,
          ward:                geo?.ward ?? null,
          lat:                 geo?.lat ?? null,
          lng:                 geo?.lng ?? null,
          affected_count:      classification.affected_count,
          report_count:        reportCount,
          status:              "active",
          embedding,
          reporter_phone_hash: phoneHash,
          reporter_consented:  consented,
        }),
        10000,
        "insertNeed"
      );
      console.log(`✅  Need inserted: ${need.id} (${referenceId})`);
    } catch (err) {
      console.error("❌  insertNeed failed:", err.message);
      throw err; // Fatal — can't continue without a need
    }
  }

  // ── Step g: Fetch volunteers ───────────────────────────────────────────────
  console.log("👥  Step g: Fetching nearby volunteers...");
  let volunteers = [];
  if (geo) {
    try {
      const all = await withTimeout(
        getVolunteersNear(geo.lat, geo.lng, 3000),
        8000,
        "getVolunteersNear"
      );
      volunteers = (all || []).slice(0, 3);
      console.log(`✅  Found ${volunteers.length} volunteer(s)`);
    } catch (err) {
      console.warn("⚠️  volunteers_within_radius failed (non-fatal):", err.message);
    }
  }

  // ── Step h: Queue alerts ───────────────────────────────────────────────────
  console.log("📬  Step h: Queuing alert jobs...");
  let volunteersQueued = 0;
  for (const volunteer of volunteers) {
    try {
      await enqueueAlertJob({ volunteer, need, geo, userPhone, contactName });
      volunteersQueued++;
    } catch (err) {
      console.error("❌  Failed to enqueue alert:", err.message);
    }
  }

  // ── Step i: Insert raw report ──────────────────────────────────────────────
  const phoneHash = hashPhone(userPhone);
  let report;
  try {
    report = await withTimeout(
      insertReport({
        need_id:       need.id,
        phone_hash:    phoneHash,
        raw_message:   rawText,
        language:      classification.language ?? "en",
        location_text: classification.location_text,
      }),
      8000,
      "insertReport"
    );
    console.log(`✅  Report inserted: ${report.id}`);
  } catch (err) {
    console.warn("⚠️  insertReport failed (non-fatal):", err.message);
    report = { id: null };
  }

  // ── Step j: Audit log ──────────────────────────────────────────────────────
  try {
    await withTimeout(
      writeAuditLog({
        user_id:    phoneHash,
        action:     existingNeed ? "INCREMENT_REPORT_COUNT" : "INSERT_NEED",
        table_name: "needs",
        record_id:  need.id,
      }),
      5000,
      "writeAuditLog"
    );
  } catch (err) {
    console.warn("⚠️  Audit log failed (non-fatal):", err.message);
  }

  console.log(`🎉  Pipeline complete — ${need.reference_id}`);
  return {
    need,
    report,
    geo,
    classification,
    volunteersQueued,
    isDuplicate: !!existingNeed,
  };
}