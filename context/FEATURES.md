# Agap — Feature Breakdown

Each feature is described with its purpose, inputs/outputs, and dependencies on other features.

---

## 1. Stock Entry (Nurse)

**Purpose:** Allow a nurse to submit a stock count in 90 seconds or less.

**User Flow:**
1. Nurse opens app → sees list of medicines assigned to their RHU
2. Enters current quantity on hand for each medicine
3. Taps submit → entry saved locally (Drift) and queued for sync

**Inputs:**
- Medicine ID
- Quantity on hand (integer)
- RHU ID (from auth context)
- Timestamp (auto)

**Outputs:**
- `stock_entry` record saved locally and synced to backend

**Offline behavior:** Saved to Drift SQLite. Sync queue flushes on connectivity restore via `connectivity_plus`.

**Dependencies:** Auth (to know which RHU/nurse), Medicine catalog (to show medicine list)

---

## 2. Consumption Velocity Engine

**Purpose:** Track consumption rate per medicine per RHU. Project when each medicine will hit zero.

**Logic:**
1. On each new `stock_entry`, calculate daily consumption rate:
   `velocity = (previous_quantity - current_quantity) / days_between_entries`
2. Maintain a 30-day rolling baseline per medicine per RHU
3. Project days remaining: `days_remaining = current_quantity / velocity`
4. If `days_remaining <= threshold` (7-14 days), trigger threshold breach

**Runs on:** Backend (Hono). Triggered by stock entry sync.

**Inputs:**
- New `stock_entry`
- Historical `stock_entries` for the same medicine + RHU

**Outputs:**
- Updated `consumption_baselines` record
- `days_remaining` value exposed to frontend
- Possible `threshold_breach` record

**Dependencies:** Stock Entry (data source)

---

## 3. Anomaly Detection Layer

**Purpose:** Flag when a medicine is being consumed significantly faster than its 30-day baseline.

**Logic:**
1. Compare current velocity against 30-day baseline
2. If current velocity > baseline × anomaly_factor (e.g. 2.0x), flag as anomaly
3. Create alert for MHO with medicine name, RHU, and spike magnitude

**Runs on:** Backend (Hono). Triggered after velocity engine runs.

**Inputs:**
- Current consumption velocity
- 30-day baseline for same medicine + RHU

**Outputs:**
- Anomaly flag notification to MHO
- Anomaly record for audit trail

**Dependencies:** Consumption Velocity Engine (needs baseline + current velocity)

---

## 4. MHO Heatmap Dashboard

**Purpose:** Show all RHUs in the municipality on a single spatial view. Color-coded by urgency.

**Components:**
- `flutter_map` widget with barangay-level tiles
- RHU markers colored by worst `days_remaining` across their medicines
- Tap an RHU → drill down to medicine-level detail

**Color coding:**
- 🟢 Green: > 14 days remaining (all medicines)
- 🟡 Yellow: 7-14 days remaining (at least one medicine)
- 🔴 Red: < 7 days remaining (threshold breach)
- ⚫ Gray: No recent report (participation alert)

**Data source:** Backend API → Supabase (PostGIS spatial queries)

**Dependencies:** Consumption Velocity Engine (for days_remaining), RHU registry (for coordinates)

---

## 5. Requisition Workflow

**Purpose:** Auto-draft a resupply requisition when a threshold is breached. MHO approves with one tap. PDF emailed to provincial pharmacy.

**Flow:**
1. Threshold breach detected → system auto-drafts requisition
2. Requisition appears in MHO's pending list
3. MHO reviews → one-tap approve
4. System generates PDF (using `pdf` package on frontend or backend)
5. PDF emailed to provincial pharmacy
6. All state transitions logged to audit trail

**State machine:**
```
threshold_breach
  → requisition_drafted (auto)
    → mho_approved (MHO tap) [timestamp]
      → email_sent [timestamp]
        → pharmacy_acknowledged [timestamp]
```

**Dependencies:** Consumption Velocity Engine (triggers breach), Auth (MHO role), Email service (backend)

---

## 6. Audit Trail

**Purpose:** Immutable log of every state transition. Provides accountability and a paper trail.

**Events logged:**
| Event | Actor | Data |
|---|---|---|
| `stock_entry_submitted` | Nurse | medicine, quantity, RHU, timestamp |
| `threshold_breach_detected` | System | medicine, RHU, projected zero date |
| `requisition_drafted` | System | medicines list, quantities, RHU |
| `requisition_approved` | MHO | requisition ID, timestamp |
| `email_sent` | System | recipient, timestamp, PDF hash |
| `pharmacy_acknowledged` | Pharmacy | requisition ID, timestamp |

**Storage:** `audit_log` table in Supabase. Append-only, no updates or deletes.

**Dependencies:** All features write to audit trail.

---

## 7. Offline Sync Queue

**Purpose:** Ensure the app works fully offline. Queue all writes locally and sync when connectivity returns.

**Implementation:**
- Drift SQLite stores all pending submissions in a `sync_queue` table
- `connectivity_plus` monitors network state
- On connectivity restore, flush queue to Hono backend in order
- Backend responds with sync confirmation; queue entries marked as synced
- Conflict resolution: server timestamp wins (last-write-wins for stock entries)

**Dependencies:** Drift (local DB), Dio (HTTP client), connectivity_plus

---

## 8. Participation Monitoring

**Purpose:** Detect when an RHU goes silent (no stock entries for X days). Silence ≠ safety.

**Logic:**
- Backend cron or scheduled check: for each RHU, check last `stock_entry` timestamp
- If `days_since_last_entry > silence_threshold` (e.g. 3 days), trigger participation alert to MHO
- Separate from stockout alerts — different notification channel

**Dependencies:** Stock Entry (data source), Notification system

---

## 9. Notifications & Alerts

**Purpose:** Surface critical events to the right person at the right time.

**Alert types:**
| Alert | Recipient | Trigger |
|---|---|---|
| Threshold breach | MHO | Medicine projected to hit zero within 7-14 days |
| Anomaly spike | MHO | Consumption velocity > 2x baseline |
| Participation alert | MHO | RHU silent for X days |
| Sync confirmation | Nurse | Offline queue successfully synced |

**Frontend:** `flutter_local_notifications` for on-device alerts
**Backend:** Push notifications and/or Supabase Realtime for live dashboard updates

---

## 10. Authentication & Role Management

**Purpose:** Identify users, enforce role-based access.

**Roles:**
- **Nurse:** Scoped to their RHU. Can submit stock entries, view their own medicine status.
- **MHO:** Scoped to their municipality. Can view all RHUs, approve requisitions, receive alerts.

**Implementation:**
- Supabase Auth (or custom JWT via Hono)
- Token stored on device via `flutter_secure_storage`
- Role determines which screens and data are accessible

**Dependencies:** Supabase Auth, backend middleware for role enforcement
