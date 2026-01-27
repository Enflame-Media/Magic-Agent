/**
 * Pull-to-refresh composable for mobile touch interactions
 *
 * Implements native-like pull-to-refresh behavior for list views.
 * Handles touch events, pull distance tracking, and iOS Safari rubber-banding.
 *
 * @see HAP-919 - Mobile Web Enhancements
 */

import { ref, computed, onMounted, onUnmounted, type Ref, type ComputedRef } from 'vue';

/**
 * Configuration options for pull-to-refresh
 */
export interface UsePullToRefreshOptions {
  /**
   * Distance in pixels required to trigger refresh
   * @default 80
   */
  threshold?: number;

  /**
   * Maximum pull distance in pixels (for visual capping)
   * @default 120
   */
  maxPullDistance?: number;

  /**
   * Resistance factor (0-1) for pull dampening
   * Higher values = more resistance
   * @default 0.5
   */
  resistance?: number;

  /**
   * Callback when refresh is triggered
   */
  onRefresh?: () => Promise<void> | void;

  /**
   * Whether pull-to-refresh is enabled
   * @default true
   */
  enabled?: boolean;
}

/**
 * Return type for usePullToRefresh
 */
export interface UsePullToRefreshReturn {
  /**
   * Target element ref - attach to the scrollable container
   */
  containerRef: Ref<HTMLElement | null>;

  /**
   * Whether user is currently pulling
   */
  isPulling: Ref<boolean>;

  /**
   * Whether refresh is in progress
   */
  isRefreshing: Ref<boolean>;

  /**
   * Current pull distance in pixels (after resistance applied)
   */
  pullDistance: Ref<number>;

  /**
   * Pull progress as percentage (0-100)
   */
  pullProgress: ComputedRef<number>;

  /**
   * Whether threshold is reached (ready to refresh)
   */
  canRefresh: ComputedRef<boolean>;

  /**
   * Manually trigger refresh
   */
  refresh: () => Promise<void>;

  /**
   * Reset the pull state
   */
  reset: () => void;
}

/**
 * Composable for pull-to-refresh functionality
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { usePullToRefresh } from '@/composables/usePullToRefresh';
 *
 * const { containerRef, isPulling, pullDistance, isRefreshing } = usePullToRefresh({
 *   threshold: 80,
 *   onRefresh: async () => {
 *     await fetchSessions();
 *   }
 * });
 * </script>
 *
 * <template>
 *   <div ref="containerRef" class="overflow-y-auto">
 *     <div v-if="isPulling || isRefreshing" class="pull-indicator">
 *       <span v-if="isRefreshing">Refreshing...</span>
 *       <span v-else>{{ pullDistance }}px</span>
 *     </div>
 *     <slot />
 *   </div>
 * </template>
 * ```
 */
export function usePullToRefresh(options: UsePullToRefreshOptions = {}): UsePullToRefreshReturn {
  const {
    threshold = 80,
    maxPullDistance = 120,
    resistance = 0.5,
    onRefresh,
    enabled = true,
  } = options;

  const containerRef = ref<HTMLElement | null>(null);
  const isPulling = ref(false);
  const isRefreshing = ref(false);
  const pullDistance = ref(0);

  // Touch tracking state
  let startY = 0;
  let currentY = 0;

  // Computed values
  const pullProgress = computed(() => {
    if (threshold === 0) return 0;
    return Math.min(100, (pullDistance.value / threshold) * 100);
  });

  const canRefresh = computed(() => pullDistance.value >= threshold);

  /**
   * Check if container is at scroll top
   */
  function isAtTop(): boolean {
    if (!containerRef.value) return false;
    return containerRef.value.scrollTop <= 0;
  }

  /**
   * Apply resistance to pull distance
   */
  function applyResistance(distance: number): number {
    if (distance <= 0) return 0;
    // Apply diminishing returns after threshold
    const resistedDistance = distance * (1 - resistance * Math.min(distance / maxPullDistance, 1));
    return Math.min(resistedDistance, maxPullDistance);
  }

  /**
   * Handle touch start
   */
  function handleTouchStart(event: TouchEvent): void {
    if (!enabled || isRefreshing.value) return;
    if (!isAtTop()) return;

    const touch = event.touches[0];
    if (touch) {
      startY = touch.clientY;
      currentY = startY;
    }
  }

  /**
   * Handle touch move
   */
  function handleTouchMove(event: TouchEvent): void {
    if (!enabled || isRefreshing.value) return;
    if (!isAtTop()) {
      // Reset if scrolled away from top
      if (isPulling.value) {
        reset();
      }
      return;
    }

    const touch = event.touches[0];
    if (!touch) return;

    currentY = touch.clientY;
    const rawDistance = currentY - startY;

    // Only track downward pulls
    if (rawDistance > 0) {
      isPulling.value = true;
      pullDistance.value = applyResistance(rawDistance);

      // Prevent default scroll behavior while pulling
      if (pullDistance.value > 0) {
        event.preventDefault();
      }
    } else {
      reset();
    }
  }

  /**
   * Handle touch end
   */
  function handleTouchEnd(): void {
    if (!enabled || isRefreshing.value) return;

    if (canRefresh.value) {
      refresh();
    } else {
      reset();
    }
  }

  /**
   * Trigger refresh
   */
  async function refresh(): Promise<void> {
    if (isRefreshing.value) return;

    isRefreshing.value = true;
    isPulling.value = false;
    pullDistance.value = threshold; // Hold at threshold during refresh

    try {
      if (onRefresh) {
        await onRefresh();
      }
    } finally {
      reset();
    }
  }

  /**
   * Reset pull state
   */
  function reset(): void {
    isPulling.value = false;
    isRefreshing.value = false;
    pullDistance.value = 0;
    startY = 0;
    currentY = 0;
  }

  /**
   * Setup and cleanup event listeners
   */
  onMounted(() => {
    if (!containerRef.value) return;

    const element = containerRef.value;

    // Use passive: false to allow preventDefault during pull
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', reset, { passive: true });
  });

  onUnmounted(() => {
    if (!containerRef.value) return;

    const element = containerRef.value;

    element.removeEventListener('touchstart', handleTouchStart);
    element.removeEventListener('touchmove', handleTouchMove);
    element.removeEventListener('touchend', handleTouchEnd);
    element.removeEventListener('touchcancel', reset);
  });

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
    canRefresh,
    refresh,
    reset,
  };
}
