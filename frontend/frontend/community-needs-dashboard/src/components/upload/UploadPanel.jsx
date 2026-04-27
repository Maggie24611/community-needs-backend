import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL ||
  'https://sahyog-backend-404307478076.asia-south1.run.app';

export default function UploadPanel() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [ngoName, setNgoName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [statusType, setStatusType] = useState(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setProgress(20);
    setUploadStatus('Uploading to server...');
    setStatusType('loading');

    const formData = new FormData();
    formData.append('file', file);
    if (ngoName.trim()) formData.append('ngo_name', ngoName.trim());

    try {
      setProgress(50);
      setUploadStatus('Processing rows...');

      const res = await fetch(
        `${API_BASE}/api/historical-data/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Upload failed');

      setProgress(100);
      const count = data.processed || data.records_added || data.count;
      setUploadStatus(count
        ? `${count} records added to knowledge base`
        : 'Upload successful — data added to knowledge base'
      );
      setStatusType('success');
      setFile(null);
      setNgoName('');
    } catch (err) {
      console.error('Upload error:', err);
      setProgress(0);
      setUploadStatus('Upload failed — ' + err.message);
      setStatusType('error');
    } finally {
      setUploading(false);
    }
  }

  const statusStyle = {
    loading: { bg: "#161B22", border: "#21262D", color: "#7D8590" },
    success: { bg: "#091D0E", border: "#1A4D24", color: "#3FB950" },
    error: { bg: "#1C0A09", border: "#6E2320", color: "#F85149" },
  };

  const progressColor = statusType === 'error' ? "#F85149"
    : statusType === 'success' ? "#3FB950" : "#58A6FF";

  return (
    <div style={{ borderBottom: "1px solid #21262D" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", padding: "12px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "4px", height: "16px", background: "#E3B341", borderRadius: "2px" }} />
          <span style={{ fontSize: "13px", fontWeight: 700, color: "#E6EDF3" }}>
            Upload historical NGO data
          </span>
        </div>
        <span style={{ fontSize: "11px", color: "#7D8590" }}>
          {open ? '▲ collapse' : '▼ expand'}
        </span>
      </button>

      {open && (
        <div style={{ padding: "0 24px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>

          <input
            type="text"
            placeholder="NGO name (optional)"
            value={ngoName}
            onChange={e => setNgoName(e.target.value)}
            style={{
              background: "#0D1117", border: "1px solid #21262D",
              borderRadius: "8px", padding: "8px 12px",
              fontSize: "12px", color: "#E6EDF3", outline: "none",
              maxWidth: "300px",
            }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <label style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "#161B22", border: `1px solid ${file ? "#6E4F15" : "#21262D"}`,
              borderRadius: "10px", padding: "10px 16px",
              cursor: "pointer", flex: 1, minWidth: "220px",
              transition: "border-color 0.15s",
            }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "8px",
                background: "#191108", border: "1px solid #6E4F15",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, color: "#E3B341", fontSize: "14px",
              }}>↑</div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#E6EDF3", margin: 0 }}>
                  {file ? file.name : 'Choose CSV file'}
                </p>
                <p style={{ fontSize: "11px", color: "#7D8590", margin: "2px 0 0" }}>
                  {file ? `${(file.size / 1024).toFixed(1)} KB ready` : 'Click to browse'}
                </p>
              </div>
              <input
                type="file" accept=".csv" style={{ display: "none" }}
                onChange={e => {
                  setFile(e.target.files[0] || null);
                  setUploadStatus(null);
                  setStatusType(null);
                  setProgress(0);
                }}
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={{
                padding: "10px 20px", fontSize: "12px", fontWeight: 600,
                borderRadius: "10px",
                cursor: !file || uploading ? "not-allowed" : "pointer",
                opacity: !file || uploading ? 0.5 : 1,
                background: "#191108", border: "1px solid #6E4F15",
                color: "#E3B341",
                display: "flex", alignItems: "center", gap: "8px",
                transition: "all 0.15s",
              }}
            >
              {uploading && (
                <span style={{
                  width: "12px", height: "12px",
                  border: "2px solid #6E4F15", borderTop: "2px solid #E3B341",
                  borderRadius: "50%", display: "inline-block",
                  animation: "spin 0.8s linear infinite",
                }} />
              )}
              {uploading ? 'Uploading...' : 'Upload and analyse'}
            </button>
          </div>

          {/* Progress bar */}
          {(uploading || statusType === 'success') && (
            <div>
              <div style={{
                height: "4px", background: "#21262D",
                borderRadius: "99px", overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${progress}%`,
                  background: progressColor,
                  borderRadius: "99px",
                  transition: "width 0.4s ease",
                }} />
              </div>
              <div style={{
                display: "flex", justifyContent: "space-between",
                marginTop: "4px",
              }}>
                <span style={{ fontSize: "10px", color: "#7D8590" }}>
                  {uploadStatus}
                </span>
                <span style={{ fontSize: "10px", color: progressColor, fontFamily: "monospace" }}>
                  {progress}%
                </span>
              </div>
            </div>
          )}

          {/* Error state */}
          {statusType === 'error' && (
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 12px", borderRadius: "8px",
              fontSize: "12px", fontWeight: 500,
              background: statusStyle.error.bg,
              border: `1px solid ${statusStyle.error.border}`,
              color: statusStyle.error.color,
            }}>
              ⚠ {uploadStatus}
            </div>
          )}

          <p style={{ fontSize: "11px", color: "#484F58", lineHeight: 1.6, margin: 0 }}>
            Accepted: survey reports, field notes, health records, drive outcomes as CSV.
            Each row: <span style={{ color: "#7D8590" }}>date, location/ward, description</span>.
          </p>
        </div>
      )}
    </div>
  );
}