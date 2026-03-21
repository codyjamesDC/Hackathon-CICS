<script lang="ts">
  import { goto } from '$app/navigation';
  import { Eye, EyeOff } from 'lucide-svelte';

  let showPassword = $state(false);
  let isLoading = $state(false);

  async function handleLogin() {
    isLoading = true;
    await new Promise(r => setTimeout(r, 900));
    localStorage.setItem('agap_logged_in', '1');
    goto('/');
  }
</script>

<div class="min-h-screen flex items-center justify-center px-4">
  <div class="w-full max-w-[400px]">

    <!-- Brand -->
    <div class="text-center mb-8">
      <h1 class="text-2xl font-bold tracking-tight text-zinc-100">AGAP Admin</h1>
      <p class="text-sm text-zinc-500 mt-1">Municipal Health Office — Nagcarlan</p>
    </div>

    <!-- Card -->
    <div class="bg-zinc-800/80 border border-zinc-600/60 rounded-2xl p-7 shadow-2xl shadow-black/70 ring-1 ring-white/5">
      <div class="space-y-4">

        <!-- Email -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Email</label>
          <input
            type="email"
            value="mho.nagcarlan@doh.gov.ph"
            readonly
            class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-200 cursor-default select-none outline-none caret-transparent"
          />
        </div>

        <!-- Password -->
        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Password</label>
          <div class="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value="agap@mho2025"
              readonly
              class="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 pr-10 text-sm text-zinc-200 cursor-default select-none outline-none caret-transparent"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              tabindex="-1"
            >
              {#if showPassword}
                <EyeOff class="h-4 w-4" />
              {:else}
                <Eye class="h-4 w-4" />
              {/if}
            </button>
          </div>
        </div>

        <!-- Button -->
        <button
          type="button"
          onclick={handleLogin}
          disabled={isLoading}
          class="w-full mt-1 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold text-sm py-2.5 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {#if isLoading}
            <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
            </svg>
            Signing in...
          {:else}
            Sign In
          {/if}
        </button>

      </div>
    </div>

    <p class="text-center text-xs text-zinc-600 mt-5">
      AGAP v1.0 · Department of Health – Region IV-A
    </p>
  </div>
</div>
