<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { 
    LayoutDashboard, 
    Building2, 
    FileText, 
    BellRing,
    LogOut,
    Menu,
    X
  } from "lucide-svelte";
  import { page } from "$app/state";

  let isOpen = $state(false);

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "RHUs", href: "/rhu", icon: Building2 },
    { name: "Requisitions", href: "/requisitions", icon: FileText },
    { name: "Alerts", href: "/alerts", icon: BellRing },
  ];
</script>

<!-- Liquid Animating Floating Pill -->
<aside 
  class="fixed left-6 top-6 z-50 bg-zinc-950 dark:bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center p-2 rounded-[2rem] transition-[height,width] duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden border border-zinc-800"
  style="width: {isOpen ? '88px' : '64px'}; height: {isOpen ? 'calc(100vh - 3rem)' : '64px'};"
>
  
  <!-- Primary Action Toggle (Always Visible) -->
  <button 
    onclick={() => isOpen = !isOpen}
    class="w-[48px] h-[48px] shrink-0 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
    aria-label="Toggle Menu"
  >
    {#if isOpen}
      <X class="size-6 transition-transform" strokeWidth={2.5} />
    {:else}
      <div class="text-2xl font-extrabold flex items-center justify-center transition-transform hover:scale-105">A.</div>
    {/if}
  </button>
  
  <!-- Hidden Navigation Payload -->
  <div 
    class="flex-1 w-full flex flex-col items-center justify-between mt-6 transition-all duration-300 transform {isOpen ? 'opacity-100 translate-y-0 delay-100' : 'opacity-0 -translate-y-8 pointer-events-none'}"
  >
    <nav class="flex flex-col w-full gap-5 items-center">
      {#each navigation as item}
        <a 
          href={item.href} 
          aria-label={item.name} 
          title={item.name}
          onclick={() => isOpen = false}
          class="w-[52px] h-[52px] rounded-[1.2rem] flex items-center justify-center transition-all duration-300 group
            {page.url.pathname === item.href || (item.href !== '/' && page.url.pathname.startsWith(item.href)) 
              ? 'bg-zinc-800 text-white shadow-md' 
              : 'text-zinc-500 hover:bg-zinc-800 hover:text-white'}"
        >
          <item.icon class="size-[1.3rem] transition-transform group-hover:scale-110" strokeWidth={2.5} />
        </a>
      {/each}
    </nav>
    
    <!-- Logout / Footer -->
    <button 
      class="w-[52px] h-[52px] rounded-[1.2rem] flex items-center justify-center transition-all duration-300 group text-zinc-500 hover:bg-zinc-800 hover:text-white mb-2" 
      aria-label="Log Out" 
      title="Log Out"
    >
      <LogOut class="size-[1.3rem] transition-transform group-hover:scale-110 ml-1" strokeWidth={2.5} />
    </button>
  </div>
  
</aside>
