// src/server.js
// Entry point — assembles Express app, registers routes, starts listening.
// express.raw() is used on /webhook so HMAC verification can read raw bytes.

import "./config/env.js";          // Validates env vars — must be first import
import express from "express";
import { env } from "./config/env.js";
import webhookRouter from "./routes/webhook.js";

const app = express();

// ─── Body parsing ─────────────────────────────────────────────────────────────
// Global JSON parser for all routes EXCEPT /webhook.
// /webhook uses raw buffer so signature verification can hash the exact bytes
// that Meta signed. Order matters: specific route middleware before global.
app.use((req, res, next) => {
  if (req.path === "/webhook" && req.method === "POST") {
    // Keep as raw Buffer — verifyWhatsAppSignature will parse to JSON
    express.raw({ type: "application/json" })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/webhook", webhookRouter);

// Health check — Railway uses this to confirm the app is alive
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "community-needs-backend",
    ts: new Date().toISOString(),
  });
});

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`🚀  Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

export default app;
