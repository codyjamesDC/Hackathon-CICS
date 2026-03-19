<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';

	import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/svelte-query';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { Loader2 } from 'lucide-svelte';
	
	const queryClient = new QueryClient();

	let { children } = $props();

	// Global fetching state for UI feedback passed strictly via explicit client
	// to avoid "context not found" SvelteKit SSR errors before DOM mounts
	const isFetching = useIsFetching(undefined, queryClient);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<QueryClientProvider client={queryClient}>

<ModeWatcher />
<Toaster />

<Sidebar.Provider>
	<AppSidebar />
	<Sidebar.Inset>
		<header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
			<Sidebar.Trigger class="-ml-1" />
			<div class="flex-1"></div>
			<!-- Global telemetry sync indicator -->
			{#if isFetching > 0}
			  <div class="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm transition-all duration-300">
			    <Loader2 class="h-3.5 w-3.5 animate-spin text-primary" />
			    <span class="hidden sm:inline-block font-medium">Live Syncing</span>
			  </div>
			{/if}
		</header>
		<main class="flex-1 p-6">
			{@render children()}
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>
<SvelteQueryDevtools />
</QueryClientProvider>
