<script setup lang="ts">
/**
 * Storage Settings View (HAP-874)
 *
 * Provides UI for managing offline artifact cache:
 * - View cache statistics
 * - Clear cache manually
 * - Configure cache size limits
 *
 * @see HAP-874 - Offline Artifact Caching
 */

import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useUiStore } from '@/stores/ui';
import { useOfflineArtifacts } from '@/composables/useOfflineArtifacts';

const router = useRouter();
const ui = useUiStore();

const {
  cacheStats,
  cacheSizeFormatted,
  maxCacheSizeFormatted,
  cacheUsagePercent,
  clearCache,
  refreshStats,
  getCacheConfig,
  setCacheConfig,
} = useOfflineArtifacts();

// Local state
const isClearing = ref(false);
const cacheEnabled = ref(true);

// Initialize
onMounted(async () => {
  await refreshStats();
  const config = getCacheConfig();
  cacheEnabled.value = config.enabled;
});

// Handlers
function goBack() {
  router.push('/settings');
}

async function handleClearCache() {
  isClearing.value = true;
  try {
    await clearCache();
    ui.success('Artifact cache cleared');
  } catch (error) {
    ui.error('Failed to clear cache');
    console.error('[storage] Failed to clear cache:', error);
  } finally {
    isClearing.value = false;
  }
}

function handleToggleCaching(enabled: boolean) {
  cacheEnabled.value = enabled;
  setCacheConfig({ enabled });
  if (enabled) {
    ui.success('Offline caching enabled');
  } else {
    ui.success('Offline caching disabled');
  }
}

// Computed
const artifactCount = computed(() => cacheStats.value?.totalArtifacts ?? 0);
const bodiesCount = computed(() => cacheStats.value?.artifactsWithBody ?? 0);
const lastCachedFormatted = computed(() => {
  if (!cacheStats.value?.newestCachedAt) return 'Never';
  return new Date(cacheStats.value.newestCachedAt).toLocaleString();
});
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Header -->
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
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
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>
      <h1 class="text-2xl font-semibold">Storage</h1>
    </header>

    <div class="space-y-6">
      <!-- Cache Status Card -->
      <Card>
        <CardHeader>
          <CardTitle>Artifact Cache</CardTitle>
          <CardDescription>
            Cached artifacts are available offline when disconnected from the server
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Enable/disable toggle -->
          <div class="flex items-center justify-between">
            <div>
              <Label class="text-base">Enable offline caching</Label>
              <p class="text-sm text-muted-foreground">
                Cache artifacts for offline viewing
              </p>
            </div>
            <Switch
              :checked="cacheEnabled"
              @update:checked="handleToggleCaching"
            />
          </div>

          <!-- Cache usage -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Cache usage</span>
              <span>{{ cacheSizeFormatted }} / {{ maxCacheSizeFormatted }}</span>
            </div>
            <Progress :model-value="cacheUsagePercent" class="h-2" />
          </div>

          <!-- Stats grid -->
          <div class="grid grid-cols-2 gap-4 pt-2">
            <div class="text-center p-3 rounded-lg bg-muted/50">
              <p class="text-2xl font-semibold">{{ artifactCount }}</p>
              <p class="text-sm text-muted-foreground">Cached artifacts</p>
            </div>
            <div class="text-center p-3 rounded-lg bg-muted/50">
              <p class="text-2xl font-semibold">{{ bodiesCount }}</p>
              <p class="text-sm text-muted-foreground">With content</p>
            </div>
          </div>

          <!-- Last cached -->
          <div class="flex items-center justify-between text-sm pt-2">
            <span class="text-muted-foreground">Last updated</span>
            <span>{{ lastCachedFormatted }}</span>
          </div>
        </CardContent>
      </Card>

      <!-- Actions Card -->
      <Card>
        <CardHeader>
          <CardTitle>Manage Cache</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- Clear cache button -->
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Clear artifact cache</p>
              <p class="text-sm text-muted-foreground">
                Remove all cached artifacts. This will not affect your server data.
              </p>
            </div>
            <Button
              variant="outline"
              :disabled="isClearing || artifactCount === 0"
              @click="handleClearCache"
            >
              <svg
                v-if="isClearing"
                class="h-4 w-4 mr-2 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {{ isClearing ? 'Clearing...' : 'Clear Cache' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- Info Card -->
      <Card>
        <CardContent class="py-4">
          <div class="flex gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p class="text-sm text-muted-foreground">
                Artifact caching uses IndexedDB for storage. The cache is automatically
                managed using a least-recently-used (LRU) policy to stay within size limits.
                Cached items are automatically updated when you connect to the server.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
