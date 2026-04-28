import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const API_BASE = import.meta.env.VITE_API_URL ||
  'https://sahyog-backend-404307478076.asia-south1.run.app';

const CATEGORY_STYLE = {
  "Food & water": { bg: "#0D2137", color: "#58A6FF", border: "#1A4A6E" },
  "Medical": { bg: "#1C0A09", color: "#F85149", border: "#6E2320" },
  "Shelter": { bg: "#191108", color: "#E3B341", border: "#6E4F15" },
  "Education": { bg: "#1A0D2E", color: "#A78BFA", border: "#5B3F8A" },
  "Safety": { bg: "#1C1000", color: "#FB923C", border: "#7C3A1A" },
  "Environment": { bg: "#091D0E", color: "#3FB950", border: "#1A4D24" },
  "Sanitation": { bg: "#091A1A", color: "#2DD4BF", border: "#1A4D4A" },
  "Other": { bg: "#161B22", color: "#7D8590", border: "#30363D" },
};

const URGENCY_COLOR = {
  Critical: "#F85149",
  High: "#E3B341",
  Medium: "#3FB950",
};

function RecCard({ rec }) {
  const cat = CATEGORY_STYLE[rec.primary_issue] ?? CATEGORY_STYLE["Other"];
  const urgencyColor = URGENCY_COLOR[rec.urgency_level] ?? URGENCY_COLOR.Medium;

  return (
    <div style={{
      background: "#161B22",
      border: "1px solid #21262D",
      borderLeft: `3px solid ${urgencyColor}`,
      borderRadius: "12px",
      padding: "14px 16px",
      minWidth: "270px", maxWidth: "300px",
      flexShrink: 0,
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {rec.priority_rank && (
            <span style={{
              width: "20px", height: "20px", borderRadius: "50%",
              background: urgencyColor + "22", border: `1px solid ${urgencyColor}44`,
              color: urgencyColor, fontSize: "10px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>{rec.priority_rank}</span>
          )}
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E6EDF3" }}>
            {rec.ward_name || rec.ward}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{
            width: "7px", height: "7px", borderRadius: "50%",
            background: urgencyColor, boxShadow: `0 0 6px ${urgencyColor}99`,
          }} />
          <span style={{ fontSize: "10px", color: "#7D8590" }}>{rec.urgency_level}</span>
        </div>
      </div>

      <span style={{
        display: "inline-flex", alignSelf: "flex-start",
        padding: "2px 10px", fontSize: "11px", fontWeight: 600,
        borderRadius: "6px", border: `1px solid ${cat.border}`,
        background: cat.bg, color: cat.color,
      }}>{rec.primary_issue}</span>

      <p style={{
        fontSize: "11px", color: "#8B949E",
        lineHeight: 1.6, margin: 0,
        display: "-webkit-box", WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{rec.reasoning}</p>

      {rec.recommended_action && (
        <div style={{ paddingTop: "8px", borderTop: "1px solid #21262D" }}>
          <p style={{ fontSize: "11px", color: "#58A6FF", margin: 0, fontStyle: "italic" }}>
            → {rec.recommended_action}
          </p>
        </div>
      )}

      {rec.volunteer_gap && (
        <span style={{
          display: "inline-flex", alignSelf: "flex-start",
          padding: "2px 8px", fontSize: "10px", fontWeight: 600,
          borderRadius: "6px", background: "#1C0A09",
          border: "1px solid #6E2320", color: "#F85149",
        }}>⚠ Volunteers needed</span>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "#161B22", border: "1px solid #21262D",
      borderRadius: "12px", padding: "14px 16px",
      minWidth: "270px", maxWidth: "300px", flexShrink: 0,
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      {[100, 60, 80, 80, 60].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? "14px" : "11px",
          width: `${w}%`, background: "#21262D", borderRadius: "4px",
        }} />
      ))}
    </div>
  );
}

export default function RecommendationsPanel() {
  const [recs, setRecs] = useState([]);
  const [meta, setMeta] = useState({ weekStarting: null, wardCount: 0, generatedAt: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecs();

    const channel = supabase
      .channel('recs-changes')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'recommendations',
      }, (payload) => {
        console.log('🤖 New recommendations via Realtime');
        const r = payload.new.recommendations || [];
        setRecs(r);
        setMeta({
          weekStarting: payload.new.week_starting || null,
          wardCount: r.length,
          generatedAt: payload.new.generated_at,
        });
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  async function fetchRecs() {
    setLoading(true);
    console.log('Fetching recs from Supabase...');
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(1);

      console.log('Recs data:', data, 'Error:', error);

      if (error) throw error;
      if (data?.[0]) {
        const r = data[0].recommendations || [];
        console.log('Recommendations array:', r);
        setRecs(r);
        setMeta({
          weekStarting: data[0].week_starting || null,
          wardCount: r.length,
          generatedAt: data[0].generated_at,
        });
      } else {
        console.log('No recommendations found in database');
      }
    } catch (err) {
      console.error('Recs error:', err.message);
    } finally {
      setLoading(false);
    }
  }
  const formatWeek = (d) => d
    ? `Week of ${new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    : null;

  return (
    <div style={{ padding: "16px 24px", borderBottom: "1px solid #21262D" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: "10px", marginBottom: "12px", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "4px", height: "16px", background: "#58A6FF", borderRadius: "2px" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E6EDF3" }}>
            This week's priority wards
          </span>
        </div>

        <span style={{
          fontSize: "10px", fontWeight: 600, padding: "2px 8px",
          background: "#58A6FF1A", border: "1px solid #58A6FF33",
          color: "#58A6FF", borderRadius: "99px",
        }}>AI powered</span>

        {meta.weekStarting && (
          <span style={{
            fontSize: "10px", padding: "2px 8px",
            background: "#161B22", border: "1px solid #21262D",
            color: "#7D8590", borderRadius: "99px",
          }}>{formatWeek(meta.weekStarting)}</span>
        )}

        {meta.generatedAt && (
          <span style={{ fontSize: "10px", color: "#484F58" }}>
            Updated {new Date(meta.generatedAt).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short', year: 'numeric',
            })}
          </span>
        )}

        {!loading && meta.wardCount > 0 && (
          <span style={{
            fontSize: "11px", color: "#7D8590",
            marginLeft: "auto",
          }}>
            {meta.wardCount} wards flagged
          </span>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
        {loading ? (
          [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
        ) : recs.length > 0 ? (
          recs.slice(0, 5).map((rec, i) => (
            <RecCard key={rec.ward_name || rec.ward || i} rec={rec} />
          ))
        ) : (
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            background: "#161B22", border: "1px solid #21262D",
            borderRadius: "12px", padding: "14px 20px", width: "100%",
          }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "#58A6FF1A", border: "1px solid #58A6FF33",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: "16px",
            }}>✦</div>
            <div>
              <p style={{ fontSize: "13px", color: "#E6EDF3", fontWeight: 600, margin: 0 }}>
                AI recommendations loading
              </p>
              <p style={{ fontSize: "11px", color: "#7D8590", margin: "3px 0 0" }}>
                The Google ADK agent is analysing current needs and historical data. Check back soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}