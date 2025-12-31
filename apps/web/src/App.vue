<script setup lang="ts">
/**
 * Root Vue component for Happy web application
 *
 * Renders the router-view for client-side navigation.
 * Includes dark mode toggle, Sonner toast provider, and WebSocket sync.
 */
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/composables/useDarkMode';
import { useSync } from '@/composables/useSync';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';

const { isDark, toggle } = useDarkMode();

// Initialize WebSocket sync - auto-connects when authenticated (HAP-671)
const { status, isConnected } = useSync();

// Auth state for conditional UI
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);
</script>

<template>
  <!-- Sonner toast provider for notifications -->
  <Toaster />

  <div id="happy-app" class="max-w-5xl mx-auto p-8 text-center min-h-screen">
    <header class="mb-8 flex items-center justify-between">
      <div class="text-left">
        <h1
          class="text-5xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent"
        >
          Happy
        </h1>
        <p class="text-muted-foreground text-lg mt-1">
          Remote control for Claude Code
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Connection status indicator (shown when authenticated) -->
        <div
          v-if="isAuthenticated"
          class="flex items-center gap-1.5 text-xs"
          :title="`Sync: ${status}`"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500': isConnected,
              'bg-yellow-500 animate-pulse': status === 'connecting' || status === 'authenticating' || status === 'reconnecting',
              'bg-red-500': status === 'error',
              'bg-gray-400': status === 'disconnected',
            }"
          />
          <span class="text-muted-foreground hidden sm:inline">
            {{ isConnected ? 'Connected' : status === 'error' ? 'Error' : status === 'disconnected' ? 'Offline' : 'Syncing...' }}
          </span>
        </div>

        <!-- Dark mode toggle button -->
        <Button
          variant="outline"
          size="icon"
          :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggle"
        >
        <!-- Sun icon (shown in dark mode) -->
        <svg
          v-if="isDark"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transition-transform"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
        <!-- Moon icon (shown in light mode) -->
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="transition-transform"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </Button>
      </div>
    </header>

    <main>
      <RouterView />
    </main>
  </div>
</template>
