# Agap Nurse Flutter Tasks (Aligned to Admin/Web Side)

## 1) Context (from `context/` docs)
- Nurse app is Flutter mobile client for RHU nurses.
- Core job: submit stock counts quickly (90s), show days remaining per medicine.
- Backend calculates consumption velocity and breaches.
- Admin dashboard (web) reads same backend data and shows heatmap/alert UI.

## 2) Required API contract (Nurse) - must match backend
1. `GET /api/medicines` → medicine catalog.
2. `POST /api/stock-entries` → submit single entry.
3. `POST /api/stock-entries/batch` → sync pending offline entries.
4. `GET /api/stock-entries?rhuId=` → optional history.

Request shape for stock entry:
```json
{
  "rhuId": "uuid",
  "medicineId": "uuid",
  "quantityOnHand": 120,
  "submittedAt": "2026-03-19T06:00:00Z"
}
```

Response should return velocity projection:
```json
{
  "velocity": {
    "velocityPerDay": 8.5,
    "daysRemaining": 14.12,
    "breachTriggered": false
  }
}
```

## 3) Flutter nurse flow tasks (in priority order)

### A) Setup + baseline
- [ ] Confirm Flutter app boots from `frontend/` root (`flutter run`).
- [ ] Confirm backend root endpoints are available (mock or local Hono server).
- [ ] Add central `ApiClient` with base URL + auth headers (X-User-Role etc.)

### B) Nurse screens
1. **Login screen** (or direct nurse simulation): store token + rhuId.
2. **Stock Entry screen**:
   - Fetch medicines `GET /api/medicines`.
   - Show medicine list with numeric input per item.
   - Submit button sends to `POST /api/stock-entries`.
   - Display submission status + returned `daysRemaining`.
3. **Sync status / queue**:
   - View pending entries offline.
   - Retry button calls `POST /api/stock-entries/batch`.

### C) Local offline and sync (key for nurse reliability)
- [ ] Save entries locally with id/timestamp/synced.
- [ ] Attempt immediate POST; if fail, keep pending.
- [ ] Provide `Sync` button to flush pending entries.
- [ ] Show offline indicator and pending count.

### D) Backend integration and web-admin parity
- [ ] Ensure Nurse requests include `X-User-Role: nurse`, `X-Rhu-Id`, and `X-User-Id` if required.
- [ ] After successful submission, verify backend creates `threshold_breach`/`requisition_drafted` if appropriate.
- [ ] Validate web dashboard sees expected breach and heatmap color updates.

### E) UX finish
- [ ] Large accessible form controls for low-end screens.
- [ ] One-tap “Submit” and “Sync pending” actions.
- [ ] “Your RHU status” summary (last submitted, days remaining summary)

## 4) Minimal Flutter tasks for current repo (exact file map)
- `frontend/lib/main.dart`: app entry.
- `frontend/lib/screens/login_screen.dart`: nurse login screen.
- `frontend/lib/screens/stock_entry_screen.dart`: medicine input + submission.
- `frontend/lib/services/api_service.dart`: network methods.
- `frontend/lib/data/local_database.dart`: local pending queue.
- `frontend/lib/models/medicine.dart`: medicine model.
- `frontend/lib/models/stock_entry.dart`: entry model.

## 5) Exact tasks to mark as “not yet finished" (from code TODOs)
- [ ] Implement backend threshold/anomaly/participation alert services.
- [ ] Implement full API endpoints in `backend/src/*` so nurse app can call real data.
- [ ] Build nurse flows in Flutter modules to show days remaining + submit.
- [ ] Connect RN nurse app to `/api/stock-entries/batch` for offline sync.
- [ ] Test with admin dashboard endpoints (`/api/dashboard/heatmap`, `/api/requisitions`).

## 6) Execution plan (next 2 days)
1. Finalize nurse app network + login + stock input.
2. Build offline queue + retry sync.
3. End-to-end test: nurse submit → backend velocity → admin heatmap update.
4. Add final UI details and edge-case error handling.

---

### Quick success metric
- Nurse app can submit real stock entries and show returned `daysRemaining`.
- Admin dashboard can read RHU urgency from same backend and display heatmap color.
- This completes the critical cross-client integrated MVP flow.
