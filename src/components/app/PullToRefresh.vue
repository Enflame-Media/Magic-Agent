<script setup lang="ts">
/**
 * PullToRefresh - Pull-to-refresh container component
 *
 * Wraps content with pull-to-refresh functionality for mobile devices.
 * Shows a loading indicator during pull and refresh states.
 *
 * @see HAP-919 - Mobile Web Enhancements
 */

import { computed, ref, onMounted, onUnmounted, type StyleValue } from 'vue';
import { IconRefresh, IconLoader2 } from '@tabler/icons-vue';
import { useBreakpoints } from '@/composables/useBreakpoints';

const props = withDefaults(
  defineProps<{
    /**
     * Distance in pixels required to trigger refresh
     */
    threshold?: number;

    /**
     * Maximum pull distance in pixels
     */
    maxPullDistance?: number;

    /**
     * Whether pull-to-refresh is enabled
     */
    enabled?: boolean;

    /**
     * Whether to only enable on mobile
     */
    mobileOnly?: boolean;
  }>(),
  {
    threshold: 80,
    maxPullDistance: 120,
    enabled: true,
    mobileOnly: true,
  }
);

const emit = defineEmits<{
  /**
   * Emitted when refresh is triggered
   */
  refresh: [];
}>();

// Breakpoints for mobile detection
const { isMobile } = useBreakpoints();

// State
const containerRef = ref<HTMLElement | null>(null);
const isPulling = ref(false);
const isRefreshing = ref(false);
const pullDistance = ref(0);

// Touch tracking
let startY = 0;
const RESISTANCE = 0.5;

// Computed values
const isEnabled = computed(() => {
  if (!props.enabled) return false;
  if (props.mobileOnly && !isMobile.value) return false;
  return true;
});

const pullProgress = computed(() => {
  if (props.threshold === 0) return 0;
  return Math.min(100, (pullDistance.value / props.threshold) * 100);
});

const canRefresh = computed(() => pullDistance.value >= props.threshold);

// Indicator styles
const indicatorStyle = computed<StyleValue>(() => ({
  transform: `translateY(${Math.max(0, pullDistance.value - 40)}px)`,
  opacity: Math.min(1, pullProgress.value / 50),
}));

const spinnerRotation = computed(() => {
  if (isRefreshing.value) return 0;
  return (pullProgress.value / 100) * 360;
});

// Check if at scroll top
function isAtTop(): boolean {
  if (!containerRef.value) return false;
  return containerRef.value.scrollTop <= 0;
}

// Apply resistance to pull
function applyResistance(distance: number): number {
  if (distance <= 0) return 0;
  const factor = 1 - RESISTANCE * Math.min(distance / props.maxPullDistance, 1);
  return Math.min(distance * factor, props.maxPullDistance);
}

// Reset state
function reset(): void {
  isPulling.value = false;
  isRefreshing.value = false;
  pullDistance.value = 0;
  startY = 0;
}

// Trigger refresh
async function triggerRefresh(): Promise<void> {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  isPulling.value = false;
  pullDistance.value = props.threshold;

  try {
    emit('refresh');
    // Wait a bit to show the refreshing state
    await new Promise((resolve) => setTimeout(resolve, 500));
  } finally {
    reset();
  }
}

// Touch handlers
function handleTouchStart(event: TouchEvent): void {
  if (!isEnabled.value || isRefreshing.value) return;
  if (!isAtTop()) return;

  const touch = event.touches[0];
  if (touch) {
    startY = touch.clientY;
  }
}

function handleTouchMove(event: TouchEvent): void {
  if (!isEnabled.value || isRefreshing.value) return;
  if (!isAtTop()) {
    if (isPulling.value) reset();
    return;
  }

  const touch = event.touches[0];
  if (!touch) return;

  const rawDistance = touch.clientY - startY;

  if (rawDistance > 0) {
    isPulling.value = true;
    pullDistance.value = applyResistance(rawDistance);

    // Prevent scroll while pulling
    if (pullDistance.value > 0) {
      event.preventDefault();
    }
  } else {
    reset();
  }
}

function handleTouchEnd(): void {
  if (!isEnabled.value || isRefreshing.value) return;

  if (canRefresh.value) {
    triggerRefresh();
  } else {
    reset();
  }
}

// Setup event listeners
onMounted(() => {
  if (!containerRef.value) return;

  const el = containerRef.value;
  el.addEventListener('touchstart', handleTouchStart, { passive: true });
  el.addEventListener('touchmove', handleTouchMove, { passive: false });
  el.addEventListener('touchend', handleTouchEnd, { passive: true });
  el.addEventListener('touchcancel', reset, { passive: true });
});

onUnmounted(() => {
  if (!containerRef.value) return;

  const el = containerRef.value;
  el.removeEventListener('touchstart', handleTouchStart);
  el.removeEventListener('touchmove', handleTouchMove);
  el.removeEventListener('touchend', handleTouchEnd);
  el.removeEventListener('touchcancel', reset);
});

// Expose for parent components
defineExpose({
  refresh: triggerRefresh,
  isRefreshing,
});
</script>

<template>
  <div
    ref="containerRef"
    class="relative h-full overflow-y-auto overscroll-y-contain"
    :class="{ 'touch-pan-y': !isPulling }"
  >
    <!-- Pull indicator -->
    <div
      v-if="isPulling || isRefreshing"
      class="absolute inset-x-0 top-0 z-10 flex items-center justify-center pointer-events-none"
      :style="indicatorStyle"
    >
      <div
        class="flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-lg border border-border"
      >
        <!-- Refreshing spinner -->
        <IconLoader2
          v-if="isRefreshing"
          class="h-5 w-5 text-primary animate-spin"
        />
        <!-- Pull progress indicator -->
        <IconRefresh
          v-else
          class="h-5 w-5 text-muted-foreground transition-transform"
          :style="{ transform: `rotate(${spinnerRotation}deg)` }"
          :class="{ 'text-primary': canRefresh }"
        />
      </div>
    </div>

    <!-- Content with optional transform during pull -->
    <div
      class="transition-transform duration-100 ease-out"
      :style="{ transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'none' }"
    >
      <slot />
    </div>
  </div>
</template>
