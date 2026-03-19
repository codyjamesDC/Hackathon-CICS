# Agap — Frontend & Dashboard Architectures

## Overview

We utilize a decoupled two-client architecture to maximize platform strengths:
1. **Frontend (`frontend/`)**: Flutter mobile app strictly for the **Nurse** role. Offline-first, optimized for low-end Android devices with intermittent connectivity via local Drift SQLite queuing.
2. **Dashboard (`dashboard/`)**: SvelteKit web app specifically for the **MHO** administrator. Visually premium Tailwind designs, full browser-native HTML canvas mapping architectures for the PostGIS heatmap, and **strictly client-side data fetching via `@tanstack/svelte-query`** (SvelteKit SSR `load` functions are explicitly prohibited).

---

## Folder Structure

```
lib/
├── main.dart                        # App entry point, ProviderScope, router
├── app.dart                         # MaterialApp + theme configuration
│
├── core/                            # Shared infrastructure
│   ├── database/                    # Drift database setup
│   │   ├── app_database.dart        # Database class, tables, DAOs
│   │   └── app_database.g.dart      # Generated code (build_runner)
│   ├── network/                     # Networking layer
│   │   ├── api_client.dart          # Dio instance + interceptors
│   │   ├── api_endpoints.dart       # Endpoint constants
│   │   └── connectivity_service.dart # Connectivity monitoring
│   ├── sync/                        # Offline sync engine
│   │   ├── sync_service.dart        # Queue flush logic
│   │   └── sync_queue.dart          # Local queue management
│   ├── auth/                        # Authentication
│   │   ├── auth_provider.dart       # Auth state (Riverpod)
│   │   ├── auth_service.dart        # Login/logout, token refresh
│   │   └── secure_storage.dart      # flutter_secure_storage wrapper
│   ├── theme/                       # App-wide theming
│   │   └── app_theme.dart           # Colors, typography, component themes
│   └── utils/                       # Shared utilities
│       ├── date_utils.dart          # Date formatting helpers
│       └── constants.dart           # App-wide constants
│
├── features/                        # Feature modules (one folder per feature)
│   ├── stock_entry/                 # Nurse: submit stock counts
│   │   ├── data/
│   │   │   ├── stock_entry_repository.dart
│   │   │   └── stock_entry_local_source.dart
│   │   ├── domain/
│   │   │   └── stock_entry_model.dart
│   │   ├── presentation/
│   │   │   ├── stock_entry_screen.dart
│   │   │   ├── stock_entry_provider.dart
│   │   │   └── widgets/
│   │   │       └── medicine_input_tile.dart
│   │   └── README.md
│   │

│   ├── consumption/                 # Days-remaining display + charts
│   │   ├── data/
│   │   │   └── consumption_repository.dart
│   │   ├── domain/
│   │   │   └── baseline_model.dart
│   │   ├── presentation/
│   │   │   ├── consumption_screen.dart
│   │   │   ├── consumption_provider.dart
│   │   │   └── widgets/
│   │   │       └── velocity_chart.dart
│   │   └── README.md
│   │

│   └── auth/                        # Login screen
│       ├── presentation/
│       │   ├── login_screen.dart
│       │   └── login_provider.dart
│       └── README.md
│
└── shared/                          # Shared widgets, not feature-specific
    └── widgets/
        ├── loading_skeleton.dart
        └── sync_status_banner.dart
```

---

## Architecture Pattern

**Feature-first + layered** — each feature folder has:

| Layer | Responsibility |
|---|---|
| `data/` | Repository + data sources (API, local DB). Implements domain contracts. |
| `domain/` | Models (data classes). Pure Dart, no Flutter imports. |
| `presentation/` | Screens, providers (Riverpod), widgets. UI logic only. |

---

## State Management Conventions

### Riverpod Providers
- Use `@riverpod` annotation + code generation for all providers
- One provider file per screen/feature concern
- Providers go in `presentation/` alongside the screen that uses them
- Shared providers go in `core/`

