import { useState, useMemo, useCallback } from "react";
import { useNeeds } from "./hooks/useNeeds";
import { useRealtimeNeeds } from "./hooks/useRealtimeNeeds";
import { resolveNeed } from "./hooks/useResolveNeed";
import { useAuth } from "./hooks/useAuth";
import FilterBar from "./components/filters/FilterBar";
import NeedCard from "./components/cards/NeedCard";
import NeedsMap from "./components/map/NeedsMap";
import RecommendationsPanel from "./components/recommendations/RecommendationsPanel";
import UploadPanel from "./components/upload/UploadPanel";
import HistoricalPanel from "./components/historical/HistoricalPanel";
import DispatchModal from "./components/modals/DispatchModal";
import { followUpNeed } from "./hooks/useFollowUp";
import { simulateNeed } from "./hooks/useSimulateNeed";
import PinModal from "./components/modals/PinModal";

const DEFAULT_FILTERS = {
  ward: "All Wards",
  category: "All Categories",
  urgency: "All",
  sortBy: "urgency_score",
};

function MetricCard({ label, value, color }) {
  const colors = {
    blue: { border: "#1A3A5C", val: "#58A6FF", bg: "#0D1F30" },
    red: { border: "#6E2320", val: "#F85149", bg: "#1C0A09" },
    amber: { border: "#6E4F15", val: "#E3B341", bg: "#191108" },
    green: { border: "#1A4D24", val: "#3FB950", bg: "#091D0E" },
  };
  const c = colors[color];
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: "12px", padding: "8px 14px",
      display: "flex", flexDirection: "column", gap: "2px", minWidth: "72px",
    }}>
      <span style={{ fontSize: "20px", fontWeight: 900, fontFamily: "monospace", color: c.val, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: "9px", color: "#7D8590", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </span>
    </div>
  );
}

function normalizeNeed(n) {
  return {
    ...n,
    id: n.reference_id || n.id,
    ai_summary: n.summary || n.ai_summary,
    urgency_level: n.urgency || n.urgency_level,
    is_assigned: n.status === 'assigned',
  };
}

