# Agap — Flutter Nurse App MVP Plan

> **Scope:** Nurse-role only. Fully online (no offline sync for MVP). Mirrors the design language of the SvelteKit MHO dashboard.
> **Target:** Android (primary), Flutter SDK ^3.11.1, Dart SDK ^3.11.1

---

## Package Arsenal

All packages are already declared in `pubspec.yaml`. Key ones driving speed:

| Package | Role |
|---|---|
| `shadcn_ui` ^0.52.1 | Pre-built, beautifully styled UI components (cards, buttons, badges, dialogs, toasts) — Flutter's answer to shadcn-svelte |
| `flutter_riverpod` + `riverpod_annotation` + `riverpod_generator` | Full code-gen state management — `@riverpod` annotations auto-generate providers |
| `dio` ^5.9.2 | HTTP client with interceptor support for injecting auth headers globally |
| `skeletonizer` ^2.1.3 | Zero-effort loading skeletons — wrap any widget tree |
| `flutter_screenutil` ^5.9.3 | Responsive sizing (`16.w`, `12.h`, `14.sp`) for low-end Android |
| `iconsax_flutter` ^1.0.1 | Rich icon pack matching the dashboard's aesthetic (Lucide-equivalent for Flutter) |
| `gap` ^3.0.1 | `Gap(16)` instead of `SizedBox(height: 16)` |
| `fl_chart` ^1.2.0 | Consumption velocity line charts |
| `flutter_secure_storage` ^10.0.0 | Store nurse session (userId, rhuId, name) |
| `flutter_local_notifications` ^21.0.0 | On-device alerts for threshold breaches |
| `connectivity_plus` ^7.0.0 | Network state awareness |

> After any `@riverpod` annotation change, always run:
> ```bash
> dart run build_runner build --delete-conflicting-outputs
> ```

---

## Design System — Matching the Dashboard

### Color Palette (Dark-first, maps to dashboard oklch values)

```dart
// lib/core/theme/app_colors.dart
static const Color primary    = Color(0xFF38BDF8); // teal/cyan — matches oklch(0.7 0.15 180)
static const Color background = Color(0xFF111111); // zinc-900
static const Color surface    = Color(0xFF1C1C1C); // zinc-800 (cards)
static const Color surfaceAlt = Color(0xFF252525); // zinc-700 (input backgrounds)
static const Color border     = Color(0xFF2A2A2A); // zinc-700/50

// Status colors — exact match to dashboard
static const Color statusCritical = Color(0xFFF87171); // red-400
static const Color statusWarning  = Color(0xFFFB923C); // orange-400
static const Color statusOk       = Color(0xFF4ADE80); // green-400
static const Color statusSilent   = Color(0xFF9CA3AF); // gray-400

static const Color textPrimary   = Color(0xFFF4F4F5); // zinc-100
static const Color textSecondary = Color(0xFFA1A1AA); // zinc-400
static const Color textMuted     = Color(0xFF71717A); // zinc-500
```

### Typography
- **Font:** Inter (add `google_fonts: ^6.2.1` or bundle Inter TTF)
- Sizes via `flutter_screenutil`: `14.sp` body, `16.sp` subtitle, `20.sp` title, `24.sp` heading

### Radii & Spacing
- Card radius: `12.r` (matches dashboard `--radius: 0.625rem`)
- Standard padding: `16.w` horizontal, `20.h` vertical
- Gap between elements: `Gap(12)` or `Gap(16)`

### Component Conventions
- Use `ShadCard` from `shadcn_ui` for all card surfaces
- Use `ShadButton` (primary/outline/ghost variants) for all CTAs
- Use `ShadBadge` for status chips (critical/warning/ok/silent)
- Use `ShadToast` via `ShadSonner` for all success/error feedback
- `Skeletonizer(enabled: isLoading, child: ...)` wraps all async content

---

## Folder Structure

