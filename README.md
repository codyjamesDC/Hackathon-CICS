# Agap — Predictive Medicine Stock Intelligence

> What currently takes 3 weeks now takes 3 hours.

Agap is a predictive medicine stock intelligence system for Rural Health Units (RHUs) in the Philippines. It connects frontline nurses, Municipal Health Officers (MHOs), and provincial pharmacies into a single data architecture, providing a 7-to-14-day early warning window before any essential medicine runs out.

---

## Monorepo Structure

```
Hackathon-CICS/
├── backend/      # Hono API server (Node.js + TypeScript)
├── dashboard/    # SvelteKit web app (MHO admin dashboard)
└── frontend/     # Flutter mobile app (Nurse client)
```

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM, TypeScript via tsx) |
| Framework | Hono |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Supabase) + PostGIS extension |
| PDF generation | PDFKit |
| Email dispatch | Resend API |
| Schema migrations | drizzle-kit push |

### Dashboard (MHO)
| Layer | Technology |
|---|---|
| Framework | SvelteKit (Svelte 5) |
| Styling | Tailwind CSS v4 |
| Components | shadcn-svelte |
| Data fetching | TanStack Query (no SSR load functions) |
| Map | Mapbox GL |
| Charts | Apache ECharts |
| Icons | lucide-svelte |

### Frontend (Nurse App)
| Layer | Technology |
|---|---|
| Framework | Flutter (Dart SDK ^3.11.1) |
| State management | Riverpod (flutter_riverpod ^3.3.1) |
| HTTP client | Dio ^5.9.2 |
| Charts | fl_chart ^1.2.0 |
| Map | flutter_map ^8.2.2 |
| Offline storage | Drift (SQLite) |
| Secure storage | flutter_secure_storage |
| UI | shadcn_ui ^0.52.1 |

---

## Core Algorithm — Consumption Velocity Engine (EWMA)

The predictive engine runs on every stock submission. It produces a smoothed consumption rate using an **Exponentially Weighted Moving Average** with smoothing factor **alpha = 0.3**:

```
raw_velocity      = (prev_qty - curr_qty) / days_elapsed
smoothed_velocity = 0.3 * raw_velocity + 0.7 * previous_average
days_remaining    = current_qty / smoothed_velocity
quantity_to_order = ceil(smoothed_velocity * 30)
```

If `days_remaining` falls at or below a medicine's `criticalThresholdDays`, a **threshold breach** is created and a batch requisition is auto-drafted for the MHO to approve.

---

## Anomaly Detection Engine

Running alongside the velocity engine, an anomaly detector fires on every stock submission to catch sudden, unusual consumption spikes that the smoothed EWMA alone might mask.

### Algorithm

```
velocity_ratio = raw_velocity / baseline_velocity
if velocity_ratio >= ANOMALY_THRESHOLD (2.0×):  → flag anomaly
```

The **pre-spike baseline** (EWMA value before the current entry is folded in) is passed directly to the check to prevent the spike from inflating its own reference point.

### Deduplication

Only one open anomaly per `(rhu_id, medicine_id)` pair is allowed at a time. A new spike for the same medicine at the same RHU is silently dropped until the existing alert is acknowledged, preventing alert spam during sustained high-consumption periods.

### Alert lifecycle

| Status | Meaning |
|---|---|
| `open` | Active, visible to both nurse app and MHO dashboard |
| `acknowledged` | MHO has reviewed it; removed from all alert feeds; future spikes can now re-trigger |

### Normalized alert feed (`GET /api/alerts`)

All alert types are merged into a single flat array, sorted by `createdAt` descending:

| Type | Trigger | Severity |
|---|---|---|
| `threshold_breach` | `days_remaining ≤ criticalThresholdDays` | `critical` |
| `anomaly_spike` | `velocity_ratio ≥ 2.0×` | `warning` |
| `participation_alert` | No stock entry in ≥ 3 days | `info` |

The endpoint is role-aware: `X-User-Role: nurse` scopes to the nurse's own RHU; `X-User-Role: mho` returns all alerts across the municipality.

---

## Setup and Running

### 1. Backend

**Prerequisites:** Node.js 20+, a Supabase (PostgreSQL) project

```bash
cd backend
npm install
```

Create a `.env` file:

