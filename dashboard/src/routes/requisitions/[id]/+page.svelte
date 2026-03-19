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
  import { toast } from "svelte-sonner";
  import type { PageData } from './$types';
  import { apiClient } from "$lib/api/client";
  import { ENDPOINTS } from "$lib/api/endpoints";
  import { invalidateAll } from "$app/navigation";
  
  let { data }: { data: PageData } = $props();

  let reqDetail = $derived(data.reqDetail);
  let isSubmitting = $state(false);

  async function approveRequisition(id: string) {
    if (isSubmitting) return;
    isSubmitting = true;
    try {
      await apiClient(window.fetch, ENDPOINTS.REQUISITION_APPROVE(id), {
        method: 'POST'
      });
      toast.success("Requisition approved successfully");
      await invalidateAll(); // Refresh data
    } catch (e: any) {
      if (e.message.includes('Already approved')) {
        toast.error("Already approved");
      } else {
        toast.error(e.message || "Failed to approve requisition");
      }
    } finally {
      isSubmitting = false;
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString();
  }
</script>

<div class="flex flex-col gap-6">
  <div>
    <Button variant="ghost" size="sm" class="-ml-3 text-muted-foreground mb-4" href="/requisitions">
      <ArrowLeft class="h-4 w-4 mr-2" /> Back to List
    </Button>
    
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          {#if reqDetail.status === 'drafted'}
            <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1"><Clock class="h-3 w-3"/> Drafted</Badge>
          {:else if reqDetail.status === 'approved'}
            <Badge variant="outline" class="border-emerald-500 text-emerald-600 gap-1"><CheckCircle2 class="h-3 w-3"/> Approved</Badge>
          {:else}
            <Badge variant="outline" class="gap-1">{reqDetail.status}</Badge>
          {/if}
          <span class="font-mono text-xs text-muted-foreground">{reqDetail.id}</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight">Requisition Review</h1>
        <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <MapPin class="h-4 w-4" /> {reqDetail.rhuName}
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" disabled={reqDetail.status !== 'drafted' || isSubmitting}>Reject</Button>
        <Button 
          disabled={reqDetail.status !== 'drafted' || isSubmitting}
          onclick={() => approveRequisition(reqDetail.id)}
          class="gap-2">
          <ShieldCheck class="h-4 w-4" /> {isSubmitting ? 'Approving...' : 'Approve & Sign'}
        </Button>
      </div>
    </div>
  </div>

  <div class="grid gap-6 md:grid-cols-3">
    <!-- Items Table -->
    <Card.Root class="md:col-span-2">
      <Card.Header>
        <Card.Title>Requested Items</Card.Title>
        <Card.Description>Auto-drafted based on threshold breaches.</Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Medicine</Table.Head>
              <Table.Head class="text-right">Current Stock</Table.Head>
              <Table.Head class="text-right">Requested Qty</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each reqDetail.items || [] as item}
              <Table.Row>
                <Table.Cell class="font-medium">
                  <div class="flex items-center gap-2">
                    <Pill class="h-4 w-4 text-muted-foreground" />
                    {item.genericName}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right {item.currentStock <= 0 ? 'text-destructive font-semibold' : ''}">{item.currentStock}</Table.Cell>
                <Table.Cell class="text-right font-bold">{item.quantityRequested}</Table.Cell>
              </Table.Row>
            {:else}
               <Table.Row>
                 <Table.Cell colspan={3} class="text-center text-muted-foreground">No items in this requisition.</Table.Cell>
               </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>

    <!-- Audit Trail -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Audit Trail</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="space-y-6">
          {#each (reqDetail.audit || []) as log}
            <div class="flex gap-4">
              <div class="mt-1 {log.actorType === 'system' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40'} p-1.5 rounded-full">
                {#if log.actorType === 'system'}
                   <Clock class="h-4 w-4" />
                {:else}
                   <CheckCircle2 class="h-4 w-4" />
                {/if}
              </div>
              <div>
                <p class="font-medium text-sm">{log.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
                <p class="text-xs text-muted-foreground mt-0.5">By {log.actorType}</p>
                <p class="text-xs mt-1 {log.actorType === 'system' ? 'text-amber-600/80 dark:text-amber-400' : 'text-emerald-600/80 dark:text-emerald-400'}">{formatDate(log.createdAt)}</p>
              </div>
            </div>
          {:else}
             <p class="text-sm text-muted-foreground">No audit logs available.</p>
          {/each}
          
          {#if !reqDetail.audit?.find((log: any) => log.eventType.includes('approv')) && reqDetail.status === 'drafted'}
            <div class="flex gap-4 opacity-50">
              <div class="mt-1 bg-muted p-1.5 rounded-full">
                <CheckCircle2 class="h-4 w-4" />
              </div>
              <div>
                <p class="font-medium text-sm">MHO Approval</p>
                <p class="text-xs text-muted-foreground mt-0.5">Pending</p>
              </div>
            </div>
          {/if}
        </div>
      </Card.Content>
      <Card.Footer>
        <p class="text-xs text-muted-foreground text-center w-full border-t pt-4">
          All actions are immutably logged.
        </p>
      </Card.Footer>
    </Card.Root>
  </div>
</div>
