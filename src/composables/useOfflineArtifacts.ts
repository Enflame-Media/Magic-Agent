/**
 * Offline Artifacts Composable (HAP-874)
 *
 * Provides reactive offline artifact access with automatic fallback to cache
 * when the WebSocket connection is lost.
 *
 * Features:
 * - Automatic cache loading when disconnected
 * - Cache statistics for UI display
 * - Manual cache management (clear, configure)
 *
 * @example
 * ```typescript
 * const {
 *   isOffline,
 *   cacheStats,
 *   loadCachedArtifacts,
 *   clearCache
 * } = useOfflineArtifacts();
 * ```
 *
 * @see HAP-874 - Offline Artifact Caching
 */

import { computed, watch, onMounted, onUnmounted, ref } from 'vue';
import { useArtifactsStore } from '@/stores/artifacts';
import { useSyncStore } from '@/stores/sync';
import type { CacheConfig } from '@/services/artifactCache';

/**
 * Composable for managing offline artifact access.
 */
export function useOfflineArtifacts() {
  const artifactsStore = useArtifactsStore();
  const syncStore = useSyncStore();

  /** Whether loading is in progress */
  const isLoading = ref(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether the app is currently offline (disconnected from server) */
  const isOffline = computed(() => !syncStore.isConnected);

  /** Whether artifacts are loaded from cache (offline mode active) */
  const isOfflineMode = computed(() => artifactsStore.isOfflineMode);

  /** Cache statistics */
  const cacheStats = computed(() => artifactsStore.cacheStats);

  /** Whether cache is initialized */
  const cacheInitialized = computed(() => artifactsStore.cacheInitialized);

  /** Human-readable cache size */
  const cacheSizeFormatted = computed(() => {
    const stats = cacheStats.value;
    if (!stats) return '0 B';
    return formatBytes(stats.totalSizeBytes);
  });

  /** Human-readable max cache size */
  const maxCacheSizeFormatted = computed(() => {
    const stats = cacheStats.value;
    if (!stats) return '50 MB';
    return formatBytes(stats.maxSizeBytes);
  });

  /** Cache usage percentage */
  const cacheUsagePercent = computed(() => {
    const stats = cacheStats.value;
    if (!stats || stats.maxSizeBytes === 0) return 0;
    return Math.min(100, Math.round((stats.totalSizeBytes / stats.maxSizeBytes) * 100));
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the artifact cache.
   */
  async function initializeCache(): Promise<void> {
    await artifactsStore.initializeCache();
  }

  /**
   * Load cached artifacts for offline viewing.
   */
  async function loadCachedArtifacts(): Promise<void> {
    isLoading.value = true;
    try {
      await artifactsStore.loadFromCache();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Load cached artifacts for a specific session.
   *
   * @param sessionId - Session ID
   */
  async function loadCachedForSession(sessionId: string): Promise<void> {
    isLoading.value = true;
    try {
      await artifactsStore.loadCachedForSession(sessionId);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Clear the artifact cache.
   */
  async function clearCache(): Promise<void> {
    await artifactsStore.clearCache();
  }

  /**
   * Refresh cache statistics.
   */
  async function refreshStats(): Promise<void> {
    await artifactsStore.refreshCacheStats();
  }

  /**
   * Get current cache configuration.
   */
  function getCacheConfig(): CacheConfig {
    return artifactsStore.getCacheConfig();
  }

  /**
   * Update cache configuration.
   *
   * @param config - Partial configuration to update
   */
  function setCacheConfig(config: Partial<CacheConfig>): void {
    artifactsStore.setCacheConfig(config);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Automatic Offline Loading
  // ─────────────────────────────────────────────────────────────────────────

  // Watch for connection status changes
  const stopWatcher = watch(
    () => syncStore.status,
    async (newStatus, oldStatus) => {
      // When transitioning to disconnected state, load from cache
      if (
        (newStatus === 'disconnected' || newStatus === 'error' || newStatus === 'reconnecting') &&
        (oldStatus === 'connected' || oldStatus === 'authenticating')
      ) {
        console.debug('[offline] Connection lost, loading cached artifacts');
        await loadCachedArtifacts();
      }

      // When reconnected, refresh stats
      if (newStatus === 'connected' && oldStatus !== 'connected') {
        console.debug('[offline] Connection restored');
        await refreshStats();
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  onMounted(async () => {
    // Initialize cache on mount
    await initializeCache();

    // If already disconnected, load from cache
    if (!syncStore.isConnected) {
      await loadCachedArtifacts();
    }
  });

  onUnmounted(() => {
    stopWatcher();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Format bytes to human-readable string.
   */
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  return {
    // State
    isLoading,
    // Computed
    isOffline,
    isOfflineMode,
    cacheStats,
    cacheInitialized,
    cacheSizeFormatted,
    maxCacheSizeFormatted,
    cacheUsagePercent,
    // Methods
    initializeCache,
    loadCachedArtifacts,
    loadCachedForSession,
    clearCache,
    refreshStats,
    getCacheConfig,
    setCacheConfig,
  };
}
