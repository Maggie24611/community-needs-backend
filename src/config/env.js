// src/config/env.js
import "dotenv/config";

const REQUIRED = [
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_APP_SECRET",
  "GROQ_API_KEY",
  "UPSTASH_REDIS_URL",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_MAPS_API_KEY",
  "ENCRYPTION_KEY",
];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error("❌  Missing required environment variables:", missing.join(", "));
  process.exit(1);
}

export const env = {
  // WhatsApp
  WA_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WA_ACCESS_TOKEN:    process.env.WHATSAPP_ACCESS_TOKEN,
  WA_VERIFY_TOKEN:    process.env.WHATSAPP_VERIFY_TOKEN,
  WA_APP_SECRET:      process.env.WHATSAPP_APP_SECRET,

  // Groq — used for classification AND allocation agent
  GROQ_API_KEY: process.env.GROQ_API_KEY,

  // HuggingFace — optional, for embeddings
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY ?? null,

  // Redis / BullMQ
  UPSTASH_REDIS_URL: process.env.UPSTASH_REDIS_URL,
  REDIS_HOST:        process.env.REDIS_HOST,
  REDIS_PORT:        parseInt(process.env.REDIS_PORT, 10),
  REDIS_PASSWORD:    process.env.REDIS_PASSWORD,

  // Supabase
  SUPABASE_URL:              process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // Google Maps
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,

  // Crypto
  ENCRYPTION_KEY:       process.env.ENCRYPTION_KEY,
  ENCRYPTION_IV_LENGTH: parseInt(process.env.ENCRYPTION_IV_LENGTH || "16", 10),

  // App
  PORT:     parseInt(process.env.PORT || "8080", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
};