```
lib/
├── main.dart                          # ProviderScope + ScreenUtilInit + app entry
├── app.dart                           # ShadApp (MaterialApp wrapper) + GoRouter
│
├── core/
│   ├── network/
│   │   ├── api_client.dart            # Dio singleton + auth interceptor
│   │   └── api_endpoints.dart         # All endpoint path constants
│   ├── auth/
│   │   ├── auth_provider.dart         # @riverpod — session state (nurseId, rhuId, name)
│   │   ├── auth_service.dart          # Read/write flutter_secure_storage
│   │   └── secure_storage.dart        # Storage key constants + wrapper
│   ├── theme/
│   │   ├── app_theme.dart             # ShadThemeData + ThemeData dark config
│   │   └── app_colors.dart            # All Color constants
│   └── utils/
│       ├── date_utils.dart            # ISO 8601 helpers, relative time strings
│       └── constants.dart             # SEED_IDS, BASE_URL, SILENCE_THRESHOLD
│
├── features/
│   ├── auth/
│   │   └── presentation/
│   │       ├── login_screen.dart      # Screen: pick nurse session
│   │       └── login_provider.dart    # @riverpod loginNotifier
│   │
│   ├── stock_entry/
│   │   ├── data/
│   │   │   └── stock_entry_repository.dart
│   │   ├── domain/
│   │   │   └── stock_entry_model.dart
│   │   └── presentation/
│   │       ├── stock_entry_screen.dart
│   │       ├── stock_entry_provider.dart
│   │       └── widgets/
│   │           └── medicine_input_tile.dart
│   │
│   ├── rhu_status/
│   │   ├── data/
│   │   │   └── rhu_status_repository.dart
│   │   ├── domain/
│   │   │   └── medicine_status_model.dart
│   │   └── presentation/
│   │       ├── rhu_status_screen.dart
│   │       ├── rhu_status_provider.dart
│   │       └── widgets/
│   │           ├── medicine_status_tile.dart
│   │           ├── status_badge.dart
│   │           └── days_remaining_chart.dart
│   │
│   └── alerts/
│       ├── data/
│       │   └── alerts_repository.dart
│       ├── domain/
│       │   └── alert_model.dart
│       └── presentation/
│           ├── alerts_screen.dart
│           └── alerts_provider.dart
│
└── shared/
    └── widgets/
        ├── loading_skeleton.dart      # Skeletonizer wrapper presets
        ├── status_badge.dart          # Reusable colored badge chip
        ├── app_bar_widget.dart        # Shared page header
        └── error_state.dart           # Consistent error + retry widget
```

---

## Phase 0 — Project Bootstrap

### TODO

- [ ] **0.1** Replace `lib/main.dart` — wrap with `ProviderScope`, `ScreenUtilInit`, and `ShadApp`
- [ ] **0.2** Create `lib/app.dart` — configure `GoRouter` with 4 named routes: `/login`, `/stock-entry`, `/rhu-status`, `/alerts`
- [ ] **0.3** Create `lib/core/theme/app_colors.dart` — all Color constants matching dashboard palette
- [ ] **0.4** Create `lib/core/theme/app_theme.dart` — `ShadThemeData` dark + `ThemeData` with Inter font, dark colorScheme seeded from `primary` color
- [ ] **0.5** Create `lib/core/network/api_endpoints.dart` — `baseUrl`, all path constants
- [ ] **0.6** Create `lib/core/network/api_client.dart` — Dio singleton with `AuthInterceptor` that injects `X-User-Id`, `X-User-Role: nurse`, `X-Rhu-Id` from `flutter_secure_storage` on every request
- [ ] **0.7** Create `lib/core/utils/constants.dart` — `kBaseUrl`, `kSeedNurseId`, `kSeedRhuId`, `kSilenceThresholdDays`
- [ ] **0.8** Create `lib/core/auth/secure_storage.dart` — typed wrapper for `flutter_secure_storage` (keys: `userId`, `rhuId`, `userName`, `rhuName`)
- [ ] **0.9** Create `lib/core/auth/auth_service.dart` — `saveSession()`, `loadSession()`, `clearSession()` using secure storage
- [ ] **0.10** Create `lib/core/auth/auth_provider.dart` — `@riverpod` `AuthNotifier` holding `AuthState(userId, rhuId, userName, rhuName, isLoggedIn)`

