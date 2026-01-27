/**
 * Swipe navigation composable for mobile gesture-based navigation
 *
 * Provides swipe left/right gestures for navigating between views.
 * Uses @vueuse/core's useSwipe for cross-browser touch detection.
 *
 * @see HAP-919 - Mobile Web Enhancements
 * @see https://vueuse.org/core/useswipe/
 */

import { ref, watch, onUnmounted, type Ref } from 'vue';
import { useSwipe, type UseSwipeDirection } from '@vueuse/core';
import { useRouter, type RouteLocationNormalized } from 'vue-router';

/**
 * Configuration options for swipe navigation
 */
export interface UseSwipeNavigationOptions {
  /**
   * Minimum swipe distance in pixels to trigger navigation
   * @default 50
   */
  threshold?: number;

  /**
   * Enable/disable swipe navigation
   * @default true
   */
  enabled?: boolean;

  /**
   * Enable swipe right to go back
   * @default true
   */
  enableBack?: boolean;

  /**
   * Enable swipe left to go forward
   * @default true
   */
  enableForward?: boolean;

  /**
   * Callback when swipe navigation occurs
   */
  onNavigate?: (direction: 'back' | 'forward') => void;

  /**
   * Route guard - return false to prevent navigation
   */
  canNavigate?: (direction: 'back' | 'forward', currentRoute: RouteLocationNormalized) => boolean;
}

/**
 * Return type for useSwipeNavigation
 */
export interface UseSwipeNavigationReturn {
  /**
   * Target element ref - attach to the swipeable container
   */
  containerRef: Ref<HTMLElement | null>;

  /**
   * Whether user is currently swiping
   */
  isSwiping: Ref<boolean>;

  /**
   * Current swipe direction
   */
  direction: Ref<UseSwipeDirection>;

  /**
   * Horizontal swipe distance (positive = right, negative = left)
   */
  swipeDistanceX: Ref<number>;

  /**
   * Vertical swipe distance (positive = down, negative = up)
   */
  swipeDistanceY: Ref<number>;

  /**
   * Stop swipe detection
   */
  stop: () => void;
}

/**
 * Composable for swipe-based navigation
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useSwipeNavigation } from '@/composables/useSwipeNavigation';
 *
 * const { containerRef, isSwiping, direction } = useSwipeNavigation({
 *   threshold: 50,
 *   enableBack: true,
 *   enableForward: true,
 *   onNavigate: (dir) => console.log('Navigating:', dir)
 * });
 * </script>
 *
 * <template>
 *   <main ref="containerRef" class="h-full">
 *     <RouterView />
 *   </main>
 * </template>
 * ```
 */
export function useSwipeNavigation(options: UseSwipeNavigationOptions = {}): UseSwipeNavigationReturn {
  const {
    threshold = 50,
    enabled = true,
    enableBack = true,
    enableForward = true,
    onNavigate,
    canNavigate,
  } = options;

  const router = useRouter();
  const containerRef = ref<HTMLElement | null>(null);
  const swipeDistanceX = ref(0);
  const swipeDistanceY = ref(0);

  // Use vueuse's useSwipe
  const { isSwiping, direction, lengthX, lengthY, stop } = useSwipe(containerRef, {
    passive: true,
    threshold,
    onSwipeEnd: (_event, swipeDirection) => {
      if (!enabled) return;

      // Check if this was a horizontal swipe (not vertical scroll)
      const absX = Math.abs(lengthX.value);
      const absY = Math.abs(lengthY.value);

      // Require horizontal swipe to be dominant (prevent triggering on scroll)
      if (absY > absX * 0.5) return;

      // Check threshold
      if (absX < threshold) return;

      const currentRoute = router.currentRoute.value;

      if (swipeDirection === 'right' && enableBack) {
        // Swipe right = go back
        if (canNavigate && !canNavigate('back', currentRoute)) return;

        // Check if we can go back in history
        if (window.history.length > 1) {
          onNavigate?.('back');
          router.back();
        }
      } else if (swipeDirection === 'left' && enableForward) {
        // Swipe left = go forward
        if (canNavigate && !canNavigate('forward', currentRoute)) return;

        onNavigate?.('forward');
        router.forward();
      }
    },
  });

  // Sync swipe distances
  watch(lengthX, (val) => {
    swipeDistanceX.value = val;
  });

  watch(lengthY, (val) => {
    swipeDistanceY.value = val;
  });

  // Cleanup on unmount
  onUnmounted(() => {
    stop();
  });

  return {
    containerRef,
    isSwiping,
    direction,
    swipeDistanceX,
    swipeDistanceY,
    stop,
  };
}

/**
 * Routes where swipe navigation should be disabled
 * (e.g., routes with their own gesture handling)
 */
export const SWIPE_DISABLED_ROUTES = [
  'session', // Session view may have its own scroll/swipe handling
  'artifacts', // Artifact viewer may need gesture interactions
];

/**
 * Check if swipe navigation should be enabled for a route
 */
export function shouldEnableSwipeForRoute(routeName: string | symbol | null | undefined): boolean {
  if (!routeName) return true;
  const name = String(routeName);
  return !SWIPE_DISABLED_ROUTES.includes(name);
}
