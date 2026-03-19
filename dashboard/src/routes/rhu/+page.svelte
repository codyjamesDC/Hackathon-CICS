<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { queries } from '$lib/api/queries';
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Building2, AlertTriangle, MapPin } from 'lucide-svelte';
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { SEED_IDS } from '$lib/api/constants';
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";

  const heatmapQuery = createQuery(() => queries.heatmap(SEED_IDS.MUNICIPALITY_ID));

  function getUrgencyWeight(status: string) {
    if (status === 'critical') return 1;
    if (status === 'warning') return 2;
    if (status === 'ok') return 3;
    return 4; // silent
  }

  let rhus = $derived(
    ((heatmapQuery.data as any[]) ?? []).slice().sort((a, b) => getUrgencyWeight(a.status) - getUrgencyWeight(b.status))
  );
</script>

<div class="px-6 py-8 max-w-7xl mx-auto space-y-8">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold tracking-tight">RHU Directory</h1>
      <p class="text-muted-foreground mt-1 text-base">Directory of monitored healthcare facilities in Nagcarlan.</p>
    </div>
  </div>

  <Card.Root>
    <Card.Content class="p-0">
      <Table.Root>
        <Table.Header>
          <Table.Row class="bg-muted/50">
            <Table.Head class="w-[300px]">RHU Name</Table.Head>
            <Table.Head>Barangay</Table.Head>
            <Table.Head>Status</Table.Head>
            <Table.Head class="text-right">Actions</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#if heatmapQuery.isPending}
            {#each Array(5) as _}
              <Table.Row>
                <Table.Cell><Skeleton class="h-5 w-48" /></Table.Cell>
                <Table.Cell><Skeleton class="h-4 w-32" /></Table.Cell>
                <Table.Cell><Skeleton class="h-6 w-20 rounded-full" /></Table.Cell>
                <Table.Cell class="text-right"><Skeleton class="h-8 w-24 ml-auto" /></Table.Cell>
              </Table.Row>
            {/each}
          {:else if heatmapQuery.isError}
            <Table.Row>
              <Table.Cell colspan={4} class="text-center text-destructive h-32">
                <AlertTriangle class="h-6 w-6 mx-auto mb-2 opacity-80" />
                <p>Failed to load RHUs.</p>
                <p class="text-xs opacity-70 mt-1">{heatmapQuery.error?.message}</p>
              </Table.Cell>
            </Table.Row>
          {:else}
            {#each rhus as rhu}
              <Table.Row class="hover:bg-muted/30">
                <Table.Cell class="font-medium">
                  <div class="flex items-center gap-3">
                    <div class="bg-primary/10 text-primary p-2 rounded-lg">
                      <Building2 class="h-4 w-4" />
                    </div>
                    {rhu.rhuName}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin class="h-3.5 w-3.5" />
                    Barangay {rhu.barangay}
                  </div>
                </Table.Cell>
                <Table.Cell>
                   {#if rhu.status === 'silent'}
                     <Badge variant="outline" class="gap-1 text-muted-foreground bg-muted">Silent</Badge>
                   {:else if rhu.worstDaysRemaining < 7}
                     <Badge variant="destructive" class="gap-1 bg-red-500 hover:bg-red-600">
                       &lt; 7d
                     </Badge>
                   {:else if rhu.worstDaysRemaining < 14}
                     <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1 bg-amber-500/10">
                       {rhu.worstDaysRemaining.toFixed(1)}d
                     </Badge>
                   {:else}
                     <Badge variant="outline" class="border-emerald-500 text-emerald-600 gap-1 bg-emerald-500/10">
                       {rhu.worstDaysRemaining.toFixed(1)}d
                     </Badge>
                   {/if}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <a href={`/rhu/${rhu.rhuId}`} class="text-sm font-medium text-primary hover:underline underline-offset-4">
                    View Inventory →
                  </a>
                </Table.Cell>
              </Table.Row>
            {:else}
               <Table.Row>
                 <Table.Cell colspan={4} class="text-center text-muted-foreground h-32">
                   No Rural Health Units registered in this municipality.
                 </Table.Cell>
               </Table.Row>
            {/each}
          {/if}
        </Table.Body>
      </Table.Root>
    </Card.Content>
  </Card.Root>
</div>
