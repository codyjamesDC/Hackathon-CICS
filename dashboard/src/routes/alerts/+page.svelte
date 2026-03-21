<script lang="ts">
  import { 
    AlertTriangle, 
    BellOff, 
    Activity,
    Clock,
    CheckCheck,
    Search,
    ChevronRight,
  } from "lucide-svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { createQuery, useQueryClient } from '@tanstack/svelte-query';
  import { queries, acknowledgeAnomaly } from '$lib/api/queries';
  import { goto } from '$app/navigation';

  const queryClient = useQueryClient();
  const alertsQuery = createQuery(() => queries.alerts());

  let alerts = $derived((alertsQuery.data as any[]) ?? []);
  let activeTab = $state<'all' | 'threshold_breach' | 'anomaly_spike' | 'participation_alert'>('all');
  let searchQuery = $state('');
  let acknowledging = $state<Set<string>>(new Set());

  let filteredAlerts = $derived(
    alerts
      .filter((a: any) => activeTab === 'all' || a.type === activeTab)
      .filter((a: any) => !searchQuery || a.rhuName?.toLowerCase().includes(searchQuery.toLowerCase()) || a.medicineName?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  async function handleAcknowledge(id: string, e: MouseEvent) {
    e.stopPropagation();
    acknowledging = new Set([...acknowledging, id]);
    try {
      await acknowledgeAnomaly(id);
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
    } finally {
      acknowledging = new Set([...acknowledging].filter(x => x !== id));
    }
  }

  function accentBorder(type: string): string {
    return type === 'threshold_breach'   ? 'border-l-red-500'
         : type === 'anomaly_spike'      ? 'border-l-amber-400'
         : 'border-l-zinc-600';
  }

  function formatTime(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return 'Just now';
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const hrs = Math.round(diffMins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }
</script>

<div class="flex flex-col gap-6 flex-1 min-h-0">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">System Alerts</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Critical events requiring attention across the municipality.
      </p>
    </div>
    <div class="relative w-full sm:w-64">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search by RHU or medicine..." bind:value={searchQuery} class="pl-9" />
    </div>
  </div>

  <Card.Root class="flex flex-col flex-1 min-h-0">
    <Card.Header class="pb-0">
      <div class="flex gap-6 border-b">
        {#each [
          { id: 'all',                 label: 'All Alerts',       count: alerts.length },
          { id: 'threshold_breach',    label: 'Threshold Breach', count: alerts.filter((a: any) => a.type === 'threshold_breach').length },
          { id: 'anomaly_spike',       label: 'Anomaly Spike',    count: alerts.filter((a: any) => a.type === 'anomaly_spike').length },
          { id: 'participation_alert', label: 'Silent Facility',  count: alerts.filter((a: any) => a.type === 'participation_alert').length },
        ] as tab}
          <button
            onclick={() => activeTab = tab.id as any}
            class="text-sm font-medium pb-3 -mb-px transition-colors {activeTab === tab.id ? 'text-foreground border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}"
          >{tab.label} ({tab.count})</button>
        {/each}
      </div>
    </Card.Header>

    <Card.Content class="pt-4 flex flex-col flex-1 min-h-0">
      <div class="relative flex-1 min-h-[200px]">

        {#if alertsQuery.isPending}
          <div class="flex flex-col gap-3">
            {#each Array(4) as _}
              <div class="border-l-4 border-l-zinc-700 rounded-md border border-border p-4 flex items-center justify-between gap-4">
                <div class="flex flex-col gap-1.5 flex-1">
                  <Skeleton class="h-4 w-28" />
                  <Skeleton class="h-3 w-48" />
                </div>
                <div class="flex flex-col gap-1.5 items-center">
                  <Skeleton class="h-5 w-24" />
                  <Skeleton class="h-3 w-32" />
                </div>
                <div class="flex gap-2 items-center shrink-0">
                  <Skeleton class="h-8 w-28" />
                  <Skeleton class="h-8 w-20" />
                </div>
              </div>
            {/each}
          </div>

        {:else if alertsQuery.isError}
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-destructive">
            <AlertTriangle class="h-8 w-8 mx-auto mb-3 opacity-80" />
            <p class="text-sm font-medium">Failed to load alerts.</p>
            <p class="text-xs opacity-70 mt-1">{alertsQuery.error?.message}</p>
          </div>

        {:else if filteredAlerts.length === 0}
          <div class="absolute inset-0 flex flex-col items-center justify-center text-center text-muted-foreground">
            {#if searchQuery}
              <p class="text-sm">No results for "<span class="text-foreground">{searchQuery}</span>"</p>
            {:else}
              <p class="text-sm font-medium text-foreground">All clear</p>
              <p class="text-xs mt-1">No active alerts in this category.</p>
            {/if}
          </div>

        {:else}
          <div class="flex flex-col gap-2">
            {#each filteredAlerts as alert}
              <div class="border-l-4 {accentBorder(alert.type)} rounded-md border border-border bg-card hover:bg-muted/30 transition-colors px-5 py-4 flex items-center gap-6 min-h-[72px]">

                <!-- Col 1: Medicine / RHU title + RHU name -->
                <div class="flex flex-col min-w-[160px]">
                  <span class="text-sm font-bold tracking-wide truncate max-w-[160px]">
                    {alert.medicineName ?? alert.rhuName}
                  </span>
                  <span class="text-xs text-muted-foreground mt-0.5">{alert.rhuName}</span>
                </div>

                <!-- Col 2: Type badge + message -->
                <div class="flex flex-col flex-1 min-w-0 gap-1">
                  {#if alert.type === 'threshold_breach'}
                    <Badge variant="destructive" class="gap-1 w-fit text-xs"><AlertTriangle class="h-3 w-3" /> Threshold Breach</Badge>
                  {:else if alert.type === 'anomaly_spike'}
                    <Badge variant="outline" class="border-amber-400 text-amber-500 gap-1 w-fit text-xs"><Activity class="h-3 w-3" /> Anomaly Spike</Badge>
                  {:else}
                    <Badge variant="secondary" class="gap-1 w-fit text-xs text-muted-foreground"><BellOff class="h-3 w-3" /> Silent Facility</Badge>
                  {/if}
                  <span class="text-xs text-muted-foreground truncate">{alert.message}</span>
                </div>

                <!-- Col 3: Time (fixed width, always aligned) -->
                <div class="w-20 shrink-0 flex items-center justify-end">
                  <span class="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock class="h-3 w-3" />{formatTime(alert.createdAt)}
                  </span>
                </div>

                <!-- Col 4: Actions (fixed width, right-aligned) -->
                <div class="w-56 shrink-0 flex items-center justify-end gap-2">
                  {#if alert.type === 'threshold_breach' && alert.relatedRequisitionId}
                    <Button size="sm" variant="destructive" class="text-xs gap-1.5 h-8 w-full" href="/requisitions/{alert.relatedRequisitionId}">
                      Review Requisition
                    </Button>
                  {:else if alert.type === 'threshold_breach'}
                    <Button size="sm" variant="outline" class="text-xs h-8 w-full" href="/rhu/{alert.rhuId}">
                      View RHU
                    </Button>
                  {:else if alert.type === 'anomaly_spike'}
                    <Button
                      size="sm"
                      variant="outline"
                      class="text-xs gap-1.5 h-8 flex-1"
                      disabled={acknowledging.has(alert.id)}
                      onclick={(e: MouseEvent) => handleAcknowledge(alert.id, e)}
                    >
                      <CheckCheck class="h-3.5 w-3.5" />
                      {acknowledging.has(alert.id) ? 'Acknowledging…' : 'Acknowledge'}
                    </Button>
                    <Button size="sm" variant="outline" class="text-xs text-amber-500 border-amber-500/50 hover:bg-amber-500/10 h-8 flex-1" href="/rhu/{alert.rhuId}">
                      View RHU
                    </Button>
                  {:else}
                    <Button size="sm" variant="outline" class="text-xs h-8 w-full" href="/rhu/{alert.rhuId}">
                      View RHU <ChevronRight class="h-3.5 w-3.5 ml-1" />
                    </Button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

      </div>
    </Card.Content>
  </Card.Root>
</div>
