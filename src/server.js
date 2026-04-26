// src/server.js
// Express app entry point.
// Groq llama-3.3-70b-versatile for all AI calls.
// Body parsing: express.json() for all routes including webhook.
// CORS: enabled for Vercel dashboard.

import "./config/env.js";
import express   from "express";
import cors      from "cors";
import multer    from "multer";
import { parse } from "csv-parse/sync";
import { env }   from "./config/env.js";
import webhookRouter          from "./routes/webhook.js";
import { runAllocationAgent } from "./agents/allocationAgent.js";
import { supabase }           from "./services/supabase.js";
import { generateEmbedding }  from "./services/embedding.js";
import { classifyReport }     from "./services/groq.js";
import { startReportWorker }  from "./queues/worker.js";

startReportWorker();

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

// ─── Allowed values ───────────────────────────────────────────────────────────
const VALID_DATA_TYPES = ["survey", "field_report", "health_record", "drive_outcome", "census", "government_data"];
const VALID_CATEGORIES = ["Food & water", "Medical", "Shelter", "Education", "Safety", "Environment", "Sanitation", "Other"];

// Map Groq classification categories to historical_data allowed categories
function mapCategory(raw) {
  if (!raw) return "Other";
  const r = raw.toLowerCase();
  if (r.includes("food") || r.includes("water"))     return "Food & water";
  if (r.includes("medical") || r.includes("health")) return "Medical";
  if (r.includes("shelter"))                         return "Shelter";
  if (r.includes("education"))                       return "Education";
  if (r.includes("safety"))                          return "Safety";
  if (r.includes("environment"))                     return "Environment";
  if (r.includes("sanitation"))                      return "Sanitation";
  return "Other";
}

// Map data_type from CSV row or default to field_report
function mapDataType(raw) {
  if (!raw) return "field_report";
  const r = raw.toLowerCase().replace(/\s+/g, "_");
  if (VALID_DATA_TYPES.includes(r))                    return r;
  if (r.includes("survey"))                            return "survey";
  if (r.includes("health"))                            return "health_record";
  if (r.includes("census"))                            return "census";
  if (r.includes("government") || r.includes("govt")) return "government_data";
  if (r.includes("drive"))                             return "drive_outcome";
  return "field_report";
}

// Validate a single CSV row has meaningful content
function validateRow(row, rowIndex) {
  const values = Object.values(row).filter(v => v && String(v).trim().length > 0);
  if (values.length === 0) return `Row ${rowIndex}: empty row`;
  const rawContent = Object.values(row).join(" ").trim();
  if (rawContent.length < 5) return `Row ${rowIndex}: insufficient content`;
  return null;
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "https://sahyog-dashboard.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  methods:      ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.options("*", cors());

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

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

// ─── Alias for frontend ───────────────────────────────────────────────────────
app.get("/recommendations", async (_req, res) => {
  try {
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

  const filename = req.file.originalname?.toLowerCase() ?? "";
  if (!filename.endsWith(".csv")) {
    return res.status(400).json({ success: false, error: "Only CSV files are accepted" });
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

  if (!rows || rows.length === 0) {
    return res.status(400).json({ success: false, error: "CSV file is empty" });
  }

  const columns = Object.keys(rows[0]).map(c => c.toLowerCase());
  if (columns.length === 0) {
    return res.status(400).json({ success: false, error: "CSV has no columns" });
  }

  console.log(`📂  Processing ${rows.length} CSV rows, columns: ${columns.join(", ")}`);

  let processed = 0;
  const errors  = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const validationError = validateRow(row, i + 1);
    if (validationError) {
      skipped.push(validationError);
      continue;
    }

    try {
      const rawContent = Object.values(row).join(" ").trim();

      const structured = await classifyReport(
        `Extract NGO record info from: ${JSON.stringify(row)}`
      );

      const embedding = await generateEmbedding(rawContent);

      const category  = mapCategory(structured.category || row.category);
      const data_type = mapDataType(row.data_type || row.type || "");
      const ward      = structured.location_text || row.ward || row.location || null;
      const date      = row.date || row.date_recorded || new Date().toISOString().split("T")[0];

      const parsedDate = new Date(date);
      const finalDate  = isNaN(parsedDate.getTime())
        ? new Date().toISOString().split("T")[0]
        : date;

      const { error } = await supabase
        .from("historical_data")
        .insert({
          source_ngo:      req.body.ngo_name || "Unknown",
          data_type,
          ward,
          category,
          date_recorded:   finalDate,
          summary:         structured.summary ?? rawContent.substring(0, 200),
          raw_content:     rawContent,
          structured_json: structured,
          embedding,
        });

      if (error) {
        console.warn(`⚠️  Row ${i + 1} insert failed:`, error.message);
        errors.push({ row: i + 1, error: error.message });
      } else {
        processed++;
      }
    } catch (err) {
      console.warn(`⚠️  Row ${i + 1} error:`, err.message);
      errors.push({ row: i + 1, error: err.message });
    }
  }

  res.json({
    success:   true,
    processed,
    total:     rows.length,
    skipped:   skipped.length > 0 ? skipped : undefined,
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