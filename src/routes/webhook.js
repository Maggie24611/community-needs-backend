// src/routes/webhook.js
// GET  /webhook  — Meta verification handshake
// POST /webhook  — Incoming WhatsApp messages

import { Router } from "express";
import { getSession, setSession } from "../services/redis.js";
import { sendTextMessage } from "../services/whatsapp.js";
import { handleMessage } from "../bot/botFlow.js";
import { processReport } from "../services/reportPipeline.js";
import { env } from "../config/env.js";

const router = Router();

// ─── GET /webhook — Meta verification ────────────────────────────────────────
router.get("/", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("Meta verification — mode:", mode, "token:", token);

  if (mode === "subscribe" && token === env.WA_VERIFY_TOKEN) {
    console.log("✅  Webhook verified by Meta");
    return res.status(200).send(challenge);
  }

  console.warn("⚠️  Webhook verification failed");
  return res.status(403).send("Forbidden");
});

// ─── POST /webhook — Incoming messages ───────────────────────────────────────
router.post("/", async (req, res) => {
  // Acknowledge immediately — Meta retries if no 200 within 20s
  res.status(200).json({ status: "ok" });

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value    = change.value;
        const messages = value.messages ?? [];
        const contacts = value.contacts ?? [];

        for (const message of messages) {
          if (message.type !== "text") continue;

          const userPhone    = message.from;
          const incomingText = message.text.body.trim();
          const contactName  = contacts[0]?.profile?.name ?? "User";

          console.log(`📩  [${userPhone}] ${contactName}: "${incomingText}"`);

          // ── Load session ────────────────────────────────────────────────
          const sessionState = await getSession(userPhone);

          // ── Bot flow ────────────────────────────────────────────────────
          const { reply, newSessionState, reportPayload } = await handleMessage(
            userPhone,
            incomingText,
            sessionState
          );

          // ── Save session ────────────────────────────────────────────────
          await setSession(userPhone, newSessionState);

          // ── Send reply ──────────────────────────────────────────────────
          if (reply) {
            await sendTextMessage(userPhone, reply);
          }

          // ── Process completed report ────────────────────────────────────
          if (reportPayload && reportPayload.rawText) {
            console.log(`📋  Processing report for ${userPhone}...`);
            try {
              await processReport({
                userPhone:    reportPayload.userPhone ?? userPhone,
                rawText:      reportPayload.rawText,
                consented:    reportPayload.consentGiven ?? false,
                contactName,
              });
              console.log(`✅  Report processed for ${userPhone}`);
            } catch (pipelineErr) {
              console.error(`❌  Pipeline error for ${userPhone}:`, pipelineErr.message);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("❌  Webhook processing error:", err);
  }
});

export default router;