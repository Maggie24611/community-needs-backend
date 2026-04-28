import { useState } from "react";
export default function PinModal({ onSuccess, onClose }) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);

    const AUTHORIZED_PINS = ['1234', '5678', '9999'];

    function handleSubmit() {
        if (AUTHORIZED_PINS.includes(pin.trim())) {
            onSuccess();
        } else {
            setError('Incorrect PIN. Try again.');
            setShaking(true);
            setPin('');
            setTimeout(() => setShaking(false), 500);
        }
    }

    function handleKey(e) {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') onClose();
    }

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: "fixed", inset: 0, zIndex: 2000,
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    animation: "fadeIn 0.15s ease-out",
                }}
            />

            {/* Modal */}
            <div style={{
                position: "fixed", zIndex: 2001,
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(380px, 92vw)",
                background: "#161B22",
                border: "1px solid #21262D",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
                animation: shaking
                    ? "shake 0.4s ease-out"
                    : "slideUp 0.2s ease-out",
            }}>

                {/* Header */}
                <div style={{
                    padding: "20px 24px 16px",
                    borderBottom: "1px solid #21262D",
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                            width: "36px", height: "36px", borderRadius: "10px",
                            background: "#58A6FF1A", border: "1px solid #58A6FF33",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "18px",
                        }}>🔒</div>
                        <div>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#E6EDF3" }}>
                                Coordinator Access
                            </div>
                            <div style={{ fontSize: "11px", color: "#7D8590", marginTop: "2px" }}>
                                Enter your PIN to continue
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: "transparent", border: "none",
                            color: "#7D8590", cursor: "pointer",
                            fontSize: "20px", lineHeight: 1,
                            padding: "2px 6px", borderRadius: "6px",
                            transition: "color 0.15s",
                        }}
                    >×</button>
                </div>

                {/* PIN dots display */}
                <div style={{ padding: "24px 24px 0" }}>
                    <div style={{
                        display: "flex", justifyContent: "center", gap: "12px",
                        marginBottom: "20px",
                    }}>
                        {[0, 1, 2, 3].map(i => (
                            <div key={i} style={{
                                width: "14px", height: "14px", borderRadius: "50%",
                                background: pin.length > i ? "#58A6FF" : "#21262D",
                                border: `2px solid ${pin.length > i ? "#58A6FF" : "#30363D"}`,
                                transition: "all 0.15s",
                                boxShadow: pin.length > i ? "0 0 8px #58A6FF66" : "none",
                            }} />
                        ))}
                    </div>

                    {/* Hidden input */}
                    <input
                        type="password"
                        value={pin}
                        onChange={e => {
                            setPin(e.target.value.slice(0, 4));
                            setError('');
                        }}
                        onKeyDown={handleKey}
                        maxLength={4}
                        autoFocus
                        style={{
                            width: "100%", padding: "12px 16px",
                            background: "#0D1117",
                            border: `1px solid ${error ? "#6E2320" : "#21262D"}`,
                            borderRadius: "10px", fontSize: "20px",
                            color: "#E6EDF3", outline: "none",
                            textAlign: "center", letterSpacing: "8px",
                            fontFamily: "monospace",
                            transition: "border-color 0.15s",
                        }}
                        placeholder="····"
                    />

                    {/* Error message */}
                    <div style={{
                        height: "20px", marginTop: "8px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                        {error && (
                            <span style={{ fontSize: "11px", color: "#F85149" }}>
                                ⚠ {error}
                            </span>
                        )}
                    </div>
                </div>

                {/* Numpad */}
                <div style={{ padding: "8px 24px 20px" }}>
                    <div style={{
                        display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "8px",
                    }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((num, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    if (num === '⌫') {
                                        setPin(p => p.slice(0, -1));
                                        setError('');
                                    } else if (num !== '' && pin.length < 4) {
                                        setPin(p => p + num);
                                        setError('');
                                    }
                                }}
                                style={{
                                    padding: "14px", fontSize: num === '⌫' ? "16px" : "18px",
                                    fontWeight: 600, borderRadius: "10px",
                                    background: num === '' ? "transparent" : "#0D1117",
                                    border: num === '' ? "none" : "1px solid #21262D",
                                    color: "#E6EDF3", cursor: num === '' ? "default" : "pointer",
                                    transition: "all 0.1s",
                                    fontFamily: "monospace",
                                }}
                            >{num}</button>
                        ))}
                    </div>
                </div>

                {/* Submit button */}
                <div style={{ padding: "0 24px 24px" }}>
                    <button
                        onClick={handleSubmit}
                        disabled={pin.length < 4}
                        style={{
                            width: "100%", padding: "12px",
                            fontSize: "13px", fontWeight: 700,
                            borderRadius: "10px", border: "none",
                            background: pin.length === 4 ? "#58A6FF" : "#21262D",
                            color: pin.length === 4 ? "#0D1117" : "#484F58",
                            cursor: pin.length === 4 ? "pointer" : "not-allowed",
                            transition: "all 0.2s",
                        }}
                    >
                        {pin.length === 4 ? "Unlock Dashboard →" : `Enter ${4 - pin.length} more digit${4 - pin.length !== 1 ? 's' : ''}`}
                    </button>
                </div>

            </div>

            <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        @keyframes shake {
          0%, 100% { transform: translate(-50%, -50%); }
          20% { transform: translate(-48%, -50%); }
          40% { transform: translate(-52%, -50%); }
          60% { transform: translate(-48%, -50%); }
          80% { transform: translate(-52%, -50%); }
        }
      `}</style>
        </>
    );
}