**Key implementation notes for Phase 0:**

```dart
// main.dart shape
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ScreenUtil.ensureScreenSize();
  runApp(const ProviderScope(child: AgapApp()));
}

// app.dart shape — ShadApp is the root (from shadcn_ui)
class AgapApp extends ConsumerWidget {
  const AgapApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ScreenUtilInit(
      designSize: const Size(390, 844), // iPhone 14 Pro reference
      minTextAdapt: true,
      builder: (_, __) => ShadApp.router(
        darkTheme: AppTheme.dark(),
        themeMode: ThemeMode.dark,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
```

```dart
// api_client.dart — AuthInterceptor injects headers
class AuthInterceptor extends Interceptor {
  final AuthService _auth;
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final session = await _auth.loadSession();
    if (session != null) {
      options.headers['X-User-Id']   = session.userId;
      options.headers['X-User-Role'] = 'nurse';
      options.headers['X-Rhu-Id']    = session.rhuId;
    }
    handler.next(options);
  }
}
```

---

## Phase 1 — Login Screen (No Auth)

> **Concept:** Nurse types their name → app queries `/api/rhu` to show a dropdown of available RHUs → nurse selects their RHU → session saved to `flutter_secure_storage`. No password. One tap to continue.
>
> For MVP, hardcode the seeded nurse + RHU IDs as the "account" so the demo works immediately.

### TODO

- [ ] **1.1** Create `lib/features/auth/presentation/login_provider.dart`
  - `@riverpod` `LoginNotifier` with state: `{isLoading, error}`
  - Method: `login(String nurseId, String rhuId, String name, String rhuName)` → calls `AuthService.saveSession()` → navigates to `/stock-entry`
- [ ] **1.2** Create `lib/features/auth/presentation/login_screen.dart`

**Screen layout:**

```
┌─────────────────────────────────────┐
│                                     │
│   [Agap logo / wordmark]            │
│   "Medicine Stock Intelligence"     │
│   subtitle in muted text            │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ ShadCard — surface bg       │   │
│   │                             │   │
│   │  "Welcome, Nurse"           │   │
│   │  "Select your account to    │   │
│   │   continue"                 │   │
│   │                             │   │
│   │  [ShadSelect — RHU/Nurse    │   │
│   │   account picker]           │   │
│   │                             │   │
│   │  [ShadButton primary —      │   │
│   │   "Continue →"]             │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│                                     │
│   version tag in bottom muted text  │
└─────────────────────────────────────┘
```

**Accounts list (hardcoded for MVP — seeded data):**

```dart
// constants.dart
// ⚠️  RESEED WARNING: These UUIDs come from the database seeder.
// After every `npm run seed` (or equivalent), check the seeder console output
// for the new NURSE_ID and RHU_ID and update the two values below manually.
// Failing to do this means login will silently use a stale ID that no longer exists.
const kNurseAccounts = [
  NurseAccount(
    userId: '13217702-e1d5-4bfb-bb56-1aec4b8783db', // ← update after reseed
    rhuId:  'b9b2ec99-379c-49e0-bb08-02503f956f26', // ← update after reseed
    name:   'Nurse (Seeded)',
    rhuName: 'Seeded RHU',
  ),
];
```

- [ ] **1.3** On app boot in `main.dart` or router redirect — check `AuthService.loadSession()`. If session exists → redirect to `/stock-entry`. If not → `/login`
- [ ] **1.4** Add logout accessible from the app's bottom nav (ghost button, clears session + redirects to `/login`)

---

## Phase 2 — Core Navigation Shell

> Bottom navigation bar with 3 tabs. Matches the sidebar feel of the dashboard but adapted to mobile bottom-nav pattern.

### TODO

- [ ] **2.1** Create `lib/shared/widgets/app_shell.dart` — `Scaffold` with `BottomNavigationBar` (or `NavigationBar` from Material 3)

**Navigation tabs:**

