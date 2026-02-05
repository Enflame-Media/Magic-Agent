/**
 * Responsive breakpoints composable for Happy Vue.js Web Application
 *
 * Provides reactive breakpoint state using TailwindCSS default breakpoints.
 * Uses @vueuse/core's useBreakpoints for efficient media query handling.
 *
 * @see https://tailwindcss.com/docs/responsive-design
 * @see HAP-916 - Responsive Design System
 */

import { breakpointsTailwind, useBreakpoints as useVueUseBreakpoints } from '@vueuse/core';
import { computed, type ComputedRef, type Ref } from 'vue';

/**
 * TailwindCSS default breakpoints (mobile-first)
 * - sm: 640px (small tablets, large phones)
 * - md: 768px (tablets)
 * - lg: 1024px (laptops)
 * - xl: 1280px (desktops)
 * - 2xl: 1536px (large screens)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

/**
 * Breakpoints composable return type
 */
export interface UseBreakpointsReturn {
  /**
   * Currently active breakpoint name
   * Returns 'xs' for screens smaller than sm (640px)
   */
  current: ComputedRef<BreakpointKey | 'xs'>;

  /**
   * True when viewport is below sm breakpoint (mobile phones)
   */
  isMobile: Ref<boolean>;

  /**
   * True when viewport is sm or larger (tablets and up)
   */
  isTablet: Ref<boolean>;

  /**
   * True when viewport is lg or larger (laptops and up)
   */
  isDesktop: Ref<boolean>;

  /**
   * True when viewport is xl or larger (large screens)
   */
  isLargeScreen: Ref<boolean>;

  /**
   * Breakpoint query methods from @vueuse/core
   */
  greaterOrEqual: (breakpoint: BreakpointKey) => Ref<boolean>;
  greater: (breakpoint: BreakpointKey) => Ref<boolean>;
  smallerOrEqual: (breakpoint: BreakpointKey) => Ref<boolean>;
  smaller: (breakpoint: BreakpointKey) => Ref<boolean>;
  between: (min: BreakpointKey, max: BreakpointKey) => Ref<boolean>;
}

/**
 * Composable for responsive design using TailwindCSS breakpoints
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useBreakpoints } from '@/composables/useBreakpoints';
 *
 * const { isMobile, isDesktop, current } = useBreakpoints();
 * </script>
 *
 * <template>
 *   <MobileNav v-if="isMobile" />
 *   <DesktopSidebar v-else />
 *   <p>Current breakpoint: {{ current }}</p>
 * </template>
 * ```
 *
 * @param options - Optional SSR configuration
 * @param options.ssrWidth - Width to use during SSR (prevents hydration mismatch)
 */
export function useBreakpoints(options?: { ssrWidth?: number }): UseBreakpointsReturn {
  const breakpoints = useVueUseBreakpoints(breakpointsTailwind, options);

  // Common breakpoint checks
  const isMobile = breakpoints.smaller('sm');
  const isTablet = breakpoints.greaterOrEqual('sm');
  const isDesktop = breakpoints.greaterOrEqual('lg');
  const isLargeScreen = breakpoints.greaterOrEqual('xl');

  // Active breakpoint with 'xs' fallback for mobile
  const current = computed<BreakpointKey | 'xs'>(() => {
    const active = breakpoints.active();
    // When no breakpoint is active (below sm), return 'xs'
    return (active.value as BreakpointKey | undefined) ?? 'xs';
  });

  return {
    current,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    greaterOrEqual: (bp: BreakpointKey) => breakpoints.greaterOrEqual(bp),
    greater: (bp: BreakpointKey) => breakpoints.greater(bp),
    smallerOrEqual: (bp: BreakpointKey) => breakpoints.smallerOrEqual(bp),
    smaller: (bp: BreakpointKey) => breakpoints.smaller(bp),
    between: (min: BreakpointKey, max: BreakpointKey) => breakpoints.between(min, max),
  };
}

/**
 * Minimum touch target size in pixels (WCAG 2.2 Level AA)
 * @see https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
 */
export const TOUCH_TARGET_MIN_SIZE = 44;

/**
 * Recommended touch target size for optimal mobile experience
 */
export const TOUCH_TARGET_RECOMMENDED_SIZE = 48;

/**
 * Responsive container max-width tokens (in pixels)
 * Maps to the ResponsiveContainer size prop values
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 */
export const CONTAINER_MAX_WIDTHS = {
  /** 672px - Forms, settings, narrow content */
  narrow: 672,
  /** 1024px - Standard content pages */
  default: 1024,
  /** 1280px - Dashboards, data-heavy views */
  wide: 1280,
  /** 1536px - Ultra-wide, 4K optimized */
  ultrawide: 1536,
} as const;

/**
 * Responsive spacing scale (in pixels)
 * Mobile-first values that scale up at breakpoints
 */
export const RESPONSIVE_SPACING = {
  /** Padding at mobile viewport */
  mobilePadding: 16,
  /** Padding at tablet viewport (sm+) */
  tabletPadding: 24,
  /** Padding at desktop viewport (lg+) */
  desktopPadding: 32,
  /** Gap between elements at mobile */
  mobileGap: 12,
  /** Gap between elements at tablet (sm+) */
  tabletGap: 16,
  /** Gap between elements at desktop (lg+) */
  desktopGap: 24,
} as const;
