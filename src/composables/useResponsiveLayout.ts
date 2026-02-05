/**
 * Responsive layout composable for adaptive multi-panel layouts
 *
 * Provides reactive layout state for transitioning between:
 * - Multi-panel layouts on desktop (side-by-side panels)
 * - Single-panel stacked layouts on mobile
 *
 * Uses the breakpoint system from useBreakpoints to determine
 * the active layout mode and panel visibility.
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 * @see HAP-916 - Responsive Design System
 */

import { computed, ref, type ComputedRef, type Ref } from 'vue';
import { useBreakpoints, type BreakpointKey } from '@/composables/useBreakpoints';

/**
 * Layout modes for responsive content display
 */
export type LayoutMode = 'single' | 'dual' | 'triple';

/**
 * Panel configuration for responsive layouts
 */
export interface PanelConfig {
  /** Unique panel identifier */
  id: string;
  /** Minimum breakpoint where panel is visible as a side panel */
  minBreakpoint: BreakpointKey;
  /** Default width as percentage (used in multi-panel mode) */
  defaultWidth: number;
  /** Whether panel can be collapsed */
  collapsible: boolean;
}

/**
 * Return type for useResponsiveLayout composable
 */
export interface UseResponsiveLayoutReturn {
  /** Current layout mode based on viewport */
  layoutMode: ComputedRef<LayoutMode>;

  /** Whether the layout is in single-panel (mobile) mode */
  isSinglePanel: ComputedRef<boolean>;

  /** Whether the layout supports dual panels */
  isDualPanel: ComputedRef<boolean>;

  /** Whether the layout supports three panels */
  isTriplePanel: ComputedRef<boolean>;

  /** Active panel ID in single-panel mode */
  activePanel: Ref<string>;

  /** Set the active panel (for single-panel navigation) */
  setActivePanel: (panelId: string) => void;

  /** Whether a specific panel should be visible */
  isPanelVisible: (panelId: string) => boolean;

  /** Number of visible panels at current breakpoint */
  visiblePanelCount: ComputedRef<number>;

  /** Computed container class based on layout mode */
  containerClass: ComputedRef<string>;
}

/**
 * Default panel configurations for common layouts
 */
export const DEFAULT_PANELS: PanelConfig[] = [
  { id: 'sidebar', minBreakpoint: 'lg', defaultWidth: 25, collapsible: true },
  { id: 'main', minBreakpoint: 'sm', defaultWidth: 50, collapsible: false },
  { id: 'detail', minBreakpoint: 'xl', defaultWidth: 25, collapsible: true },
];

/**
 * Composable for responsive multi-panel layouts
 *
 * Manages the transition between multi-panel desktop layouts
 * and single-panel mobile layouts, with panel visibility
 * determined by viewport breakpoints.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useResponsiveLayout } from '@/composables/useResponsiveLayout';
 *
 * const { layoutMode, isSinglePanel, activePanel, setActivePanel } = useResponsiveLayout();
 * </script>
 *
 * <template>
 *   <div :class="containerClass">
 *     <aside v-if="isPanelVisible('sidebar')">Sidebar</aside>
 *     <main v-if="isPanelVisible('main')">Content</main>
 *     <aside v-if="isPanelVisible('detail')">Detail</aside>
 *   </div>
 *
 *   <!-- Mobile panel switcher -->
 *   <nav v-if="isSinglePanel">
 *     <button @click="setActivePanel('main')">Content</button>
 *     <button @click="setActivePanel('detail')">Detail</button>
 *   </nav>
 * </template>
 * ```
 *
 * @param panels - Panel configurations (defaults to sidebar/main/detail)
 * @param defaultPanel - Default active panel ID (defaults to 'main')
 */
export function useResponsiveLayout(
  panels: PanelConfig[] = DEFAULT_PANELS,
  defaultPanel = 'main',
): UseResponsiveLayoutReturn {
  const { isMobile, isDesktop, isLargeScreen, greaterOrEqual } = useBreakpoints();

  // Active panel for single-panel mode navigation
  const activePanel = ref(defaultPanel);

  // Determine layout mode based on viewport
  const layoutMode = computed<LayoutMode>(() => {
    if (isLargeScreen.value) return 'triple';
    if (isDesktop.value) return 'dual';
    return 'single';
  });

  const isSinglePanel = computed(() => layoutMode.value === 'single');
  const isDualPanel = computed(() => layoutMode.value === 'dual');
  const isTriplePanel = computed(() => layoutMode.value === 'triple');

  // Count visible panels at current breakpoint
  const visiblePanelCount = computed(() => {
    return panels.filter((panel) => greaterOrEqual(panel.minBreakpoint).value).length;
  });

  /**
   * Set the active panel for single-panel mode
   */
  function setActivePanel(panelId: string) {
    const panel = panels.find((p) => p.id === panelId);
    if (panel) {
      activePanel.value = panelId;
    }
  }

  /**
   * Check if a panel should be visible at the current breakpoint
   *
   * In multi-panel mode, visibility is determined by the panel's minBreakpoint.
   * In single-panel mode, only the active panel is visible.
   */
  function isPanelVisible(panelId: string): boolean {
    const panel = panels.find((p) => p.id === panelId);
    if (!panel) return false;

    // In single-panel mode, only show the active panel
    if (isMobile.value) {
      return activePanel.value === panelId;
    }

    // In multi-panel mode, check breakpoint
    return greaterOrEqual(panel.minBreakpoint).value;
  }

  // Container CSS class based on layout mode
  const containerClass = computed(() => {
    switch (layoutMode.value) {
      case 'triple':
        return 'grid grid-cols-[minmax(200px,25%)_1fr_minmax(200px,25%)] gap-0 h-full';
      case 'dual':
        return 'grid grid-cols-[minmax(200px,30%)_1fr] gap-0 h-full';
      case 'single':
      default:
        return 'flex flex-col h-full';
    }
  });

  return {
    layoutMode,
    isSinglePanel,
    isDualPanel,
    isTriplePanel,
    activePanel,
    setActivePanel,
    isPanelVisible,
    visiblePanelCount,
    containerClass,
  };
}
