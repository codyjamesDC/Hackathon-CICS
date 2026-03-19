# Agap — API Contract

> **Finalized contract between backend (Hono) and frontend (Flutter/Dio).**
> All endpoints return JSON. All `id` fields are UUIDs. All timestamps are ISO 8601 with timezone.

---

## Build Order & Dependency Chain

```
1. Medicines + RHU        → simple reads, unblocks everything
2. Stock Entries          → core input, offline sync
3. Velocity Engine        → triggered by stock entries (not an endpoint)
4. Dashboard              → reads velocity engine output
5. Requisitions           → reads threshold breaches from velocity engine
```

---

## Auth Context

For MVP, `nurseId`, `rhuId`, and `municipalityId` will be passed via query params or headers until auth middleware is wired.

| Header / Param | Type | Notes |
|---|---|---|
| `X-User-Id` | uuid | Simulated auth — the requesting user's ID |
| `X-User-Role` | `nurse` \| `mho` | Used for access gating |
| `X-Municipality-Id` | uuid | MHO scoping (for dashboard, RHU list) |
| `X-Rhu-Id` | uuid | Nurse scoping (for stock entries) |

---

## 1. Medicines

### `GET /api/medicines`

Returns the full medicine catalog. Used by the nurse app to populate the stock entry form.

**Access:** Any authenticated user

**Query Params:** None

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "genericName": "Amoxicillin 500mg",
      "unit": "capsule",
      "category": "antibiotic",
      "criticalThresholdDays": 7,
      "createdAt": "2026-03-19T00:00:00Z"
    }
  ]
}
```

---

## 2. RHU (Rural Health Units)

### `GET /api/rhu`

List all RHUs in the MHO's municipality. Used for the dashboard heatmap and RHU selection.

**Access:** MHO (scoped to `X-Municipality-Id`)

**Query Params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `municipalityId` | uuid | Yes (MVP) | Until auth wired, pass explicitly |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Barangay San Jose RHU",
      "barangay": "San Jose",
      "municipalityId": "uuid",
      "lat": 14.5995,
      "lng": 120.9842,
      "createdAt": "2026-03-19T00:00:00Z"
    }
  ]
}
```

### `GET /api/rhu/:id`

Single RHU detail.

**Access:** Any authenticated user

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Barangay San Jose RHU",
    "barangay": "San Jose",
    "municipalityId": "uuid",
    "lat": 14.5995,
    "lng": 120.9842,
    "createdAt": "2026-03-19T00:00:00Z"
  }
}
```

**Response `404`:**
```json
{ "error": "The requested resource was not found." }
```

---

## 3. Stock Entries

### `POST /api/stock-entries`

Single stock count submission from a nurse. Triggers velocity engine on success.

**Access:** Nurse

**Request Body:**
```json
{
  "rhuId": "uuid",
  "medicineId": "uuid",
  "quantityOnHand": 120,
  "submittedAt": "2026-03-19T06:00:00Z"
}
```

**Response `201`:**
```json
{
  "data": {
    "id": "uuid",
    "rhuId": "uuid",
    "medicineId": "uuid",
    "nurseId": "uuid",
    "quantityOnHand": 120,
    "submittedAt": "2026-03-19T06:00:00Z",
    "syncedAt": "2026-03-19T06:00:05Z",
    "createdAt": "2026-03-19T06:00:05Z"
  },
  "velocity": {
    "velocityPerDay": 8.5,
    "daysRemaining": 14.12,
    "breachTriggered": false
  }
}
```

> **Note:** `velocity` is returned so the Flutter app can immediately show updated days-remaining without refetching.

**Response `400`:** Zod validation error

### `POST /api/stock-entries/batch`

Offline sync flush. Submits 1–100 entries at once. Each entry triggers velocity engine independently.

**Access:** Nurse

**Request Body:**
```json
{
  "entries": [
    {
      "rhuId": "uuid",
      "medicineId": "uuid",
      "quantityOnHand": 120,
      "submittedAt": "2026-03-19T06:00:00Z"
    },
    {
      "rhuId": "uuid",
      "medicineId": "uuid",
      "quantityOnHand": 45,
      "submittedAt": "2026-03-19T06:01:00Z"
    }
  ]
}
```

**Response `201`:**
```json
{
  "data": {
    "processed": 2,
    "failed": 0,
    "results": [
      {
        "id": "uuid",
        "medicineId": "uuid",
        "status": "ok",
        "velocity": {
          "velocityPerDay": 8.5,
          "daysRemaining": 14.12,
          "breachTriggered": false
        }
      },
      {
        "id": "uuid",
        "medicineId": "uuid",
        "status": "ok",
        "velocity": {
          "velocityPerDay": 3.2,
          "daysRemaining": 14.06,
          "breachTriggered": false
        }
      }
    ]
  }
}
```

> Batch is **not** all-or-nothing. Each entry is processed independently. Partial success is reported.

### `GET /api/stock-entries`

Get entries for an RHU (optional medicine filter).

**Access:** Any authenticated user

**Query Params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `rhuId` | uuid | Yes | Filter by RHU |
| `medicineId` | uuid | No | Filter by medicine |
| `limit` | integer | No | Default 50, max 200 |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rhuId": "uuid",
      "medicineId": "uuid",
      "nurseId": "uuid",
      "quantityOnHand": 120,
      "submittedAt": "2026-03-19T06:00:00Z",
      "syncedAt": "2026-03-19T06:00:05Z",
      "createdAt": "2026-03-19T06:00:05Z"
    }
  ]
}
```

