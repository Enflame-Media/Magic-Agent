/**
 * Sidebar state composable with localStorage persistence
 *
 * Manages resizable sidebar state including width and collapsed state.
 * State persists across browser sessions using localStorage.
 *
 * @see HAP-918 - Desktop Enhancements - Resizable Sidebar
 */

import { useLocalStorage } from '@vueuse/core';
import { computed, type Ref, type ComputedRef } from 'vue';

/**
 * Sidebar state shape persisted to localStorage
 */
export interface SidebarState {
  /** Sidebar width in pixels (200-400px) */
  width: number;
  /** Whether sidebar is collapsed */
  collapsed: boolean;
}

/**
 * Default sidebar configuration
 */
export const SIDEBAR_DEFAULTS = {
  /** Default width in pixels */
  width: 256,
  /** Minimum width in pixels */
  minWidth: 200,
  /** Maximum width in pixels */
  maxWidth: 400,
  /** Width when collapsed (icon only) */
  collapsedWidth: 48,
  /** Default collapsed state */
  collapsed: false,
  /** localStorage key */
  storageKey: 'happy-sidebar-state',
} as const;

/**
 * Composable return type
 */
export interface UseSidebarStateReturn {
  /** Current sidebar width (reactive) */
  width: Ref<number>;
  /** Whether sidebar is collapsed (reactive) */
  isCollapsed: Ref<boolean>;
  /** Computed effective width (collapsed width or actual width) */
  effectiveWidth: ComputedRef<number>;
  /** Computed CSS width value */
  cssWidth: ComputedRef<string>;
  /** Set the sidebar width (clamped to min/max) */
  setWidth: (width: number) => void;
  /** Toggle collapsed state */
  toggleCollapsed: () => void;
  /** Set collapsed state */
  setCollapsed: (collapsed: boolean) => void;
  /** Reset to defaults */
  reset: () => void;
  /** Configuration constants */
  config: typeof SIDEBAR_DEFAULTS;
}

/**
 * Composable for managing resizable sidebar state
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useSidebarState } from '@/composables/useSidebarState';
 *
 * const { width, isCollapsed, cssWidth, setWidth, toggleCollapsed } = useSidebarState();
 * </script>
 *
 * <template>
 *   <aside :style="{ width: cssWidth }">
 *     <!-- Sidebar content -->
 *   </aside>
 * </template>
 * ```
 */
export function useSidebarState(): UseSidebarStateReturn {
  // Persistent state with localStorage
  const state = useLocalStorage<SidebarState>(
    SIDEBAR_DEFAULTS.storageKey,
    {
      width: SIDEBAR_DEFAULTS.width,
      collapsed: SIDEBAR_DEFAULTS.collapsed,
    },
    {
      // Deep merge to handle partial state
      mergeDefaults: true,
    }
  );

  // Derived reactive values
  const width = computed({
    get: () => state.value.width,
    set: (value: number) => {
      state.value = { ...state.value, width: clampWidth(value) };
    },
  });

  const isCollapsed = computed({
    get: () => state.value.collapsed,
    set: (value: boolean) => {
      state.value = { ...state.value, collapsed: value };
    },
  });

  // Effective width accounts for collapsed state
  const effectiveWidth = computed(() =>
    isCollapsed.value ? SIDEBAR_DEFAULTS.collapsedWidth : width.value
  );

  // CSS-ready width value
  const cssWidth = computed(() => `${effectiveWidth.value}px`);

  /**
   * Clamp width to allowed range
   */
  function clampWidth(value: number): number {
    return Math.max(
      SIDEBAR_DEFAULTS.minWidth,
      Math.min(SIDEBAR_DEFAULTS.maxWidth, value)
    );
  }

  /**
   * Set sidebar width (clamped to min/max)
   */
  function setWidth(newWidth: number) {
    width.value = clampWidth(newWidth);
  }

  /**
   * Toggle collapsed state
   */
  function toggleCollapsed() {
    isCollapsed.value = !isCollapsed.value;
  }

  /**
   * Set collapsed state
   */
  function setCollapsed(collapsed: boolean) {
    isCollapsed.value = collapsed;
  }

  /**
   * Reset to defaults
   */
  function reset() {
    state.value = {
      width: SIDEBAR_DEFAULTS.width,
      collapsed: SIDEBAR_DEFAULTS.collapsed,
    };
  }

  return {
    width,
    isCollapsed,
    effectiveWidth,
    cssWidth,
    setWidth,
    toggleCollapsed,
    setCollapsed,
    reset,
    config: SIDEBAR_DEFAULTS,
  };
}
