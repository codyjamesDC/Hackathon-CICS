# Agap — Backend Architecture

## Overview

Hono API server on Node.js. Handles business logic, consumption velocity engine, anomaly detection, requisition workflow, and audit logging. Connects to Supabase PostgreSQL.

---

## Folder Structure

```
backend/
├── src/
│   ├── index.ts                     # Hono app entry point, mount routes
│   │
│   ├── common/                      # Shared utilities across modules
│   │   └── utils/
│   │       ├── drizzle.ts           # Timestamp definitions, formatting
│   │       └── exceptions.ts        # Standardized HTTP error factories
│   │
│   ├── db/                          # Database configuration
│   │   ├── client.ts                # Drizzle instance + Supabase connection
│   │   └── schema/
│   │       └── index.ts             # Barrel export for Drizzle Kit
│   │
│   ├── stock-entries/               # Feature Module Structure (4-Layer)
│   │   ├── stock-entries.controller.ts
│   │   ├── stock-entries.dto.ts     # Zod validation schemas
│   │   ├── stock-entries.service.ts
│   │   ├── stock-entries.repository.ts
│   │   └── stock-entries.schema.ts  # Co-located Drizzle schema
│   │
│   ├── requisitions/                # Auto-draft, approval workflow
│   ├── alerts/                      # Threshold breaches
│   ├── medicines/                   # Medicine catalog
│   ├── rhu/                         # Rural Health Units
│   ├── users/                       # Nurses and MHOs (Auth)
│   ├── audit/                       # Append-only logging
│   ├── dashboard/                   # MHO Heatmap and summary stats
│   ├── velocity-engine/             # Core predictive engine
│   ├── anomaly-detection/           # Spike detection
│   └── participation-monitor/       # Silent RHU detection
│
├── drizzle.config.ts                # Drizzle Kit config
├── package.json
├── tsconfig.json                    # Strict type-checking, NodeNext resolution
└── .env.example                     # Environment template
```

---

## Architecture Pattern (4-Layer)

The backend follows a strict 4-layer structure to separate concerns, adapted from standard `@kubo` module patterns for clarity:

1. **Controller Layer (`*.controller.ts`)**: Defines Hono HTTP routes, uses `@hono/zod-validator` combined with Zod DTOs (`*.dto.ts`) to strictly validate POST/PUT payload structures, and calls the appropriate Service. DTOs are lightweight and only applied to routes accepting user input.
2. **Service Layer (`*.service.ts`)**: Orchestrates business logic, makes external API calls (e.g. email, PDF gen), triggers other engines (like `velocity-engine`), and calls the Repository.
3. **Repository Layer (`*.repository.ts`)**: The ONLY place where Drizzle ORM `.select()`, `.insert()`, etc. are executed. Abstracts database operations entirely from business logic.
4. **Schema Layer (`*.schema.ts`)**: Drizzle table definitions and TS type inference, now co-located directly inside the feature module.

This guarantees that routes don't contain SQL queries, and database updates instantly trigger audit logs and engines without spaghetti code.

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