| Index | Icon (Iconsax) | Label | Route |
|---|---|---|---|
| 0 | `Iconsax.clipboard_tick` | Submit | `/stock-entry` |
| 1 | `Iconsax.health` | My RHU | `/rhu-status` |
| 2 | `Iconsax.notification` | Alerts | `/alerts` |

**Shell styling:**
```dart
NavigationBar(
  backgroundColor: AppColors.surface,        // zinc-800
  indicatorColor: AppColors.primary.withOpacity(0.15),
  labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
  // selectedIndex drives GoRouter shell branches
)
```

- [ ] **2.2** Refactor GoRouter to use `ShellRoute` so bottom nav persists across tab switches
- [ ] **2.3** Add `AppBar` widget (`lib/shared/widgets/app_bar_widget.dart`) used by each screen:
  - Left: "Agap" wordmark in primary color
  - Right: connectivity indicator dot (green/red via `connectivity_plus`)
  - Subtitle: logged-in nurse's RHU name from `authProvider`

---

## Phase 3 — Stock Entry Screen

> **Goal:** Submit all medicine stock counts in ≤90 seconds. The core nurse workflow.

### API integration:
- `GET /api/medicines` → populate medicine list
- `POST /api/stock-entries/batch` → submit all quantities in one call

### TODO

- [ ] **3.1** Create `lib/features/stock_entry/domain/stock_entry_model.dart`
  ```dart
  class StockEntryRequest { final String rhuId, medicineId; final int quantityOnHand; final String submittedAt; }
  class StockEntryVelocity { final double velocityPerDay, daysRemaining; final bool breachTriggered; }
  class StockEntryResponse { final String id, rhuId, medicineId; final StockEntryVelocity velocity; }
  class BatchStockEntryResponse { final List<StockEntryResponse> entries; }
  class MedicineModel { final String id, genericName, unit, category; final int criticalThresholdDays; }
  ```

- [ ] **3.2** Create `lib/features/stock_entry/data/stock_entry_repository.dart`
  - `Future<List<MedicineModel>> getMedicines()` → `GET /api/medicines`
  - `Future<BatchStockEntryResponse> submitBatch(List<StockEntryRequest> entries)` → `POST /api/stock-entries/batch`

- [ ] **3.3** Create `lib/features/stock_entry/presentation/stock_entry_provider.dart`
  ```dart
  @riverpod
  Future<List<MedicineModel>> medicines(Ref ref) async { ... } // fetches medicine list

  @riverpod
  class StockEntryNotifier extends _$StockEntryNotifier {
    // state: Map<medicineId, int> quantities + submission status
    void updateQuantity(String medicineId, int qty) { ... }
    Future<void> submitAll() async {
      final rhuId = ref.read(authProvider).rhuId;
      final entries = state.quantities.entries.map((e) => StockEntryRequest(
        medicineId: e.key,
        quantityOnHand: e.value,
        rhuId: rhuId,
        submittedAt: DateTime.now().toUtc().toIso8601String(),
      )).toList();
      await ref.read(stockEntryRepositoryProvider).submitBatch(entries); // 1 call, not 12
    }
  }
  ```

- [ ] **3.4** Create `lib/features/stock_entry/presentation/stock_entry_screen.dart`

**Screen layout:**

```
┌─────────────────────────────────────┐
│  AppBar: "Submit Stock Count"       │
│  subtitle: "Brgy. [RHU Name]"       │
│  right: date chip (today)           │
├─────────────────────────────────────┤
│  Skeletonizer(                      │
│    enabled: medicinesAsync.isLoading│
│    child: ListView.builder(         │
│      itemCount: medicines.length,   │
│      itemBuilder: (ctx, i) =>       │
│        MedicineInputTile(...)       │
│    )                                │
│  )                                  │
├─────────────────────────────────────┤
│  [ShadButton primary — full width]  │
│  "Submit Count"                     │
│  shows CircularProgressIndicator    │
│  while submitting                   │
└─────────────────────────────────────┘
```

- [ ] **3.5** Create `lib/features/stock_entry/presentation/widgets/medicine_input_tile.dart`

