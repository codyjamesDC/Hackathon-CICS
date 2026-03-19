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
    <!-- Threshold Breach Alert -->
    <Card.Root class="border-destructive/50 bg-destructive/5">
      <Card.Header class="pb-2">
        <div class="flex items-center justify-between">
          <Badge variant="destructive" class="gap-1 mb-2"><AlertTriangle class="h-3 w-3" /> Threshold Breach</Badge>
          <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="h-3 w-3"/> 10 mins ago</span>
        </div>
        <Card.Title class="text-lg">Paracetamol 500mg</Card.Title>
        <Card.Description>Barangay San Jose RHU</Card.Description>
      </Card.Header>
      <Card.Content>
        <p class="text-sm text-foreground mt-2">
          Projected to hit zero stock within 24 hours. A requisition has been automatically drafted.
        </p>
        <Button size="sm" class="mt-4 w-full" variant="destructive" href="/requisitions/req-1">
          Review Requisition
        </Button>
      </Card.Content>
    </Card.Root>

    <!-- Anomaly Spike Alert -->
    <Card.Root class="border-amber-500/50 bg-amber-500/5">
      <Card.Header class="pb-2">
        <div class="flex items-center justify-between">
          <Badge variant="outline" class="border-amber-500 text-amber-600 gap-1 mb-2"><Activity class="h-3 w-3" /> Anomaly Spike</Badge>
          <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="h-3 w-3"/> 2 hours ago</span>
        </div>
        <Card.Title class="text-lg">Amoxicillin 500mg</Card.Title>
        <Card.Description>Barangay Mabini RHU</Card.Description>
      </Card.Header>
      <Card.Content>
        <p class="text-sm text-foreground mt-2">
          Consumption velocity is 3.5x higher than the 30-day baseline. 
        </p>
        <Button size="sm" class="mt-4 w-full text-amber-600 border-amber-500 hover:bg-amber-500/10" variant="outline" href="/rhu/rhu-2">
          View RHU Detail
        </Button>
      </Card.Content>
    </Card.Root>

    <!-- Participation Alert -->
    <Card.Root class="border-muted-foreground/30 bg-muted/20">
      <Card.Header class="pb-2">
        <div class="flex items-center justify-between">
          <Badge variant="secondary" class="gap-1 mb-2 text-muted-foreground"><BellOff class="h-3 w-3" /> Silent Facility</Badge>
          <span class="text-xs text-muted-foreground flex items-center gap-1"><Clock class="h-3 w-3"/> 1 day ago</span>
        </div>
        <Card.Title class="text-lg">Barangay Rizal RHU</Card.Title>
        <Card.Description>Silence Alert</Card.Description>
      </Card.Header>
      <Card.Content>
        <p class="text-sm text-foreground mt-2">
          No stock entries received for over 72 hours. Last sync was 4 days ago.
        </p>
        <Button size="sm" class="mt-4 w-full" variant="secondary" href="/rhu/rhu-4">
          View RHU Detail
        </Button>
      </Card.Content>
    </Card.Root>
  </div>
</div>
