/**
 * Arrow key navigation composable for keyboard-accessible lists
 *
 * Provides arrow key (Up/Down) navigation within a container of focusable items.
 * Supports Home/End keys to jump to first/last item, and wrapping at boundaries.
 *
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 */

import { onMounted, onUnmounted, type Ref } from 'vue';

/**
 * Configuration options for arrow navigation
 */
export interface ArrowNavigationOptions {
  /** CSS selector for focusable items within the container */
  itemSelector?: string;
  /** Whether to wrap around when reaching the first/last item */
  loop?: boolean;
  /** Whether navigation is enabled */
  enabled?: Ref<boolean> | boolean;
  /** Orientation of the list */
  orientation?: 'vertical' | 'horizontal';
}

const defaultOptions: Required<Omit<ArrowNavigationOptions, 'enabled'>> & { enabled: boolean } = {
  itemSelector: '[role="option"], [role="menuitem"], [role="listitem"], [data-nav-item]',
  loop: true,
  enabled: true,
  orientation: 'vertical',
};

/**
 * Composable for arrow key navigation within a container
 *
 * @param containerRef - Ref to the container element
 * @param options - Configuration options
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useArrowNavigation } from '@/composables/useArrowNavigation';
 *
 * const listRef = ref<HTMLElement | null>(null);
 * useArrowNavigation(listRef, {
 *   itemSelector: '[role="option"]',
 *   loop: true,
 * });
 * </script>
 *
 * <template>
 *   <ul ref="listRef" role="listbox" aria-label="Sessions">
 *     <li role="option" tabindex="-1">Session 1</li>
 *     <li role="option" tabindex="-1">Session 2</li>
 *   </ul>
 * </template>
 * ```
 */
export function useArrowNavigation(
  containerRef: Ref<HTMLElement | null>,
  options: ArrowNavigationOptions = {},
) {
  const config = { ...defaultOptions, ...options };

  function getItems(): HTMLElement[] {
    if (!containerRef.value) return [];
    return Array.from(containerRef.value.querySelectorAll<HTMLElement>(config.itemSelector));
  }

  function isEnabled(): boolean {
    if (typeof config.enabled === 'boolean') return config.enabled;
    if (config.enabled && 'value' in config.enabled) return config.enabled.value;
    return true;
  }

  function getCurrentIndex(items: HTMLElement[]): number {
    const activeElement = document.activeElement as HTMLElement;
    return items.indexOf(activeElement);
  }

  function focusItem(items: HTMLElement[], index: number) {
    const item = items[index];
    if (item) {
      item.focus();
      // Update aria-activedescendant on container if it has an ID
      if (containerRef.value && item.id) {
        containerRef.value.setAttribute('aria-activedescendant', item.id);
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isEnabled()) return;

    const items = getItems();
    if (items.length === 0) return;

    const isVertical = config.orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    let currentIndex = getCurrentIndex(items);

    switch (event.key) {
      case nextKey: {
        event.preventDefault();
        if (currentIndex === -1) {
          // Nothing focused yet, focus first item
          focusItem(items, 0);
        } else if (currentIndex < items.length - 1) {
          focusItem(items, currentIndex + 1);
        } else if (config.loop) {
          focusItem(items, 0);
        }
        break;
      }
      case prevKey: {
        event.preventDefault();
        if (currentIndex === -1) {
          // Nothing focused yet, focus last item
          focusItem(items, items.length - 1);
        } else if (currentIndex > 0) {
          focusItem(items, currentIndex - 1);
        } else if (config.loop) {
          focusItem(items, items.length - 1);
        }
        break;
      }
      case 'Home': {
        event.preventDefault();
        focusItem(items, 0);
        break;
      }
      case 'End': {
        event.preventDefault();
        focusItem(items, items.length - 1);
        break;
      }
    }
  }

  onMounted(() => {
    containerRef.value?.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    containerRef.value?.removeEventListener('keydown', handleKeyDown);
  });

  return {
    /** Manually focus the first item */
    focusFirst: () => {
      const items = getItems();
      if (items.length > 0) focusItem(items, 0);
    },
    /** Manually focus the last item */
    focusLast: () => {
      const items = getItems();
      if (items.length > 0) focusItem(items, items.length - 1);
    },
    /** Get all navigable items */
    getItems,
  };
}
