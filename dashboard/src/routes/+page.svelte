<script lang="ts">
  import { 
    AlertTriangle, 
    BellOff, 
    Building2, 
    FileText 
  } from "lucide-svelte";
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import 'maplibre-gl/dist/maplibre-gl.css'; // Native Vite import to sync with installed npm version
  import maplibregl from 'maplibre-gl';
  import * as Card from "$lib/components/ui/card/index.js";
  import type { PageData } from './$types';
  
  let { data }: { data: PageData } = $props();

  let mapElement: HTMLElement;

  onMount(() => {
    if (!mapElement) return;

    // We use the completely free, no-token-required CartoDB Dark Matter GL style!
    const map = new maplibregl.Map({
      container: mapElement,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [121.2333, 14.1667],
      zoom: 12.5,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-left');

    map.on('load', async () => {
      try {
        const response = await window.fetch('/losb_anos_barangays.geojson');
        const geojsonData = await response.json();

        // 1. Build a fast lookup map for our backend metric data
        const rhuMap = new Map();
        data.heatmap.forEach((rhu: any) => {
          const rawName = rhu.barangay.toLowerCase().replace('barangay ', '').trim();
          rhuMap.set(rawName, rhu);
        });

        // 2. Pre-process the GeoJSON to embed our data-driven styling properties directly 
        // into the feature properties so the WebGL shader can render them in one pass.
        geojsonData.features = geojsonData.features.map((f: any, index: number) => {
          f.id = index; // MapLibre GL requires integer IDs for interactive hover states
          
          const brgyName = f.properties.NAME_3?.toLowerCase().trim();
          const rhu = rhuMap.get(brgyName);
          
          let fillColor = '#1f2937'; // Default dark gray for no RHU
          let fillOpacity = 0.3;
          let status = 'unmonitored';

          if (rhu) {
            status = rhu.status;
            switch (rhu.status) {
              case 'critical': fillColor = '#ef4444'; fillOpacity = 0.7; break;
              case 'warning':  fillColor = '#f97316'; fillOpacity = 0.6; break;
              case 'ok':       fillColor = '#22c55e'; fillOpacity = 0.5; break;
              case 'silent':   fillColor = '#6b7280'; fillOpacity = 0.4; break;
            }
          }

          f.properties.fillColor = fillColor;
          f.properties.fillOpacity = fillOpacity;
          f.properties.status = status;
          f.properties.rhuId = rhu?.rhuId || null;
          f.properties.rhuName = rhu?.rhuName || null;
          f.properties.worstDaysRemaining = rhu?.worstDaysRemaining || null;
          
          return f;
        });

        // 3. Add the data source to the WebGL engine
        map.addSource('barangays', {
          type: 'geojson',
          data: geojsonData
        });

        // 4. Paint the filled polygons using the data-driven properties
        map.addLayer({
          id: 'barangays-fill',
          type: 'fill',
          source: 'barangays',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': ['get', 'fillOpacity']
          }
        });

        // 5. Paint the dashed boundaries
        map.addLayer({
          id: 'barangays-line',
          type: 'line',
          source: 'barangays',
          paint: {
            'line-color': '#ffffff',
            'line-width': 1,
            'line-dasharray': [3, 3],
            'line-opacity': 0.5
          }
        });

        // 6. Paint a dynamic hover-border layer
        map.addLayer({
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

        // 7. Interactivity definitions
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
        });

        let hoveredStateId: number | null = null;

        map.on('mousemove', 'barangays-fill', (e: any) => {
          if (e.features.length > 0) {
            map.getCanvas().style.cursor = 'pointer';
            
            // Set hover state for border outline
            if (hoveredStateId !== null) {
              map.setFeatureState({ source: 'barangays', id: hoveredStateId }, { hover: false });
            }
            hoveredStateId = e.features[0].id;
            map.setFeatureState({ source: 'barangays', id: hoveredStateId }, { hover: true });

            // Set popup text
            const props = e.features[0].properties;
            let html = '';
            if (props.rhuId) {
              html = `<div style="padding: 4px; font-family: Inter, sans-serif;">
                <b style="color: black">${props.rhuName}</b><br/>
                <span style="color: #666; font-size: 12px;">Status: <b style="color: ${props.fillColor}">${props.status.toUpperCase()}</b></span><br/>
                <span style="color: #666; font-size: 12px;">Worst Days Left: ${Number(props.worstDaysRemaining).toFixed(1)}</span>
              </div>`;
            } else {
              html = `<div style="padding: 4px; font-family: Inter, sans-serif;">
                <b style="color: black">Barangay ${props.NAME_3}</b><br/>
                <span style="color: gray; font-size: 12px;">No monitoring facility.</span>
              </div>`;
            }
            popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
          }
        });

        map.on('mouseleave', 'barangays-fill', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
          if (hoveredStateId !== null) {
            map.setFeatureState({ source: 'barangays', id: hoveredStateId }, { hover: false });
          }
          hoveredStateId = null;
        });

        map.on('click', 'barangays-fill', (e: any) => {
          const rhuId = e.features[0]?.properties?.rhuId;
          if (rhuId && rhuId !== 'null') {
            window.location.href = `/rhu/${rhuId}`;
          }
        });

      } catch (e) {
        console.error("Failed to load map geojson data", e);
      }
    });

    return () => {
      map.remove();
    };
  });

  // Derived state directly from resolved data
  let totalRhus = $derived(data.heatmap.length);
  let activeBreaches = $derived(data.heatmap.filter(r => r.status === 'critical').length);
  let silentRhus = $derived(data.heatmap.filter(r => r.status === 'silent').length);
  let pendingRequisitions = $derived(data.requisitions.filter(r => r.status === 'drafted').length);