function ErrorBanner({ message }) {
  return (
    <div style={{
      margin: "8px 24px", padding: "10px 14px",
      background: "#1C0A09", border: "1px solid #6E2320",
      borderRadius: "8px", fontSize: "12px", color: "#F85149",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      ⚠ {message}
    </div>
  );
}

export default function App() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [realtimeNeeds, setRealtimeNeeds] = useState([]);
  const [resolvedIds, setResolvedIds] = useState(new Set());
  const [resolvingId, setResolvingId] = useState(null);
  const [view, setView] = useState("split");

  const { needs, loading, error } = useNeeds(filters);
  const { isAuthorized, login, logout, showPinModal, handlePinSuccess, handlePinClose } = useAuth();
  const [dispatchNeed, setDispatchNeed] = useState(null);
  const [followingUpId, setFollowingUpId] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const handleRealtimeEvent = useCallback((need) => {
    if (need._resolved) {
      setResolvedIds(prev => new Set([...prev, need.reference_id || need.id]));
      setRealtimeNeeds(prev =>
        prev.filter(n => (n.reference_id || n.id) !== (need.reference_id || need.id))
      );
    } else {
      setRealtimeNeeds(prev => {
        const exists = prev.find(n =>
          (n.reference_id || n.id) === (need.reference_id || need.id)
        );
        if (exists) return prev;
        return [{ ...need, _isNew: true }, ...prev];
      });
    }
  }, []);

  useRealtimeNeeds(handleRealtimeEvent);

  const handleResolve = useCallback(async (need) => {
    const id = need.reference_id || need.id;
    setResolvingId(id);
    const success = await resolveNeed(id);
    if (success) {
      setResolvedIds(prev => new Set([...prev, id]));
      setRealtimeNeeds(prev =>
        prev.filter(n => (n.reference_id || n.id) !== id)
      );
    } else {
      alert('Failed to resolve. Check console for details.');
    }
    setResolvingId(null);
  }, []);

  const handleFollowUp = useCallback(async (need) => {
    const ok = window.confirm(
      "Log a follow up for " + (need.reference_id || need.id) + "?\n\nThis will mark it as in progress."
    );
    if (!ok) return;

    const id = need.reference_id || need.id;
    setFollowingUpId(id);
    const success = await followUpNeed(id);
    if (success) {
      alert("✓ Follow up logged — need marked as in progress.");
    } else {
      alert("Failed to log follow up. Check console.");
    }
    setFollowingUpId(null);
  }, []);

  const allNeeds = useMemo(() => {
    const ids = new Set(needs.map(n => n.reference_id));
    const fresh = realtimeNeeds.filter(n => !ids.has(n.reference_id));
    return [...fresh, ...needs]
      .map(normalizeNeed)
      .filter(n => !resolvedIds.has(n.reference_id || n.id));
  }, [needs, realtimeNeeds, resolvedIds]);

  const metrics = useMemo(() => ({
    total: allNeeds.length,
    critical: allNeeds.filter(n => n.urgency === 'Critical').length,
    unassigned: allNeeds.filter(n => n.status === 'active').length,
    avgScore: allNeeds.length
      ? Math.round(allNeeds.reduce((s, n) => s + (n.urgency_score || 0), 0) / allNeeds.length)
      : 0,
  }), [allNeeds]);

  const isMobile = window.innerWidth < 768;
  const PANEL_HEIGHT = isMobile ? "400px" : "calc(100vh - 340px)";

  const renderCards = () =>
    loading
      ? [...Array(3)].map((_, i) => (
        <div key={i} style={{
          background: "#161B22", border: "1px solid #21262D",
          borderRadius: "12px", height: "180px",
          animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0,
        }} />
      ))
      : allNeeds.length === 0
        ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 20px", gap: "12px",
            animation: "slideIn 0.3s ease-out",
          }}>
            <div style={{ fontSize: "32px" }}>🔍</div>
            <p style={{ fontSize: "13px", color: "#7D8590", margin: 0, textAlign: "center" }}>
              No needs match your current filters
            </p>
            <button
              onClick={() => setFilters(DEFAULT_FILTERS)}
              style={{
                padding: "6px 16px", fontSize: "11px",
                color: "#58A6FF", background: "transparent",
                border: "1px solid #58A6FF44", borderRadius: "8px",
                cursor: "pointer",
              }}
            >Clear filters</button>
          </div>
        )
        : allNeeds.map(need => (
          <NeedCard
            key={need.id}
            need={need}
            resolving={resolvingId === (need.reference_id || need.id)}
            isAuthorized={isAuthorized}
            onRequestAccess={login}
            onResolve={handleResolve}
            onDispatch={n => setDispatchNeed(n)}
            onFollowUp={handleFollowUp}
          />
        ));

  return (
    <div style={{ minHeight: "100vh", background: "#0D1117", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <header style={{ background: "#161B22", borderBottom: "1px solid #21262D" }}>
        <div style={{
          padding: "12px 20px",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
        }}>
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "30px", height: "30px", borderRadius: "8px",
              background: "#58A6FF1A", border: "1px solid #58A6FF33",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ color: "#58A6FF", fontWeight: 900, fontSize: "13px" }}>S</span>
            </div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#E6EDF3", lineHeight: 1 }}>Sahyog</div>
              <div style={{ fontSize: "10px", color: "#7D8590", marginTop: "1px" }}>Mumbai Community Needs</div>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "5px",
              background: "#091D0E", border: "1px solid #1A4D24",
              padding: "3px 8px", borderRadius: "99px", marginLeft: "4px",
            }}>
              <div style={{
                width: "6px", height: "6px", borderRadius: "50%",
                background: "#3FB950", animation: "pulse 2s ease-in-out infinite",
              }} />
              <span style={{ fontSize: "10px", fontWeight: 600, color: "#3FB950" }}>Live</span>
            </div>

            {/* Auth button */}
            {isAuthorized ? (
              <div style={{
                display: "flex", alignItems: "center", gap: "5px",
                background: "#091D0E", border: "1px solid #1A4D24",
                padding: "3px 8px", borderRadius: "99px",
              }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "#3FB950" }}>✓ Coordinator</span>
              </div>
            ) : (
              <button onClick={login} style={{
                display: "flex", alignItems: "center", gap: "5px",
                background: "#191108", border: "1px solid #6E4F15",
                padding: "3px 8px", borderRadius: "99px",
                cursor: "pointer", fontSize: "10px", fontWeight: 600, color: "#E3B341",
              }}>🔒 Login</button>
            )}
            {dispatchNeed && (
              <DispatchModal
                need={dispatchNeed}
                onClose={() => setDispatchNeed(null)}
                onSuccess={({ need, volunteer }) => {
                  alert(`✓ ${volunteer.name || 'Volunteer'} dispatched to ${need.ward}`);
                  setDispatchNeed(null);
                }}
              />

            )}
            {showPinModal && (
              <PinModal
                onSuccess={handlePinSuccess}
                onClose={handlePinClose}
              />
            )}
          </div>

          {/* View toggle */}
          <div style={{
            display: "flex", alignItems: "center",
            background: "#0D1117", border: "1px solid #21262D",
            borderRadius: "8px", padding: "3px",
          }}>
            {[
              { key: "cards", label: "Cards" },
              { key: "split", label: "Split" },
              { key: "map", label: "Map" },
            ].map(v => (
              <button key={v.key} onClick={() => setView(v.key)} style={{
                padding: "5px 12px", fontSize: "11px", fontWeight: 600,
                borderRadius: "6px", border: "none", cursor: "pointer",
                background: view === v.key ? "#58A6FF" : "transparent",
                color: view === v.key ? "#0D1117" : "#7D8590",
                transition: "all 0.15s",
              }}>{v.label}</button>
            ))}
          </div>

          {/* Demo simulate button — hidden during normal use */}
          <button
            onClick={async () => {
              setSimulating(true);
              const ok = await simulateNeed();
              if (ok) {
                // Button flashes green then resets
                setTimeout(() => setSimulating(false), 2000);
              } else {
                alert('Insert failed — check Supabase INSERT policy');
                setSimulating(false);
              }
            }}
            style={{
              padding: "5px 12px", fontSize: "11px", fontWeight: 600,
              borderRadius: "6px", border: "none", cursor: "pointer",
              background: simulating ? "#091D0E" : "#161B22",
              color: simulating ? "#3FB950" : "#484F58",
              border: `1px solid ${simulating ? "#1A4D24" : "#21262D"}`,
              transition: "all 0.3s",
              display: "flex", alignItems: "center", gap: "6px",
            }}
          >
            {simulating ? (
              <>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "#3FB950", animation: "pulse 1s infinite",
                }} />
                Need sent!
              </>
            ) : (
              <>⚡ Simulate</>
            )}
          </button>

          {/* Metrics */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <MetricCard label="Active" value={loading ? '—' : metrics.total} color="blue" />
            <MetricCard label="Critical" value={loading ? '—' : metrics.critical} color="red" />
            <MetricCard label="Unassigned" value={loading ? '—' : metrics.unassigned} color="amber" />
            <MetricCard label="Avg Score" value={loading ? '—' : metrics.avgScore} color="green" />
          </div>
        </div>
      </header>

      {/* Panels */}
      <RecommendationsPanel />
      <HistoricalPanel />
      <UploadPanel />
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Status bar */}
      <div style={{
        padding: "6px 20px 4px",
        display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap",
      }}>
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#7D8590" }}>
            <span style={{
              width: "11px", height: "11px",
              border: "2px solid #21262D", borderTop: "2px solid #58A6FF",
              borderRadius: "50%", display: "inline-block",
              animation: "spin 0.8s linear infinite",
            }} />
            Loading needs...
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "#7D8590" }}>
            <strong style={{ color: "#E6EDF3" }}>{allNeeds.length}</strong> needs
          </span>
        )}
        {realtimeNeeds.length > 0 && (
          <span style={{
            display: "flex", alignItems: "center", gap: "5px",
            fontSize: "11px", color: "#3FB950",
            background: "#091D0E", border: "1px solid #1A4D24",
            padding: "2px 8px", borderRadius: "99px",
          }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#3FB950", animation: "pulse 2s infinite" }} />
            {realtimeNeeds.length} new
          </span>
        )}
      </div>

      {error && <ErrorBanner message={`Connection issue — showing cached data. ${error}`} />}

      {/* Main content */}
      <main style={{ flex: 1, padding: "10px 20px 20px", overflow: "hidden" }}>

        {/* SPLIT */}
        {view === "split" && (
          <div style={{
            display: "flex", gap: "14px",
            flexDirection: isMobile ? "column" : "row",
            height: isMobile ? "auto" : PANEL_HEIGHT,
          }}>
            <div style={{
              width: isMobile ? "100%" : "50%",
              height: isMobile ? "350px" : "100%",
              borderRadius: "12px", overflow: "hidden",
              border: "1px solid #21262D", flexShrink: 0,
            }}>
              <NeedsMap needs={allNeeds} loading={loading} />
            </div>
            <div style={{
              width: isMobile ? "100%" : "50%",
              overflowY: "auto",
              display: "flex", flexDirection: "column", gap: "10px",
              maxHeight: isMobile ? "none" : PANEL_HEIGHT,
              paddingRight: "2px",
            }}>
              {renderCards()}
            </div>
          </div>
        )}

        {/* CARDS */}
        {view === "cards" && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: "10px",
          }}>
            {renderCards()}
          </div>
        )}

        {/* MAP */}
        {view === "map" && (
          <div style={{
            borderRadius: "12px", overflow: "hidden",
            border: "1px solid #21262D",
            height: isMobile ? "500px" : PANEL_HEIGHT,
          }}>
            <NeedsMap needs={allNeeds} loading={loading} />
          </div>
        )}

      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes pinPulse { 0%{transform:scale(1);opacity:0.8} 100%{transform:scale(3.5);opacity:0} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}