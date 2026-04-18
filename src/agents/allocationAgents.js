// src/agents/allocationAgent.js
// Resource allocation agent — uses Groq (Llama 3) for AI analysis.
// No Gemini, no Anthropic — Groq only.

import { supabase }          from "../services/supabase.js";
import { runAllocationLLM }  from "../services/groq.js";

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

/**
 * Run the resource allocation agent.
 * Fetches live data from Supabase, calls Groq LLM,
 * writes recommendations back to Supabase.
 * @returns {Promise<Array>} — 5 prioritised recommendations
 */
export async function runAllocationAgent() {
  console.log("🤖  Allocation agent starting...");

  // Fetch active needs
  const { data: needs, error: needsError } = await supabase
    .from("needs")
    .select("ward, category, urgency_score, status, urgency, affected_count")
    .eq("status", "open");

  if (needsError) throw new Error(`Failed to fetch needs: ${needsError.message}`);
  console.log(`📊  Fetched ${needs?.length ?? 0} active needs`);

  // Fetch historical data (last 12 months)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const { data: history } = await supabase
    .from("historical_data")
    .select("ward, category, data_type, date_recorded, summary")
    .gte("date_recorded", oneYearAgo);

  console.log(`📚  Fetched ${history?.length ?? 0} historical records`);

  // Fetch opted-in volunteers
  const { data: volunteers } = await supabase
    .from("volunteers")
    .select("ward, categories, opted_in")
    .eq("opted_in", true);

  console.log(`👥  Fetched ${volunteers?.length ?? 0} volunteers`);

  // Prepare summaries
  const wardNeedsSummary   = groupByWard(needs ?? []);
  const wardHistorySummary = groupByWard(history ?? []);
  const wardVolunteerCount = countByWard(volunteers ?? []);

  // Call Groq LLM
  console.log("🧠  Calling Groq Llama 3 for recommendations...");
  const recommendations = await runAllocationLLM({
    wardNeedsSummary,
    wardHistorySummary,
    wardVolunteerCount,
  });

  console.log(`✅  Got ${recommendations.length} recommendations`);

  // Save to Supabase recommendations table
  const { error: insertError } = await supabase
    .from("recommendations")
    .insert({
      week_starting:   new Date().toISOString().split("T")[0],
      recommendations,
      ward_count:      recommendations.length,
      generated_by:    "groq_llama3_70b",
      input_summary: {
        active_needs:         needs?.length ?? 0,
        historical_records:   history?.length ?? 0,
        available_volunteers: volunteers?.length ?? 0,
      },
    });

  if (insertError) {
    console.warn("⚠️  Could not save recommendations:", insertError.message);
  } else {
    console.log("✅  Recommendations saved to Supabase");
  }

  return recommendations;
}