</script>

<div class="relative w-full h-[calc(100vh-6rem)] rounded-2xl overflow-hidden border border-border/30 shadow-2xl bg-[#09090b]">
  <!-- Base Map Layer -->
  <div bind:this={mapElement} class="absolute z-0 bg-transparent" style="top: 0; left: 0; width: 100%; height: 100%; min-height: 400px;"></div>

  <!-- Floating Overlay Container (Command Center Style) -->
  <div class="absolute inset-0 z-10 p-5 md:p-6 pointer-events-none flex flex-row justify-between items-start gap-5">
    
    <!-- Title Block (Top Left) -->
    <div class="pointer-events-auto bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-5 max-w-sm transition-all self-start">
      <h1 class="text-xl font-bold tracking-tight text-foreground">Municipal Dashboard</h1>
      <p class="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
        Real-time stockout risk and medical supply velocity tracking across networked Rural Health Units.
      </p>
    </div>

    <!-- Right Sidebar Panel (~280px wide) -->
    <div class="flex flex-col items-end gap-4 w-full md:w-[280px] self-stretch pointer-events-none">
      
      <!-- Map Legend (Top Right) -->
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

      <!-- Floating Stats Vertical Panel (Right Edge) -->
      <div class="pointer-events-auto flex flex-col gap-3 w-full">
        <!-- Total RHUs -->
        <div class="bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Network Coverage</span>
            <div class="text-2xl font-black text-foreground tracking-tighter leading-none">{totalRhus}</div>
          </div>
          <div class="p-2.5 bg-muted/50 rounded-xl">
            <Building2 class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <!-- Active Breaches -->
        <div class="bg-destructive/10 backdrop-blur-xl border border-destructive/20 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between group">
          <div>
            <span class="text-[10px] font-bold text-destructive uppercase tracking-wider block mb-0.5">Active Breaches</span>
            <div class="text-2xl font-black text-destructive tracking-tighter leading-none drop-shadow-sm">{activeBreaches}</div>
          </div>
          <div class="p-2.5 bg-destructive/20 rounded-xl">
            <AlertTriangle class="h-4 w-4 text-destructive group-hover:scale-110 transition-transform" />
          </div>
        </div>

        <!-- Pending Requisitions -->
        <div class="bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">MHO Queue</span>
            <div class="text-2xl font-black text-foreground tracking-tighter leading-none">{pendingRequisitions}</div>
          </div>
          <div class="p-2.5 bg-muted/50 rounded-xl">
            <FileText class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <!-- Silent RHUs -->
        <div class="bg-background/60 backdrop-blur-xl border border-border/40 shadow-xl rounded-2xl p-4 transition-transform hover:-translate-x-1 flex items-center justify-between">
          <div>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Silent Hubs</span>
            <div class="text-2xl font-black text-foreground tracking-tighter leading-none">{silentRhus}</div>
          </div>
          <div class="p-2.5 bg-muted/50 rounded-xl">
            <BellOff class="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
      
    </div>
  </div>
</div>

<style>
  /* Global overrides for MapLibre Popups to match the dark glassmorphism aesthetic perfectly */
  :global(.maplibregl-popup-content) {
    background-color: rgba(9, 9, 11, 0.75) !important;
    backdrop-filter: blur(12px) !important;
    color: white !important;
    border: 1px solid rgba(255, 255, 255, 0.15) !important;
    border-radius: 1rem !important;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3) !important;
    padding: 12px 16px !important;
  }
  :global(.maplibregl-popup-anchor-bottom .maplibregl-popup-tip) {
    border-top-color: rgba(9, 9, 11, 0.75) !important;
  }
  :global(.maplibregl-popup-anchor-top .maplibregl-popup-tip) {
    border-bottom-color: rgba(9, 9, 11, 0.75) !important;
  }
</style>
