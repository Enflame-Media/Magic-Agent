/**
 * Focus trap composable for modal/dialog accessibility compliance
 *
 * Provides focus trapping functionality to keep Tab/Shift+Tab cycling
 * within a container element (e.g., modal or dialog). Returns focus to
 * the trigger element when the trap is deactivated.
 *
 * Supports nested focus traps via a stack-based approach where only the
 * most recently activated trap handles focus.
 *
 * Note: Reka-UI's Dialog/AlertDialog components include built-in focus
 * trapping via FocusScope. This composable provides an additional explicit
 * layer for custom modal scenarios and serves as a testable abstraction.
 *
 * @see HAP-967 - Implement focus trapping in modals/dialogs
 * @see WCAG 2.4.3 - Focus Order
 */

import { ref, watch, onUnmounted, nextTick, type Ref } from 'vue';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseFocusTrapOptions {
  /**
   * Whether the focus trap is currently active.
   * When true, Tab/Shift+Tab are constrained within the container.
   */
  enabled: Ref<boolean>;

  /**
   * Whether to loop focus (Tab from last element goes to first, Shift+Tab from first goes to last).
   * @default true
   */
  loop?: boolean;

  /**
   * Whether to auto-focus the first tabbable element when the trap activates.
   * @default true
   */
  autoFocus?: boolean;

  /**
   * Whether to restore focus to the previously focused element when the trap deactivates.
   * @default true
   */
  restoreFocus?: boolean;
}

export interface UseFocusTrapReturn {
  /** Ref to bind to the container element that should trap focus */
  containerRef: Ref<HTMLElement | null>;

  /** Manually activate the focus trap */
  activate: () => void;

  /** Manually deactivate the focus trap */
  deactivate: () => void;

  /** Whether the trap is currently active */
  isActive: Ref<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Focus trap stack for nested modals
// ─────────────────────────────────────────────────────────────────────────────

const focusTrapStack: Array<{ id: symbol; pause: () => void; resume: () => void }> = [];

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  'details > summary:first-of-type',
].join(', ');

/**
 * Get all focusable/tabbable elements within a container.
 * Filters out elements that are not visible or have display: none.
 */
export function getTabbableElements(container: HTMLElement): HTMLElement[] {
  const elements = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    // Skip elements that are not visible
    if (el.offsetParent === null && el.style.position !== 'fixed') return false;
    // Skip elements with visibility: hidden
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return true;
  });
}

/**
 * Get the first and last tabbable elements within a container.
 */
export function getTabbableEdges(container: HTMLElement): [HTMLElement | null, HTMLElement | null] {
  const tabbable = getTabbableElements(container);
  return [tabbable[0] ?? null, tabbable[tabbable.length - 1] ?? null];
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable that traps focus within a container element.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { useFocusTrap } from '@/composables/useFocusTrap';
 *
 * const isOpen = ref(false);
 * const { containerRef } = useFocusTrap({
 *   enabled: isOpen,
 * });
 * </script>
 *
 * <template>
 *   <div v-if="isOpen" ref="containerRef" role="dialog" aria-modal="true">
 *     <button @click="isOpen = false">Close</button>
 *     <input type="text" placeholder="Focus stays here" />
 *   </div>
 * </template>
 * ```
 */
export function useFocusTrap(options: UseFocusTrapOptions): UseFocusTrapReturn {
  const {
    enabled,
    loop = true,
    autoFocus = true,
    restoreFocus = true,
  } = options;

  const containerRef = ref<HTMLElement | null>(null);
  const isActive = ref(false);
  const trapId = Symbol('focus-trap');

  let previouslyFocusedElement: HTMLElement | null = null;
  let isPaused = false;

  // Stack entry for nested trap support
  const stackEntry = {
    id: trapId,
    pause: () => { isPaused = true; },
    resume: () => { isPaused = false; },
  };

  /**
   * Handle keydown events to trap Tab/Shift+Tab within the container.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    if (isPaused) return;
    if (event.key !== 'Tab') return;

    const container = containerRef.value;
    if (!container) return;

    const [first, last] = getTabbableEdges(container);

    // If no tabbable elements, prevent Tab from leaving the container
    if (!first || !last) {
      event.preventDefault();
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      // Shift+Tab: if on first element, wrap to last
      if (activeElement === first || !container.contains(activeElement)) {
        event.preventDefault();
        if (loop) {
          last.focus();
        }
      }
    } else {
      // Tab: if on last element, wrap to first
      if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        if (loop) {
          first.focus();
        }
      }
    }
  }

  /**
   * Handle focusin events to ensure focus stays within the container.
   */
  function handleFocusIn(event: FocusEvent): void {
    if (isPaused) return;

    const container = containerRef.value;
    if (!container) return;

    const target = event.target as HTMLElement;
    if (!container.contains(target)) {
      // Focus escaped - pull it back
      const [first] = getTabbableEdges(container);
      if (first) {
        first.focus();
      } else {
        container.focus();
      }
    }
  }

  /**
   * Activate the focus trap.
   */
  function activate(): void {
    if (isActive.value) return;

    const container = containerRef.value;
    if (!container) return;

    // Store the currently focused element for restoration
    previouslyFocusedElement = document.activeElement as HTMLElement | null;

    // Pause the previous trap (if any) for nested modal support
    const previousTrap = focusTrapStack[focusTrapStack.length - 1];
    if (previousTrap) {
      previousTrap.pause();
    }

    // Add to stack
    focusTrapStack.push(stackEntry);
    isPaused = false;

    // Attach event listeners
    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);

    isActive.value = true;

    // Auto-focus the first tabbable element
    if (autoFocus) {
      void nextTick(() => {
        const [first] = getTabbableEdges(container);
        if (first) {
          first.focus();
        } else {
          // If no tabbable elements, focus the container itself
          container.setAttribute('tabindex', '-1');
          container.focus();
        }
      });
    }
  }

  /**
   * Deactivate the focus trap.
   */
  function deactivate(): void {
    if (!isActive.value) return;

    const container = containerRef.value;

    // Remove event listeners
    if (container) {
      container.removeEventListener('keydown', handleKeyDown);
    }
    document.removeEventListener('focusin', handleFocusIn);

    // Remove from stack
    const stackIndex = focusTrapStack.findIndex((entry) => entry.id === trapId);
    if (stackIndex !== -1) {
      focusTrapStack.splice(stackIndex, 1);
    }

    // Resume the previous trap (if any)
    const previousTrap = focusTrapStack[focusTrapStack.length - 1];
    if (previousTrap) {
      previousTrap.resume();
    }

    isActive.value = false;

    // Restore focus to the previously focused element
    if (restoreFocus && previouslyFocusedElement) {
      void nextTick(() => {
        previouslyFocusedElement?.focus();
        previouslyFocusedElement = null;
      });
    }
  }

  // Watch enabled state to activate/deactivate
  watch(
    [enabled, containerRef],
    async ([isEnabled, container]) => {
      await nextTick();
      if (isEnabled && container) {
        activate();
      } else if (!isEnabled && isActive.value) {
        deactivate();
      }
    },
    { immediate: true },
  );

  // Clean up on component unmount
  onUnmounted(() => {
    deactivate();
  });

  return {
    containerRef,
    activate,
    deactivate,
    isActive,
  };
}
