<script lang="ts">
  import { 
    MapPin, 
    Pill, 
    TrendingDown, 
    AlertTriangle,
    CheckCircle2,
    CalendarClock
  } from "lucide-svelte";
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
        <h1 class="text-3xl font-bold tracking-tight">{rhuDetail.rhu.name}</h1>
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
      <Button variant="outline" disabled={!rhuDetail}>View Offline Audit</Button>
      <Button disabled={!rhuDetail}>Draft Requisition</Button>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-3">
    <!-- Medicine Table Area -->
    <Card.Root class="md:col-span-2">
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
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if rhuDetail}
              {#each rhuDetail!.medicines as med}
                <Table.Row>
                  <Table.Cell class="font-medium">
                    <div class="flex items-center gap-2">
                      <Pill class="h-4 w-4 text-muted-foreground" />
                      <div class="flex flex-col">
                        <span>{med.genericName}</span>
                        <span class="text-xs text-muted-foreground font-normal">Reported: {formatRelativeTime(med.lastEntryAt)}</span>
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell class="text-right font-medium {med.currentStock <= 0 ? 'text-destructive font-bold' : ''}">{med.currentStock}</Table.Cell>
                  <Table.Cell class="text-right">{med.velocityPerDay.toFixed(1)}</Table.Cell>
                  <Table.Cell class="text-right font-semibold 
                    {med.daysRemaining < 7 ? 'text-destructive' : med.daysRemaining < 14 ? 'text-amber-500' : 'text-emerald-500'}">
                    {med.daysRemaining > 999 ? '∞' : med.daysRemaining > 90 ? '90+' : med.daysRemaining.toFixed(1)}
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    {#if med.status === 'critical'}
                      <Badge variant="destructive" class="gap-1"><AlertTriangle class="h-3 w-3"/> Critical</Badge>
                    {:else if med.status === 'warning'}
                      <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1"><TrendingDown class="h-3 w-3"/> Low</Badge>
                    {:else if med.status === 'ok'}
                      <Badge variant="outline" class="border-emerald-500 text-emerald-600 gap-1"><CheckCircle2 class="h-3 w-3"/> Safe</Badge>
                    {:else}
                      <Badge variant="outline" class="gap-1 text-muted-foreground bg-muted">Silent</Badge>
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={5} class="text-center text-muted-foreground h-24">No medicines documented for this RHU.</Table.Cell>
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
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <!-- Velocity Chart Placeholder -->
    <div class="space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>Consumption Trend</Card.Title>
          <Card.Description>Select a medicine to view its 30-day velocity.</Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="h-[200px] w-full bg-muted/30 rounded-md border flex items-center justify-center p-4 text-center text-sm text-muted-foreground">
            <div>
              <TrendingDown class="mx-auto h-8 w-8 mb-2 opacity-50" />
              Chart.js or Recharts<br/>wrapper goes here
            </div>
          </div>
        </Card.Content>
      </Card.Root>
      
      <Card.Root>
        <Card.Header>
          <Card.Title>Active Alerts</Card.Title>
        </Card.Header>
        <Card.Content class="space-y-4">
          {#if rhuDetail}
            {#each rhuDetail!.medicines.filter((m: any) => m.status === 'critical' || m.status === 'warning') as med}
              <div class="flex gap-3 text-sm p-3 rounded-lg {med.status === 'critical' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-amber-500/10 border-amber-500/20 text-amber-600'} border">
                <AlertTriangle class="h-5 w-5 shrink-0" />
                <div>
                  <p class="font-semibold">{med.genericName} Low Stock</p>
                  <p class="text-xs opacity-90 mt-0.5">Projected stockout in {med.daysRemaining.toFixed(1)} days.</p>
                </div>
              </div>
            {:else}
              <div class="p-4 text-center text-sm text-muted-foreground">
                No active alerts for this RHU.
              </div>
            {/each}
          {/if}
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
