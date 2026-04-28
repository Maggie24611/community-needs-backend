import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

export default function HistoricalPanel() {
  const [stats, setStats] = useState({ total: 0, wards: 0, earliest: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    try {
      const { count } = await supabase
        .from('historical_data')
        .select('*', { count: 'exact', head: true });

      const { data: wardsData } = await supabase
        .from('historical_data')
        .select('ward');

      const { data: dateRange } = await supabase
        .from('historical_data')
        .select('date_recorded')
        .order('date_recorded', { ascending: true })
        .limit(1);

      setStats({
        total: count || 0,
        wards: new Set((wardsData || []).map(r => r.ward)).size,
        earliest: dateRange?.[0]?.date_recorded || null,
      });
    } catch (err) {
      console.error('Historical stats error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const metrics = [
    { label: "Records ingested", value: loading ? '—' : stats.total.toLocaleString(), color: "#58A6FF" },
    { label: "Wards covered",    value: loading ? '—' : stats.wards,                  color: "#3FB950" },
    { label: "Oldest record",    value: loading ? '—' : stats.earliest
        ? new Date(stats.earliest).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'N/A',
      color: "#E3B341"
    },
  ];

  return (
    <div style={{
      padding: "10px 24px",
      borderBottom: "1px solid #21262D",
      display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <div style={{ width: "4px", height: "16px", background: "#3FB950", borderRadius: "2px" }} />
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#E6EDF3", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Historical data
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {i > 0 && <div style={{ width: "1px", height: "16px", background: "#21262D" }} />}
            <span style={{ fontSize: "11px", color: "#7D8590" }}>{m.label}</span>
            <span style={{
              fontSize: "13px", fontWeight: 800, fontFamily: "monospace",
              color: m.color,
            }}>{m.value}</span>
          </div>
        ))}
      </div>

      {!loading && stats.total === 0 && (
        <span style={{ fontSize: "11px", color: "#484F58", fontStyle: "italic", marginLeft: "auto" }}>
          No historical data yet — upload a CSV to get started
        </span>
      )}
    </div>
  );
}