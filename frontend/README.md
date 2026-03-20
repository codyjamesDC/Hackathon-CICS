# Agap Nurse Flutter App — To Do / Setup

This Flutter app is the nurse-side client for Agap (Predictive Medicine Stock Intelligence).
It connects to the backend APIs and sends stock entries, then shows days remaining.

## 1) Project Setup

1. Install Flutter 3.41.1 (or compatible with Dart 3.11.0).
2. From `frontend/` run:
   ```bash
   flutter pub get
   ```
3. If using code generation (Riverpod), run:
   ```bash
   dart run build_runner build --delete-conflicting-outputs
   ```

## 2) Basic app launch

From `frontend/`:
```bash
flutter run -d chrome
```
or on Android:
```bash
flutter run -d emulator-5554
```

## 3) Required backend APIs (confirm endpoints)

The nurse app depends on these endpoints:
- `GET /api/medicines` → medicine catalog
- `POST /api/stock-entries` → single stock count
- `POST /api/stock-entries/batch` → offline sync batch upload
- Optional: `GET /api/stock-entries?rhuId=` for history

Must include auth context headers:
- `X-User-Id`
- `X-User-Role: nurse`
- `X-Rhu-Id`

## 4) App architecture and files

The minimal nurse app modules should include:
- `lib/main.dart` — app entry and route to login
- `lib/screens/login_screen.dart` — nurse login stub
- `lib/screens/stock_entry_screen.dart` — medicine form + submit
- `lib/services/api_service.dart` — Dio client + endpoints
- `lib/data/local_database.dart` — local queue for offline entries
- `lib/models/medicine.dart`, `lib/models/stock_entry.dart`
- `lib/core/env.dart` — API base URL and auth config

## 5) High-priority tasks (to implement now)

1. **Login flow** (or skip real auth for MVP):
   - Save token (or dummy) and RHU id.
2. **Fetch medicine list** from `GET /api/medicines`.
3. **Stock entry form**:
   - Input quantity per medicine.
   - Submit to `POST /api/stock-entries`.
4. **Offline queue + sync**:
   - Save unsynced entries locally.
   - Add Auto/Manual sync to `POST /api/stock-entries/batch`.
5. **Show Days Remaining** with `velocity` response values.

## 6) Developer checklist for finalization

- [ ] Confirm backend server starts and endpoints respond.
- [ ] Confirm stock submission triggers velocity engine and breaches in backend.
- [ ] Confirm admin dashboard uses same backend results (heatmap/requisitions).
- [ ] Add real auth + token storage for production.
- [ ] Add tests for API models and submission flow.

## 7) Local dev run sequence

1. Start backend:
   ```bash
   cd Hackathon-CICS/backend
   npm install
   npx tsx src/index.ts
   ```
2. Start nurse app:
   ```bash
   cd Hackathon-CICS/frontend
   flutter run -d chrome
   ```
3. Use API inspector or logs to verify:
   - `GET http://localhost:3000/api/medicines`
   - `POST http://localhost:3000/api/stock-entries`

## 8) Notes

For now, nurse flow should be minimal and robust for low-end devices: a single stock-entry screen with quick numeric input and one-tap submit.

If the backend has not implemented endpoints, stub responses can be used locally with `json-server` or mock data.