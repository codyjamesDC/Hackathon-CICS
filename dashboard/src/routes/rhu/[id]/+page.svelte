<script lang="ts">
  import { 
    MapPin, 
    Pill, 
    TrendingDown, 
    AlertTriangle,
    CheckCircle2,
    CalendarClock,
    ChevronDown
  } from "lucide-svelte";
  import { slide } from 'svelte/transition';
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { page } from "$app/stores";
  import { createQuery } from '@tanstack/svelte-query';
  import { queries } from '$lib/api/queries';
  
  const rhuQuery = createQuery(() => queries.rhuDrilldown($page.params.id as string));
  let rhuDetail = $derived(rhuQuery.data as any);

  let selectedMedicineId = $state<string | null>(null);
  let selectedMedicine = $state<any | null>(null);

  const stockEntriesQuery = createQuery(() => queries.stockEntries($page.params.id as string, selectedMedicineId ?? ''));
  let stockEntriesData = $derived(stockEntriesQuery.data as any[]);

  function toggleRow(med: any) {
    if (selectedMedicineId === med.medicineId) {
      selectedMedicineId = null;
      selectedMedicine = null;
    } else {
      selectedMedicineId = med.medicineId;
      selectedMedicine = med;
    }
  }

  let chartContainer = $state<HTMLElement | null>(null);
  let chartInstance: any = null;

  $effect(() => {
    const entries = stockEntriesData; 
    const medicine = selectedMedicine;
    const container = chartContainer;

    if (!medicine || !entries || entries.length < 2 || !container) {
      if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
      }
      return;
    }

    const initChart = async () => {
      try {
        const echartsModule = await import('echarts');
        const echarts = echartsModule.default || echartsModule;

        if (chartInstance) {
          chartInstance.dispose();
        }

        chartInstance = echarts.init(container);

      const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      const sortedEntries = [...entries].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

      const statusColor = {
        critical: '#ef4444',
        warning: '#f97316',
        ok: '#22c55e',
        silent: '#6b7280',
      }[medicine.status] ?? '#6b7280';

      const option = {
        backgroundColor: 'transparent',
        grid: {
          left: '12%',
          right: '5%',
          top: '15%',
          bottom: '15%',
        },
        xAxis: {
          type: 'category',
          data: sortedEntries.map(e => formatDate(e.submittedAt)),
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
          splitLine: { show: false },
        },
        yAxis: {
          type: 'value',
          name: 'Units on Hand',
          nameTextStyle: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
          axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        },
        series: [
          {
            type: 'line',
            data: sortedEntries.map(e => e.quantityOnHand),
            smooth: true,
            symbol: 'none',
            lineStyle: { color: statusColor, width: 2 },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: statusColor + '40' },
                  { offset: 1, color: statusColor + '05' },
                ],
              },
            },
            markLine: {
              silent: true,
              symbol: 'none',
              data: [
                {
                  yAxis: medicine.criticalThresholdDays * medicine.velocityPerDay,
                  label: {
                    formatter: 'Breach Threshold',
                    color: 'rgba(239,68,68,0.8)',
                    fontSize: 11,
                    position: 'insideEndTop',
                  },
                  lineStyle: {
                    color: 'rgba(239,68,68,0.5)',
                    type: 'dashed',
                    width: 1.5,
                  },
                },
              ],
            },
          },
        ],
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(15,15,15,0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          textStyle: { color: '#fff', fontSize: 12 },
          formatter: (params: any) => {
            const p = params[0];
            return `${p.name}<br/>Units on Hand: <strong>${p.value}</strong>`;
          },
        },
      };

      chartInstance.setOption(option);
      } catch (err) {
        console.error("Failed to initialize ECharts:", err);
      }
    };

    initChart();

    return () => {
      if (chartInstance) {
        chartInstance.dispose();
        chartInstance = null;
      }
    };
  });

  $effect(() => {
    const handleResize = () => {
      if (chartInstance) {
        chartInstance.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  function formatRelativeTime(isoString: string) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return 'Just now'; // Handle clock skew
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} days ago`;
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      {#if rhuDetail}
        <div class="flex items-center gap-2 text-muted-foreground mb-1">
          <MapPin class="h-4 w-4" />
          <span class="text-sm font-medium">Barangay {rhuDetail.rhu.barangay}</span>
        </div>
        <div class="flex items-center gap-3">
          <h1 class="text-3xl font-bold tracking-tight">{rhuDetail.rhu.name}</h1>
          {#if rhuDetail.medicines && rhuDetail.medicines.length > 0}
            {@const overallStatus = 
              rhuDetail.medicines.some((m: any) => m.status === 'critical') ? 'critical' :
              rhuDetail.medicines.some((m: any) => m.status === 'warning') ? 'warning' :
              rhuDetail.medicines.some((m: any) => m.status === 'ok') ? 'ok' : 'silent'}
            {#if overallStatus === 'critical'}
              <Badge variant="destructive" class="text-xs">Critical</Badge>
            {:else if overallStatus === 'warning'}
              <Badge variant="outline" class="border-amber-500 text-amber-600 bg-amber-500/10 text-xs">Warning</Badge>
            {:else if overallStatus === 'ok'}
              <Badge variant="outline" class="border-emerald-500 text-emerald-600 bg-emerald-500/10 text-xs">OK</Badge>
            {:else}
              <Badge variant="outline" class="text-muted-foreground bg-muted text-xs">Silent</Badge>
            {/if}
          {/if}
        </div>
        <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <CalendarClock class="h-4 w-4" /> Active Status Monitored
        </p>
      {:else if rhuQuery.isPending}
        <Skeleton class="h-5 w-32 mb-2" />
        <Skeleton class="h-9 w-64 mb-2" />
        <Skeleton class="h-5 w-48" />
      {:else}
        <p class="text-destructive">Failed to load RHU data.</p>
      {/if}
    </div>
    <div class="flex gap-2">
      <Button variant="outline" disabled={!rhuDetail}>View Audit Trail</Button>
    </div>
  </div>

  <!-- At-a-Glance Dashboard Bar -->
  {#if rhuDetail && rhuDetail.medicines && rhuDetail.medicines.length > 0}
    {@const activeMeds = rhuDetail.medicines.filter((m: any) => m.daysRemaining != null && m.daysRemaining < 999)}
    {@const worstMed = activeMeds.length > 0 ? activeMeds.reduce((prev: any, current: any) => (prev.daysRemaining < current.daysRemaining) ? prev : current) : null}
    {@const mostStaleMed = rhuDetail.medicines.reduce((prev: any, current: any) => new Date(prev.lastEntryAt).getTime() < new Date(current.lastEntryAt).getTime() ? prev : current, rhuDetail.medicines[0])}
    {@const daysSinceLastReport = mostStaleMed ? Math.floor((Date.now() - new Date(mostStaleMed.lastEntryAt).getTime()) / (1000 * 60 * 60 * 24)) : 0}
    
    <div class="flex flex-wrap items-center gap-4">
      {#if worstMed}
        <div class="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
          <Pill class="h-4 w-4 {worstMed.daysRemaining < 7 ? 'text-destructive' : 'text-amber-500'}" />
          <span class="text-sm font-medium text-muted-foreground">Most Critical:</span>
          <span class="text-sm font-bold">{worstMed.genericName}</span>
        </div>
        <div class="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
          <TrendingDown class="h-4 w-4 {worstMed.daysRemaining < 7 ? 'text-destructive' : 'text-amber-500'}" />
          <span class="text-sm font-medium text-muted-foreground">Projected Zero:</span>
          <span class="text-sm font-bold {worstMed.daysRemaining < 7 ? 'text-destructive' : 'text-amber-500'}">{worstMed.daysRemaining.toFixed(1)} days</span>
        </div>
      {/if}
      <div class="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5">
        <CalendarClock class="h-4 w-4 {daysSinceLastReport > 3 ? 'text-destructive' : 'text-emerald-500'}" />
        <span class="text-sm font-medium text-muted-foreground">Last Report:</span>
        <span class="text-sm font-bold {daysSinceLastReport > 3 ? 'text-destructive' : 'text-emerald-500'}">
          {daysSinceLastReport === 0 ? 'Today' : `${daysSinceLastReport} days ago`}
        </span>
      </div>
    </div>
  {/if}

  <div class="space-y-6">
    <!-- Medicine Table Area -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Medicine Inventory & Velocity</Card.Title>
        <Card.Description>Current stock levels and EWMA-projected days remaining.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Medicine</Table.Head>
              <Table.Head class="text-right">Stock</Table.Head>
              <Table.Head class="text-right">Velocity/Day</Table.Head>
              <Table.Head class="text-right">Days Left</Table.Head>
              <Table.Head class="text-center">Status</Table.Head>
              <Table.Head class="w-[50px]"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if rhuDetail}
              {#each rhuDetail!.medicines as med}
                {@const isStale = (Date.now() - new Date(med.lastEntryAt).getTime()) > 3 * 24 * 60 * 60 * 1000}
                <Table.Row 
                  onclick={() => toggleRow(med)}
                  class="cursor-pointer transition-colors {selectedMedicineId === med.medicineId ? 'bg-white/[0.02]' : 'hover:bg-muted/30'}"
                  style="border-left: 4px solid {selectedMedicineId === med.medicineId ? (med.status === 'critical' ? '#ef4444' : med.status === 'warning' ? '#f97316' : med.status === 'ok' ? '#22c55e' : '#6b7280') : 'transparent'};"
                >
                  <Table.Cell class="font-medium">
                    <div class="flex items-center gap-2">
                      <Pill class="h-4 w-4 text-muted-foreground" />
                      <div class="flex flex-col">
                        <span>{med.genericName}</span>
                        <span class="text-xs font-normal {isStale ? 'text-destructive font-semibold' : 'text-muted-foreground'}">Reported: {formatRelativeTime(med.lastEntryAt)}</span>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell class="text-right font-medium {med.currentStock <= 0 ? 'text-destructive font-bold' : ''}">{med.currentStock}</Table.Cell>
                  <Table.Cell class="text-right">{med.velocityPerDay.toFixed(1)}</Table.Cell>
                  <Table.Cell class="text-right {med.daysRemaining < 7 ? 'text-destructive font-bold' : med.daysRemaining < 14 ? 'text-amber-500 font-semibold' : 'text-emerald-500 font-semibold'}">
                    {#if med.daysRemaining == null || med.daysRemaining > 999}
                      <span class="text-muted-foreground font-normal">&mdash;</span>
                    {:else if med.daysRemaining > 90}
                      90+
                    {:else}
                      {med.daysRemaining.toFixed(1)}
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    {#if med.status === 'critical'}
                      <Badge variant="destructive" class="gap-1"><AlertTriangle class="h-3 w-3"/> Critical</Badge>
                    {:else if med.status === 'warning'}
                      <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1"><TrendingDown class="h-3 w-3"/> Low</Badge>
                    {:else if med.status === 'ok'}
                      <Badge variant="outline" class="border-emerald-500 text-emerald-600 gap-1"><CheckCircle2 class="h-3 w-3"/> Safe</Badge>
                    {:else}
                      {#if isStale}
                        <Badge variant="destructive" class="gap-1 bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"><AlertTriangle class="h-3 w-3"/> Silent</Badge>
                      {:else}
                        <Badge variant="outline" class="gap-1 text-muted-foreground bg-muted">Silent</Badge>
                      {/if}
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="text-right">
                    <ChevronDown class="h-4 w-4 text-muted-foreground transition-transform duration-200 {selectedMedicineId === med.medicineId ? 'rotate-180' : ''}" />
                  </Table.Cell>
                </Table.Row>
                
                {#if selectedMedicineId === med.medicineId}
                  <Table.Row class="bg-white/[0.02]">
                    <Table.Cell colspan={6} class="p-0 border-b-0">
                      <div transition:slide={{ duration: 200 }} class="border-t border-white/10 overflow-hidden">
                        <div class="px-6 py-4">
                          <h3 class="text-sm font-medium text-muted-foreground mb-4">Consumption Trend — {med.genericName}</h3>
                          {#if stockEntriesQuery.isPending}
                             <div class="w-full h-[280px] rounded-md bg-white/5 animate-pulse" />
                          {:else if stockEntriesData && stockEntriesData.length < 2}
                             <div class="h-[280px] w-full flex items-center justify-center text-center text-sm text-muted-foreground p-4">
                               Not enough data to plot trend.<br/>At least 2 stock submissions required.
                             </div>
                          {:else}
                             <div bind:this={chartContainer} class="h-[280px] w-full"></div>
                          {/if}
                        </div>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                {/if}
              {:else}
                <Table.Row>
                  <Table.Cell colspan={6} class="text-center text-muted-foreground h-24">No medicines documented for this RHU.</Table.Cell>
                </Table.Row>
              {/each}
            {:else if rhuQuery.isPending}
              {#each Array(4) as _}
                <Table.Row>
                  <Table.Cell><Skeleton class="h-8 w-32" /></Table.Cell>
                  <Table.Cell><Skeleton class="h-5 w-12 ml-auto" /></Table.Cell>
                  <Table.Cell><Skeleton class="h-5 w-12 ml-auto" /></Table.Cell>
                  <Table.Cell><Skeleton class="h-5 w-12 ml-auto" /></Table.Cell>
                  <Table.Cell><Skeleton class="h-6 w-20 mx-auto" /></Table.Cell>
                  <Table.Cell><Skeleton class="h-4 w-4 ml-auto" /></Table.Cell>
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

  </div>
</div>
