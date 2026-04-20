// src/server.js
// Express app entry point.
// Groq llama-3.3-70b-versatile for all AI calls.

import "./config/env.js";
import express   from "express";
import multer    from "multer";
import { parse } from "csv-parse/sync";
import { env }   from "./config/env.js";
import webhookRouter          from "./routes/webhook.js";
import { runAllocationAgent } from "./agents/allocationAgent.js";
import { supabase }           from "./services/supabase.js";
import { generateEmbedding }  from "./services/embedding.js";
import { classifyReport }     from "./services/groq.js";

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Allowed values ───────────────────────────────────────────────────────────
const VALID_DATA_TYPES = ["survey", "field_report", "health_record", "drive_outcome", "census", "government_data"];
const VALID_CATEGORIES = ["Food & water", "Medical", "Shelter", "Education", "Safety", "Environment", "Sanitation", "Other"];

// Map Groq classification categories to historical_data allowed categories
function mapCategory(raw) {
  if (!raw) return "Other";
  const r = raw.toLowerCase();
  if (r.includes("food") || r.includes("water"))  return "Food & water";
  if (r.includes("medical") || r.includes("health")) return "Medical";
  if (r.includes("shelter"))   return "Shelter";
  if (r.includes("education")) return "Education";
  if (r.includes("safety"))    return "Safety";
  if (r.includes("environment")) return "Environment";
  if (r.includes("sanitation")) return "Sanitation";
  return "Other";
}

// Map data_type from CSV row or default to field_report
function mapDataType(raw) {
  if (!raw) return "field_report";
  const r = raw.toLowerCase().replace(/\s+/g, "_");
  if (VALID_DATA_TYPES.includes(r)) return r;
  if (r.includes("survey"))   return "survey";
  if (r.includes("health"))   return "health_record";
  if (r.includes("census"))   return "census";
  if (r.includes("government") || r.includes("govt")) return "government_data";
  if (r.includes("drive"))    return "drive_outcome";
  return "field_report";
}

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path === "/webhook" && req.method === "POST") {
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:  "ok",
    service: "sahyog-backend",
    ts:      new Date().toISOString(),
  });
});

// ─── Allocation Agent ─────────────────────────────────────────────────────────
app.get("/api/recommendations", async (_req, res) => {
  try {
    console.log("📡  GET /api/recommendations");
    const recommendations = await runAllocationAgent();
    res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error("❌  Agent error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CSV Historical Data Upload ───────────────────────────────────────────────
app.post("/api/historical-data/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  let rows;
  try {
    rows = parse(req.file.buffer, {
      columns:          true,
      skip_empty_lines: true,
      trim:             true,
    });
  } catch (err) {
    return res.status(400).json({ success: false, error: `CSV parse error: ${err.message}` });
  }

  console.log(`📂  Processing ${rows.length} CSV rows...`);
  let processed = 0;
  const errors  = [];

  for (const row of rows) {
    try {
      const rawContent = Object.values(row).join(" ");

      // Classify using Groq
      const structured = await classifyReport(
        `Extract NGO record info from: ${JSON.stringify(row)}`
      );

      // Generate embedding
      const embedding = await generateEmbedding(rawContent);

      // Map to allowed values
      const category  = mapCategory(structured.category || row.category);
      const data_type = mapDataType(row.data_type || row.type || "");
      const ward      = structured.location_text || row.ward || row.location || null;
      const date      = row.date || row.date_recorded || new Date().toISOString().split("T")[0];

      const { error } = await supabase
        .from("historical_data")
        .insert({
          source_ngo:      req.body.ngo_name || "Unknown",
          data_type,
          ward,
          category,
          date_recorded:   date,
          summary:         structured.summary ?? rawContent.substring(0, 200),
          raw_content:     rawContent,
          structured_json: structured,
          embedding,
        });

      if (error) {
        console.warn(`⚠️  Row insert failed:`, error.message);
        errors.push({ row: processed + 1, error: error.message });
      } else {
        processed++;
      }
    } catch (err) {
      console.warn(`⚠️  Row ${processed + 1} error:`, err.message);
      errors.push({ row: processed + 1, error: err.message });
    }
  }

  res.json({
    success:   true,
    processed,
    total:     rows.length,
    errors:    errors.length > 0 ? errors : undefined,
    message:   `${processed} of ${rows.length} records added to historical_data`,
  });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀  Server running on port ${PORT} [${env.NODE_ENV}]`);
});

export default app;