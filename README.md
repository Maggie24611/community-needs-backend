# Sahyog — Community Needs Backend

**PS5: Smart Resource Allocation | Mumbai Hackathon 2026**

A real-time community needs aggregation and volunteer dispatch system for Mumbai. Citizens report emergencies via WhatsApp in English, Hindi, or Marathi. The backend classifies, geocodes, deduplicates, and dispatches volunteers automatically.

---

## 🚀 Live URLs

| Environment                | URL                                                         |
| -------------------------- | ----------------------------------------------------------- |
| **Production (Cloud Run)** | `https://sahyog-backend-404307478076.asia-south1.run.app`   |
| **Dev (Railway)**          | `https://community-needs-backend-production.up.railway.app` |

---

## 📡 API Endpoints

### Health Check

```
GET /health
```

**Response:**

```json
{
  "status": "ok",
  "service": "sahyog-backend",
  "ts": "2026-04-24T10:00:00.000Z"
}
```

---

### WhatsApp Webhook — Meta Verification

```
GET /webhook?hub.mode=subscribe&hub.verify_token=mumbai_needs_verify_2026&hub.challenge=CHALLENGE
```

Returns the challenge string if verify token matches.

---

### WhatsApp Webhook — Incoming Messages

```
POST /webhook
```

**Headers:**

```
Content-Type: application/json
X-Hub-Signature-256: sha256=...
```

**Body:** Standard Meta WhatsApp Business Cloud API webhook payload.

**Response:**

```json
{ "status": "ok" }
```

Always returns 200 immediately. Processing happens asynchronously.

---

### Resource Allocation Recommendations

```
GET /api/recommendations
```

Triggers the Groq Llama allocation agent to analyse active needs, historical data, and volunteer availability across Mumbai wards.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "priority_rank": 1,
      "ward_name": "Dharavi",
      "primary_issue": "Food & water",
      "urgency_level": "Critical",
      "reasoning": "3 active water reports. Historical data shows jaundice spike same period last year.",
      "recommended_action": "Deploy water testing team and run awareness campaign this week",
      "volunteer_gap": true
    }
  ]
}
```

Returns exactly 5 ward recommendations sorted by priority.

---

### CSV Historical Data Upload

```
POST /api/historical-data/upload
Content-Type: multipart/form-data
```

**Form fields:**
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | ✅ | CSV file (`.csv` only) |
| `ngo_name` | Text | ❌ | Source NGO name (default: "Unknown") |

**Accepted CSV columns** (any combination):

```
date, ward, category, description, summary, data_type, location
```

**Response:**

```json
{
  "success": true,
  "processed": 5,
  "total": 5,
  "message": "5 of 5 records added to historical_data"
}
```

**Error response:**

```json
{
  "success": true,
  "processed": 3,
  "total": 5,
  "errors": [{ "row": 2, "error": "Row insert failed: constraint violation" }],
  "message": "3 of 5 records added to historical_data"
}
```

---

## 🤖 WhatsApp Bot Flow

The bot guides users through a 7-step conversation:

```
1. Language selection (English / Hindi / Marathi)
2. Category selection (Food & water / Medical / Shelter / Education / Safety / Environment / Sanitation / Other)
3. Urgency level (Critical / High / Medium / Low)
4. Location (free text)
5. Description (free text)
6. Data consent (YES / NO — DPDP Act 2023)
7. Confirmation with Reference ID (MUM-XXXX)
```

**Global keywords** (work at any step):
| Keyword | Action |
|---|---|
| `HI` or `HELLO` | Restart conversation |
| `RESTART` | Restart conversation |
| `VOLUNTEER` | Start volunteer registration |
| `NEW` | Submit a new report (from DONE state) |

---

## 🔧 Environment Variables

Copy `.env.example` and fill in your values:

```env
# WhatsApp Business Cloud API
WHATSAPP_PHONE_NUMBER_ID=1069863986210946
WHATSAPP_ACCESS_TOKEN=your_permanent_system_user_token
WHATSAPP_VERIFY_TOKEN=mumbai_needs_verify_2026
WHATSAPP_APP_SECRET=your_app_secret

# Groq AI (llama-3.3-70b-versatile)
GROQ_API_KEY=your_groq_api_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Maps Geocoding
GOOGLE_MAPS_API_KEY=your_maps_api_key

# Upstash Redis (BullMQ + Sessions)
UPSTASH_REDIS_URL=rediss://your-upstash-url
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Encryption (AES-256)
ENCRYPTION_KEY=your_32_byte_hex_key
ENCRYPTION_IV_LENGTH=16

# HuggingFace (embeddings)
HUGGINGFACE_API_KEY=your_huggingface_key

# App
NODE_ENV=production
```

---

## 🗄️ Database Schema (Supabase)

### Tables

| Table             | Description                           |
| ----------------- | ------------------------------------- |
| `needs`           | Community needs reported via WhatsApp |
| `reports`         | Raw reports linked to needs           |
| `volunteers`      | Opted-in volunteers with location     |
| `historical_data` | NGO historical data (CSV uploads)     |
| `recommendations` | Allocation agent weekly output        |
| `audit_log`       | All system actions logged here        |

### RPC Functions

```sql
-- Find volunteers within radius of a need
volunteers_within_radius(need_lat, need_lng, radius_meters)

-- Find similar needs using pgvector embeddings
find_similar_needs(query_embedding, match_ward, similarity_threshold, match_count)
```

### Location Format

```
SRID=4326;POINT(lng lat)   -- lng FIRST, then lat
```

---

## 🏗️ Architecture

```
WhatsApp User
     ↓
Meta Cloud API
     ↓
POST /webhook (Cloud Run)
     ↓
botFlow.js (7-step conversation)
     ↓
reportPipeline.js
  ├── Groq classification (category, urgency, summary)
  ├── Google Maps geocoding (lat, lng, ward)
  ├── pgvector deduplication
  ├── Supabase insert (needs + reports + audit_log)
  └── BullMQ → volunteer WhatsApp alerts
     ↓
GET /api/recommendations
  └── Groq allocation agent → recommendations table
```

---

## 🚢 Deployment

### Google Cloud Run (Production)

```bash
gcloud run deploy sahyog-backend \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances=1
```

### Railway (Dev)

Push to `main` branch — Railway auto-deploys.

---

## 👥 Team

| Member | Role                                         |
| ------ | -------------------------------------------- |
| M1     | Backend — Node.js + Express + AI integration |
| M2     | Database — Supabase + PostGIS + pgvector     |
| M3     | Frontend — React dashboard (Vercel)          |
| M4     | WhatsApp bot flow + Meta integration         |
