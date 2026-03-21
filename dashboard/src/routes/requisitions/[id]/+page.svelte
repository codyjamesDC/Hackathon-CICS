<script lang="ts">
  import { 
    MapPin, 
    ArrowLeft, 
    Clock, 
    CheckCircle2, 
    ShieldCheck, 
    Pill
  } from "lucide-svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Skeleton } from "$lib/components/ui/skeleton/index.js";
  import { toast } from "svelte-sonner";
  import { page } from "$app/stores";
  import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
  import { queries, approveRequisition } from '$lib/api/queries';

  const queryClient = useQueryClient();
  const reqQuery = createQuery(() => queries.requisitionDetail($page.params.id as string));
  let reqDetail = $derived(reqQuery.data);

  const approveMut = createMutation(() => ({
    mutationFn: (id: string) => approveRequisition(id),
    onSuccess: () => {
      toast.success('Requisition approved');
      queryClient.invalidateQueries({ queryKey: ['requisitions'] });
    },
    onError: (err: Error) => {
      if (err.message.includes('409') || err.message.includes('Already approved')) toast.error('Already approved');
      else toast.error(err.message);
    }
  }));

  let isSubmitting = $derived(approveMut.isPending);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }

  function auditDotColor(eventType: string): string {
    if (eventType.includes('draft'))  return 'bg-zinc-500';
    if (eventType.includes('approv')) return 'bg-emerald-500';
    if (eventType.includes('sent') || eventType.includes('send')) return 'bg-teal-500';
    return 'bg-zinc-500';
  }

  let sortedAudit = $derived(
    reqDetail ? [...(reqDetail.audit ?? [])].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []
  );
</script>

<div class="flex flex-col gap-6">
  <div>
    <Button variant="ghost" size="sm" class="-ml-3 text-muted-foreground mb-4" href="/requisitions">
      <ArrowLeft class="h-4 w-4 mr-2" /> Back to List
    </Button>
    
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        {#if reqDetail}
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-semibold text-foreground">REQ-{reqDetail.id.slice(0, 6).toUpperCase()}</span>
            {#if reqDetail.status === 'drafted'}
              <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1"><Clock class="h-3 w-3"/> Drafted</Badge>
            {:else if reqDetail.status === 'approved'}
              <Badge variant="outline" class="border-emerald-500 text-emerald-600 gap-1"><CheckCircle2 class="h-3 w-3"/> Approved</Badge>
            {:else if reqDetail.status === 'sent'}
              <Badge variant="outline" class="border-teal-500 text-teal-500 gap-1">Sent</Badge>
            {:else}
              <Badge variant="outline" class="gap-1">{reqDetail.status}</Badge>
            {/if}
          </div>
          <h1 class="text-3xl font-bold tracking-tight">Requisition Review</h1>
          <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin class="h-4 w-4" /> {reqDetail.rhuName}
          </p>
        {:else if reqQuery.isPending}
          <Skeleton class="h-6 w-24 mb-3" />
          <Skeleton class="h-10 w-64 mb-2" />
          <Skeleton class="h-5 w-48" />
        {:else}
          <p class="text-destructive">Failed to load requisition.</p>
        {/if}
      </div>
      <div class="flex gap-2">
        <Button 
          disabled={!reqDetail || reqDetail.status !== 'drafted' || isSubmitting}
          onclick={() => approveMut.mutate(reqDetail!.id)}
          class="gap-2">
          <ShieldCheck class="h-4 w-4" /> {isSubmitting ? 'Approving...' : 'Approve'}
        </Button>
      </div>
    </div>
  </div>

  <div class="flex flex-col gap-6">
    <!-- Items Table -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Requested Items</Card.Title>
        <Card.Description>Auto-drafted based on threshold breaches.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Item</Table.Head>
              <Table.Head class="text-right">Requested Qty</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#if reqDetail}
              {#each reqDetail!.items || [] as item}
                <Table.Row>
                  <Table.Cell>
                    <span class="font-medium">{item.genericName}</span>
                  </Table.Cell>
                  <Table.Cell class="text-right font-medium">{item.quantityRequested}</Table.Cell>
                </Table.Row>
              {:else}
                <Table.Row>
                  <Table.Cell colspan={2} class="text-center text-muted-foreground">No items in this requisition.</Table.Cell>
                </Table.Row>
              {/each}
            {/if}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <!-- Audit Trail -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Audit Trail</Card.Title>
      </Card.Header>
      <Card.Content class="pt-2 pb-6">
        {#if reqDetail}
          {@const STEPS = [
            { key: 'drafted',      label: 'Drafted',      match: (e: string) => e.includes('draft'),    dotClass: 'bg-zinc-400' },
            { key: 'approved',     label: 'Approved',     match: (e: string) => e.includes('approv'),   dotClass: 'bg-emerald-500' },
            { key: 'sent',         label: 'Sent',         match: (e: string) => e.includes('sent') || e.includes('send'), dotClass: 'bg-teal-500' },
          ]}
          <div class="relative flex items-start justify-between px-2">
            <!-- Connecting line across the full width -->
            <div class="absolute top-[6px] left-6 right-6 h-px bg-border"></div>
            {#each STEPS as step, i}
              {@const log = sortedAudit.find((l: any) => step.match(l.eventType))}
              <div class="flex flex-col items-center text-center flex-1 relative">
                <!-- Dot -->
                <div class="w-3.5 h-3.5 rounded-full ring-2 ring-background z-10 shrink-0
                  {log ? step.dotClass : 'bg-card border-2 border-border'}"></div>
                <!-- Label -->
                <p class="text-xs font-medium mt-2 {log ? 'text-foreground' : 'text-muted-foreground/50'}">{step.label}</p>
                {#if log}
                  <p class="text-xs text-muted-foreground mt-0.5">By {log.actorType}</p>
                  <p class="text-xs text-muted-foreground/70">{formatDate(log.createdAt)}</p>
                {:else}
                  <p class="text-xs text-muted-foreground/40 mt-0.5">Pending</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </Card.Content>
      <Card.Footer>
        <p class="text-xs text-muted-foreground text-center w-full border-t pt-4">
          All actions are immutably logged.
        </p>
      </Card.Footer>
    </Card.Root>
  </div>
</div>
