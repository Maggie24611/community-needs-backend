// src/agents/allocationAgent.js
// Google Gemini-powered resource allocation agent.
// Satisfies hackathon requirement: Google AI model actively integrated.
// Reads needs + historical_data + volunteers from Supabase,
// calls Gemini to generate prioritised deployment recommendations,
// writes results to recommendations table.

import { GoogleGenAI } from "@google/genai";
import { supabase } from "../services/supabase.js";
import { env } from "../config/env.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

// ─── Helper functions ──────────────────────────────────────────────────────

function groupByWard(rows) {
  if (!rows || rows.length === 0) return {};
  return rows.reduce((acc, row) => {
    const ward = row.ward || "Unknown";
    if (!acc[ward]) acc[ward] = [];
    acc[ward].push(row);
    return acc;
  }, {});
}

function countByWard(rows) {
  if (!rows || rows.length === 0) return {};
  return rows.reduce((acc, row) => {
    const ward = row.ward || "Unknown";
    acc[ward] = (acc[ward] || 0) + 1;
    return acc;
  }, {});
}

// ─── Main Agent ───────────────────────────────────────────────────────────────

/**
 * Run the Gemini-powered resource allocation agent.
 * Fetches live data from Supabase, calls Gemini 2.0 Flash,
 * writes recommendations back to Supabase.
 *
 * @returns {Promise<Array>} — array of 5 prioritised recommendations
 */
export async function runAllocationAgent() {
  console.log("🤖  Allocation agent starting...");

  // ── Fetch active needs ─────────────────────────────────────────────────────
  const { data: needs, error: needsError } = await supabase
    .from("needs")
    .select("ward, category, urgency_score, status, urgency, affected_count")
    .eq("status", "open");

  if (needsError) throw new Error(`Failed to fetch needs: ${needsError.message}`);
  console.log(`📊  Fetched ${needs.length} active needs`);

  // ── Fetch historical data (last 12 months) ────────────────────────────────
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const { data: history, error: historyError } = await supabase
    .from("historical_data")
    .select("ward, category, data_type, date_recorded, summary")
    .gte("date_recorded", oneYearAgo);

  if (historyError) {
    console.warn("⚠️  Could not fetch historical_data:", historyError.message);
  }
  console.log(`📚  Fetched ${history?.length ?? 0} historical records`);

  // ── Fetch available volunteers ─────────────────────────────────────────────
  const { data: volunteers, error: volError } = await supabase
    .from("volunteers")
    .select("ward, categories, opted_in")
    .eq("opted_in", true);

  if (volError) {
    console.warn("⚠️  Could not fetch volunteers:", volError.message);
  }
  console.log(`👥  Fetched ${volunteers?.length ?? 0} opted-in volunteers`);

  // ── Prepare summaries ──────────────────────────────────────────────────────
  const wardNeedsSummary    = groupByWard(needs);
  const wardHistorySummary  = groupByWard(history ?? []);
  const wardVolunteerCount  = countByWard(volunteers ?? []);

  // ── Build Gemini prompt ────────────────────────────────────────────────────
  const prompt = `You are a resource allocation expert for Mumbai NGOs working on PS5: Smart Resource Allocation.
Analyse this data and return a prioritised deployment plan.

CURRENT ACTIVE NEEDS BY WARD:
${JSON.stringify(wardNeedsSummary, null, 2)}

HISTORICAL ISSUE PATTERNS (last 12 months):
${JSON.stringify(wardHistorySummary, null, 2)}

AVAILABLE VOLUNTEERS BY WARD:
${JSON.stringify(wardVolunteerCount, null, 2)}

Return ONLY a JSON array of exactly 5 objects.
Each object must have these exact fields:
{
  "priority_rank": 1,
  "ward_name": "Dharavi",
  "primary_issue": "Food & water",
  "urgency_level": "Critical",
  "reasoning": "3 active water reports scoring 91 average. Historical data shows jaundice spike after water shortage same period last year. No water awareness drive in 8 months.",
  "recommended_action": "Deploy water testing team and run awareness campaign this week",
  "volunteer_gap": true
}

No preamble, no explanation, JSON array only.`;

  // ── Call Gemini ────────────────────────────────────────────────────────────
  console.log("🧠  Calling Gemini 2.0 Flash for recommendations...");
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: prompt,
  });

  const text  = response.text();
  const clean = text.replace(/```json|```/g, "").trim();

  let recommendations;
  try {
    recommendations = JSON.parse(clean);
  } catch {
    console.error("❌  Gemini returned non-JSON:", text);
    throw new Error("Allocation agent parse error");
  }

  console.log(`✅  Gemini returned ${recommendations.length} recommendations`);

  // ── Write to recommendations table ────────────────────────────────────────
  const { error: insertError } = await supabase
    .from("recommendations")
    .insert({
      week_starting:   new Date().toISOString().split("T")[0],
      recommendations,
      ward_count:      recommendations.length,
      input_summary: {
        active_needs:          needs.length,
        historical_records:    history?.length ?? 0,
        available_volunteers:  volunteers?.length ?? 0,
      },
    });

  if (insertError) {
    console.warn("⚠️  Could not save recommendations:", insertError.message);
  } else {
    console.log("✅  Recommendations saved to Supabase");
  }

  return recommendations;
}