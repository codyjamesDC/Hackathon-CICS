Phase 1 — API Client Setup
Create dashboard/src/lib/api/client.ts:

Base fetch wrapper that injects the auth headers on every request
Typed response handler that unwraps the { data: ... } envelope
Error handling that throws with the error message from the response

Create dashboard/src/lib/api/endpoints.ts:

Constants for all API endpoints
Typed response interfaces matching context/API_CONTRACT.md exactly


Phase 2 — Dashboard Overview Page (/)
Wire +page.svelte to GET /api/dashboard/heatmap?municipalityId={MUNI_ID}:

Replace mock summary cards with real counts:

Total RHUs (count of all RHUs in response)
Active Breaches (count where status is critical)
Silent RHUs (count where status is silent)
Pending Requisitions (fetch from GET /api/requisitions?municipalityId={MUNI_ID}, count where status is drafted)


Show skeletonizer loading state while fetching
Show error state if fetch fails
Map placeholder stays as-is for now (Phase 5)


Phase 3 — Requisitions Page (/requisitions)
Wire +page.svelte to GET /api/requisitions?municipalityId={MUNI_ID}:

Replace mock table rows with real requisition data
Status badge colors:

drafted → yellow
approved → blue
sent → green
acknowledged → gray


Status filter tabs must actually filter the displayed rows client-side
Each row links to /requisitions/{id}

Wire /requisitions/[id]/+page.svelte to GET /api/requisitions/{id}:

Show requisition detail with real medicine items and quantities
Show real audit trail timeline from the response
Approve button — calls POST /api/requisitions/{id}/approve with X-User-Id header

On success → show svelte-sonner toast "Requisition approved", update status badge
On 409 conflict → show toast "Already approved"
Button disabled if status is not drafted




Phase 4 — RHU Drill-down (/rhu/[id])
Wire +page.svelte to GET /api/dashboard/rhu/{id}:

Replace mock medicine table with real data
Status badge per medicine:

critical → red badge
warning → yellow badge
ok → green badge
silent → gray badge


Show daysRemaining and velocityPerDay per medicine
Show lastReportedAt formatted as relative time (e.g. "2 hours ago")


Phase 5 — MapLibre GL Heatmap
Install if not already present:
bashnpm install maplibre-gl
npm install -D @types/maplibre-gl
In the dashboard overview +page.svelte, replace the map placeholder with a real MapLibre GL map:

Load Los Baños barangay GeoJSON from dashboard/static/losb_anos_barangays.geojson
Initialize MapLibre GL map in onMount centered on Los Baños: [14.1667, 121.2333], zoom 13
Use Mapbox tiles as base layer (dark style) — get token from environment variable PUBLIC_MAPBOX_TOKEN
For each barangay polygon in the GeoJSON:

Match it to an RHU from the heatmap API response by barangay name
Color the polygon based on RHU status:

critical → #ef4444 (red, opacity 0.7)
warning → #f97316 (orange, opacity 0.6)
ok → #22c55e (green, opacity 0.5)
silent → #6b7280 (gray, opacity 0.4)
No RHU match → #1f2937 (dark, opacity 0.3)




On polygon click → navigate to /rhu/{rhu_id}
Add a legend component showing the 4 status colors

Important: Wrap the MapLibre GL import in onMount — it is browser-only and will break SSR if imported at module level:
tsonMount(async () => {
  const maplibregl = (await import('maplibre-gl')).default
  // initialize map here
})
Also add to app.html:
html<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css" />

Phase 6 — Alerts Page (/alerts)
Wire +page.svelte to GET /api/alerts:

Replace mock alert cards with real data
Group by alert type: threshold_breach, anomaly_spike, participation_alert
Each card links to the relevant RHU drill-down


Implementation Rules:

Use SvelteKit load functions in +page.ts for all data fetching — not inline in +page.svelte
All API calls go through $lib/api/client.ts — no raw fetch calls in page components
Use svelte-sonner for all success/error notifications
Use skeletonizer pattern — show loading skeletons while data loads
Dark mode must work on all pages — test with mode-watcher toggle
No mock data anywhere after this implementation — all data comes from the real backend


Verification after each phase:

Phase 1: console.log the API client response in browser devtools
Phase 2: Dashboard cards show real counts matching seed data
Phase 3: Requisitions table shows the auto-drafted requisition from seed, approve button works
Phase 4: RHU drill-down shows Amoxicillin as critical with ~4.5 days remaining
Phase 5: Map renders with Los Baños barangays colored by status
Phase 6: Alerts page shows threshold breach for Amoxicillin

Do one phase at a time. Stop after each phase and report what was implemented and any issues encountered.