```env
DATABASE_URL=postgresql://...        # Supabase connection string
RESEND_API_KEY=re_...                # Resend API key (for email dispatch)
EMAIL_FROM=agap@yourdomain.com       # Verified sender address
EMAIL_TO=mho@nagcarlan.gov.ph        # MHO recipient address
```

**Seed the database** (run this first every time you reset):

```bash
npm run seed
```

This creates:
- 1 municipality (Nagcarlan, Laguna)
- 50 RHUs with procedural telemetry (4500+ stock entries, every 2 days over 14 days)
- 12 medicines with per-medicine critical thresholds
- 1 MHO user + 50 nurse users
- Consumption baselines with realistic velocity profiles
- Threshold breach records derived from any baseline where `daysRemaining ≤ criticalThresholdDays`
- Anomaly spike alerts seeded on ~6 critical RHUs (including Abo) for Paracetamol and Amoxicillin
- Abo Health Center is always seeded as critical with pre-populated alerts for demo purposes

**Start the API server:**

```bash
# Standard dev (localhost only)
npm run dev

# With ADB reverse for Flutter device testing
npm run dev:phone
```

The API runs at `http://localhost:3000`.

**Other backend commands:**

```bash
npm run db:push       # Push schema changes to the database (no migration files)
npm run db:generate   # Generate Drizzle migration files
npm run db:studio     # Open Drizzle Studio (visual DB browser)
npx tsx scripts/test-approve.ts   # Run end-to-end requisition approval test
```

---

### 2. Dashboard (MHO Admin)

```bash
cd dashboard
npm install
npm run dev
```

Opens at `http://localhost:5173`.

The dashboard uses the backend at `http://localhost:3000` (no additional env config needed for local dev). Log in with the pre-filled demo credentials shown on the login screen.

---

### 3. Frontend (Flutter Nurse App)

**Prerequisites:** Flutter SDK, Android device or emulator with USB debugging enabled

```bash
cd frontend
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run
```

To use with a physical device over USB (ADB):

```bash
# In backend terminal
npm run dev:phone   # runs: adb reverse tcp:3000 tcp:3000 && tsx watch src/index.ts

# In frontend terminal
flutter run
```

---

## Fixed Demo Seed IDs

These UUIDs are stable across every reseed and are used by the Flutter app and test scripts:

| Entity | ID |
|---|---|
| MHO | `00000000-0000-4000-8000-000000000001` |
| Municipality (Nagcarlan) | `00000000-0000-0000-0000-000000000002` |
| Abo Health Center (RHU) | `00000000-0000-4000-8000-000000000010` |
| Abo Nurse | `00000000-0000-4000-8000-000000000011` |

---

## API Overview

All endpoints are under `/api`. Auth is header-simulated (no JWT for MVP):

```
X-User-Id: <uuid>
X-User-Role: nurse | mho
X-Rhu-Id: <uuid>         # required for nurse requests
```

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/medicines` | List all medicines |
| GET | `/api/rhu?municipalityId=` | List RHUs in a municipality |
| GET | `/api/rhu/:id` | Single RHU detail |
| POST | `/api/stock-entries` | Submit single stock count |
| POST | `/api/stock-entries/batch` | Batch offline sync flush |
| GET | `/api/stock-entries?rhuId=` | Stock history for an RHU |
| GET | `/api/dashboard/heatmap?municipalityId=` | Municipality heatmap data |
| GET | `/api/dashboard/rhu/:id` | Per-medicine drilldown for an RHU |
| GET | `/api/requisitions?municipalityId=&status=` | List requisitions |
| GET | `/api/requisitions/:id` | Requisition detail with items |
| POST | `/api/requisitions/:id/approve` | MHO approves, triggers PDF + email |
| GET | `/api/alerts` | Normalized alert feed — threshold breaches, anomaly spikes, silent facilities (role-scoped by header) |
| PATCH | `/api/alerts/anomalies/:id/acknowledge` | Acknowledge an anomaly spike; removes it from the feed and unblocks future detection |

---

## Roles

| Role | Client | Capabilities |
|---|---|---|
| **Nurse** | Flutter app | Submit stock counts, view days-remaining per medicine, see stock history chart, view RHU-scoped alerts (threshold breaches, anomaly spikes, participation alerts) |
| **MHO** | SvelteKit dashboard | Municipality heatmap, RHU drilldown, approve requisitions (triggers PDF + email to pharmacy), view and acknowledge municipality-wide alerts |