**Tile layout:**
```
┌─────────────────────────────────────────┐
│  [Icon: pill]  Amoxicillin 500mg        │
│                antibiotic · capsule     │
│                                         │
│  Qty on hand: [─────] [+] [-]           │
│               numeric input (large tap) │
└─────────────────────────────────────────┘
```
- Large number `TextField` (keyboardType: number) centered, with `+`/`-` `IconButton` flanks
- `ShadCard` container, `12.r` border radius
- Quantity defaults to `0`; red border if left at `0` and user taps submit

- [ ] **3.6** On successful submit:
  - Show `ShadSonner` toast: "Stock count submitted ✓"
  - If any `velocity.breachTriggered == true` → show a `ShadAlert` dialog: "⚠ Threshold breach detected for [medicineName]. MHO has been notified."
  - Reset all quantities to 0 after confirm
  - Trigger local notification via `flutter_local_notifications` for each breach

- [ ] **3.7** Error handling:
  - Network error → `ShadSonner` toast error: "Submission failed. Check connection."
  - Partial failure (one medicine fails) → list failed medicines in error dialog

---

## Phase 4 — RHU Status Screen

> **Goal:** Nurse sees days-remaining per medicine for their RHU at a glance. Read-only dashboard equivalent.

### API integration:
- `GET /api/dashboard/rhu/:id` → full medicine status for the nurse's RHU

### TODO

- [ ] **4.1** Create `lib/features/rhu_status/domain/medicine_status_model.dart`
  ```dart
  class MedicineStatusModel {
    final String medicineId, genericName, unit, category;
    final int currentStock;
    final double velocityPerDay, daysRemaining;
    final int criticalThresholdDays;
    final String status; // 'ok' | 'warning' | 'critical' | 'silent'
    final String? lastEntryAt;
  }
  class RhuStatusModel {
    final String id, name, barangay;
    final List<MedicineStatusModel> medicines;
  }
  ```

- [ ] **4.2** Create `lib/features/rhu_status/data/rhu_status_repository.dart`
  - `Future<RhuStatusModel> getRhuStatus(String rhuId)` → `GET /api/dashboard/rhu/:id`

- [ ] **4.3** Create `lib/features/rhu_status/presentation/rhu_status_provider.dart`
  ```dart
  @riverpod
  Future<RhuStatusModel> rhuStatus(Ref ref) async {
    final rhuId = ref.watch(authProvider).rhuId;
    return ref.watch(rhuStatusRepositoryProvider).getRhuStatus(rhuId);
  }
  ```
  Auto-refresh: use `ref.invalidateSelf()` on a `Timer.periodic(30s)` or `ref.keepAlive()` + manual refresh button

- [ ] **4.4** Create `lib/features/rhu_status/presentation/rhu_status_screen.dart`

**Screen layout:**
```
┌────────────────────────────────────────┐
│  AppBar: "My RHU Status"               │
│  subtitle: "Brgy. [RHU Name]"          │
│  right: [Iconsax.refresh] refresh btn  │
├────────────────────────────────────────┤
│  At-a-Glance Chips Row (horizontal):   │
│  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ Most     │ │ Projected│ │ Last   │ │
│  │ Critical │ │ Zero     │ │ Report │ │
│  │ [name]   │ │ [date]   │ │ [time] │ │
│  └──────────┘ └──────────┘ └────────┘ │
├────────────────────────────────────────┤
│  Skeletonizer(                         │
│    ListView.builder — MedicineStatus   │
│    Tile per medicine, sorted by        │
│    daysRemaining ASC (critical first)  │
│  )                                     │
└────────────────────────────────────────┘
```

- [ ] **4.5** Create `lib/features/rhu_status/presentation/widgets/medicine_status_tile.dart`

