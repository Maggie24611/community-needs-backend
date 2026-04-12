// src/services/whatsapp.js
// Thin wrapper around the WhatsApp Cloud API messages endpoint.

import { env } from "../config/env.js";

const WA_API_URL = `https://graph.facebook.com/v19.0/${env.WA_PHONE_NUMBER_ID}/messages`;

const headers = {
  "Content-Type":  "application/json",
  "Authorization": `Bearer ${env.WA_ACCESS_TOKEN}`,
};

/**
 * Send a plain text message to a WhatsApp user.
 * @param {string} to   — recipient phone in E.164 format (digits only, no +)
 * @param {string} text — message body (max 4096 chars)
 */
export async function sendTextMessage(to, text) {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type:    "individual",
    to,
    type: "text",
    text: { preview_url: false, body: text },
  };

  const res = await fetch(WA_API_URL, {
    method:  "POST",
    headers,
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    console.error(`❌  WhatsApp send failed to ${to}:`, JSON.stringify(error));
    throw new Error(`WhatsApp API error: ${res.status}`);
  }

  const data = await res.json();
  console.log(`📤  Message sent to ${to} — message_id: ${data.messages?.[0]?.id}`);
  return data;
}

/**
 * Mark an incoming message as read (shows double blue ticks).
 * @param {string} messageId — the wamid from the incoming webhook
 */
export async function markMessageRead(messageId) {
  const payload = {
    messaging_product: "whatsapp",
    status:     "read",
    message_id: messageId,
  };

  const res = await fetch(WA_API_URL, {
    method:  "POST",
    headers,
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    console.warn(`⚠️  Could not mark message ${messageId} as read`);
  }
}
