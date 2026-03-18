# Agap — Backend Architecture

## Overview

Hono API server on Node.js. Handles business logic, consumption velocity engine, anomaly detection, requisition workflow, and audit logging. Connects to Supabase PostgreSQL.

---

## Folder Structure

```
backend/
├── src/
│   ├── index.ts                     # Hono app entry point, mount routes
│   ├── env.ts                       # Environment variable validation
│   │
│   ├── db/                          # Drizzle ORM setup
│   │   ├── client.ts                # Drizzle instance + Supabase connection
│   │   ├── schema/                  # Table definitions
│   │   │   ├── users.ts
│   │   │   ├── rhu.ts
│   │   │   ├── medicines.ts
│   │   │   ├── stock-entries.ts
│   │   │   ├── consumption-baselines.ts
│   │   │   ├── threshold-breaches.ts
│   │   │   ├── requisitions.ts
│   │   │   ├── requisition-items.ts
│   │   │   ├── audit-log.ts
│   │   │   └── index.ts             # Re-export all schemas
│   │   └── migrations/              # Drizzle Kit migration files
│   │
│   ├── routes/                      # Hono route handlers
│   │   ├── auth.ts                  # Login, token refresh
│   │   ├── stock-entries.ts         # CRUD + sync endpoint
│   │   ├── medicines.ts             # Medicine catalog
│   │   ├── rhu.ts                   # RHU registry
│   │   ├── dashboard.ts             # MHO dashboard data (PostGIS)
│   │   ├── requisitions.ts          # Requisition CRUD + approve
│   │   ├── alerts.ts                # Breach + anomaly + participation alerts
│   │   └── audit.ts                 # Audit trail read-only
│   │
│   ├── services/                    # Business logic
│   │   ├── velocity-engine.ts       # Consumption velocity calculations
│   │   ├── anomaly-detection.ts     # Demand spike detection
│   │   ├── requisition-service.ts   # Auto-draft, approve, email workflow
│   │   ├── participation-monitor.ts # Silent RHU detection
│   │   ├── audit-service.ts         # Append audit log entries
│   │   └── email-service.ts         # PDF email dispatch
│   │
│   ├── middleware/                   # Hono middleware
│   │   ├── auth.ts                  # JWT verification, attach user to context
│   │   └── role-guard.ts            # Role-based access control
│   │
│   └── utils/                       # Shared utilities
│       ├── errors.ts                # Custom error classes
│       └── pdf-generator.ts         # Requisition PDF generation
│
├── drizzle.config.ts                # Drizzle Kit config
├── package.json
├── tsconfig.json
└── .env                             # Environment variables (git-ignored)
```

---

## API Endpoints

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, return JWT |
| POST | `/api/auth/refresh` | Auth | Refresh token |

### Stock Entries
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/stock-entries` | Nurse | Submit stock count (single) |
| POST | `/api/stock-entries/batch` | Nurse | Submit batch (offline sync flush) |
| GET | `/api/stock-entries?rhu_id=` | Auth | Get entries for an RHU |

### Medicines
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/medicines` | Auth | List all medicines |

### RHU
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/rhu` | MHO | List RHUs in MHO's municipality |
| GET | `/api/rhu/:id` | Auth | Get single RHU detail |

### Dashboard
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/dashboard/heatmap` | MHO | All RHUs with coordinates + worst days_remaining |
| GET | `/api/dashboard/rhu/:id` | MHO | Drill-down: medicine-level status for an RHU |

### Requisitions
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/requisitions` | MHO | List requisitions (filterable by status) |
| GET | `/api/requisitions/:id` | MHO | Single requisition detail |
| POST | `/api/requisitions/:id/approve` | MHO | Approve → triggers email |

### Alerts
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/alerts` | Auth | Get alerts for user's scope |

---

## Business Logic

### Velocity Engine (`velocity-engine.ts`)

Triggered on every new stock entry:

```
Input: new stock_entry (rhu_id, medicine_id, quantity, timestamp)

1. Fetch previous stock_entry for same rhu_id + medicine_id
2. Calculate:
   - days_elapsed = (new.timestamp - prev.timestamp) in days
   - units_consumed = prev.quantity - new.quantity
   - velocity = units_consumed / days_elapsed
3. Update 30-day rolling average in consumption_baselines
4. Calculate days_remaining = new.quantity / velocity
5. If days_remaining <= medicine.critical_threshold_days:
   - Create threshold_breach record
   - Trigger requisition auto-draft
   - Log to audit trail
```

### Anomaly Detection (`anomaly-detection.ts`)

Runs after velocity engine:

```
Input: current velocity, baseline velocity

1. anomaly_ratio = current_velocity / baseline_velocity
2. If anomaly_ratio > ANOMALY_THRESHOLD (default 2.0):
   - Flag as anomaly
   - Notify MHO
   - Log to audit trail
```

### Participation Monitor (`participation-monitor.ts`)

Runs on a schedule (cron or triggered check):

```
1. For each RHU in the system:
   - Fetch latest stock_entry timestamp
   - If (now - latest) > SILENCE_THRESHOLD_DAYS (default 3):
     - Create participation alert for MHO
     - Log to audit trail
```

---

## Environment Variables

```env
DATABASE_URL=postgresql://...          # Supabase PostgreSQL connection string
SUPABASE_URL=https://xxx.supabase.co   # Supabase project URL
SUPABASE_ANON_KEY=eyJ...               # Supabase anon key
SUPABASE_SERVICE_KEY=eyJ...            # Supabase service role key
JWT_SECRET=...                         # JWT signing secret
EMAIL_FROM=agap@example.com            # Sender email
EMAIL_API_KEY=...                      # Resend/SMTP API key
PORT=3000                              # Server port
```

---

## Middleware Stack

```
Request
  → Auth middleware (verify JWT, attach user)
    → Role guard (check nurse/mho access)
      → Route handler
        → Service layer (business logic)
          → Drizzle ORM (database)
            → Response
```
