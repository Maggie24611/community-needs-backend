// src/services/reportPipeline.js
// Complete ingestion pipeline — steps a through j.
// Day 6: status is now "active" (not "open"), urgency is Title Case.

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
  return crypto.createHash("sha256").update(phone).digest("hex");
}

export function generateReferenceId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MUM-${num}`;
}

export async function processReport({
  userPhone,
  rawText,
  consented = false,
  reportCount = 1,
  contactName = "Reporter",
}) {
  console.log(`🔄  Pipeline starting for ${userPhone}`);

  // Step a: Classify via Groq
  console.log("🧠  Step a: Classifying with Groq...");
  const classification = await classifyReport(rawText);
  console.log("✅  Classification:", classification);

  // Step b: Geocode
  console.log(`📍  Step b: Geocoding "${classification.location_text}"...`);
  const geo = await geocodeLocation(classification.location_text);
  console.log(geo ? `✅  Geocoded: (${geo.lat}, ${geo.lng})` : "⚠️  Geocoding failed");

  // Step c: Embedding
  console.log("🔢  Step c: Generating embedding...");
  let embedding = null;
  try {
    embedding = await generateEmbedding(rawText);
    if (embedding) console.log("✅  Embedding generated");
  } catch (err) {
    console.warn("⚠️  Embedding failed:", err.message);
  }

  // Step d: Deduplication
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
        console.log(`⚠️  Duplicate found: ${existingNeed.id}`);
        await incrementReportCount(existingNeed.id, existingNeed.report_count + 1);
      }
    } catch (err) {
      console.warn("⚠️  Dedup failed:", err.message);
    }
  }

  // Step e & f: Insert need
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

    need = await insertNeed({
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
      status:              "active",        // M2 confirmed: "active" not "open"
      embedding,
      reporter_phone_hash: phoneHash,
      reporter_consented:  consented,
    });
    console.log(`✅  Need inserted: ${need.id} (${referenceId})`);
  }

  // Step g: Fetch volunteers
  console.log("👥  Step g: Fetching nearby volunteers...");
  let volunteers = [];
  if (geo) {
    try {
      const all = await getVolunteersNear(geo.lat, geo.lng, 3000);
      volunteers = all.slice(0, 3);
      console.log(`✅  Found ${volunteers.length} volunteer(s)`);
    } catch (err) {
      console.warn("⚠️  volunteers_within_radius failed:", err.message);
    }
  }

  // Step h: Queue alerts
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

  // Step i: Insert raw report
  const phoneHash = hashPhone(userPhone);
  const report = await insertReport({
    need_id:       need.id,
    phone_hash:    phoneHash,
    raw_message:   rawText,
    language:      classification.language,
    location_text: classification.location_text,
  });
  console.log(`✅  Report inserted: ${report.id}`);

  // Step j: Audit log
  await writeAuditLog({
    user_id:    phoneHash,
    action:     existingNeed ? "INCREMENT_REPORT_COUNT" : "INSERT_NEED",
    table_name: "needs",
    record_id:  need.id,
  });

  console.log(`🎉  Pipeline complete — ${need.reference_id}`);
  return { need, report, geo, classification, volunteersQueued, isDuplicate: !!existingNeed };
}