/**
 * Dark Mode Composable
 *
 * Provides reactive dark mode state with localStorage persistence
 * and system preference detection using @vueuse/core's useColorMode.
 *
 * Features:
 * - Three modes: 'light', 'dark', 'auto' (system preference)
 * - Automatic system preference detection
 * - LocalStorage persistence
 * - Syncs 'dark' class on document.documentElement for Tailwind
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useDarkMode } from '@/composables/useDarkMode';
 *
 * const { isDark, mode, toggle, setMode } = useDarkMode();
 * </script>
 *
 * <template>
 *   <button @click="toggle">
 *     {{ isDark ? '🌙 Dark' : '☀️ Light' }}
 *   </button>
 *
 *   <!-- Or use the mode selector -->
 *   <select v-model="mode">
 *     <option value="light">Light</option>
 *     <option value="dark">Dark</option>
 *     <option value="auto">System</option>
 *   </select>
 * </template>
 * ```
 */

import { computed, type ComputedRef, type WritableComputedRef } from 'vue';
import { useColorMode, usePreferredDark } from '@vueuse/core';

/**
 * Color mode options
 * - 'light': Force light mode
 * - 'dark': Force dark mode
 * - 'auto': Follow system preference
 */
export type ColorMode = 'light' | 'dark' | 'auto';

export interface UseDarkModeReturn {
  /** Whether dark mode is currently active (computed from mode and system preference) */
  isDark: ComputedRef<boolean>;
  /** Current color mode setting: 'light', 'dark', or 'auto' */
  mode: WritableComputedRef<ColorMode>;
  /** Toggle between light and dark modes (skips auto) */
  toggle: () => void;
  /** Set the color mode explicitly */
  setMode: (value: ColorMode) => void;
  /** Set dark mode on/off (sets to 'dark' or 'light', not 'auto') */
  setDark: (value: boolean) => void;
  /** Whether using system preference (mode === 'auto') */
  isAuto: ComputedRef<boolean>;
  /** System preference for dark mode */
  systemPrefersDark: ComputedRef<boolean>;
}

const STORAGE_KEY = 'happy-vue-color-mode';

/**
 * Composable for managing dark mode state.
 *
 * Uses @vueuse/core's useColorMode for robust color mode management:
 * - Persists user preference to localStorage
 * - Supports 'auto' mode that follows system preference
 * - Syncs with document.documentElement.classList for Tailwind's class-based dark mode
 * - Singleton pattern ensures consistent state across components
 */
export function useDarkMode(): UseDarkModeReturn {
  // System preference detection
  const systemPrefersDark = usePreferredDark();

  // Color mode with localStorage persistence
  const colorMode = useColorMode({
    storageKey: STORAGE_KEY,
    attribute: 'class',
    modes: {
      light: '',
      dark: 'dark',
      auto: '',
    },
    onChanged: (mode, defaultHandler) => {
      // When auto, apply based on system preference
      if (mode === 'auto') {
        document.documentElement.classList.toggle('dark', systemPrefersDark.value);
      } else {
        defaultHandler(mode);
      }
    },
  });

  // Computed: is dark mode currently active?
  const isDark = computed(() => {
    if (colorMode.value === 'auto') {
      return systemPrefersDark.value;
    }
    return colorMode.value === 'dark';
  });

  // Writable computed for mode
  const mode = computed<ColorMode>({
    get: () => colorMode.value as ColorMode,
    set: (value: ColorMode) => {
      colorMode.value = value;
      // Re-apply the dark class when setting mode
      if (value === 'auto') {
        document.documentElement.classList.toggle('dark', systemPrefersDark.value);
      } else {
        document.documentElement.classList.toggle('dark', value === 'dark');
      }
    },
  });

  // Whether using auto mode
  const isAuto = computed(() => colorMode.value === 'auto');

  /**
   * Toggle between light and dark modes.
   * If currently on 'auto', switches to the opposite of system preference.
   */
  function toggle(): void {
    if (isDark.value) {
      mode.value = 'light';
    } else {
      mode.value = 'dark';
    }
  }

  /**
   * Set the color mode explicitly.
   * @param value - 'light', 'dark', or 'auto'
   */
  function setMode(value: ColorMode): void {
    mode.value = value;
  }

  /**
   * Set dark mode on/off explicitly.
   * Sets to 'dark' or 'light', not 'auto'.
   * @param value - true for dark mode, false for light mode
   */
  function setDark(value: boolean): void {
    mode.value = value ? 'dark' : 'light';
  }

  return {
    isDark,
    mode,
    toggle,
    setMode,
    setDark,
    isAuto,
    systemPrefersDark: computed(() => systemPrefersDark.value),
  };
}
