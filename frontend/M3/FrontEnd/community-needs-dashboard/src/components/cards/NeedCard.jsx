import { formatTimeAgo } from "../../utils/urgency";

const BORDER_COLOR = {
  Critical: "#6E2320",
  High: "#6E4F15",
  Medium: "#1A4D24",
};

const ACCENT_COLOR = {
  Critical: "#F85149",
  High: "#E3B341",
  Medium: "#3FB950",
};

const BADGE_STYLE = {
  Critical: { background: "#1C0A09", color: "#F85149", border: "1px solid #6E2320" },
  High: { background: "#191108", color: "#E3B341", border: "1px solid #6E4F15" },
  Medium: { background: "#091D0E", color: "#3FB950", border: "1px solid #1A4D24" },
};

const SCORE_COLOR = {
  Critical: "#F85149",
  High: "#E3B341",
  Medium: "#3FB950",
};

function UrgencyBadge({ level }) {
  const style = BADGE_STYLE[level] ?? BADGE_STYLE.Medium;
  return (
    <span style={{
      ...style,
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "2px 10px", fontSize: "11px", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.05em", borderRadius: "6px",
    }}>
      <span style={{
        width: "6px", height: "6px", borderRadius: "50%",
        background: ACCENT_COLOR[level] ?? ACCENT_COLOR.Medium,
        flexShrink: 0,
      }} />
      {level}
    </span>
  );
}

function UrgencyBar({ score, level }) {
  const color = SCORE_COLOR[level] ?? SCORE_COLOR.Medium;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
        <span style={{ fontSize: "11px", color: "#7D8590" }}>Urgency Score</span>
        <span style={{ fontSize: "11px", fontWeight: 700, fontFamily: "monospace", color }}>{score}</span>
      </div>
      <div style={{ height: "5px", background: "#21262D", borderRadius: "99px", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score}%`, background: color,
          borderRadius: "99px", transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, isSuccess, disabled, locked }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px", fontSize: "11px", fontWeight: 500,
        border: isSuccess ? "1px solid #1A4D24" : "1px solid #21262D",
        borderRadius: "6px",
        background: isSuccess ? "#091D0E" : "#0D1117",
        color: isSuccess ? "#3FB950" : "#7D8590",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: "5px",
      }}
    >
      {locked && <span style={{ fontSize: "10px" }}>🔒</span>}
      {label}
    </button>
  );
}

export default function NeedCard({
  need,
  onDispatch,
  onFollowUp,
  onResolve,
  resolving = false,
  isAuthorized = false,
  onRequestAccess,
}) {
  const level = need.urgency_level || need.urgency || "Medium";
  const accentColor = ACCENT_COLOR[level] ?? ACCENT_COLOR.Medium;
  const borderColor = BORDER_COLOR[level] ?? BORDER_COLOR.Medium;

  function handleDispatch() {
    if (!isAuthorized) {
      onRequestAccess?.();
      return;
    }
    onDispatch?.(need);
  }

  function handleFollowUp() {
    if (!isAuthorized) {
      onRequestAccess?.();
      return;
    }
    const ok = window.confirm(
      "Log a follow up for " + need.id + "?\n\nThis will mark the need as in progress."
    );
    if (ok) onFollowUp?.(need);
  }

  function handleResolve() {
    if (!isAuthorized) {
      onRequestAccess?.();
      return;
    }
    const ok = window.confirm(
      "Mark " + need.id + " as resolved?\n\nThis will permanently remove it from the dashboard."
    );
    if (ok) onResolve?.(need);
  }

  return (
    <div style={{
      background: "#161B22",
      border: "1px solid " + borderColor,
      borderRadius: "12px",
      overflow: "hidden",
      opacity: resolving ? 0.5 : 1,
      pointerEvents: resolving ? "none" : "auto",
      flexShrink: 0,
    }}>
      <div style={{ height: "3px", background: accentColor, width: "100%" }} />

      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <UrgencyBadge level={level} />
            {need.is_assigned && (
              <span style={{
                padding: "2px 8px", fontSize: "11px", fontWeight: 500,
                background: "#21262D", color: "#7D8590",
                border: "1px solid #30363D", borderRadius: "6px",
              }}>Assigned</span>
            )}
          </div>
          <span style={{
            fontSize: "10px", fontFamily: "monospace", color: "#7D8590",
            background: "#0D1117", border: "1px solid #21262D",
            padding: "3px 8px", borderRadius: "6px", whiteSpace: "nowrap",
          }}>{need.id}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "11px", color: "#7D8590" }}>
          <span style={{ color: "#E6EDF3", fontWeight: 600 }}>{need.ward}</span>
          <span>·</span>
          <span>{need.category}</span>
          <span>·</span>
          <span>{need.report_count} reports</span>
          <span>·</span>
          <span>{formatTimeAgo(need.created_at)}</span>
        </div>

        <p style={{
          fontSize: "12px", color: "#8B949E", lineHeight: 1.6, margin: 0,
          display: "-webkit-box", WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {need.ai_summary || need.summary}
        </p>

        <UrgencyBar score={need.urgency_score} level={level} />

        <div style={{
          display: "flex", gap: "8px", flexWrap: "wrap",
          paddingTop: "10px", borderTop: "1px solid #21262D",
          alignItems: "center",
        }}>
          <ActionBtn
            label="Dispatch"
            locked={!isAuthorized}
            onClick={handleDispatch}
          />
          <ActionBtn
            label="Follow Up"
            locked={!isAuthorized}
            onClick={handleFollowUp}
          />
          <ActionBtn
            label={resolving ? "Resolving..." : "Resolve"}
            isSuccess={isAuthorized}
            locked={!isAuthorized}
            onClick={handleResolve}
            disabled={resolving}
          />
          {!isAuthorized && (
            <span style={{ fontSize: "10px", color: "#484F58" }}>
              PIN required
            </span>
          )}
        </div>

      </div>
    </div>
  );
}