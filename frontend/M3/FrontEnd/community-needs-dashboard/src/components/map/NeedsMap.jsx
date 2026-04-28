import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const URGENCY_COLOR = {
  Critical: "#E24B4A",
  High: "#E3B341",
  Medium: "#3FB950",
};

function createPin(color, isNew = false) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
        ${isNew ? `<div style="position:absolute;width:22px;height:22px;border-radius:50%;background:${color}44;animation:pinPulse 1.5s ease-out infinite;"></div>` : ''}
        <div style="width:14px;height:14px;background:${color};border:2.5px solid rgba(255,255,255,0.5);border-radius:50%;box-shadow:0 0 10px ${color}cc,0 0 20px ${color}44;position:relative;z-index:1;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

const WARD_COORDS = {
  "Worli": [19.0178, 72.8178],
  "Dharavi": [19.0422, 72.8570],
  "Dadar": [19.0178, 72.8478],
  "Malad": [19.1859, 72.8493],
  "Malad East": [19.1859, 72.8693],
  "Malad West": [19.1859, 72.8293],
  "Bandra": [19.0544, 72.8557],
  "Bandra West": [19.0596, 72.8295],
  "Bandra East": [19.0544, 72.8557],
  "Kurla": [19.0728, 72.8826],
  "Govandi": [19.0472, 72.9186],
  "Andheri": [19.1136, 72.8347],
  "Andheri West": [19.1136, 72.8347],
  "Andheri East": [19.1197, 72.8694],
  "Colaba": [18.9067, 72.8147],
  "Chembur": [19.0522, 72.8994],
  "Thane": [19.2183, 72.9781],
  "Borivali": [19.2307, 72.8567],
  "Kandivali": [19.2094, 72.8526],
  "Jogeshwari": [19.1369, 72.8493],
  "Ghatkopar": [19.0858, 72.9089],
  "Mulund": [19.1724, 72.9560],
  "Powai": [19.1197, 72.9051],
  "Vikhroli": [19.1041, 72.9264],
  "Khar": [19.0728, 72.8347],
  "Santacruz": [19.0822, 72.8397],
  "Vile Parle": [19.0990, 72.8450],
  "Matunga": [19.0275, 72.8647],
  "Sion": [19.0390, 72.8619],
  "Wadala": [19.0176, 72.8562],
  "Parel": [18.9952, 72.8402],
};

function getCoords(need, cache) {
  const id = need.reference_id || need.id;
  if (cache[id]) return cache[id];

  const lat = parseFloat(need.lat);
  const lng = parseFloat(need.lng);
  let coords;

  if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    coords = [lat, lng];
  } else {
    const base = WARD_COORDS[need.ward?.trim()];
    coords = base
      ? [base[0] + (Math.random() - 0.5) * 0.015, base[1] + (Math.random() - 0.5) * 0.015]
      : [19.0760 + (Math.random() - 0.5) * 0.04, 72.8777 + (Math.random() - 0.5) * 0.04];
  }

  cache[id] = coords;
  return coords;
}

function buildPopup(need, color) {
  const level = need.urgency_level || need.urgency || "Medium";
  const statusLabel = need.status === 'active' ? 'Active'
    : need.status === 'in_progress' ? 'In Progress'
      : need.status || 'Active';
  const statusColor = need.status === 'active' ? '#3FB950'
    : need.status === 'in_progress' ? '#E3B341' : '#7D8590';

  return `
    <div style="font-family:'DM Sans',sans-serif;min-width:230px;max-width:280px;">
      <div style="background:${color}18;border-bottom:1px solid ${color}33;padding:10px 14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="color:${color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">${level}</span>
          <span style="font-size:10px;color:#7D8590;font-family:monospace;">${need.id || need.reference_id}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#E6EDF3;margin-top:4px;line-height:1.3;">
          ${need.title || (need.ai_summary || need.summary || '').slice(0, 60) || 'Community Need'}
        </div>
      </div>
      <div style="padding:10px 14px;display:flex;flex-direction:column;gap:6px;">
        <div style="font-size:11px;color:#7D8590;">
          📍 <strong style="color:#E6EDF3;">${need.ward}</strong> · ${need.category}
        </div>
        ${need.affected_count ? `<div style="font-size:11px;color:#7D8590;">👥 <strong style="color:#E6EDF3;">${need.affected_count}</strong> people affected</div>` : ''}
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:10px;padding:2px 7px;border-radius:5px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44;">${statusLabel}</span>
          <span style="font-size:10px;color:#7D8590;">Score: <strong style="color:${color};">${need.urgency_score}</strong></span>
          <span style="font-size:10px;color:#7D8590;">${need.report_count} reports</span>
        </div>
        ${(need.ai_summary || need.summary) ? `
          <p style="font-size:11px;color:#8B949E;line-height:1.5;margin:4px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${need.ai_summary || need.summary}
          </p>` : ''}
      </div>
    </div>
  `;
}