---

## 4. Velocity Engine (Internal — No API Endpoint)

Not an API endpoint. Triggered internally by `POST /api/stock-entries` and `/batch` after each entry is saved.

### Flow:
```
1. Fetch previous stock_entry for same rhu_id + medicine_id
2. If no previous → first entry, set velocity = 0, days_remaining = ∞ (9999)
3. Calculate:
   - days_elapsed = (new.submitted_at - prev.submitted_at) in days
   - units_consumed = prev.quantity - new.quantity
   - If units_consumed <= 0 → restocked, set velocity = 0
   - velocity = units_consumed / days_elapsed
4. Upsert consumption_baselines:
   - Update velocity (30-day rolling average via exponential smoothing)
   - Update days_remaining = new.quantity / averaged_velocity
5. If days_remaining <= medicine.critical_threshold_days:
   - Insert threshold_breach (status = 'open')
   - Auto-draft requisition (status = 'drafted')
   - Log to audit_log
6. Return { velocityPerDay, daysRemaining, breachTriggered } to caller
```

### Exponential Smoothing Formula:
```
smoothing_factor = 0.3    (gives more weight to recent data)
new_avg_velocity = (smoothing_factor × current_velocity) + ((1 - smoothing_factor) × prev_avg_velocity)
```

---

## 5. Dashboard

### `GET /api/dashboard/heatmap`

Returns all RHUs in a municipality with coordinates and worst `days_remaining` across all medicines. Used for the MHO heatmap.

**Access:** MHO

**Query Params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `municipalityId` | uuid | Yes (MVP) | Until auth wired |

**Response `200`:**
```json
{
  "data": [
    {
      "rhuId": "uuid",
      "rhuName": "Barangay San Jose RHU",
      "barangay": "San Jose",
      "lat": 14.5995,
      "lng": 120.9842,
      "worstDaysRemaining": 4.5,
      "totalMedicines": 12,
      "breachCount": 2,
      "lastReportedAt": "2026-03-19T06:00:00Z",
      "status": "critical"
    }
  ]
}
```

**Status Derivation:**
| Condition | Status |
|---|---|
| `worstDaysRemaining` is null (no baselines) | `"silent"` |
| `worstDaysRemaining < 7` | `"critical"` |
| `worstDaysRemaining >= 7 && < 14` | `"warning"` |
| `worstDaysRemaining >= 14` | `"ok"` |

### `GET /api/dashboard/rhu/:id`

Drill-down view for a single RHU. Shows medicine-level status including velocity and days remaining.

**Access:** MHO

**Response `200`:**
```json
{
  "data": {
    "rhu": {
      "id": "uuid",
      "name": "Barangay San Jose RHU",
      "barangay": "San Jose"
    },
    "medicines": [
      {
        "medicineId": "uuid",
        "genericName": "Amoxicillin 500mg",
        "unit": "capsule",
        "category": "antibiotic",
        "currentStock": 120,
        "velocityPerDay": 8.5,
        "daysRemaining": 14.12,
        "criticalThresholdDays": 7,
        "status": "ok",
        "lastEntryAt": "2026-03-19T06:00:00Z"
      },
      {
        "medicineId": "uuid",
        "genericName": "Paracetamol 500mg",
        "unit": "tablet",
        "category": "analgesic",
        "currentStock": 15,
        "velocityPerDay": 12.0,
        "daysRemaining": 1.25,
        "criticalThresholdDays": 7,
        "status": "critical",
        "lastEntryAt": "2026-03-19T06:00:00Z"
      }
    ]
  }
}
```

**Response `404`:** RHU not found

---

## 6. Requisitions

### `GET /api/requisitions`

List all requisitions visible to the MHO, filterable by status.

**Access:** MHO

**Query Params:**

