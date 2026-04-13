// src/services/embedding.js
// Generates text embeddings for deduplication via find_similar_needs RPC.
// Uses Hugging Face Inference API — completely free, no card needed.
// Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
// Falls back gracefully to null if API is unavailable.

import { env } from "../config/env.js";

const HF_API_URL =
  "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2";

/**
 * Generate a 384-dimension embedding vector for a text string.
 * Used by find_similar_needs RPC to detect duplicate reports.
 *
 * @param {string} text — report text to embed
 * @returns {Promise<number[]|null>} — embedding vector or null if failed
 */
export async function generateEmbedding(text) {
  if (!text || text.trim().length === 0) return null;

  // If no HF token configured, skip silently
  if (!env.HUGGINGFACE_API_KEY) {
    console.warn("⚠️  HUGGINGFACE_API_KEY not set — skipping embedding");
    return null;
  }

  try {
    const response = await fetch(HF_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.HUGGINGFACE_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.warn(`⚠️  HuggingFace embedding failed (${response.status}):`, err);
      return null;
    }

    const data = await response.json();

    // HF returns nested array for sentence transformers — flatten to 1D
    const vector = Array.isArray(data[0]) ? data[0] : data;
    return vector;
  } catch (err) {
    console.warn("⚠️  Embedding generation error:", err.message);
    return null;
  }
}