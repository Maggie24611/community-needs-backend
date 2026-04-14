// src/services/urgencyScorer.js
// Day 4: Added Environment and Sanitation categories per M2's update.

const SEVERITY_WEIGHTS = {
  low:      0.25,
  medium:   0.50,
  high:     0.75,
  critical: 1.00,
};

/**
 * Compute a 0-100 urgency score.
 * Formula: (severity_weight * 40) + (report_count * 3) + (affected_count * 2)
 */
export function computeUrgencyScore({ urgency, report_count, affected_count }) {
  const severityWeight = SEVERITY_WEIGHTS[urgency] ?? SEVERITY_WEIGHTS.medium;
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
 * Day 4: Added Environment and Sanitation categories.
 */
export function deriveTitleFromCategory(category, locationText) {
  const labels = {
    FOOD:        "Food shortage",
    MEDICAL:     "Medical assistance needed",
    SHELTER:     "Shelter required",
    WATER:       "Water supply issue",
    SAFETY:      "Safety concern",
    ENVIRONMENT: "Environmental issue",
    SANITATION:  "Sanitation issue",
    OTHER:       "Community need",
  };
  const label = labels[category] ?? "Community need";
  const loc   = locationText ? ` — ${locationText.substring(0, 40)}` : "";
  return `${label}${loc}`;
}