// src/services/gemini.js
// Google Gemini API — replaces Groq for classification.
// Satisfies hackathon requirement: "use at least one Google AI model or service"
// Free tier available at https://aistudio.google.com

import { env } from "../config/env.js";

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`;

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
 * Classify a WhatsApp report using Google Gemini.
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
  const response = await fetch(GEMINI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        {
          parts: [{ text: rawText }],
        },
      ],
      generationConfig: {
        temperature:     0.1,
        maxOutputTokens: 512,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error("❌  Gemini API error:", JSON.stringify(err));
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown fences if Gemini adds them
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);

    const validCategories = ["FOOD", "MEDICAL", "SHELTER", "WATER", "SAFETY", "OTHER"];
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
    console.error("❌  Gemini returned non-JSON:", text);
    throw new Error("Classification parse error — Gemini returned invalid JSON");
  }
}