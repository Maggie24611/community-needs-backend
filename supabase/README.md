# Supabase Database

## Project: Sahyog

**Region:** ap-south-1

---

## Tables

| Table             | Columns | Rows |
| ----------------- | ------- | ---- |
| `needs`           | 21      | 32   |
| `volunteers`      | 11      | 35   |
| `reports`         | 7       | 6    |
| `historical_data` | 12      | 27   |
| `recommendations` | 8       | 3    |
| `audit_log`       | 7       | 34   |

---

## RPC Functions

```sql
-- Find opted-in volunteers within radius of a need
volunteers_within_radius(need_lat, need_lng, radius_meters)

-- Find similar needs using pgvector embeddings
find_similar_needs(query_embedding, match_ward, similarity_threshold, match_count)
```

---

## Extensions

- `postgis` — geographic queries and PostGIS proximity matching
- `pgvector` — vector similarity search for deduplication

---

## Security

- **RLS:** Row Level Security enabled on all tables
- **Triggers:** `updated_at` auto-update + `audit_log` entry on all tables
- **Compliance:** India DPDP Act 2023 — consent logging, PII minimisation, audit trails
