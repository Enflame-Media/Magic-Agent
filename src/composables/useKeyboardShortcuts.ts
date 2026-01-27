/**
 * Global keyboard shortcuts composable for Happy Vue.js Web Application
 *
 * Provides centralized keyboard shortcut management using @vueuse/core useMagicKeys.
 * Handles Cmd/Ctrl+K for command palette, Escape for closing modals/dropdowns,
 * and other global shortcuts.
 *
 * @see HAP-918 - Desktop Enhancements - Keyboard Shortcuts
 */

import { useMagicKeys, whenever } from '@vueuse/core';
import { ref, type Ref, computed } from 'vue';

/**
 * Keyboard shortcut registration
 */
export interface ShortcutRegistration {
  /** Unique ID for the shortcut */
  id: string;
  /** Handler to call when shortcut is triggered */
  handler: () => void;
}

/**
 * Global state for command palette
 */
const isCommandPaletteOpen = ref(false);

/**
 * Registry for escape key handlers (stack-based for nested modals)
 */
const escapeHandlers: ShortcutRegistration[] = [];


/**
 * Composable return type
 */
export interface UseKeyboardShortcutsReturn {
  /** Whether the command palette is currently open */
  isCommandPaletteOpen: Ref<boolean>;
  /** Open the command palette */
  openCommandPalette: () => void;
  /** Close the command palette */
  closeCommandPalette: () => void;
  /** Toggle the command palette */
  toggleCommandPalette: () => void;
  /** Register an escape key handler (for modals/dropdowns) */
  registerEscapeHandler: (id: string, handler: () => void) => void;
  /** Unregister an escape key handler */
  unregisterEscapeHandler: (id: string) => void;
  /** Check if an element is an input (to avoid triggering shortcuts while typing) */
  isInputElement: (target: EventTarget | null) => boolean;
}

/**
 * Check if the target element is an input or textarea
 */
function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  const isInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select';
  const isContentEditable = target.isContentEditable;
  return isInput || isContentEditable;
}

/**
 * Composable for global keyboard shortcuts
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
 *
 * const {
 *   isCommandPaletteOpen,
 *   toggleCommandPalette,
 *   registerEscapeHandler,
 *   unregisterEscapeHandler,
 * } = useKeyboardShortcuts();
 *
 * // Register escape handler for a modal
 * registerEscapeHandler('my-modal', () => {
 *   closeModal();
 * });
 *
 * // Clean up on unmount
 * onUnmounted(() => {
 *   unregisterEscapeHandler('my-modal');
 * });
 * </script>
 * ```
 */
export function useKeyboardShortcuts(): UseKeyboardShortcutsReturn {
  const keys = useMagicKeys();

  // Cmd/Ctrl + K for command palette
  const cmdK = computed(() => keys.meta_k?.value || keys.ctrl_k?.value);

  // Escape key for closing modals
  const escape = keys.escape;

  // Handle Cmd/Ctrl + K
  whenever(cmdK, () => {
    // Don't trigger if typing in an input
    const activeElement = document.activeElement;
    if (isInputElement(activeElement)) {
      // Still allow Cmd+K in inputs to open command palette
      // This is intentional - users expect Cmd+K to work anywhere
    }
    toggleCommandPalette();
  });

  // Handle Escape key
  if (escape) {
    whenever(escape, () => {
      // First, try to close command palette if open
      if (isCommandPaletteOpen.value) {
        closeCommandPalette();
        return;
      }

      // Then, call the most recently registered escape handler
      if (escapeHandlers.length > 0) {
        const lastHandler = escapeHandlers[escapeHandlers.length - 1];
        if (lastHandler) {
          lastHandler.handler();
        }
      }
    });
  }

  function openCommandPalette() {
    isCommandPaletteOpen.value = true;
  }

  function closeCommandPalette() {
    isCommandPaletteOpen.value = false;
  }

  function toggleCommandPalette() {
    isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
  }

  function registerEscapeHandler(id: string, handler: () => void) {
    // Remove existing handler with same ID if present
    const existingIndex = escapeHandlers.findIndex(h => h.id === id);
    if (existingIndex !== -1) {
      escapeHandlers.splice(existingIndex, 1);
    }
    escapeHandlers.push({ id, handler });
  }

  function unregisterEscapeHandler(id: string) {
    const index = escapeHandlers.findIndex(h => h.id === id);
    if (index !== -1) {
      escapeHandlers.splice(index, 1);
    }
  }

  return {
    isCommandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    toggleCommandPalette,
    registerEscapeHandler,
    unregisterEscapeHandler,
    isInputElement,
  };
}

/**
 * Minimum composable for components that just need command palette state
 */
export function useCommandPaletteState() {
  return {
    isOpen: isCommandPaletteOpen,
    open: () => { isCommandPaletteOpen.value = true; },
    close: () => { isCommandPaletteOpen.value = false; },
    toggle: () => { isCommandPaletteOpen.value = !isCommandPaletteOpen.value; },
  };
}