### Naming
- Providers: `somethingProvider` (generated from `@riverpod something(...)`)
- Async providers: return `AsyncValue<T>`
- Repositories: suffixed with `Repository`, injected via provider

### Example
```dart
@riverpod
Future<List<StockEntry>> stockEntries(Ref ref) async {
  final repo = ref.watch(stockEntryRepositoryProvider);
  return repo.getEntries();
}
```

---

## Offline-First Pattern

```
User Action
  │
  ├── Write to Drift (local SQLite) immediately
  │     └── Mark as `synced: false`
  │
  ├── Check connectivity
  │     ├── [online]  → Send to Hono API via Dio
  │     │                 └── On success → mark as `synced: true`
  │     └── [offline] → Stay in local queue
  │
  └── connectivity_plus listener
        └── On connectivity restored → flush sync queue
```

---

## Navigation

Role-based routing:
- **Nurse** → Stock Entry, My RHU Status, Alerts

Use Flutter's `GoRouter` or simple `Navigator` with role-based guards in the auth provider.

---

## Screen Inventory

### Flutter (Nurse App)
| Screen | Role | Description |
|---|---|---|
| Stock Entry | Nurse | List of medicines, enter quantities, submit |
| My RHU Status | Nurse | Days remaining per medicine, sync status |
| Sync Status | Nurse | View local queue and connectivity status |
*(Note: Login skipped if skipping auth)*

### SvelteKit (MHO Dashboard)
| Screen | Role | Description |
|---|---|---|
| Dashboard/Heatmap | MHO | Spatial overview of all RHUs, breach metrics |
| RHU Drill-down | MHO | Full-width single-column layout with horizontal stat chips and inline medicine row expansion for ECharts trend visualizations |
| Requisitions | MHO | Manage system-drafted and pending requests |
| Alerts | MHO | View anomaly spikes, breaches, and silent RHUs |

---

## SvelteKit Dashboard Architecture (MHO)

**MHO Dashboard** uses standard `SvelteKit` file-based `+page.svelte` routing driven by `Tailwind CSS v4` and `shadcn-svelte`.

### Folder Structure Overview
```
dashboard/
├── src/
│   ├── app.html                  # Root template wrapper with Google Fonts
│   ├── lib/                      # Reusable modular code
│   │   ├── components/           # UI Components
│   │   │   ├── ui/               # shadcn-svelte auto-generated primitives
│   │   │   └── app-sidebar.svelte# Main layout sidebar navigation
│   │   ├── server/               # Server-only secrets
│   │   └── utils.ts              # cn() tailwind-merge utilities
│   └── routes/                   # File-based routing
│       ├── +layout.svelte        # Outer generic shell (Sidebar, ModeWatcher, Toaster)
│       ├── layout.css            # Global stylesheet with oklch themes
│       ├── +page.svelte          # Homepage Heatmap Overview + Metrics
│       ├── alerts/               # System alerts and notifications route
│       │   └── +page.svelte      # Alert grouped cards
│       ├── requisitions/         # /requisitions Route
│       │   ├── +page.svelte      # Data grid of drafts + approvals
│       │   └── [id]/             # /requisitions/:id Drill-down Route
│       └── rhu/
│           └── [id]/             # Specific RHU Inventory Drill-down views
```

### MapLibre GL WebGL Integration
Unlike Flutter's restricted `flutter_map`, navigating spatial PostGIS boundaries natively via `maplibre-gl` GPU-accelerated WebGL shaders through Svelte `onMount` bindings guarantees top-tier performance for the `GET /api/dashboard/heatmap` response.

### TypeScript Monorepo Advantage
The `dashboard` and `backend` are both node-based TypeScript workspaces. The frontend fetches raw typed endpoints and guarantees compile-time safety against the Drizzle Database model definitions saving colossal scaffolding cycles.

---

## Code Generation

After any change to Drift tables or `@riverpod` annotations:

```bash
cd frontend
dart run build_runner build --delete-conflicting-outputs
```
