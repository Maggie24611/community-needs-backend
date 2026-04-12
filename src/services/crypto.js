// src/services/crypto.js
// AES-256-CBC encryption for phone numbers before they leave M1's boundary.
// Each encrypt call uses a fresh random IV — output is "iv:ciphertext" in hex.
// M2 note: seed data has placeholder values like "enc_rahul" — we skip those.

import crypto from "crypto";
import { env } from "../config/env.js";

const ALGORITHM  = "aes-256-cbc";
const KEY_BUFFER = Buffer.from(env.ENCRYPTION_KEY, "hex"); // 32 bytes from 64 hex chars

if (KEY_BUFFER.length !== 32) {
  throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
}

/**
 * Encrypt a phone number string.
 * @param {string} plainPhone — e.g. "919876543210"
 * @returns {string}          — "ivHex:ciphertextHex" (safe to store in DB)
 */
export function encryptPhone(plainPhone) {
  const iv     = crypto.randomBytes(env.ENCRYPTION_IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainPhone, "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a previously encrypted phone string.
 * Only used server-side when we need to send a WhatsApp message to a volunteer.
 *
 * M2 note: seed data volunteers have placeholder values like "PLACEHOLDER_rahul"
 * or "enc_rahul" — these are not real AES-256 values and cannot be decrypted.
 * We detect and skip them gracefully, returning null.
 *
 * @param {string} encryptedPhone — "ivHex:ciphertextHex"
 * @returns {string|null}         — original phone number, or null if placeholder
 */
export function decryptPhone(encryptedPhone) {
  // Guard: handle null/undefined
  if (!encryptedPhone) {
    console.log("⚠️  decryptPhone: empty value — skipping");
    return null;
  }

  // Guard: M2 seed data has placeholder values — skip them
  if (
    encryptedPhone.startsWith("PLACEHOLDER_") ||
    encryptedPhone.startsWith("enc_") ||
    !encryptedPhone.includes(":")
  ) {
    console.log(`⚠️  Skipping placeholder volunteer phone: "${encryptedPhone}"`);
    return null;
  }

  try {
    const [ivHex, ciphertextHex] = encryptedPhone.split(":");
    const iv         = Buffer.from(ivHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    const decipher   = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
    const decrypted  = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error(`❌  decryptPhone failed for value "${encryptedPhone}":`, err.message);
    return null;
  }
}