Here's your prompt:

You are implementing the SvelteKit MHO dashboard for Agap. Read ALL files in context/ before writing any code. The backend is complete and verified at http://localhost:3000. Do not modify anything in backend/ or frontend/.

Current state: Dashboard scaffold is complete with mock data. TanStack Query migration is approved. Your task is to migrate to TanStack Query AND wire all real API calls in one continuous implementation.

Hardcoded IDs for development (from seed):
ts

export const SEED_IDS = {
  MHO_ID: 'cef0a0f1-33cd-42b7-94ca-06774ff70e37',
  NURSE_ID: '13217702-e1d5-4bfb-bb56-1aec4b8783db',
  RHU_ID: 'b9b2ec99-379c-49e0-bb08-02503f956f26',
  MUNICIPALITY_ID: '9f7bdeb0-aeda-4edb-bfd7-9bc5d6163cfd',
  AMOX_ID: 'aac02163-aae8-424c-af84-c2134e7cf30b',
}
```

**Base URL:** `http://localhost:3000`

**Auth headers required on every request:**
```
X-User-Role: mho
X-User-Id: {MHO_ID}
X-Municipality-Id: {MUNICIPALITY_ID}

Phase 0 — TanStack Query Setup
bash

npm install @tanstack/svelte-query @tanstack/svelte-query-devtools

    Create dashboard/src/lib/api/client.ts — base fetch wrapper:
        Injects auth headers on every request
        Unwraps { data: ... } envelope
        Throws with error message on failure
    Create dashboard/src/lib/api/endpoints.ts — typed interfaces:
        Match context/API_CONTRACT.md exactly
        Export typed interfaces for every API response
    Create dashboard/src/lib/api/queries.ts — TanStack query factories:

ts

export const queries = {
  heatmap: (municipalityId: string) => ({
    queryKey: ['heatmap', municipalityId],
    queryFn: () => fetchHeatmap(municipalityId),
    refetchInterval: 30_000, // 30 second auto-refresh
  }),
  requisitions: (municipalityId: string) => ({
    queryKey: ['requisitions', municipalityId],
    queryFn: () => fetchRequisitions(municipalityId),
    refetchInterval: 30_000,
  }),
  requisitionDetail: (id: string) => ({
    queryKey: ['requisitions', id],
    queryFn: () => fetchRequisitionById(id),
  }),
  rhuDrilldown: (rhuId: string) => ({
    queryKey: ['rhu', rhuId],
    queryFn: () => fetchRhuDrilldown(rhuId),
    refetchInterval: 30_000,
  }),
  alerts: () => ({
    queryKey: ['alerts'],
    queryFn: () => fetchAlerts(),
    refetchInterval: 30_000,
  }),
}

    Wrap +layout.svelte with QueryClientProvider:

svelte

<script>
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools'
  const queryClient = new QueryClient()
</script>

<QueryClientProvider client={queryClient}>
  <!-- existing layout shell -->
  <SvelteQueryDevtools />
</QueryClientProvider>

    Remove ALL +page.ts load functions — data fetching moves entirely to client-side createQuery hooks in +page.svelte

Phase 1 — Dashboard Overview Page (/)

Wire +page.svelte using TanStack Query:
svelte

<script>
  import { createQuery } from '@tanstack/svelte-query'
  import { queries } from '$lib/api/queries'
  import { SEED_IDS } from '$lib/api/constants'

  const heatmapQuery = createQuery(queries.heatmap(SEED_IDS.MUNICIPALITY_ID))
  const requisitionsQuery = createQuery(queries.requisitions(SEED_IDS.MUNICIPALITY_ID))

  const totalRHUs = $derived($heatmapQuery.data?.length ?? 0)
  const activeBreaches = $derived($heatmapQuery.data?.filter(r => r.status === 'critical').length ?? 0)
  const silentRHUs = $derived($heatmapQuery.data?.filter(r => r.status === 'silent').length ?? 0)
  const pendingRequisitions = $derived($requisitionsQuery.data?.filter(r => r.status === 'drafted').length ?? 0)
</script>

    Show skeleton cards while $heatmapQuery.isPending
    Show error state if $heatmapQuery.isError
    Map placeholder stays for now (Phase 5)
    Cards float on right side as compact glassmorphism panel overlaying the map

Phase 2 — Requisitions Page (/requisitions)

Wire list page with createQuery(queries.requisitions(...)):

    Real data replaces mock rows
    Status badge colors: drafted → yellow, approved → blue, sent → green, acknowledged → gray
    Filter tabs filter client-side using $derived
    Each row links to /requisitions/{id}

Wire detail page /requisitions/[id] with createQuery(queries.requisitionDetail(id)):

    Real medicine items and quantities
    Real audit trail timeline
    Approve button calls POST /api/requisitions/{id}/approve:

ts

const mutation = createMutation({
  mutationFn: (id: string) => approveRequisition(id),
  onSuccess: () => {
    toast.success('Requisition approved')
    queryClient.invalidateQueries({ queryKey: ['requisitions'] })
  },
  onError: (err) => {
    if (err.message.includes('409')) toast.error('Already approved')
    else toast.error(err.message)
  }
})

    Button disabled if status !== drafted

Phase 3 — RHU Drill-down (/rhu/[id])

Wire with createQuery(queries.rhuDrilldown(id)):

    Real medicine table with daysRemaining, velocityPerDay, status
    Status badges: critical → red, warning → yellow, ok → green, silent → gray
    lastReportedAt formatted as relative time ("2 hours ago")
    30 second auto-refetch

Phase 4 — Alerts Page (/alerts)

Wire with createQuery(queries.alerts()):

    Real alert cards grouped by type: threshold_breach, anomaly_spike, participation_alert
    Each card links to /rhu/{rhu_id}
    30 second auto-refetch

Phase 5 — MapLibre GL Heatmap

Install:
bash

npm install maplibre-gl
npm install -D @types/maplibre-gl

Add to app.html:
html

<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css" />

In dashboard overview +page.svelte:

    Download Nagcarlan, Laguna barangay GeoJSON from https://github.com/faeldon/philippines-json-maps and save to dashboard/static/nagcarlan_barangays.geojson
    Initialize MapLibre GL in onMount — never import at module level, SSR will break:

ts

onMount(async () => {
  const maplibregl = (await import('maplibre-gl')).default

  const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // free dark tiles, no token needed
    center: [121.4170, 13.9200], // Nagcarlan, Laguna
    zoom: 13
  })

  map.on('load', () => {
    // add GeoJSON source
    map.addSource('barangays', {
      type: 'geojson',
      data: '/nagcarlan_barangays.geojson'
    })

    // choropleth fill layer
    map.addLayer({
      id: 'barangay-fill',
      type: 'fill',
      source: 'barangays',
      paint: {
        'fill-color': [
          'match',
          ['get', 'NAME_4'], // barangay name property in GeoJSON
          ...buildColorExpression($heatmapQuery.data ?? []),
          '#1f2937' // default - no RHU
        ],
        'fill-opacity': 0.65
      }
    })

    // barangay borders
    map.addLayer({
      id: 'barangay-border',
      type: 'line',
      source: 'barangays',
      paint: {
        'line-color': '#ffffff',
        'line-width': 0.8,
        'line-opacity': 0.4
      }
    })

    // click handler
    map.on('click', 'barangay-fill', (e) => {
      const barangayName = e.features?.[0]?.properties?.NAME_4
      const rhu = $heatmapQuery.data?.find(r => r.barangay === barangayName)
      if (rhu) goto(`/rhu/${rhu.id}`)
    })

    // hover cursor
    map.on('mouseenter', 'barangay-fill', () => map.getCanvas().style.cursor = 'pointer')
    map.on('mouseleave', 'barangay-fill', () => map.getCanvas().style.cursor = '')
  })
})

    buildColorExpression helper — converts RHU status array to MapLibre match expression:

ts

function buildColorExpression(rhus: RhuStatus[]) {
  const pairs: string[] = []
  for (const rhu of rhus) {
    const color = {
      critical: '#ef4444',
      warning: '#f97316',
      ok: '#22c55e',
      silent: '#6b7280',
    }[rhu.status] ?? '#1f2937'
    pairs.push(rhu.barangay, color)
  }
  return pairs
}

    Map div must have explicit height:

svelte

<div id="map" class="w-full h-full absolute inset-0"></div>

    Add legend component — 4 colored dots with labels, positioned top-right above the metric cards panel

Implementation Rules:

    All data fetching via TanStack createQuery — no +page.ts load functions
    All API calls through $lib/api/client.ts — no raw fetch anywhere else
    svelte-sonner for all toasts
    Skeleton loading states on all queries while isPending
    Dark mode works on all pages
    Map is full viewport, metric cards float right as compact glassmorphism overlay
    No mock data anywhere

