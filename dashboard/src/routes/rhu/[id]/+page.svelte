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
  
  // Mock Data
  const mockRhu = {
    name: "Barangay San Jose RHU",
    barangay: "San Jose",
    lastReported: "2 hours ago"
  };

  const mockMedicines = [
    { name: "Amoxicillin 500mg", type: "capsule", stock: 120, velocity: 8.5, daysLeft: 14.1, status: "ok" },
    { name: "Paracetamol 500mg", type: "tablet", stock: 15, velocity: 12.0, daysLeft: 1.2, status: "critical" },
    { name: "Losartan 50mg", type: "tablet", stock: 45, velocity: 5.2, daysLeft: 8.6, status: "warning" },
    { name: "Cetirizine 10mg", type: "tablet", stock: 200, velocity: 2.1, daysLeft: 95.2, status: "ok" },
    { name: "Ibuprofen 400mg", type: "tablet", stock: 0, velocity: 15.4, daysLeft: 0, status: "critical" },
  ];
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div class="flex items-center gap-2 text-muted-foreground mb-1">
        <MapPin class="h-4 w-4" />
        <span class="text-sm font-medium">Barangay {mockRhu.barangay}</span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight">{mockRhu.name}</h1>
      <p class="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
        <CalendarClock class="h-4 w-4" /> Last synced: {mockRhu.lastReported}
      </p>
    </div>
    <div class="flex gap-2">
      <Button variant="outline">View Offline Audit</Button>
      <Button>Draft Requisition</Button>
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
            {#each mockMedicines as med}
              <Table.Row>
                <Table.Cell class="font-medium">
                  <div class="flex items-center gap-2">
                    <Pill class="h-4 w-4 text-muted-foreground" />
                    {med.name}
                  </div>
                </Table.Cell>
                <Table.Cell class="text-right">{med.stock}</Table.Cell>
                <Table.Cell class="text-right">{med.velocity.toFixed(1)}</Table.Cell>
                <Table.Cell class="text-right font-semibold 
                  {med.daysLeft < 7 ? 'text-destructive' : med.daysLeft < 14 ? 'text-amber-500' : 'text-emerald-500'}">
                  {med.daysLeft > 90 ? '90+' : med.daysLeft.toFixed(1)}
                </Table.Cell>
                <Table.Cell class="text-center">
                  {#if med.status === 'critical'}
                    <Badge variant="destructive" class="gap-1"><AlertTriangle class="h-3 w-3"/> Critical</Badge>
                  {:else if med.status === 'warning'}
                    <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1"><TrendingDown class="h-3 w-3"/> Low</Badge>
                  {:else}
                    <Badge variant="outline" class="border-emerald-500 text-emerald-600 gap-1"><CheckCircle2 class="h-3 w-3"/> Safe</Badge>
                  {/if}
                </Table.Cell>
              </Table.Row>
            {/each}
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
          <div class="flex gap-3 text-sm p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertTriangle class="h-5 w-5 shrink-0" />
            <div>
              <p class="font-semibold">Paracetamol 500mg Depleted</p>
              <p class="text-xs opacity-90 mt-0.5">Projected to hit 0 tomorrow. Requisition drafted.</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  </div>
</div>
