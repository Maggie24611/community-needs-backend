// src/bot/botFlow.js
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  THIS FILE IS OWNED BY MEMBER 4.
// M1 imports only the `handleMessage` function. Do not modify the function
// signature — it is the agreed interface contract between M1 and M4.
// ─────────────────────────────────────────────────────────────────────────────
//
// INTERFACE CONTRACT (M1 ↔ M4):
//
// Input:
//   userPhone    {string}  — E.164 digits only, e.g. "919876543210"
//   incomingText {string}  — trimmed message body from WhatsApp
//   sessionState {object}  — current session from Redis (empty {} on first msg)
//
// Output (must always return all three keys):
//   reply          {string|null}  — text to send back; null = send nothing
//   newSessionState {object}      — updated session to persist in Redis
//   reportPayload  {object|null}  — non-null only when a report is complete.
//                                   Must include at minimum: { rawText: string }
//                                   M1 passes this to the classification worker.
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} userPhone
 * @param {string} incomingText
 * @param {object} sessionState
 * @returns {{ reply: string|null, newSessionState: object, reportPayload: object|null }}
 */
export async function handleMessage(userPhone, incomingText, sessionState) {
  // STUB — M4 replaces this body entirely.
  // This stub echoes the message so M1 can test the webhook pipeline end-to-end.
  console.log(`[botFlow STUB] ${userPhone}: "${incomingText}"`, sessionState);

  return {
    reply: `[STUB] Echo: "${incomingText}" — M4 has not yet implemented botFlow.js`,
    newSessionState: { ...sessionState, lastMessage: incomingText },
    reportPayload: null,
  };
}
