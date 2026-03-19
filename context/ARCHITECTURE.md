# Agap — Architecture & Tech Stack

> Predictive Medicine Stock Intelligence for Rural Health Units
> Hackathon project targeting rural health supply chain visibility in the Philippines.

---

## Monorepo Structure

```
Hackathon-CICS/
├── frontend/        # Flutter mobile app (Nurse offline app)
├── dashboard/       # SvelteKit web app (MHO admin dashboard)
├── backend/         # Hono API server (business logic layer)
├── context/         # Project documentation and agentic context
└── README.md
```

---

## 1. Frontend (Nurse App)

**Runtime:** Flutter (Dart SDK ^3.11.1)
**Target Platform:** Android (primary), offline-first, low-end device optimized

### State Management
| Package | Version | Purpose |
|---|---|---|
| `flutter_riverpod` | ^3.3.1 | App-wide state, async handling, role-based providers |
| `riverpod_annotation` | ^4.0.2 | Annotation support for Riverpod |
| `riverpod_generator` | ^4.0.3 | Code generation for `@riverpod` annotations |

### Local Database (Offline-First)
| Package | Version | Purpose |
|---|---|---|
| `drift` | ^2.31.0 | SQLite ORM — offline queue, local cache |
| `sqlite3_flutter_libs` | ^0.6.0 | SQLite native binaries for Android/iOS |
| `path_provider` | ^2.1.5 | Resolve local DB file path |
| `path` | ^1.9.1 | Path utilities for DB setup |
| `drift_dev` | ^2.31.0 | Code generation for Drift schemas |

> Drift stores stock submissions locally when the device is offline. On connectivity restore, the queue syncs to Supabase via the Hono backend.

### Networking
| Package | Version | Purpose |
|---|---|---|
| `dio` | ^5.9.2 | HTTP client — API calls to Hono backend |
| `connectivity_plus` | ^7.0.0 | Detect network state, trigger offline queue flush |

### UI & Visualization
| Package | Version | Purpose |
|---|---|---|
| `flutter_map` | ^8.2.2 | Barangay heatmap — RHU spatial overview for MHO |
| `fl_chart` | ^1.2.0 | Consumption velocity graphs, stock trend charts |
| `flutter_screenutil` | ^5.9.3 | Responsive layout for low-end screen sizes |
| `skeletonizer` | ^2.1.3 | Loading skeleton states |
| `cupertino_icons` | ^1.0.8 | Icon set |

### Notifications & Alerts
| Package | Version | Purpose |
|---|---|---|
| `flutter_local_notifications` | ^21.0.0 | Local alerts — threshold breaches, participation alerts |

### Security & Auth
| Package | Version | Purpose |
|---|---|---|
| `flutter_secure_storage` | ^10.0.0 | Secure token storage on device |

### PDF Generation
| Package | Version | Purpose |
|---|---|---|
| `pdf` | ^3.12.0 | Auto-generate pre-filled requisition PDFs |

### Dev Tools
| Package | Version | Purpose |
|---|---|---|
| `build_runner` | ^2.13.0 | Runs code generation (Drift + Riverpod) |
| `flutter_lints` | ^6.0.0 | Lint rules |

---

---

## 2. Dashboard (MHO Web App)

**Runtime:** Node.js (Vite)
**Framework:** SvelteKit (TypeScript)
**Styling:** Tailwind CSS

### Core Technologies
| Package | Purpose |
|---|---|
| `svelte` | Core UI compiler natively outputting lean DOM components |
| `@sveltejs/kit` | SSR and file-based routing architecture |
| `tailwindcss` v4 | Utility-first styling for hyper-rapid aesthetic prototyping (oklch colors) |
| `shadcn-svelte` | Beautiful, accessible component ecosystem based on `bits-ui` Headless architecture |
| `tailwind-variants` | Component variant styling API used alongside clsx/tailwind-merge |
| `maplibre-gl`| Core WebGL spatial rendering engine for displaying the PostGIS interactive Heatmap natively on web |
| `lucide-svelte` | High quality SVG icon pack |
| `mode-watcher` & `svelte-sonner` | Dark/light theme toggling and toast notifications |

> **Strategic Advantage:** Because the SvelteKit Dashboard and the Hono Backend are both built leveraging TypeScript, API Contracts and Drizzle Database Schemas can easily be shared inside the monorepo ensuring zero drift between admin components and database fields.

---

## 3. Backend (Hono API)

**Runtime:** Node.js
**Framework:** Hono (^4.12.8) — lightweight, TypeScript-first HTTP framework
**ORM:** Drizzle — TypeScript-native, pairs cleanly with Hono
**Database:** Supabase (PostgreSQL + PostGIS)

### Installed Packages
| Package | Purpose |
|---|---|
| `hono` | API routing and middleware |
| `typescript` | Type safety |
| `tsx` | TypeScript execution in dev |
| `@types/node` | Node.js type definitions |
| `drizzle-orm` | Type-safe DB queries |
| `drizzle-kit` | Schema migrations |
| `@supabase/supabase-js` | Supabase client (auth, realtime) |
| `@hono/node-server` | Node.js adapter for Hono |
| `dotenv` | Environment variable management |
| `nodemailer` / `resend` | Email dispatch for requisition PDFs |

### Responsibilities
- Consumption velocity engine (projects days until stockout)
- Anomaly detection (flags unusual demand spikes to MHO)
- Requisition auto-drafting and PDF email dispatch
- Audit trail logging (immutable state transitions)
- Participation monitoring (silent RHU alerts)

---

## Database

**Provider:** Supabase (hosted PostgreSQL)
**Spatial Extension:** PostGIS — powers barangay heatmap and RHU geolocation queries
**Realtime:** Supabase Realtime — MHO dashboard live updates

### Key Tables
| Table | Purpose |
|---|---|
| `rhu` | Rural Health Unit registry (name, barangay, municipality, coordinates) |
| `medicines` | Medicine catalog (generic name, unit, category) |
| `stock_entries` | Nurse submissions — quantity on hand, timestamped |
| `consumption_baselines` | 30-day rolling baselines per medicine per RHU |
| `threshold_breaches` | Flagged stockout projections with projected zero date |
| `requisitions` | Auto-drafted + MHO-approved resupply requests |
| `audit_log` | Immutable state transition log with actor + timestamp |
| `users` | Auth users (nurse, MHO roles) linked to RHU |

---

## Data Flow

```
Nurse submits stock count
  │
  ├── [offline] → saved to Drift (local SQLite queue)
  │                 └── connectivity returns → synced to Hono
  │
  └── [online] → Dio sends to Hono API
                    └── Hono runs velocity engine
                          └── writes to Supabase
                                └── threshold breach?
                                      ├── yes → draft requisition + notify MHO
                                      └── no  → update dashboard
```

---

## Code Generation

After modifying Drift schemas or Riverpod providers, run:

```bash
cd frontend
dart run build_runner build --delete-conflicting-outputs
```

---

## Roles

| Role | Access |
|---|---|
| **Nurse** | Submit stock counts, view days-remaining per medicine, see sync status |
| **MHO** | Heatmap dashboard, approve requisitions, receive breach + silence alerts |
