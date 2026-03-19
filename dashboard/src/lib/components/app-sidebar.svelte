<script lang="ts">
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { 
    LayoutDashboard, 
    Building2, 
    FileText, 
    BellRing 
  } from "lucide-svelte";
  import { page } from "$app/state";

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "RHUs", href: "/rhu", icon: Building2 },
    { name: "Requisitions", href: "/requisitions", icon: FileText },
    { name: "Alerts", href: "/alerts", icon: BellRing },
  ];
</script>

<Sidebar.Root>
  <Sidebar.Header>
    <div class="px-4 py-3 text-lg font-bold text-primary flex items-center gap-2">
      <div class="bg-primary text-primary-foreground p-1 rounded-md">
        <Building2 class="size-5" />
      </div>
      Agap
    </div>
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Menu</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each navigation as item}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton 
                isActive={page.url.pathname === item.href || (item.href !== "/" && page.url.pathname.startsWith(item.href))}
              >
                {#snippet child({ props })}
                  <a href={item.href} {...props}>
                    <item.icon />
                    <span>{item.name}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>
</Sidebar.Root>
