# Agap — Data Model

## Overview

All persistent data lives in Supabase PostgreSQL with PostGIS enabled. The Flutter app maintains a local Drift (SQLite) cache for offline-first operation.

---

## Entity Relationship Diagram

```
users ─────────┐
               │ belongs_to
               ▼
rhu ───────────┬──────────────────────────┐
               │                          │
               │ has_many                 │ has_many
               ▼                          ▼
        stock_entries              consumption_baselines
               │                          │
               │ triggers                 │ compared_against
               ▼                          ▼
      threshold_breaches          anomaly_detections
               │
               │ triggers
               ▼
         requisitions
               │
               │ all transitions logged to
               ▼
          audit_log
```

---

## Tables

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | Unique |
| `name` | text | Display name |
| `role` | enum | `nurse`, `mho` |
| `rhu_id` | uuid | FK → `rhu`. NULL for MHO (MHO sees all RHUs in municipality) |
| `municipality_id` | uuid | FK → `municipalities` (for MHO scoping) |
| `created_at` | timestamptz | |

### `municipalities`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Municipality name |
| `province` | text | Province name |

### `rhu`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | RHU name (e.g. "Barangay San Jose RHU") |
| `barangay` | text | Barangay name |
| `municipality_id` | uuid | FK → `municipalities` |
| `lat` | real | Latitude (simplified from PostGIS for MVP) |
| `lng` | real | Longitude (simplified from PostGIS for MVP) |
| `created_at` | timestamptz | |

### `medicines`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `generic_name` | text | e.g. "Amoxicillin 500mg" |
| `unit` | text | e.g. "tablet", "capsule", "bottle" |
| `category` | text | e.g. "antibiotic", "analgesic", "antihypertensive" |
| `critical_threshold_days` | integer | Default 7. Below this → threshold breach |
| `created_at` | timestamptz | |

### `stock_entries`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `rhu_id` | uuid | FK → `rhu` |
| `medicine_id` | uuid | FK → `medicines` |
| `nurse_id` | uuid | FK → `users` |
| `quantity_on_hand` | integer | Current stock count |
| `submitted_at` | timestamptz | When nurse submitted |
| `synced_at` | timestamptz | NULL if not yet synced |
| `created_at` | timestamptz | Server receive time |

### `consumption_baselines`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `rhu_id` | uuid | FK → `rhu` |
| `medicine_id` | uuid | FK → `medicines` |
| `velocity` | decimal | Units consumed per day (30-day rolling avg) |
| `days_remaining` | decimal | Projected days until stockout |
| `last_updated` | timestamptz | |

### `threshold_breaches`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `rhu_id` | uuid | FK → `rhu` |
| `medicine_id` | uuid | FK → `medicines` |
| `days_remaining` | decimal | At time of breach |
| `projected_zero_date` | date | When stock hits zero at current rate |
| `status` | enum | `open`, `requisition_drafted`, `resolved` |
| `created_at` | timestamptz | |

### `requisitions`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `rhu_id` | uuid | FK → `rhu` |
| `breach_id` | uuid | FK → `threshold_breaches` |
| `status` | enum | `drafted`, `approved`, `sent`, `acknowledged` |
| `drafted_at` | timestamptz | Auto |
| `approved_at` | timestamptz | MHO tap |
| `approved_by` | uuid | FK → `users` (MHO) |
| `sent_at` | timestamptz | Email dispatch |
| `acknowledged_at` | timestamptz | Pharmacy confirmation |
| `pdf_url` | text | Stored PDF location |

### `requisition_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `requisition_id` | uuid | FK → `requisitions` (onDelete: cascade) |
| `medicine_id` | uuid | FK → `medicines` |
| `quantity_requested` | integer | Based on baseline consumption × restock period |
| `current_stock` | integer | At time of drafting |

### `audit_log`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `event_type` | text | e.g. `stock_entry_submitted`, `threshold_breach_detected` |
| `actor_id` | uuid | FK → `users` (NULL for system events) |
| `actor_type` | enum | `nurse`, `mho`, `system` |
| `entity_type` | text | e.g. `stock_entry`, `requisition` |
| `entity_id` | uuid | FK to relevant table |
| `metadata` | jsonb | Event-specific data |
| `created_at` | timestamptz | Immutable |

> **Audit log is append-only.** No UPDATE or DELETE operations. This table is the paper trail.

---

## Local SQLite Schema (Drift)

The Flutter app mirrors a subset of these tables locally for offline operation:

| Local Table | Purpose |
|---|---|
| `local_stock_entries` | Pending submissions not yet synced |
| `local_medicines` | Cached medicine catalog |
| `local_sync_queue` | Queue of API calls to replay on connectivity |
| `local_baselines` | Cached consumption baselines for days-remaining display |

---

## PostGIS Queries

Used for the MHO heatmap dashboard:

```sql
-- Get all RHUs in a municipality with their worst days_remaining
SELECT
  r.id, r.name, r.barangay,
  r.lat, r.lng,
  MIN(cb.days_remaining) as worst_days_remaining
FROM rhu r
LEFT JOIN consumption_baselines cb ON cb.rhu_id = r.id
WHERE r.municipality_id = $1
GROUP BY r.id, r.name, r.barangay, r.lat, r.lng;
```
