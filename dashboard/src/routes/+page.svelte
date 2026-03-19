<script lang="ts">
  import { 
    AlertTriangle, 
    BellOff, 
    Building2, 
    FileText 
  } from "lucide-svelte";
  import { onMount, untrack } from 'svelte';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import maplibregl from 'maplibre-gl';
  import * as Card from "$lib/components/ui/card/index.js";
  import { createQuery } from '@tanstack/svelte-query';
  import { queries } from '$lib/api/queries';
  import { SEED_IDS } from '$lib/api/constants';
 
  let mapElement: HTMLElement;
  let mapInstance: maplibregl.Map | null = null;
 
  const heatmapQuery = createQuery(() => queries.heatmap(SEED_IDS.MUNICIPALITY_ID));
  const reqsQuery = createQuery(() => queries.requisitions(SEED_IDS.MUNICIPALITY_ID));
 
  let heatData = $derived(heatmapQuery.data ?? []);
  let totalRhus = $derived(heatData.length);
  let activeBreaches = $derived(heatData.filter((r: any) => r.status === 'critical').length);
  let silentRhus = $derived(heatData.filter((r: any) => r.status === 'silent').length);
  let pendingRequisitions = $derived((reqsQuery.data ?? []).filter((r: any) => r.status === 'drafted').length);
 
  const statusColor: Record<string, string> = {
    critical:    '#f87171',
    warning:     '#fb923c',
    ok:          '#4ade80',
    silent:      '#9ca3af',
    unmonitored: '#4b5563',
  };
 
  const statusBg: Record<string, string> = {
    critical:    'rgba(239,68,68,0.18)',
    warning:     'rgba(249,115,22,0.18)',
    ok:          'rgba(34,197,94,0.18)',
    silent:      'rgba(107,114,128,0.18)',
    unmonitored: 'rgba(75,85,99,0.18)',
  };
 
  function buildPopupHTML(props: any): string {
    if (props.rhuId && props.rhuId !== 'null') {
      const status = props.status ?? 'unknown';
      const color  = statusColor[status] ?? '#9ca3af';
      const bg     = statusBg[status]    ?? 'rgba(107,114,128,0.18)';
      const days   = props.worstDaysRemaining != null
        ? Number(props.worstDaysRemaining).toFixed(1)
        : '—';
 
      return `
        <div style="min-width:160px;">
          <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.95);margin-bottom:8px;line-height:1.3;">
            ${props.rhuName}
          </div>
          <div style="display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;background:${bg};margin-bottom:10px;">
            <span style="width:6px;height:6px;border-radius:50%;background:${color};display:inline-block;"></span>
            <span style="font-size:10px;font-weight:700;color:${color};letter-spacing:0.07em;">${status.toUpperCase()}</span>
          </div>
          <div style="font-size:10px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">
            Worst Days Left
          </div>
          <div style="font-size:24px;font-weight:800;color:${color};line-height:1;">
            ${days}
          </div>
        </div>`;
    }
 
    return `
      <div style="min-width:140px;">
        <div style="font-size:12px;font-weight:600;color:rgba(255,255,255,0.8);margin-bottom:4px;">
          ${props.adm4_en ?? 'Unknown'}
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,0.35);">
          No monitoring facility
        </div>
      </div>`;
  }
 
  onMount(() => {
    if (!mapElement) return;
 
    mapInstance = new maplibregl.Map({
      container: mapElement,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [121.4170, 14.1500],
      zoom: 12.5,
      attributionControl: false
    });
 
    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
 
    mapInstance.on('load', async () => {
      if (!mapInstance) return;
      try {
        const response = await window.fetch('/nagcarlan_barangays.geojson');
        const geojsonData = await response.json();
 
        const currentHeatmap = untrack(() => heatmapQuery.data ?? []);
        const rhuMap = new Map();
        currentHeatmap.forEach((rhu: any) => {
          const rawName = rhu.barangay.toLowerCase().replace('barangay ', '').trim();
          rhuMap.set(rawName, rhu);
        });
 
        geojsonData.features = geojsonData.features.map((f: any, index: number) => {
          f.id = index;
 
          const brgyName = f.properties.adm4_en?.toLowerCase().trim();
          const rhu = rhuMap.get(brgyName);
 
          let fillColor   = '#1f2937';
          let fillOpacity = 0.3;
          let status      = 'unmonitored';
 
          if (rhu) {
            status = rhu.status;
            switch (rhu.status) {
              case 'critical': fillColor = '#ef4444'; fillOpacity = 0.7; break;
              case 'warning':  fillColor = '#f97316'; fillOpacity = 0.6; break;
              case 'ok':       fillColor = '#22c55e'; fillOpacity = 0.5; break;
              case 'silent':   fillColor = '#6b7280'; fillOpacity = 0.4; break;
            }
          }
 
          f.properties.fillColor          = fillColor;
          f.properties.fillOpacity        = fillOpacity;
          f.properties.status             = status;
          f.properties.rhuId              = rhu?.rhuId              || null;
          f.properties.rhuName            = rhu?.rhuName            || null;
          f.properties.worstDaysRemaining = rhu?.worstDaysRemaining || null;
 
          return f;
        });
 
        mapInstance.addSource('barangays', { type: 'geojson', data: geojsonData });
 
        mapInstance.addLayer({
          id: 'barangays-fill',
          type: 'fill',
          source: 'barangays',
          paint: {
            'fill-color':   ['get', 'fillColor'],
            'fill-opacity': ['get', 'fillOpacity']
          }
        });
 
        mapInstance.addLayer({
          id: 'barangays-line',
          type: 'line',
          source: 'barangays',
          paint: {
            'line-color':     '#ffffff',
            'line-width':     1,
            'line-dasharray': [3, 3],
            'line-opacity':   0.5
          }
        });
 
        mapInstance.addLayer({
          id: 'barangays-hover',
          type: 'line',
          source: 'barangays',
          paint: {
            'line-color': '#ffffff',
            'line-width': 3,
            'line-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              1,
              0
            ]
          }
        });
 
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'agap-popup',
          offset: 15,
        });
 
        let hoveredStateId: number | null = null;
        let currentFeatureId: number | null = null;
 
        mapInstance.on('mousemove', 'barangays-fill', (e: any) => {
          if (!mapInstance) return;
          if (e.features.length === 0) return;
 
          mapInstance.getCanvas().style.cursor = 'pointer';
 
          const feature = e.features[0];
          const featureId = feature.id as number;
 
          // Only update hover state when feature actually changes
          if (featureId !== hoveredStateId) {
            if (hoveredStateId !== null) {
              mapInstance.setFeatureState({ source: 'barangays', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = featureId;
            mapInstance.setFeatureState({ source: 'barangays', id: hoveredStateId }, { hover: true });
          }
 
          // Only rebuild and re-add popup when moving to a different feature
          if (featureId !== currentFeatureId) {
            currentFeatureId = featureId;
            const props = feature.properties;
            popup.setHTML(buildPopupHTML(props));
            if (!popup.isOpen()) popup.addTo(mapInstance);
          }
 
          // Always update position smoothly — no flicker since we're not rebuilding HTML
          popup.setLngLat(e.lngLat);
        });
 
        mapInstance.on('mouseleave', 'barangays-fill', () => {
          if (!mapInstance) return;
          mapInstance.getCanvas().style.cursor = '';
          popup.remove();
          if (hoveredStateId !== null) {
            mapInstance.setFeatureState({ source: 'barangays', id: hoveredStateId }, { hover: false });
          }
          hoveredStateId = null;
          currentFeatureId = null;
        });
 
        mapInstance.on('click', 'barangays-fill', (e: any) => {
          const rhuId = e.features[0]?.properties?.rhuId;
          if (rhuId && rhuId !== 'null') {
            window.location.href = `/rhu/${rhuId}`;
          }
        });
 
      } catch (e) {
        console.error('Failed to load map geojson data', e);
      }
    });
 
    return () => { mapInstance?.remove(); };
  });
