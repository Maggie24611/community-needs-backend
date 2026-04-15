// src/server.js
// Entry point — Express app with all routes.
// Day 4: Added /api/recommendations and /api/historical-data/upload

import "./config/env.js";
import express    from "express";
import multer     from "multer";
import { parse }  from "csv-parse/sync";
import { env }    from "./config/env.js";
import webhookRouter from "./routes/webhook.js";
import { runAllocationAgent } from "./agents/allocationAgents.js";
import { supabase }           from "./services/supabase.js";
import { generateEmbedding }  from "./services/embedding.js";
import { classifyReport }     from "./services/gemini.js";

const app    = express();
const upload = multer({ storage: multer.memoryStorage() });

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
    service: "community-needs-backend",
    ts:      new Date().toISOString(),
  });
});

// ─── Gemini Allocation Agent ──────────────────────────────────────────────────
// GET /api/recommendations
// Calls Gemini to analyse needs + history + volunteers
// and returns prioritised ward deployment plan
app.get("/api/recommendations", async (_req, res) => {
  try {
    console.log("📡  GET /api/recommendations — running allocation agent...");
    const recommendations = await runAllocationAgent();
    res.json({ success: true, data: recommendations });
  } catch (err) {
    console.error("❌  Allocation agent error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── CSV Historical Data Upload ───────────────────────────────────────────────
// POST /api/historical-data/upload
// Accepts a CSV file, classifies each row using Gemini,
// generates embeddings, and inserts into historical_data table
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

      // Classify row using Gemini
      const structured = await classifyReport(
        `Extract NGO record fields from this data. Record: ${JSON.stringify(row)}`
      );

      // Generate embedding for similarity search
      const embedding = await generateEmbedding(rawContent);

      // Insert into historical_data table
      const { error } = await supabase
        .from("historical_data")
        .insert({
          source_ngo:      req.body.ngo_name || "Unknown",
          data_type:       structured.category ?? "OTHER",
          ward:            structured.location_text ?? null,
          category:        structured.category ?? "OTHER",
          date_recorded:   row.date || row.date_recorded || new Date().toISOString().split("T")[0],
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

// ─── 404 fallback ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
// Cloud Run uses PORT 8080 by default
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀  Server running on port ${PORT} [${env.NODE_ENV}]`);
});

export default app;