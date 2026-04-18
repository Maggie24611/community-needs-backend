// src/services/groq.js
// Groq API — Llama 3.3 for classification AND allocation agent.
// Both use llama-3.3-70b-versatile (latest, not deprecated)

import { env } from "../config/env.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// ─── Classification ───────────────────────────────────────────────────────────

const CLASSIFY_SYSTEM_PROMPT = `You are a structured data extractor for Sahyog — a Mumbai community needs platform.
A community member has reported a need via WhatsApp. Extract information and return ONLY valid JSON.
Do not include markdown fences, explanation, or any text outside the JSON object.

Return exactly this JSON structure:
{
  "category": string,        // one of: FOOD | MEDICAL | SHELTER | WATER | SAFETY | ENVIRONMENT | SANITATION | OTHER
  "urgency": string,         // one of: "low" | "medium" | "high" | "critical"
  "summary": string,         // concise 1-2 sentence summary in English
  "affected_count": number,  // estimated number of people affected (default 1 if unknown)
  "location_text": string,   // location exactly as described by the reporter
  "language": string         // detected language code: "en" | "hi" | "mr" | "gu" | "other"
}

Urgency guidelines:
- critical: immediate life threat, medical emergency, no food for children
- high: serious need within hours, large group affected
- medium: need within a day, manageable situation
- low: non-urgent, informational`;

/**
 * Classify a WhatsApp report using Groq (Llama 3.3).
 * @param {string} rawText
 * @returns {Promise<object>}
 */
export async function classifyReport(rawText) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      max_tokens:  512,
      temperature: 0.1,
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
        { role: "user",   content: rawText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("❌  Groq classify error:", JSON.stringify(err));
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(text);
    const validCategories = ["FOOD", "MEDICAL", "SHELTER", "WATER", "SAFETY", "ENVIRONMENT", "SANITATION", "OTHER"];
    const validUrgencies  = ["low", "medium", "high", "critical"];

    return {
      category:       validCategories.includes(parsed.category) ? parsed.category : "OTHER",
      urgency:        validUrgencies.includes(parsed.urgency)   ? parsed.urgency  : "medium",
      summary:        parsed.summary        ?? "No summary available",
      affected_count: parseInt(parsed.affected_count, 10) || 1,
      location_text:  parsed.location_text  ?? "Location not specified",
      language:       parsed.language       ?? "en",
    };
  } catch {
    console.error("❌  Groq classify non-JSON:", text);
    throw new Error("Classification parse error");
  }
}

// ─── Allocation Agent LLM ─────────────────────────────────────────────────────

const ALLOCATION_SYSTEM_PROMPT = `You are a resource allocation expert for Mumbai NGOs working on PS5: Smart Resource Allocation.
Analyse the provided data and return a prioritised deployment plan.
Return ONLY a valid JSON array of exactly 5 objects. No preamble, no explanation, no markdown.
Each object must have exactly these fields:
{
  "priority_rank": number,
  "ward_name": string,
  "primary_issue": string,
  "urgency_level": string,
  "reasoning": "2 sentences max combining current needs and historical patterns",
  "recommended_action": "specific action to take this week",
  "volunteer_gap": boolean
}`;

/**
 * Run resource allocation analysis using Groq Llama 3.3.
 * @param {object} data
 * @returns {Promise<Array>}
 */
export async function runAllocationLLM({ wardNeedsSummary, wardHistorySummary, wardVolunteerCount }) {
  const userPrompt = `CURRENT ACTIVE NEEDS BY WARD:
${JSON.stringify(wardNeedsSummary, null, 2)}

HISTORICAL ISSUE PATTERNS (last 12 months):
${JSON.stringify(wardHistorySummary, null, 2)}

AVAILABLE VOLUNTEERS BY WARD:
${JSON.stringify(wardVolunteerCount, null, 2)}

Return ONLY a JSON array of exactly 5 prioritised ward recommendations. No markdown, no explanation.`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       "llama-3.3-70b-versatile",
      max_tokens:  1024,
      temperature: 0.2,
      messages: [
        { role: "system", content: ALLOCATION_SYSTEM_PROMPT },
        { role: "user",   content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("❌  Groq allocation error:", JSON.stringify(err));
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data  = await response.json();
  const text  = data.choices?.[0]?.message?.content ?? "";
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    console.error("❌  Groq allocation non-JSON:", text);
    throw new Error("Allocation parse error");
  }
}