<script lang="ts">
  import { 
    AlertTriangle, 
    BellOff, 
    Activity,
    Clock,
    Filter
  } from "lucide-svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { createQuery } from '@tanstack/svelte-query';
  import { queries } from '$lib/api/queries';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";

  const alertsQuery = createQuery(() => queries.alerts());

  let alerts = $derived((alertsQuery.data as any[]) ?? []);

  function formatTime(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 0) return 'Just now'; // Handle clock skew
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    const hrs = Math.round(diffMins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    return `${Math.round(hrs / 24)} days ago`;
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">System Alerts</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Critical events requiring attention across the municipality.
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline" class="gap-2"><Filter class="h-4 w-4" /> Filter</Button>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
    {#if alertsQuery.isPending}
      {#each Array(3) as _}
        <Card.Root class="border-muted/30">
          <Card.Header class="pb-2">
            <Skeleton class="h-5 w-24 mb-2" />
            <Skeleton class="h-6 w-3/4 mb-1" />
            <Skeleton class="h-4 w-1/2" />
          </Card.Header>
          <Card.Content>
            <Skeleton class="h-16 w-full mt-2" />
            <Skeleton class="h-9 w-full mt-4" />
          </Card.Content>
        </Card.Root>
      {/each}
    {:else if alertsQuery.isError}
      <div class="col-span-full py-12 text-center border-2 border-dashed border-destructive/50 rounded-lg text-destructive">
        <AlertTriangle class="h-8 w-8 mx-auto mb-2 opacity-80" />
        <h3 class="font-medium text-lg">Failed to load alerts</h3>
        <p class="text-sm mt-1 opacity-80">{alertsQuery.error?.message || 'Unknown error occurred'}</p>
      </div>
    {:else}
      {#each alerts as alert}
      {#if alert.type === 'threshold_breach'}
        <Card.Root class="border-destructive/50 bg-destructive/5">
          <Card.Header class="pb-2">
            <div class="flex items-center justify-between">
              <Badge variant="destructive" class="gap-1 mb-2"><AlertTriangle class="h-3 w-3" /> Threshold Breach</Badge>
              <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="h-3 w-3"/> {formatTime(alert.createdAt)}</span>
            </div>
            <Card.Title class="text-lg">{alert.medicineName || 'Unknown Medicine'}</Card.Title>
            <Card.Description>{alert.rhuName}</Card.Description>
          </Card.Header>
          <Card.Content>
            <p class="text-sm text-foreground mt-2">
              {alert.message}
            </p>
            {#if alert.relatedRequisitionId}
              <Button size="sm" class="mt-4 w-full" variant="destructive" href="/requisitions/{alert.relatedRequisitionId}">
                Review Requisition
              </Button>
            {/if}
          </Card.Content>
        </Card.Root>
      {:else if alert.type === 'anomaly_spike'}
        <Card.Root class="border-amber-500/50 bg-amber-500/5">
          <Card.Header class="pb-2">
            <div class="flex items-center justify-between">
              <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1 mb-2"><Activity class="h-3 w-3" /> Anomaly Spike</Badge>
              <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="h-3 w-3"/> {formatTime(alert.createdAt)}</span>
            </div>
            <Card.Title class="text-lg">{alert.medicineName || 'Multiple Medicines'}</Card.Title>
            <Card.Description>{alert.rhuName}</Card.Description>
          </Card.Header>
          <Card.Content>
            <p class="text-sm text-foreground mt-2">
              {alert.message}
            </p>
            <Button size="sm" class="mt-4 w-full text-amber-600 border-amber-500 hover:bg-amber-500/10" variant="outline" href="/rhu/{alert.rhuId}">
              View RHU Detail
            </Button>
          </Card.Content>
        </Card.Root>
      {:else}
        <Card.Root class="border-muted-foreground/30 bg-muted/20">
          <Card.Header class="pb-2">
            <div class="flex items-center justify-between">
              <Badge variant="secondary" class="gap-1 mb-2 text-muted-foreground"><BellOff class="h-3 w-3" /> Silent Facility</Badge>
              <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="h-3 w-3"/> {formatTime(alert.createdAt)}</span>
            </div>
            <Card.Title class="text-lg">{alert.rhuName}</Card.Title>
            <Card.Description>Silence Alert</Card.Description>
          </Card.Header>
          <Card.Content>
            <p class="text-sm text-foreground mt-2">
              {alert.message}
            </p>
            <Button size="sm" class="mt-4 w-full" variant="secondary" href="/rhu/{alert.rhuId}">
              View RHU Detail
            </Button>
          </Card.Content>
        </Card.Root>
      {/if}
      {:else}
        <div class="col-span-full py-12 text-center border-2 border-dashed rounded-lg">
          <h3 class="font-medium text-lg text-foreground">No active alerts</h3>
          <p class="text-muted-foreground text-sm mt-1">All facilities are operating normally.</p>
        </div>
      {/each}
    {/if}
  </div>
</div>
