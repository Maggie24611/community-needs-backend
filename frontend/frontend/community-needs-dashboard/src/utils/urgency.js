export const URGENCY_CONFIG = {
  Critical: {
    label: "Critical",
    color: "#F85149",
    bg: "#1C0A09",
    border: "#6E2320",
    tailwind: {
      pill: "bg-critical-light text-critical border border-critical-border",
      bar: "bg-critical",
    },
  },
  High: {
    label: "High",
    color: "#E3B341",
    bg: "#191108",
    border: "#6E4F15",
    tailwind: {
      pill: "bg-high-light text-high border border-high-border",
      bar: "bg-high",
    },
  },
  Medium: {
    label: "Medium",
    color: "#3FB950",
    bg: "#091D0E",
    border: "#1A4D24",
    tailwind: {
      pill: "bg-medium-light text-medium border border-medium-border",
      bar: "bg-medium",
    },
  },
};

export const getUrgencyConfig = (level) =>
  URGENCY_CONFIG[level] ?? URGENCY_CONFIG.Medium;

export const formatTimeAgo = (isoString) => {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};