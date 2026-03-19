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
  import { Separator } from "$lib/components/ui/separator/index.js";
  
  // Mock Data
  const reqDetail = {
    id: "req-1",
    rhuName: "Barangay San Jose RHU",
    status: "drafted",
    draftedAt: "10 mins ago",
    items: [
      { name: "Paracetamol 500mg", type: "tablet", reqQty: 1000, currentStock: 15 },
      { name: "Ibuprofen 400mg", type: "tablet", reqQty: 500, currentStock: 0 },
    ]
  };
</script>

<div class="flex flex-col gap-6">
  <div>
    <Button variant="ghost" size="sm" class="-ml-3 text-muted-foreground mb-4" href="/requisitions">
      <ArrowLeft class="h-4 w-4 mr-2" /> Back to List
    </Button>
    <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-2">
          <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1"><Clock class="h-3 w-3"/> Drafted</Badge>
          <span class="font-mono text-xs text-muted-foreground">{reqDetail.id}</span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight">Requisition Review</h1>
        <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
          <MapPin class="h-4 w-4" /> {reqDetail.rhuName}
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline">Reject</Button>
        <Button class="gap-2"><ShieldCheck class="h-4 w-4" /> Approve & Sign</Button>
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
            {#each reqDetail.items as item}
              <Table.Row>
                <Table.Cell class="font-medium">
                  <div class="flex items-center gap-2">
                    <Pill class="h-4 w-4 text-muted-foreground" />
                    {item.name}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right text-destructive font-semibold">{item.currentStock}</Table.Cell>
                <Table.Cell class="text-right font-bold">{item.reqQty}</Table.Cell>
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
          <div class="flex gap-4">
            <div class="mt-1 bg-amber-100 text-amber-600 p-1.5 rounded-full dark:bg-amber-900/40">
              <Clock class="h-4 w-4" />
            </div>
            <div>
              <p class="font-medium text-sm">Drafted by System</p>
              <p class="text-xs text-muted-foreground mt-0.5">Threshold breach detected</p>
              <p class="text-xs text-muted-foreground mt-1 text-amber-600/80">10 mins ago</p>
            </div>
          </div>
          <div class="flex gap-4 opacity-50">
            <div class="mt-1 bg-muted p-1.5 rounded-full">
              <CheckCircle2 class="h-4 w-4" />
            </div>
            <div>
              <p class="font-medium text-sm">MHO Approval</p>
              <p class="text-xs text-muted-foreground mt-0.5">Pending</p>
            </div>
          </div>
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
