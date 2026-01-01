<script setup lang="ts">
/**
 * Home View - Sessions List
 *
 * Displays all synced sessions from the user's connected machines.
 * Main landing page for authenticated users.
 *
 * Features:
 * - Real-time session list with sync status
 * - Search/filter sessions (future)
 * - Navigate to session detail
 * - Empty state for new users
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSessionsStore } from '@/stores/sessions';
import { useSyncStore } from '@/stores/sync';
import { SessionCard, EmptyState, ConnectionStatus } from '@/components/app';
import { Button } from '@/components/ui/button';

const router = useRouter();
const sessionsStore = useSessionsStore();
const syncStore = useSyncStore();

// Computed session lists
const activeSessions = computed(() => sessionsStore.activeSessions);
const inactiveSessions = computed(() => sessionsStore.inactiveSessions);
const hasAnySessions = computed(() => sessionsStore.count > 0);

// Connection status
const isConnected = computed(() => syncStore.isConnected);

function navigateToSettings() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-3xl">
    <!-- Header -->
    <header class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold">Sessions</h1>
        <p class="text-sm text-muted-foreground mt-1">
          Your Claude Code sessions across all machines
        </p>
      </div>
      <div class="flex items-center gap-4">
        <ConnectionStatus />
        <Button variant="ghost" size="icon" @click="navigateToSettings">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </Button>
      </div>
    </header>

    <!-- Empty State -->
    <template v-if="!hasAnySessions">
      <EmptyState
        title="No Sessions Yet"
        description="Connect a terminal running Claude Code with the Happy CLI to see your sessions here."
        action-label="Go to Settings"
        @action="navigateToSettings"
      />
    </template>

    <!-- Sessions List -->
    <template v-else>
      <!-- Active Sessions -->
      <section v-if="activeSessions.length > 0" class="mb-8">
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Active Sessions
        </h2>
        <div class="space-y-3">
          <SessionCard
            v-for="session in activeSessions"
            :key="session.id"
            :session="session"
          />
        </div>
      </section>

      <!-- Inactive/Archived Sessions -->
      <section v-if="inactiveSessions.length > 0">
        <h2 class="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Archived Sessions
        </h2>
        <div class="space-y-3">
          <SessionCard
            v-for="session in inactiveSessions"
            :key="session.id"
            :session="session"
          />
        </div>
      </section>

      <!-- Sync Status Banner -->
      <div
        v-if="!isConnected"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-white px-4 py-2 rounded-full text-sm shadow-lg"
      >
        Reconnecting to server...
      </div>
    </template>
  </div>
</template>
