// src/middleware/verifyWhatsApp.js
// Meta sends X-Hub-Signature-256: sha256=<hmac> on every webhook POST.
// We verify it before parsing the body. Express must expose raw body for this.

import crypto from "crypto";
import { env } from "../config/env.js";

/**
 * Middleware: verifies the HMAC-SHA256 signature from Meta.
 * Must be applied BEFORE express.json() on the webhook route —
 * we use express.raw() on that route instead so rawBody is available here.
 */
export function verifyWhatsAppSignature(req, res, next) {
  const signature = req.headers["x-hub-signature-256"];

  if (!signature) {
    console.warn("⚠️  Webhook request missing X-Hub-Signature-256 header");
    return res.status(401).json({ error: "Missing signature" });
  }

  const rawBody = req.body; // Buffer (because we use express.raw on this route)

  const expectedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", env.WA_APP_SECRET)
      .update(rawBody)
      .digest("hex");

  // Constant-time comparison to prevent timing attacks
  const sigBuffer      = Buffer.from(signature,         "utf8");
  const expectedBuffer = Buffer.from(expectedSignature, "utf8");

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    console.warn("⚠️  Webhook signature mismatch — possible spoofed request");
    return res.status(403).json({ error: "Invalid signature" });
  }

  // Parse raw body to JSON for downstream handlers
  try {
    req.body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  next();
}
