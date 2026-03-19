<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ModeWatcher } from 'mode-watcher';
	import AppSidebar from '$lib/components/app-sidebar.svelte';

	import { QueryClient, QueryClientProvider, useIsFetching } from '@tanstack/svelte-query';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { Loader2 } from 'lucide-svelte';
	
	const queryClient = new QueryClient();

	let { children } = $props();

	// Global fetching state for UI feedback passed strictly via explicit client
	// to avoid "context not found" SvelteKit SSR errors before DOM mounts
	const isFetching = useIsFetching(undefined, queryClient);

	import { page } from "$app/state";
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<QueryClientProvider client={queryClient}>

<ModeWatcher />
<Toaster />

<div class="min-h-screen bg-zinc-100 dark:bg-zinc-900 flex text-zinc-900 dark:text-zinc-100 font-sans transition-colors duration-300">
	<AppSidebar />
	
	<!-- Full screen layer layout (Pill acts as an absolute floating overlay) -->
	<div class="flex-1 flex flex-col w-full transition-all duration-300 min-h-screen relative">
		<!-- Dynamic header clearance to prevent colliding with the floating pill -->
		<header class="flex h-20 shrink-0 items-center justify-between px-8 pl-28 {page.url.pathname === '/' ? 'absolute top-0 w-full z-10 pointer-events-none' : ''}">
			<div class="flex items-center gap-4 {page.url.pathname === '/' ? 'pointer-events-auto' : ''}">
			  <!-- Global telemetry sync indicator -->
			  {#if isFetching > 0}
			    <div class="flex items-center gap-2 text-sm text-zinc-600 bg-white/50 px-4 py-2 rounded-[1rem] shadow-sm ring-1 ring-zinc-200/50 transition-all duration-300 dark:bg-zinc-800/50 dark:text-zinc-300 dark:ring-zinc-700/50 backdrop-blur-md">
			      <Loader2 class="h-4 w-4 animate-spin text-zinc-900 dark:text-zinc-100" />
			      <span class="hidden sm:inline-block font-medium shadow-none text-zinc-900 dark:text-zinc-100">Live Syncing</span>
			    </div>
			  {/if}
			</div>
			
			<div class="flex-1"></div>
			<!-- Top right options can go here in the future -->
		</header>
		
		<main class="flex-1 {page.url.pathname === '/' ? 'overflow-hidden' : 'p-8 pb-12 overflow-y-auto'}">
			<div class="w-full {page.url.pathname === '/' ? 'h-screen' : 'mx-auto max-w-[1600px]'}">
				{@render children()}
			</div>
		</main>
	</div>
</div>

<SvelteQueryDevtools />
</QueryClientProvider>
