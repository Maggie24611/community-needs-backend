import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useVolunteers } from "../../hooks/useVolunteers";

export default function DispatchModal({ need, onClose, onSuccess }) {
    const { volunteers, loading } = useVolunteers(need?.ward, need?.category);
    const [selected, setSelected] = useState(null);
    const [dispatching, setDispatching] = useState(false);
    const [error, setError] = useState(null);

    async function handleDispatch() {
        if (!selected) return;
        setDispatching(true);
        setError(null);

        try {
            const { error } = await supabase
                .from('needs')
                .update({
                    status: 'in_progress',
                    assigned_volunteer: selected.id || selected.name,
                })
                .eq('reference_id', need.reference_id || need.id);

            if (error) throw error;

            onSuccess?.({
                need,
                volunteer: selected,
            });
            onClose();
        } catch (err) {
            console.error('Dispatch error:', err.message);
            setError('Failed to dispatch. Please try again.');
        } finally {
            setDispatching(false);
        }
    }

    if (!need) return null;

    const level = need.urgency_level || need.urgency || 'Medium';
    const accentColor = level === 'Critical' ? '#F85149'
        : level === 'High' ? '#E3B341' : '#3FB950';

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.7)",
                    backdropFilter: "blur(4px)",
                    animation: "fadeIn 0.15s ease-out",
                }}
            />

            {/* Modal */}
            <div style={{
                position: "fixed", zIndex: 1001,
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(520px, 95vw)",
                background: "#161B22",
                border: "1px solid #21262D",
                borderRadius: "16px",
                overflow: "hidden",
                animation: "slideUp 0.2s ease-out",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            }}>

                {/* Header */}
                <div style={{
                    padding: "16px 20px",
                    borderBottom: "1px solid #21262D",
                    display: "flex", alignItems: "flex-start",
                    justifyContent: "space-between", gap: "12px",
                }}>
                    <div>
                        <div style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            marginBottom: "4px",
                        }}>
                            <div style={{ width: "4px", height: "16px", background: accentColor, borderRadius: "2px" }} />
                            <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3", margin: 0 }}>
                                Dispatch Volunteer
                            </h2>
                        </div>
                        <p style={{ fontSize: "11px", color: "#7D8590", margin: 0 }}>
                            {need.ward} · {need.category} · {need.id || need.reference_id}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent", border: "none",
                            color: "#7D8590", cursor: "pointer",
                            fontSize: "18px", lineHeight: 1,
                            padding: "2px 6px", borderRadius: "6px",
                        }}
                    >×</button>
                </div>

                {/* Need summary */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid #21262D", background: "#0D1117" }}>
                    <p style={{ fontSize: "12px", color: "#8B949E", margin: 0, lineHeight: 1.5 }}>
                        {need.ai_summary || need.summary || need.title}
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
                        <span style={{
                            fontSize: "10px", padding: "2px 8px", borderRadius: "6px",
                            background: accentColor + "22", color: accentColor,
                            border: `1px solid ${accentColor}44`,
                        }}>{level}</span>
                        {need.affected_count && (
                            <span style={{ fontSize: "10px", color: "#7D8590" }}>
                                👥 {need.affected_count} affected
                            </span>
                        )}
                        <span style={{ fontSize: "10px", color: "#7D8590" }}>
                            Score: {need.urgency_score}
                        </span>
                    </div>
                </div>

                {/* Volunteer list */}
                <div style={{ padding: "14px 20px" }}>
                    <p style={{
                        fontSize: "11px", fontWeight: 600, color: "#7D8590",
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        margin: "0 0 10px",
                    }}>
                        Available volunteers in {need.ward}
                    </p>

                    {loading ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {[...Array(3)].map((_, i) => (
                                <div key={i} style={{
                                    height: "56px", background: "#21262D",
                                    borderRadius: "10px", animation: "pulse 1.5s infinite",
                                }} />
                            ))}
                        </div>
                    ) : volunteers.length === 0 ? (
                        <div style={{
                            padding: "20px", textAlign: "center",
                            background: "#0D1117", borderRadius: "10px",
                            border: "1px solid #21262D",
                        }}>
                            <p style={{ fontSize: "13px", color: "#7D8590", margin: "0 0 4px" }}>
                                No volunteers found in {need.ward}
                            </p>
                            <p style={{ fontSize: "11px", color: "#484F58", margin: 0 }}>
                                Try dispatching to a nearby ward
                            </p>
                        </div>
                    ) : (
                        <div style={{
                            display: "flex", flexDirection: "column", gap: "8px",
                            maxHeight: "240px", overflowY: "auto",
                        }}>
                            {volunteers.map((vol, i) => {
                                const isSelected = selected?.id === vol.id || selected?.name === vol.name;
                                const cats = Array.isArray(vol.categories)
                                    ? vol.categories
                                    : (vol.categories || '').split(',').map(c => c.trim()).filter(Boolean);

                                return (
                                    <div
                                        key={vol.id || i}
                                        onClick={() => setSelected(vol)}
                                        style={{
                                            padding: "12px 14px",
                                            background: isSelected ? "#58A6FF1A" : "#0D1117",
                                            border: `1px solid ${isSelected ? "#58A6FF" : "#21262D"}`,
                                            borderRadius: "10px",
                                            cursor: "pointer",
                                            transition: "all 0.15s",
                                            display: "flex", alignItems: "center",
                                            justifyContent: "space-between", gap: "12px",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: "32px", height: "32px", borderRadius: "50%",
                                                background: isSelected ? "#58A6FF22" : "#21262D",
                                                border: `1px solid ${isSelected ? "#58A6FF44" : "#30363D"}`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "12px", fontWeight: 700,
                                                color: isSelected ? "#58A6FF" : "#7D8590",
                                                flexShrink: 0,
                                            }}>
                                                {(vol.name || vol.volunteer_name || 'V')[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: "12px", fontWeight: 600, color: "#E6EDF3", margin: 0 }}>
                                                    {vol.name || vol.volunteer_name || `Volunteer ${i + 1}`}
                                                </p>
                                                <p style={{ fontSize: "10px", color: "#7D8590", margin: "2px 0 0" }}>
                                                    {vol.ward} {vol.phone ? `· ${vol.phone}` : ''}
                                                </p>
                                                {cats.length > 0 && (
                                                    <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                                                        {cats.slice(0, 3).map((cat, j) => (
                                                            <span key={j} style={{
                                                                fontSize: "9px", padding: "1px 6px",
                                                                background: "#21262D", color: "#7D8590",
                                                                borderRadius: "4px", border: "1px solid #30363D",
                                                            }}>{cat}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div style={{
                                                width: "18px", height: "18px", borderRadius: "50%",
                                                background: "#58A6FF", flexShrink: 0,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: "10px", color: "#0D1117", fontWeight: 700,
                                            }}>✓</div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        margin: "0 20px",
                        padding: "8px 12px",
                        background: "#1C0A09", border: "1px solid #6E2320",
                        borderRadius: "8px", fontSize: "11px", color: "#F85149",
                    }}>⚠ {error}</div>
                )}

                {/* Footer */}
                <div style={{
                    padding: "14px 20px",
                    borderTop: "1px solid #21262D",
                    display: "flex", gap: "10px", justifyContent: "flex-end",
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: "8px 18px", fontSize: "12px", fontWeight: 600,
                            background: "transparent", border: "1px solid #21262D",
                            borderRadius: "8px", color: "#7D8590", cursor: "pointer",
                        }}
                    >Cancel</button>
                    <button
                        onClick={handleDispatch}
                        disabled={!selected || dispatching}
                        style={{
                            padding: "8px 18px", fontSize: "12px", fontWeight: 600,
                            background: selected && !dispatching ? "#58A6FF" : "#21262D",
                            border: "none", borderRadius: "8px",
                            color: selected && !dispatching ? "#0D1117" : "#484F58",
                            cursor: !selected || dispatching ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: "8px",
                            transition: "all 0.15s",
                        }}
                    >
                        {dispatching && (
                            <span style={{
                                width: "12px", height: "12px",
                                border: "2px solid #0D111722",
                                borderTop: "2px solid #0D1117",
                                borderRadius: "50%", display: "inline-block",
                                animation: "spin 0.8s linear infinite",
                            }} />
                        )}
                        {dispatching ? "Dispatching..." : selected ? `Dispatch to ${selected.name || 'volunteer'}` : "Select a volunteer"}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -45%); } to { opacity: 1; transform: translate(-50%, -50%); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
        </>
    );
}