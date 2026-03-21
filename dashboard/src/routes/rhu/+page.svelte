<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queries } from '$lib/api/queries';
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { AlertTriangle, ChevronRight, Search } from 'lucide-svelte';
  import { SEED_IDS } from '$lib/api/constants';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { Input } from '$lib/components/ui/input/index.js';
  import { goto } from '$app/navigation';

  let searchQuery = $state('');

  function relativeTime(iso: string | Date | null): string {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const heatmapQuery = createQuery(() => queries.heatmap(SEED_IDS.MUNICIPALITY_ID));

  function getUrgencyWeight(status: string) {
    if (status === 'critical') return 1;
    if (status === 'warning')  return 2;
    if (status === 'ok')       return 3;
    return 4;
  }

  let rhus = $derived(
    ((heatmapQuery.data as any[]) ?? [])
      .slice()
      .sort((a, b) => getUrgencyWeight(a.status) - getUrgencyWeight(b.status))
  );

  let filteredRhus = $derived(
    rhus.filter((rhu: any) =>
      rhu.rhuName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rhu.barangay.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="flex flex-col gap-6 flex-1 min-h-0">
  <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">RHU Directory</h1>
      <p class="text-sm text-muted-foreground mt-1">Directory of monitored healthcare facilities in Nagcarlan.</p>
    </div>
    <div class="relative w-full sm:w-64">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Search RHU or barangay..." bind:value={searchQuery} class="pl-9" />
    </div>
  </div>

  <Card.Root class="flex flex-col flex-1 min-h-0 overflow-hidden py-0">
    <Card.Content class="p-0 flex flex-col flex-1 min-h-0">
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50 border-b border-border/60">
            <Table.Head class="w-[300px] pl-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">RHU Name</Table.Head>
            <Table.Head class="w-[200px] text-xs font-semibold uppercase tracking-wider text-muted-foreground">Barangay</Table.Head>
            <Table.Head class="w-[180px] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Predicted Days Remaining</Table.Head>
            <Table.Head class="w-[140px] text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last Report</Table.Head>
            <Table.Head class="w-[40px]"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if heatmapQuery.isPending}
            {#each Array(8) as _}
              <Table.Row>
                <Table.Cell class="pl-5"><Skeleton class="h-5 w-44" /></Table.Cell>
                <Table.Cell><Skeleton class="h-4 w-24" /></Table.Cell>
                <Table.Cell class="text-center"><Skeleton class="h-4 w-12 mx-auto" /></Table.Cell>
                <Table.Cell class="text-center"><Skeleton class="h-4 w-16 mx-auto" /></Table.Cell>
                <Table.Cell></Table.Cell>
              </Table.Row>
            {/each}
          {:else if heatmapQuery.isError}
            <Table.Row>
              <Table.Cell colspan={5} class="text-center text-destructive h-32">
                <AlertTriangle class="h-6 w-6 mx-auto mb-2 opacity-80" />
                <p>Failed to load RHUs.</p>
                <p class="text-xs opacity-70 mt-1">{heatmapQuery.error?.message}</p>
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each filteredRhus as rhu}
              <Table.Row
                class="hover:bg-muted/40 cursor-pointer transition-colors"
                onclick={() => goto(`/rhu/${rhu.rhuId}`)}
              >
                <Table.Cell class="font-medium pl-5 py-4">{rhu.rhuName}</Table.Cell>
                <Table.Cell class="text-muted-foreground text-sm">{rhu.barangay}</Table.Cell>
                <Table.Cell class="text-center">
                  {#if rhu.status === 'silent'}
                    <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60">
                      <span class="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0"></span>
                      No data
                    </span>
                  {:else if rhu.worstDaysRemaining < 7}
                    <span class="inline-flex items-center gap-1.5 text-xs text-red-400">
                      <span class="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse"></span>
                      {rhu.worstDaysRemaining.toFixed(1)}d
                    </span>
                  {:else if rhu.worstDaysRemaining < 14}
                    <span class="inline-flex items-center gap-1.5 text-xs text-amber-400">
                      <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                      {rhu.worstDaysRemaining.toFixed(1)}d
                    </span>
                  {:else}
                    <span class="inline-flex items-center gap-1.5 text-xs text-emerald-500">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      {rhu.worstDaysRemaining.toFixed(1)}d
                    </span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-center text-xs text-muted-foreground">
                  {relativeTime(rhu.lastReportedAt)}
                </Table.Cell>
                <Table.Cell class="text-muted-foreground/40 pr-4">
                  <ChevronRight class="h-4 w-4" />
                </Table.Cell>
              </Table.Row>
            {:else}
              <Table.Row class="hover:bg-transparent">
                <Table.Cell colspan={5} class="h-64 align-middle">
                  <div class="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-1">
                    <p class="text-sm">
                      {#if searchQuery}No results for "<span class="text-foreground">{searchQuery}</span>"{:else}No Rural Health Units registered in this municipality.{/if}
                    </p>
                  </div>
                </Table.Cell>
              </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
</div>