**Tile layout:**
```
┌────────────────────────────────────────────┐
│  [StatusBadge]  Paracetamol 500mg          │
│                 tablet · analgesic         │
│                                            │
│  Stock: 15      Velocity: 12.0/day         │
│                                            │
│  ████████░░░░░░ 1.3 days remaining         │  ← LinearProgressIndicator, red
│                                            │
│  Last entry: 2 hours ago                   │
└────────────────────────────────────────────┘
```
- `LinearProgressIndicator` value = `(daysRemaining / criticalThresholdDays).clamp(0.0, 1.0)`
- Color: `AppColors.statusCritical` / `statusWarning` / `statusOk` per status
- Tap tile → expand to show `fl_chart` `LineChart` of velocity trend (if history available via `GET /api/stock-entries?rhuId=&medicineId=`)

- [ ] **4.6** Create `lib/shared/widgets/status_badge.dart`
  ```dart
  // Matches dashboard status pills exactly
  // critical → red bg, warning → orange bg, ok → green bg, silent → gray bg
  ShadBadge(backgroundColor: color, child: Text(label.toUpperCase(), style: ...))
  ```

- [ ] **4.7** Create `lib/features/rhu_status/presentation/widgets/days_remaining_chart.dart`
  - `fl_chart` `LineChart` showing last 7 stock entries for a medicine
  - X-axis: dates, Y-axis: quantity on hand
  - Line color: `AppColors.primary`, grid: `AppColors.border`
  - Displayed inside an `AnimatedContainer` when tile is expanded

---

## Phase 5 — Alerts Screen

> **Goal:** Show the nurse any system alerts relevant to their RHU (threshold breaches, participation flags). Read-only.

> ⚠️ **Backend prerequisite — verify before starting this phase.**
> `GET /api/alerts` is currently a stub: `alerts.controller.ts` returns `{ breaches: [], anomalies: [], participationAlerts: [] }` unconditionally. `alerts.service.ts` has a TODO comment: *"nurse sees RHU alerts, MHO sees municipality alerts"* but no filtering is implemented. `alerts.repository.ts` → `getAlertsByScope()` is also a stub.
>
> **Before building Phase 5, the backend team must:**
> - [ ] Implement `getAlertsByScope(userRole, scopeId)` in `alerts.repository.ts` — query `threshold_breaches` joined to `rhu` filtered by `rhu.id = scopeId` when `userRole === 'nurse'`
> - [ ] Wire `alerts.service.ts` → read `X-User-Role` + `X-Rhu-Id` headers from context, call `getAlertsByScope('nurse', rhuId)`
> - [ ] Update `alerts.controller.ts` to extract headers and pass to service
>
> Until then, Phase 5 will always render an empty alerts list regardless of actual breach data.

