<script lang="ts">
  import { 
    Activity, 
    AlertTriangle, 
    BellOff, 
    Building2, 
    FileText 
  } from "lucide-svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
</script>

<div class="flex flex-col gap-6">
  <div>
    <h1 class="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
    <p class="text-muted-foreground mt-2">
      Real-time stockout risk across all Rural Health Units in the municipality.
    </p>
  </div>

  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Total RHUs Monitored</Card.Title>
        <Building2 class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">14</div>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium text-destructive">Active Breaches</Card.Title>
        <AlertTriangle class="h-4 w-4 text-destructive" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">3</div>
        <p class="text-xs text-muted-foreground mt-1">
          Stockouts projected within 7 days
        </p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Pending Requisitions</Card.Title>
        <FileText class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">2</div>
        <p class="text-xs text-muted-foreground mt-1">
          Requires MHO approval
        </p>
      </Card.Content>
    </Card.Root>
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
        <Card.Title class="text-sm font-medium">Silent RHUs</Card.Title>
        <BellOff class="h-4 w-4 text-muted-foreground" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">1</div>
        <p class="text-xs text-muted-foreground mt-1">
          No reports in > 72 hours
        </p>
      </Card.Content>
    </Card.Root>
  </div>

  <Card.Root class="flex-1 min-h-[500px] flex flex-col">
    <Card.Header class="flex flex-row items-center justify-between">
      <Card.Title>Municipality Heatmap</Card.Title>
      <div class="flex gap-4 text-sm px-4 py-2 border rounded-md bg-muted/50">
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-emerald-500"></div> 
          <span>&gt; 14 days</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-amber-500"></div> 
          <span>7-14 days</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-destructive"></div> 
          <span>&lt; 7 days</span>
        </div>
        <div class="flex items-center gap-2">
          <div class="w-3 h-3 rounded-full bg-neutral-400"></div> 
          <span>Silent</span>
        </div>
      </div>
    </Card.Header>
    <Card.Content class="flex-1">
      <div class="w-full h-full min-h-[400px] bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed">
        <div class="text-center text-muted-foreground">
          <Building2 class="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 class="font-medium text-lg">Interactive Leaflet Heatmap</h3>
          <p class="text-sm mt-1">The PostGIS spatial data rendering goes here.<br/>This component will fetch from <code>/api/dashboard/heatmap</code>.</p>
        </div>
      </div>
    </Card.Content>
  </Card.Root>
</div>
