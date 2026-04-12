// src/services/groq.js
// Groq API — Llama 3 for free classification.
// Output fields match M2's needs table schema exactly.

import { env } from "../config/env.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama3-70b-8192";

const SYSTEM_PROMPT = `You are a structured data extractor for Sahyog — a Mumbai community needs platform.
A community member has reported a need via WhatsApp. Extract information and return ONLY valid JSON.
Do not include markdown fences, explanation, or any text outside the JSON object.

Return exactly this JSON structure:
{
  "category": string,        // one of: FOOD | MEDICAL | SHELTER | WATER | SAFETY | OTHER
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
 * Classify a WhatsApp report using Groq (Llama 3).
 * Output fields match M2's needs table schema exactly.
 *
 * @param {string} rawText — full report text from the bot conversation
 * @returns {Promise<{
 *   category: string,
 *   urgency: string,
 *   summary: string,
 *   affected_count: number,
 *   location_text: string,
 *   language: string
 * }>}
 */
export async function classifyReport(rawText) {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model:       MODEL,
      max_tokens:  512,
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: rawText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("❌  Groq API error:", JSON.stringify(err));
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content ?? "";

  try {
    const parsed = JSON.parse(text);

    // Validate and sanitize fields
    const validCategories = ["FOOD", "MEDICAL", "SHELTER", "WATER", "SAFETY", "OTHER"];
    const validUrgencies  = ["low", "medium", "high", "critical"];

    return {
      category:      validCategories.includes(parsed.category) ? parsed.category : "OTHER",
      urgency:       validUrgencies.includes(parsed.urgency)   ? parsed.urgency  : "medium",
      summary:       parsed.summary       ?? "No summary available",
      affected_count: parseInt(parsed.affected_count, 10) || 1,
      location_text: parsed.location_text ?? "Location not specified",
      language:      parsed.language      ?? "en",
    };
  } catch {
    console.error("❌  Groq returned non-JSON:", text);
    throw new Error("Classification parse error — model returned invalid JSON");
  }
}