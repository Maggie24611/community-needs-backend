// src/routes/webhook.js
// GET  /webhook  — Meta verification handshake
// POST /webhook  — Incoming WhatsApp messages
// Day 8: Added structured logging for every step

import { Router } from "express";
import { getSession, setSession } from "../services/redis.js";
import { sendTextMessage } from "../services/whatsapp.js";
import { handleMessage } from "../bot/botFlow.js";
import { processReport } from "../services/reportPipeline.js";
import { env } from "../config/env.js";

const router = Router();

// ─── Structured logger ────────────────────────────────────────────────────────
function log(level, event, data = {}) {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    event,
    ...data,
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

// ─── GET /webhook — Meta verification ────────────────────────────────────────
router.get("/", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  log("info", "webhook.verify.attempt", { mode, token_match: token === env.WA_VERIFY_TOKEN });

  if (mode === "subscribe" && token === env.WA_VERIFY_TOKEN) {
    log("info", "webhook.verify.success");
    return res.status(200).send(challenge);
  }

  log("warn", "webhook.verify.failed", { mode, token });
  return res.status(403).send("Forbidden");
});

// ─── POST /webhook — Incoming messages ───────────────────────────────────────
router.post("/", async (req, res) => {
  // Acknowledge immediately — Meta retries if no 200 within 20s
  res.status(200).json({ status: "ok" });

  try {
    const body = req.body;

    if (body.object !== "whatsapp_business_account") {
      log("warn", "webhook.unknown_object", { object: body.object });
      return;
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;

        const value    = change.value;
        const messages = value.messages ?? [];
        const contacts = value.contacts ?? [];

        for (const message of messages) {
          // Handle non-text messages gracefully
          if (message.type !== "text") {
            log("info", "webhook.message.ignored", {
              phone:   message.from,
              type:    message.type,
              reason:  "non-text message type"
            });
            continue;
          }

          const userPhone    = message.from;
          const incomingText = message.text?.body?.trim() ?? "";
          const contactName  = contacts[0]?.profile?.name ?? "User";
          const messageId    = message.id;

          // Guard against empty messages
          if (!incomingText) {
            log("warn", "webhook.message.empty", { phone: userPhone, message_id: messageId });
            continue;
          }

          log("info", "webhook.message.received", {
            phone:      userPhone,
            name:       contactName,
            message_id: messageId,
            text:       incomingText.substring(0, 50), // truncate for logs
            length:     incomingText.length,
          });

          // ── Load session ──────────────────────────────────────────────
          let sessionState = {};
          try {
            sessionState = await getSession(userPhone);
            log("info", "webhook.session.loaded", {
              phone: userPhone,
              step:  sessionState?.step ?? "new",
            });
          } catch (sessionErr) {
            log("warn", "webhook.session.load_failed", {
              phone: userPhone,
              error: sessionErr.message,
            });
          }

          // ── Bot flow ──────────────────────────────────────────────────
          let reply, newSessionState, reportPayload;
          try {
            ({ reply, newSessionState, reportPayload } = await handleMessage(
              userPhone,
              incomingText,
              sessionState
            ));
            log("info", "webhook.bot.response", {
              phone:    userPhone,
              step:     newSessionState?.step,
              has_reply: !!reply,
              has_report: !!reportPayload,
            });
          } catch (botErr) {
            log("error", "webhook.bot.error", { phone: userPhone, error: botErr.message });
            continue;
          }

          // ── Save session ──────────────────────────────────────────────
          try {
            await setSession(userPhone, newSessionState);
          } catch (sessionErr) {
            log("warn", "webhook.session.save_failed", {
              phone: userPhone,
              error: sessionErr.message,
            });
          }

          // ── Send reply ────────────────────────────────────────────────
          if (reply) {
            try {
              await sendTextMessage(userPhone, reply);
              log("info", "webhook.reply.sent", {
                phone:  userPhone,
                length: reply.length,
              });
            } catch (sendErr) {
              log("error", "webhook.reply.failed", {
                phone: userPhone,
                error: sendErr.message,
              });
            }
          }

          // ── Process completed report ──────────────────────────────────
          if (reportPayload && reportPayload.rawText) {
            log("info", "webhook.pipeline.start", {
              phone:      userPhone,
              ref_id:     reportPayload.referenceId,
              category:   reportPayload.category,
              urgency:    reportPayload.urgencyCode,
              consented:  reportPayload.consentGiven,
            });

            try {
              const result = await processReport({
                userPhone:   reportPayload.userPhone ?? userPhone,
                rawText:     reportPayload.rawText,
                consented:   reportPayload.consentGiven ?? false,
                contactName,
              });

              log("info", "webhook.pipeline.complete", {
                phone:             userPhone,
                need_id:           result?.need?.id,
                ref_id:            result?.need?.reference_id,
                volunteers_queued: result?.volunteersQueued,
                is_duplicate:      result?.isDuplicate,
              });
            } catch (pipelineErr) {
              log("error", "webhook.pipeline.error", {
                phone: userPhone,
                error: pipelineErr.message,
              });
            }
          }
        }
      }
    }
  } catch (err) {
    log("error", "webhook.unhandled_error", { error: err.message, stack: err.stack });
  }
});

export default router;