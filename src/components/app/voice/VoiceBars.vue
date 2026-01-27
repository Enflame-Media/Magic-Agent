<script setup lang="ts">
/**
 * VoiceBars - Audio Level Visualizer
 *
 * Animated bars that indicate voice activity state.
 * Ported from happy-app VoiceBars.tsx component.
 *
 * Features:
 * - Three animated bars with staggered timing
 * - Active/inactive states
 * - Configurable size and color
 * - Accessibility support
 *
 * @see HAP-701 - Create voice UI components
 */

import { computed, type HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';

interface Props {
  /** Whether voice is currently active */
  isActive?: boolean;
  /** Bar color (CSS color value) */
  color?: string;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Additional classes */
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  color: 'currentColor',
  size: 'small',
});

// Computed dimensions based on size
const barDimensions = computed(() => ({
  width: props.size === 'small' ? '2px' : '3px',
  height: props.size === 'small' ? '12px' : '16px',
  gap: props.size === 'small' ? '1.5px' : '2px',
}));
</script>

<template>
  <div
    :class="cn('voice-bars', props.class)"
    :style="{
      gap: barDimensions.gap,
      height: barDimensions.height,
    }"
    role="img"
    :aria-label="isActive ? 'Voice active' : 'Voice inactive'"
  >
    <div
      v-for="i in 3"
      :key="i"
      class="voice-bar"
      :class="[
        isActive ? 'voice-bar-active' : 'voice-bar-inactive',
        `voice-bar-${i}`,
      ]"
      :style="{
        width: barDimensions.width,
        height: barDimensions.height,
        backgroundColor: color,
        borderRadius: barDimensions.width,
      }"
    />
  </div>
</template>

<style scoped>
.voice-bars {
  display: flex;
  flex-direction: row;
  align-items: center;
}

.voice-bar {
  transition: transform 0.2s ease-out;
}

.voice-bar-inactive {
  transform: scaleY(0.3);
}

.voice-bar-active {
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}

/* Staggered animations for each bar */
.voice-bar-1.voice-bar-active {
  animation-name: voice-bar-bounce-1;
  animation-duration: 300ms;
  animation-delay: 0ms;
}

.voice-bar-2.voice-bar-active {
  animation-name: voice-bar-bounce-2;
  animation-duration: 350ms;
  animation-delay: 100ms;
}

.voice-bar-3.voice-bar-active {
  animation-name: voice-bar-bounce-3;
  animation-duration: 400ms;
  animation-delay: 200ms;
}

@keyframes voice-bar-bounce-1 {
  0% {
    transform: scaleY(0.3);
  }
  100% {
    transform: scaleY(1);
  }
}

@keyframes voice-bar-bounce-2 {
  0% {
    transform: scaleY(0.5);
  }
  100% {
    transform: scaleY(1);
  }
}

@keyframes voice-bar-bounce-3 {
  0% {
    transform: scaleY(0.4);
  }
  100% {
    transform: scaleY(1);
  }
}
</style>
