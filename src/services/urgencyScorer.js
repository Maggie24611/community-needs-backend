// src/services/urgencyScorer.js
// Day 6: Updated to match M2's exact urgency and category values.
// Urgency: Critical | High | Medium | Low
// Status: active (not "open")

const SEVERITY_WEIGHTS = {
  Low:      0.25,
  Medium:   0.50,
  High:     0.75,
  Critical: 1.00,
};

/**
 * Compute a 0-100 urgency score.
 * Formula: (severity_weight * 40) + (report_count * 3) + (affected_count * 2)
 */
export function computeUrgencyScore({ urgency, report_count, affected_count }) {
  const severityWeight = SEVERITY_WEIGHTS[urgency] ?? SEVERITY_WEIGHTS.Medium;
  const score =
    (severityWeight * 40) +
    (report_count   *  3) +
    (affected_count *  2);
  return Math.min(Math.round(score), 100);
}

/**
 * Generate reference ID in format MUM-XXXX
 */
export function generateReferenceId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `MUM-${num}`;
}

/**
 * Derive a short title from category + location.
 * Uses M2's exact category values.
 */
export function deriveTitleFromCategory(category, locationText) {
  const labels = {
    "Food & water": "Food & water shortage",
    "Medical":      "Medical assistance needed",
    "Shelter":      "Shelter required",
    "Education":    "Education support needed",
    "Safety":       "Safety concern",
    "Environment":  "Environmental issue",
    "Sanitation":   "Sanitation issue",
    "Other":        "Community need",
  };
  const label = labels[category] ?? "Community need";
  const loc   = locationText ? ` — ${locationText.substring(0, 40)}` : "";
  return `${label}${loc}`;
}