export default function NeedsMap({ needs, loading = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const coordsCacheRef = useRef({});
  const [mapReady, setMapReady] = useState(false);
  const [pinCount, setPinCount] = useState(0);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [19.0760, 72.8777],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { subdomains: "abcd", maxZoom: 19 }
    ).addTo(map);

    mapInstanceRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    const currentIds = new Set(needs.map(n => n.reference_id || n.id));

    Object.keys(markersRef.current).forEach(id => {
      if (!currentIds.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
        delete coordsCacheRef.current[id];
      }
    });

    needs.forEach(need => {
      const id = need.reference_id || need.id;
      if (markersRef.current[id]) return;

      const level = need.urgency_level || need.urgency || "Medium";
      const color = URGENCY_COLOR[level] ?? URGENCY_COLOR.Medium;
      const coords = getCoords(need, coordsCacheRef.current);

      const marker = L.marker(coords, {
        icon: createPin(color, need._isNew === true),
        zIndexOffset: level === 'Critical' ? 1000 : level === 'High' ? 500 : 0,
      }).addTo(map);

      marker.bindPopup(buildPopup(need, color), {
        className: "dark-popup", maxWidth: 300,
      });

      markersRef.current[id] = marker;
    });

    const allMarkers = Object.values(markersRef.current);
    if (allMarkers.length > 0) {
      const group = L.featureGroup(allMarkers);
      map.fitBounds(group.getBounds().pad(0.15), { animate: true, duration: 0.5 });
    }

    setPinCount(Object.keys(markersRef.current).length);
  }, [needs, mapReady]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={mapRef} style={{ width: "100%", height: "100%", minHeight: "300px" }} />

      {loading && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 1000,
          background: "rgba(13,17,23,0.75)",
          display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(2px)",
        }}>
          <div style={{
            background: "#161B22", border: "1px solid #21262D",
            borderRadius: "12px", padding: "14px 20px",
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <div style={{
              width: "16px", height: "16px",
              border: "2px solid #21262D", borderTop: "2px solid #58A6FF",
              borderRadius: "50%", animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: "12px", color: "#7D8590" }}>Updating map...</span>
          </div>
        </div>
      )}

      <div style={{
        position: "absolute", bottom: "32px", left: "12px", zIndex: 900,
        background: "rgba(22,27,34,0.95)", border: "1px solid #21262D",
        borderRadius: "10px", padding: "10px 14px",
        backdropFilter: "blur(8px)",
        display: "flex", flexDirection: "column", gap: "6px",
      }}>
        {Object.entries(URGENCY_COLOR).map(([level, color]) => (
          <div key={level} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "11px", height: "11px", borderRadius: "50%",
              background: color, boxShadow: `0 0 6px ${color}99`, flexShrink: 0,
            }} />
            <span style={{ fontSize: "11px", color: "#7D8590" }}>{level}</span>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #21262D", marginTop: "2px", paddingTop: "5px" }}>
          <span style={{ fontSize: "10px", color: "#484F58" }}>{pinCount} pins</span>
        </div>
      </div>
    </div>
  );
}