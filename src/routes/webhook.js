// src/routes/webhook.js
// GET  /webhook  — Meta's one-time verification handshake
// POST /webhook  — Incoming WhatsApp messages & status updates

import { Router } from "express";
import { env } from "../config/env.js";
import { verifyWhatsAppSignature } from "../middleware/verifyWhatsApp.js";
import { getSession, setSession } from "../services/redis.js";
import { sendTextMessage } from "../services/whatsapp.js";
import { handleMessage } from "../bot/botFlow.js";     // M4 owns this module
import { enqueueAlertJob } from "../queues/alertQueue.js";

const router = Router();

// ─── GET /webhook — Meta verification handshake ───────────────────────────────
// Meta sends hub.mode, hub.verify_token, hub.challenge as query params.
// We echo back hub.challenge only if verify_token matches.
router.get("/", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  console.log('Meta sent token:', req.query['hub.verify_token']);
  console.log('Expected token:', process.env.WHATSAPP_VERIFY_TOKEN);

  if (mode === "subscribe" && token === env.WA_VERIFY_TOKEN) {
    console.log("✅  WhatsApp webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  console.warn("⚠️  Webhook verification failed — token mismatch or wrong mode");
  return res.status(403).send("Forbidden");
});

// ─── POST /webhook — Incoming messages ────────────────────────────────────────
// express.raw() is applied at server level for this route (see server.js).
// verifyWhatsAppSignature middleware parses body to JSON after HMAC check.
router.post(
  "/",
  verifyWhatsAppSignature,
  async (req, res) => {
    // Acknowledge immediately — Meta retries if it doesn't get 200 within 20 s
    res.status(200).json({ status: "ok" });

    try {
      const body = req.body;

      // Guard: only process whatsapp_business_account events
      if (body.object !== "whatsapp_business_account") return;

      for (const entry of body.entry ?? []) {
        for (const change of entry.changes ?? []) {
          if (change.field !== "messages") continue;

          const value    = change.value;
          const messages = value.messages ?? [];
          const contacts = value.contacts ?? [];

          for (const message of messages) {
            // Only handle inbound text messages for now
            if (message.type !== "text") continue;

            const userPhone   = message.from;               // E.164 without +
            const incomingText = message.text.body.trim();
            const contactName  = contacts[0]?.profile?.name ?? "User";

            console.log(`📩  [${userPhone}] ${contactName}: "${incomingText}"`);

            // ── Load session from Redis ──────────────────────────────────────
            const sessionState = await getSession(userPhone);

            // ── Delegate to M4's bot flow ────────────────────────────────────
            // handleMessage is pure — takes state in, returns state + output
            const { reply, newSessionState, reportPayload } = await handleMessage(
              userPhone,
              incomingText,
              sessionState
            );

            // ── Persist updated session ──────────────────────────────────────
            await setSession(userPhone, newSessionState);

            // ── Send reply via WhatsApp ──────────────────────────────────────
            if (reply) {
              await sendTextMessage(userPhone, reply);
            }

            // ── If bot completed a report, enqueue for async processing ──────
            // reportPayload is non-null only when M4 signals report completion
            if (reportPayload) {
              await enqueueAlertJob({
                userPhone,
                contactName,
                reportPayload,
              });
              console.log(`📋  Report enqueued for ${userPhone}`);
            }
          }
        }
      }
    } catch (err) {
      // Error is caught here so Meta's 200 ACK (sent above) isn't affected.
      // Do NOT re-throw — Meta would retry and flood users.
      console.error("❌  Error processing webhook payload:", err);
    }
  }
);

export default router;
