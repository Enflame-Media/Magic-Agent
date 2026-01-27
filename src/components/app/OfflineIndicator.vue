<script setup lang="ts">
/**
 * Offline Indicator Component (HAP-874)
 *
 * Displays a visual indicator when viewing cached offline content.
 * Shows cache statistics and provides access to cache management.
 *
 * @see HAP-874 - Offline Artifact Caching
 */

import { computed } from 'vue';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOfflineArtifacts } from '@/composables/useOfflineArtifacts';

const {
  isOfflineMode,
  cacheStats,
  cacheSizeFormatted,
} = useOfflineArtifacts();

// Format the cached at time
const cachedAtFormatted = computed(() => {
  if (!cacheStats.value?.newestCachedAt) return 'Unknown';
  const date = new Date(cacheStats.value.newestCachedAt);
  return date.toLocaleString();
});
</script>

<template>
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger as-child>
        <Badge
          v-if="isOfflineMode"
          variant="secondary"
          class="gap-1.5 cursor-help bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        >
          <!-- Cloud off icon -->
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L21 21M9.172 9.172A4 4 0 0112 8c1.657 0 3.156 1.007 3.778 2.55m-3.778 5.45H6a4 4 0 01-.778-7.92"
            />
          </svg>
          Offline
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" class="max-w-xs">
        <div class="space-y-1">
          <p class="font-medium">Viewing cached content</p>
          <p class="text-xs text-muted-foreground">
            You're currently disconnected from the server. Showing cached artifacts.
          </p>
          <div class="pt-1 text-xs">
            <p>Cached: {{ cacheStats?.totalArtifacts ?? 0 }} artifacts</p>
            <p>Size: {{ cacheSizeFormatted }}</p>
            <p>Last updated: {{ cachedAtFormatted }}</p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
