// src/routes/webhook.js — WhatsApp webhook endpoint
// Receives incoming messages, does quick validation, then enqueues for async processing.

import { Router } from 'express';

const router = Router();

/**
 * POST /webhook/whatsapp
 * Twilio / WhatsApp Business API webhook.
 * Responds immediately with 200 — processing is async via BullMQ.
 */
router.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    // ── Support both Twilio and WhatsApp Business API formats ──────────────
    let sender_id, raw_text, lat, lng;

    if (body.From && body.Body) {
      // Twilio format
      sender_id = body.From;
      raw_text  = body.Body;
      lat       = body.Latitude  ? parseFloat(body.Latitude)  : null;
      lng       = body.Longitude ? parseFloat(body.Longitude) : null;
    } else if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      // WhatsApp Business Cloud API format
      const msg = body.entry[0].changes[0].value.messages[0];
      sender_id = msg.from;
      raw_text  = msg.text?.body ?? msg.interactive?.button_reply?.title ?? '';
      if (msg.location) {
        lat = msg.location.latitude;
        lng = msg.location.longitude;
      }
    } else {
      return res.status(400).json({ error: 'Unrecognised webhook format' });
    }

    if (!raw_text?.trim()) {
      return res.status(200).json({ status: 'ignored', reason: 'empty message' });
    }

    const jobId = await enqueueReport({
      sender_id,
      raw_text:    raw_text.trim(),
      lat,
      lng,
      ward:        null,   // will be resolved by classifier or geocoder
      timestamp:   new Date().toISOString(),
      source:      'whatsapp',
    });

    // Always respond 200 quickly — Twilio retries on timeout
    res.status(200).json({ status: 'queued', job_id: jobId });

  } catch (err) {
    console.error('[Webhook] Error:', err);
    // Still return 200 to avoid Twilio retries flooding the queue
    res.status(200).json({ status: 'error', message: err.message });
  }
});

/**
 * GET /webhook/whatsapp — Twilio webhook verification
 */
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

export default router;