| Param | Type | Required | Notes |
|---|---|---|---|
| `municipalityId` | uuid | Yes (MVP) | Scope to MHO's municipality |
| `status` | string | No | Filter: `drafted`, `approved`, `sent`, `acknowledged` |

**Response `200`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "rhuId": "uuid",
      "rhuName": "Barangay San Jose RHU",
      "breachId": "uuid",
      "status": "drafted",
      "draftedAt": "2026-03-19T06:30:00Z",
      "approvedAt": null,
      "approvedBy": null,
      "sentAt": null,
      "acknowledgedAt": null,
      "items": [
        {
          "medicineId": "uuid",
          "genericName": "Paracetamol 500mg",
          "unit": "tablet",
          "quantityRequested": 500,
          "currentStock": 15
        }
      ]
    }
  ]
}
```

### `GET /api/requisitions/:id`

Single requisition detail with items and audit trail.

**Access:** MHO

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "rhuId": "uuid",
    "rhuName": "Barangay San Jose RHU",
    "breachId": "uuid",
    "status": "drafted",
    "draftedAt": "2026-03-19T06:30:00Z",
    "approvedAt": null,
    "approvedBy": null,
    "sentAt": null,
    "acknowledgedAt": null,
    "items": [
      {
        "medicineId": "uuid",
        "genericName": "Paracetamol 500mg",
        "unit": "tablet",
        "quantityRequested": 500,
        "currentStock": 15
      }
    ],
    "audit": [
      {
        "eventType": "threshold_breach_detected",
        "actorType": "system",
        "createdAt": "2026-03-19T06:25:00Z",
        "metadata": { "daysRemaining": 1.25 }
      },
      {
        "eventType": "requisition_drafted",
        "actorType": "system",
        "createdAt": "2026-03-19T06:30:00Z",
        "metadata": {}
      }
    ]
  }
}
```

**Response `404`:** Requisition not found

### `POST /api/requisitions/:id/approve`

MHO one-tap approve. Transitions status from `drafted` → `approved`.

**Access:** MHO

**Request Body:** None (just the route param)

**Response `200`:**
```json
{
  "data": {
    "id": "uuid",
    "status": "approved",
    "approvedAt": "2026-03-19T07:00:00Z",
    "approvedBy": "uuid"
  }
}
```

**Response `404`:** Requisition not found
**Response `409`:** Already approved or in a non-draft state

---

## Error Response Format

All errors follow this shape:

```json
{
  "error": "Human-readable error message",
  "code": 400
}
```

For Zod validation errors:
```json
{
  "error": "Validation failed",
  "code": 400,
  "details": [
    { "path": ["quantityOnHand"], "message": "Expected number, received string" }
  ]
}
```

---

## Summary Matrix

| # | Method | Path | Access | Input | Velocity? | Status |
|---|---|---|---|---|---|---|
| 1 | GET | `/api/medicines` | Auth | — | — | TODO |
| 2 | GET | `/api/rhu` | MHO | `?municipalityId=` | — | TODO |
| 3 | GET | `/api/rhu/:id` | Auth | — | — | TODO |
| 4 | POST | `/api/stock-entries` | Nurse | JSON body | ✅ triggers | TODO |
| 5 | POST | `/api/stock-entries/batch` | Nurse | JSON body | ✅ triggers | TODO |
| 6 | GET | `/api/stock-entries` | Auth | `?rhuId=` | — | TODO |
| 7 | GET | `/api/dashboard/heatmap` | MHO | `?municipalityId=` | — | TODO |
| 8 | GET | `/api/dashboard/rhu/:id` | MHO | — | — | TODO |
| 9 | GET | `/api/requisitions` | MHO | `?municipalityId=` | — | TODO |
| 10 | GET | `/api/requisitions/:id` | MHO | — | — | TODO |
| 11 | POST | `/api/requisitions/:id/approve` | MHO | — | — | TODO |

---

## Notes for Frontend Team

1. **Wrap all responses in `data` key** — consistent envelope for all success responses.
2. **Velocity data is returned inline** with stock entry POST responses — no need for a separate fetch after submitting.
3. **Batch POST is not atomic** — partial success is possible. Check each `results[].status`.
4. **Dashboard status is derived** — the backend computes `status` from `worstDaysRemaining`, no need for frontend logic.
5. **Auth is header-simulated for MVP** — use `X-User-Id`, `X-User-Role`, `X-Municipality-Id`, `X-Rhu-Id` headers.
6. **All IDs are UUIDs** — validate on frontend before sending.
7. **`submittedAt` must be ISO 8601** — use `DateTime.now().toUtc().toIso8601String()` in Dart.