</script>
 
<div class="relative w-full h-full overflow-hidden bg-[#09090b]">
  <div bind:this={mapElement} class="absolute z-0 bg-transparent" style="top:0;left:0;width:100%;height:100%;min-height:400px;"></div>
 
  <div class="absolute inset-0 z-10 p-5 md:p-6 pointer-events-none flex flex-row justify-end items-start gap-5">
    <div class="flex flex-col items-end gap-4 w-full md:w-[280px] self-stretch pointer-events-none">
 
      <!-- Legend -->
      <div class="pointer-events-auto flex items-center justify-between w-full bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl px-4 py-3 text-[10px] font-semibold">
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
          <span class="text-muted-foreground">&gt; 14d</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
          <span class="text-muted-foreground">7-14d</span>
        </div>
        <div class="flex items-center gap-1.5 tracking-wide">
          <div class="w-2.5 h-2.5 rounded-full bg-destructive shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse"></div>
          <span class="text-foreground">&lt; 7d</span>
        </div>
      </div>
 
      <!-- Stats -->
      <div class="pointer-events-auto flex flex-col gap-3 w-full">
        <div class="bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Network Coverage</span>
            <div class="text-2xl font-black text-foreground tracking-tighter leading-none">{totalRhus}</div>
          </div>
          <div class="p-2.5 bg-muted/50 rounded-xl"><Building2 class="h-4 w-4 text-muted-foreground" /></div>
        </div>
 
        <div class="bg-destructive/10 backdrop-blur-xl border border-destructive/20 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between group">
          <div>
            <span class="text-[10px] font-bold text-destructive uppercase tracking-wider block mb-0.5">Active Breaches</span>
            <div class="text-2xl font-black text-destructive tracking-tighter leading-none drop-shadow-sm">{activeBreaches}</div>
          </div>
          <div class="p-2.5 bg-destructive/20 rounded-xl"><AlertTriangle class="h-4 w-4 text-destructive group-hover:scale-110 transition-transform" /></div>
        </div>
 
        <div class="bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">MHO Queue</span>
            <div class="text-2xl font-black text-foreground tracking-tighter leading-none">{pendingRequisitions}</div>
          </div>
          <div class="p-2.5 bg-muted/50 rounded-xl"><FileText class="h-4 w-4 text-muted-foreground" /></div>
        </div>
 
        <div class="bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Silent Hubs</span>
            <div class="text-2xl font-black text-foreground tracking-tighter leading-none">{silentRhus}</div>
          </div>
          <div class="p-2.5 bg-muted/50 rounded-xl"><BellOff class="h-4 w-4 text-muted-foreground" /></div>
        </div>
      </div>
 
    </div>
  </div>
</div>
 
<style>
  :global(.agap-popup) {
    pointer-events: none !important;
  }
  :global(.agap-popup .maplibregl-popup-content) {
    background-color: rgba(9, 9, 11, 0.88) !important;
    backdrop-filter: blur(16px) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 12px !important;
    box-shadow: 0 16px 40px rgba(0,0,0,0.5) !important;
    padding: 12px 14px !important;
  }
  :global(.agap-popup .maplibregl-popup-tip) {
    display: none !important;
  }
</style>