# Agap — Frontend Architecture

## Overview

Flutter mobile app with two role-based experiences (Nurse, MHO) sharing the same codebase. Offline-first, optimized for low-end Android devices with intermittent connectivity.

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
│   ├── dashboard/                   # MHO: heatmap + overview
│   │   ├── data/
│   │   │   └── dashboard_repository.dart
│   │   ├── domain/
│   │   │   └── rhu_status_model.dart
│   │   ├── presentation/
│   │   │   ├── dashboard_screen.dart
│   │   │   ├── dashboard_provider.dart
│   │   │   └── widgets/
│   │   │       ├── rhu_heatmap.dart
│   │   │       └── urgency_legend.dart
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
│   ├── requisition/                 # MHO: approve requisitions
│   │   ├── data/
│   │   │   └── requisition_repository.dart
│   │   ├── domain/
│   │   │   └── requisition_model.dart
│   │   ├── presentation/
│   │   │   ├── requisition_list_screen.dart
│   │   │   ├── requisition_detail_screen.dart
│   │   │   ├── requisition_provider.dart
│   │   │   └── widgets/
│   │   │       └── requisition_card.dart
│   │   └── README.md
│   │
│   ├── alerts/                      # Notifications display
│   │   ├── data/
│   │   │   └── alerts_repository.dart
│   │   ├── domain/
│   │   │   └── alert_model.dart
│   │   ├── presentation/
│   │   │   ├── alerts_screen.dart
│   │   │   └── alerts_provider.dart
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
- **MHO** → Dashboard (Heatmap), Requisitions, Alerts, All RHUs

Use Flutter's `GoRouter` or simple `Navigator` with role-based guards in the auth provider.

---

## Screen Inventory

| Screen | Role | Description |
|---|---|---|
| Login | Both | Email + password, token stored securely |
| Stock Entry | Nurse | List of medicines, enter quantities, submit |
| My RHU Status | Nurse | Days remaining per medicine, sync status |
| Dashboard | MHO | Heatmap of all RHUs, color by urgency |
| RHU Detail | MHO | Drill into one RHU's medicine status |
| Requisitions | MHO | List of pending/approved requisitions |
| Requisition Detail | MHO | View items, approve, see audit trail |
| Alerts | Both | Threshold breaches, anomalies, participation alerts |

---

## Code Generation

After any change to Drift tables or `@riverpod` annotations:

```bash
cd frontend
dart run build_runner build --delete-conflicting-outputs
```
