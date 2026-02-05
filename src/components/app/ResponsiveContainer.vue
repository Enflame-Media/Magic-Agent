<script setup lang="ts">
/**
 * ResponsiveContainer - Adaptive layout container for responsive design
 *
 * Provides a container that automatically adapts its layout based on viewport:
 * - Mobile (< 640px): Full-width single column with mobile-optimized padding
 * - Tablet (640-1023px): Centered container with moderate padding
 * - Desktop (1024px+): Max-width container with comfortable padding
 * - Large (1536px+): Wider max-width for 4K and ultrawide displays
 *
 * Uses TailwindCSS responsive prefixes for mobile-first progressive enhancement.
 * All interactive elements within maintain 48px minimum touch targets on mobile.
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 * @see HAP-916 - Responsive Design System
 */

import { computed, type HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { useBreakpoints } from '@/composables/useBreakpoints';

export interface ResponsiveContainerProps {
  /**
   * Container size variant
   * - 'full': No max-width, spans entire viewport
   * - 'narrow': max-w-2xl (672px) - for forms, settings
   * - 'default': max-w-5xl (1024px) - for most content
   * - 'wide': max-w-7xl (1280px) - for dashboards, data tables
   * - 'ultrawide': max-w-screen-2xl (1536px) - for 4K displays
   */
  size?: 'full' | 'narrow' | 'default' | 'wide' | 'ultrawide';

  /**
   * Padding variant
   * - 'none': No padding
   * - 'compact': Minimal padding (mobile-optimized)
   * - 'default': Standard padding with responsive scaling
   * - 'comfortable': Extra padding for reading content
   */
  padding?: 'none' | 'compact' | 'default' | 'comfortable';

  /**
   * Whether to center the container horizontally
   * @default true
   */
  centered?: boolean;

  /**
   * Additional CSS classes
   */
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<ResponsiveContainerProps>(), {
  size: 'default',
  padding: 'default',
  centered: true,
});

const { isMobile } = useBreakpoints();

const sizeClasses: Record<NonNullable<ResponsiveContainerProps['size']>, string> = {
  full: 'w-full',
  narrow: 'w-full max-w-2xl',
  default: 'w-full max-w-5xl',
  wide: 'w-full max-w-7xl',
  ultrawide: 'w-full max-w-screen-2xl',
};

const paddingClasses: Record<NonNullable<ResponsiveContainerProps['padding']>, string> = {
  none: '',
  compact: 'px-3 py-2 sm:px-4 sm:py-3',
  default: 'px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6',
  comfortable: 'px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10',
};

const containerClass = computed(() =>
  cn(
    sizeClasses[props.size],
    paddingClasses[props.padding],
    props.centered && 'mx-auto',
    props.class,
  )
);
</script>

<template>
  <div
    :class="containerClass"
    :data-mobile="isMobile ? 'true' : undefined"
  >
    <slot />
  </div>
</template>
