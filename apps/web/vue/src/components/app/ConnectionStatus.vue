<script setup lang="ts">
/**
 * ConnectionStatus - Displays real-time sync connection status
 *
 * Shows a colored dot with status text indicating WebSocket connection state.
 * Reactive to sync store changes for immediate feedback.
 */

import { computed } from 'vue';
import { useSyncStore } from '@/stores/sync';

const syncStore = useSyncStore();

const statusColor = computed(() => {
  switch (syncStore.status) {
    case 'connected':
      return 'bg-green-500';
    case 'connecting':
    case 'authenticating':
    case 'reconnecting':
      return 'bg-yellow-500';
    case 'error':
      return 'bg-red-500';
    case 'disconnected':
    default:
      return 'bg-gray-400';
  }
});

const isPulsing = computed(() =>
  syncStore.status === 'connecting' ||
  syncStore.status === 'authenticating' ||
  syncStore.status === 'reconnecting'
);
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      :class="[
        'w-2 h-2 rounded-full',
        statusColor,
        isPulsing && 'animate-pulse',
      ]"
    />
    <span class="text-sm text-muted-foreground">
      {{ syncStore.statusMessage }}
    </span>
  </div>
</template>