### API integration:
- `GET /api/alerts` (with `X-Rhu-Id` header → scoped to nurse's RHU once backend stub is implemented)

### TODO

- [ ] **5.1** Create `lib/features/alerts/domain/alert_model.dart`
  ```dart
  class AlertModel {
    final String id, type, medicineId, medicineName, rhuId;
    final double? daysRemaining;
    final String createdAt;
    // type: 'threshold_breach' | 'anomaly_spike' | 'participation_alert'
  }
  ```

- [ ] **5.2** Create `lib/features/alerts/data/alerts_repository.dart`
  - `Future<List<AlertModel>> getAlerts()` → `GET /api/alerts`

- [ ] **5.3** Create `lib/features/alerts/presentation/alerts_provider.dart`
  ```dart
  @riverpod
  Future<List<AlertModel>> alerts(Ref ref) async { ... }
  ```

- [ ] **5.4** Create `lib/features/alerts/presentation/alerts_screen.dart`

**Screen layout:**
```
┌────────────────────────────────────────┐
│  AppBar: "Alerts"                      │
│  subtitle: alert count badge           │
├────────────────────────────────────────┤
│  if empty: EmptyState widget           │
│    Iconsax.notification_slash          │
│    "No active alerts"                  │
│                                        │
│  Else: ListView grouped by type        │
│  ┌──────────────────────────────────┐  │
│  │ [🔴 CRITICAL]  Paracetamol 500mg │  │
│  │ Threshold breach · 1.3 days left │  │
│  │ Detected 2 hours ago             │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ [🟠 ANOMALY]   Amoxicillin 500mg │  │
│  │ Consumption spike · 3.2x normal  │  │
│  │ Detected 5 hours ago             │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

- [ ] **5.5** Wire `flutter_local_notifications` on app startup:
  - Initialize in `main.dart`
  - Whenever `alertsProvider` resolves with `threshold_breach` or `anomaly_spike` alerts → schedule a local notification for each unread alert
  - Store seen alert IDs in `flutter_secure_storage` to avoid re-notifying

---

## Phase 6 — Polish & Wire-up

### TODO

- [ ] **6.1** Create `lib/shared/widgets/error_state.dart` — consistent full-screen error widget with retry `ShadButton`
  ```dart
  // Usage: error_state.dart
  // Shows: error icon, message, [Retry] button that calls ref.invalidate(provider)
  ```

- [ ] **6.2** Add `connectivity_plus` stream to `authProvider` or a top-level `connectivityProvider`:
  - Show a red dot in `AppBar` when offline
  - Disable `Submit Count` button when offline with tooltip "No connection"

- [ ] **6.3** Add pull-to-refresh (`RefreshIndicator`) to both `RhuStatusScreen` and `AlertsScreen`
  - Calls `ref.invalidate(rhuStatusProvider)` / `ref.invalidate(alertsProvider)`

- [ ] **6.4** Loading states — every `AsyncValue.loading` branch wraps with `Skeletonizer`:
  ```dart
  medicinesAsync.when(
    loading: () => Skeletonizer(enabled: true, child: _buildMedicineList(fakeMedicines)),
    error:   (e, _) => ErrorState(onRetry: () => ref.invalidate(medicinesProvider)),
    data:    (data) => _buildMedicineList(data),
  )
  ```

- [ ] **6.5** Add `ShadSonner` (toast) at app root level in `app.dart`:
  ```dart
  ShadApp.router(
    builder: (context, child) => ShadToaster(child: child!),
    ...
  )
  ```

- [ ] **6.6** Ensure `flutter_screenutil` sizing is applied consistently:
  - All `EdgeInsets` → `EdgeInsets.symmetric(horizontal: 16.w, vertical: 12.h)`
  - All `Text` font sizes → `14.sp`, `16.sp`, `20.sp`
  - All `BorderRadius` → `BorderRadius.circular(12.r)`

- [ ] **6.7** Run final code generation:
  ```bash
  dart run build_runner build --delete-conflicting-outputs
  ```

- [ ] **6.8** Test end-to-end with seeded backend:
  - Login → selects seeded nurse account → navigates to Stock Entry
  - Submit stock count → see velocity response → if breach → toast + local notification
  - Navigate to RHU Status → see medicines with correct days remaining
  - Navigate to Alerts → see any active threshold breaches

---

## API Integration Reference

| # | Screen | Method | Endpoint | Headers |
|---|---|---|---|---|
| 1 | Login (boot check) | — | — | Load session from storage |
| 2 | Stock Entry | GET | `/api/medicines` | `X-User-Id`, `X-User-Role: nurse`, `X-Rhu-Id` |
| 3 | Stock Entry | POST | `/api/stock-entries/batch` | same + body |
| 4 | RHU Status | GET | `/api/dashboard/rhu/:id` | same |
| 5 | RHU Status (expanded chart) | GET | `/api/stock-entries?rhuId=&medicineId=` | same |
| 6 | Alerts | GET | `/api/alerts` | same |

**Dio interceptor injects all headers globally** — no manual header setting per request.

---

## Implementation Order Summary

```
Phase 0 → Bootstrap (main.dart, app.dart, theme, Dio client, auth storage)
Phase 1 → Login screen (pick account, save session)
Phase 2 → Navigation shell (bottom nav, GoRouter ShellRoute)
Phase 3 → Stock Entry screen (medicine list + quantity inputs + submit)
Phase 4 → RHU Status screen (days remaining, velocity chart expansion)
Phase 5 → Alerts screen (alert cards + local notifications)
Phase 6 → Polish (error states, skeletons, connectivity, pull-to-refresh)
```

> **Critical build step** after every `@riverpod` annotation change:
> ```bash
> dart run build_runner build --delete-conflicting-outputs
> ```