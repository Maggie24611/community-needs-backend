// src/services/urgencyScorer.js
// Computes a 0-100 urgency score from classifier output + report count.
//
// Formula (from spec):
//   (severity_weight * 40) + (report_count * 3) + (affected_count * 2)
//   capped at 100

/**
 * Maps urgency string to a severity weight (0.0 - 1.0)
 * Used in the formula: severity_weight * 40
 */
const SEVERITY_WEIGHTS = {
  low:      0.25,  // → 10 points
  medium:   0.50,  // → 20 points
  high:     0.75,  // → 30 points
  critical: 1.00,  // → 40 points
};

/**
 * Compute a 0-100 urgency score.
 *
 * @param {object} params
 * @param {string} params.urgency        — "low"|"medium"|"high"|"critical"
 * @param {number} params.report_count   — how many reports for this need
 * @param {number} params.affected_count — estimated people affected
 * @returns {number} score between 0 and 100
 *
 * @example
 * computeUrgencyScore({ urgency: "high", report_count: 3, affected_count: 10 })
 * // → (0.75 * 40) + (3 * 3) + (10 * 2) = 30 + 9 + 20 = 59
 */
export function computeUrgencyScore({ urgency, report_count, affected_count }) {
  const severityWeight = SEVERITY_WEIGHTS[urgency] ?? SEVERITY_WEIGHTS.medium;

  const score =
    (severityWeight * 40) +
    (report_count   *  3) +
    (affected_count *  2);

  // Cap at 100
  return Math.min(Math.round(score), 100);
}

/**
 * Generate a unique reference ID for a need.
 * Format: NEED-{timestamp}-{random4}
 * @returns {string} e.g. "NEED-1712345678-A3F2"
 */
export function generateReferenceId() {
  const ts     = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NEED-${ts}-${random}`;
}

/**
 * Derive a short human-readable title from category.
 * Used as needs.title in Supabase.
 * @param {string} category
 * @param {string} locationText
 * @returns {string}
 */
export function deriveTitleFromCategory(category, locationText) {
  const labels = {
    FOOD:    "Food shortage",
    MEDICAL: "Medical assistance needed",
    SHELTER: "Shelter required",
    WATER:   "Water supply issue",
    SAFETY:  "Safety concern",
    OTHER:   "Community need",
  };
  const label = labels[category] ?? "Community need";
  const loc   = locationText ? ` — ${locationText.substring(0, 40)}` : "";
  return `${label}${loc}`;
}