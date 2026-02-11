/**
 * Unit tests for useFocusTrap composable
 *
 * Tests cover:
 * - Focus trapping activation/deactivation lifecycle
 * - Tab key cycles within container boundaries
 * - Shift+Tab reverse-cycles within container boundaries
 * - Focus restoration to trigger element on deactivation
 * - Nested focus trap support (stack-based pausing/resuming)
 * - Auto-focus behavior on activation
 * - Edge cases (no focusable elements, single element, etc.)
 * - getTabbableElements and getTabbableEdges utilities
 *
 * @see HAP-967 - Implement focus trapping in modals/dialogs
 * @see WCAG 2.4.3 - Focus Order
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useFocusTrap, getTabbableElements, getTabbableEdges } from './useFocusTrap';

// Mock onUnmounted since we're not in a component context
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    onUnmounted: vi.fn((fn: () => void) => {
      // Store cleanup function for manual invocation in tests
      (globalThis as Record<string, unknown>).__unmountCleanup = fn;
    }),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

function createDialogContainer(): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');

  const button1 = document.createElement('button');
  button1.textContent = 'First Button';
  button1.setAttribute('data-testid', 'first');

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Middle Input';
  input.setAttribute('data-testid', 'middle');

  const button2 = document.createElement('button');
  button2.textContent = 'Last Button';
  button2.setAttribute('data-testid', 'last');

  container.appendChild(button1);
  container.appendChild(input);
  container.appendChild(button2);
  document.body.appendChild(container);

  return container;
}

function createEmptyContainer(): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');

  const span = document.createElement('span');
  span.textContent = 'No focusable elements here';
  container.appendChild(span);

  document.body.appendChild(container);
  return container;
}

function createSingleFocusableContainer(): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');

  const button = document.createElement('button');
  button.textContent = 'Only Button';
  button.setAttribute('data-testid', 'only');
  container.appendChild(button);

  document.body.appendChild(container);
  return container;
}

function createTabEvent(shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
}

function createContainerWithMixedElements(): HTMLElement {
  const container = document.createElement('div');
  container.setAttribute('role', 'dialog');
  container.setAttribute('aria-modal', 'true');

  const enabledButton = document.createElement('button');
  enabledButton.textContent = 'Enabled';

  const disabledButton = document.createElement('button');
  disabledButton.textContent = 'Disabled';
  disabledButton.disabled = true;

  const disabledInput = document.createElement('input');
  disabledInput.type = 'text';
  disabledInput.disabled = true;

  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'hidden';

  const textarea = document.createElement('textarea');

  const select = document.createElement('select');
  const option = document.createElement('option');
  option.textContent = 'Option';
  select.appendChild(option);

  const link = document.createElement('a');
  link.href = '#';
  link.textContent = 'Link';

  const nonTabbableDiv = document.createElement('div');
  nonTabbableDiv.setAttribute('tabindex', '-1');
  nonTabbableDiv.textContent = 'Not tabbable';

  const tabbableDiv = document.createElement('div');
  tabbableDiv.setAttribute('tabindex', '0');
  tabbableDiv.textContent = 'Tabbable';

  container.appendChild(enabledButton);
  container.appendChild(disabledButton);
  container.appendChild(disabledInput);
  container.appendChild(hiddenInput);
  container.appendChild(textarea);
  container.appendChild(select);
  container.appendChild(link);
  container.appendChild(nonTabbableDiv);
  container.appendChild(tabbableDiv);
  document.body.appendChild(container);

  return container;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility function tests
// ─────────────────────────────────────────────────────────────────────────────

describe('getTabbableElements', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
  });

  it('should find buttons, inputs, textareas, selects, and links', () => {
    container = createContainerWithMixedElements();

    const elements = getTabbableElements(container);
    // Should find: enabled button, textarea, select, link, tabbable div = 5
    expect(elements).toHaveLength(5);
  });

  it('should exclude disabled elements', () => {
    container = document.createElement('div');
    const enabledBtn = document.createElement('button');
    enabledBtn.textContent = 'Enabled';
    const disabledBtn = document.createElement('button');
    disabledBtn.textContent = 'Disabled';
    disabledBtn.disabled = true;
    const disabledInput = document.createElement('input');
    disabledInput.type = 'text';
    disabledInput.disabled = true;
    container.appendChild(enabledBtn);
    container.appendChild(disabledBtn);
    container.appendChild(disabledInput);
    document.body.appendChild(container);

    const elements = getTabbableElements(container);
    expect(elements).toHaveLength(1);
  });

  it('should exclude hidden inputs', () => {
    container = document.createElement('div');
    const textInput = document.createElement('input');
    textInput.type = 'text';
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    container.appendChild(textInput);
    container.appendChild(hiddenInput);
    document.body.appendChild(container);

    const elements = getTabbableElements(container);
    expect(elements).toHaveLength(1);
  });

  it('should exclude elements with tabindex="-1"', () => {
    container = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Normal';
    const div = document.createElement('div');
    div.setAttribute('tabindex', '-1');
    div.textContent = 'Not tabbable';
    container.appendChild(button);
    container.appendChild(div);
    document.body.appendChild(container);

    const elements = getTabbableElements(container);
    expect(elements).toHaveLength(1);
  });

  it('should include elements with tabindex="0"', () => {
    container = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Normal';
    const div = document.createElement('div');
    div.setAttribute('tabindex', '0');
    div.textContent = 'Tabbable div';
    container.appendChild(button);
    container.appendChild(div);
    document.body.appendChild(container);

    const elements = getTabbableElements(container);
    expect(elements).toHaveLength(2);
  });

  it('should return empty array for container with no focusable elements', () => {
    container = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = 'Not focusable';
    const p = document.createElement('p');
    p.textContent = 'Also not focusable';
    container.appendChild(span);
    container.appendChild(p);
    document.body.appendChild(container);

    const elements = getTabbableElements(container);
    expect(elements).toHaveLength(0);
  });
});

describe('getTabbableEdges', () => {
  let container: HTMLElement;

  afterEach(() => {
    container?.remove();
  });

  it('should return first and last tabbable elements', () => {
    container = createDialogContainer();
    const [first, last] = getTabbableEdges(container);

    expect(first?.getAttribute('data-testid')).toBe('first');
    expect(last?.getAttribute('data-testid')).toBe('last');
  });

  it('should return same element for both when only one focusable element', () => {
    container = createSingleFocusableContainer();
    const [first, last] = getTabbableEdges(container);

    expect(first?.getAttribute('data-testid')).toBe('only');
    expect(last?.getAttribute('data-testid')).toBe('only');
  });

  it('should return [null, null] when no focusable elements', () => {
    container = createEmptyContainer();
    const [first, last] = getTabbableEdges(container);

    expect(first).toBeNull();
    expect(last).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// useFocusTrap composable tests
// ─────────────────────────────────────────────────────────────────────────────

describe('useFocusTrap', () => {
  let container: HTMLElement;
  let triggerButton: HTMLElement;

  beforeEach(() => {
    // Create a trigger button (simulates the element that opens the dialog)
    triggerButton = document.createElement('button');
    triggerButton.textContent = 'Open Dialog';
    triggerButton.setAttribute('data-testid', 'trigger');
    document.body.appendChild(triggerButton);
    triggerButton.focus();
  });

  afterEach(() => {
    container?.remove();
    triggerButton?.remove();
  });

  describe('activation and deactivation', () => {
    it('should activate when enabled is set to true', async () => {
      container = createDialogContainer();
      const enabled = ref(false);

      const { containerRef, isActive } = useFocusTrap({ enabled });
      containerRef.value = container;

      expect(isActive.value).toBe(false);

      enabled.value = true;
      await nextTick();
      await nextTick();

      expect(isActive.value).toBe(true);
    });

    it('should deactivate when enabled is set to false', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef, isActive } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      expect(isActive.value).toBe(true);

      enabled.value = false;
      await nextTick();
      await nextTick();

      expect(isActive.value).toBe(false);
    });

    it('should support manual activate/deactivate', async () => {
      container = createDialogContainer();
      const enabled = ref(false);

      const { containerRef, isActive, activate, deactivate } = useFocusTrap({ enabled });
      containerRef.value = container;

      activate();
      expect(isActive.value).toBe(true);

      deactivate();
      expect(isActive.value).toBe(false);
    });

    it('should not activate without a container element', async () => {
      const enabled = ref(true);

      const { isActive } = useFocusTrap({ enabled });
      await nextTick();

      expect(isActive.value).toBe(false);
    });

    it('should not double-activate', async () => {
      container = createDialogContainer();
      const enabled = ref(false);

      const { containerRef, isActive, activate } = useFocusTrap({ enabled });
      containerRef.value = container;

      activate();
      expect(isActive.value).toBe(true);

      // Second activation should be a no-op
      activate();
      expect(isActive.value).toBe(true);
    });

    it('should not double-deactivate', async () => {
      container = createDialogContainer();
      const enabled = ref(false);

      const { containerRef, activate, deactivate } = useFocusTrap({ enabled });
      containerRef.value = container;

      activate();
      deactivate();
      // Should not throw
      deactivate();
    });
  });

  describe('auto-focus behavior', () => {
    it('should auto-focus the first tabbable element on activation', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();
      await nextTick();

      const firstButton = container.querySelector('[data-testid="first"]');
      expect(document.activeElement).toBe(firstButton);
    });

    it('should skip auto-focus when autoFocus option is false', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled, autoFocus: false });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      // Focus should remain on the trigger button
      expect(document.activeElement).toBe(triggerButton);
    });

    it('should focus the container if no tabbable elements exist', async () => {
      container = createEmptyContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();
      await nextTick();

      expect(document.activeElement).toBe(container);
      expect(container.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('focus restoration', () => {
    it('should restore focus to the previously focused element on deactivation', async () => {
      container = createDialogContainer();
      triggerButton.focus();

      const enabled = ref(true);
      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();
      await nextTick();

      // Focus should be in the dialog now
      expect(container.contains(document.activeElement)).toBe(true);

      // Deactivate
      enabled.value = false;
      await nextTick();
      await nextTick();
      await nextTick();

      // Focus should return to trigger
      expect(document.activeElement).toBe(triggerButton);
    });

    it('should not restore focus when restoreFocus option is false', async () => {
      container = createDialogContainer();
      triggerButton.focus();

      const enabled = ref(true);
      const { containerRef } = useFocusTrap({ enabled, restoreFocus: false });
      containerRef.value = container;
      await nextTick();
      await nextTick();
      await nextTick();

      const focusedInDialog = document.activeElement;
      expect(container.contains(focusedInDialog)).toBe(true);

      // Deactivate
      enabled.value = false;
      await nextTick();
      await nextTick();

      // Focus should NOT return to trigger (stays wherever it was)
      expect(document.activeElement).not.toBe(triggerButton);
    });
  });

  describe('Tab key trapping', () => {
    it('should prevent Tab from escaping when on last element (loop enabled)', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled, loop: true });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      // Focus the last button
      const lastButton = container.querySelector<HTMLElement>('[data-testid="last"]')!;
      lastButton.focus();

      // Press Tab
      const event = createTabEvent();
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should prevent Shift+Tab from escaping when on first element (loop enabled)', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled, loop: true });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      // Focus the first button
      const firstButton = container.querySelector<HTMLElement>('[data-testid="first"]')!;
      firstButton.focus();

      // Press Shift+Tab
      const event = createTabEvent(true);
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should prevent Tab when no focusable elements exist', async () => {
      container = createEmptyContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      const event = createTabEvent();
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should not interfere with non-Tab keys', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('should not loop when loop is disabled and on last element', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled, loop: false });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      // Focus the last button
      const lastButton = container.querySelector<HTMLElement>('[data-testid="last"]')!;
      lastButton.focus();

      // Press Tab - should still prevent default (stops focus from leaving)
      // but won't loop to first element
      const event = createTabEvent();
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('nested focus trap support', () => {
    let innerContainer: HTMLElement;

    afterEach(() => {
      innerContainer?.remove();
    });

    it('should support nested focus traps by pausing the outer trap', async () => {
      // Create outer dialog
      container = createDialogContainer();
      const outerEnabled = ref(true);

      const outer = useFocusTrap({ enabled: outerEnabled });
      outer.containerRef.value = container;
      await nextTick();
      await nextTick();

      expect(outer.isActive.value).toBe(true);

      // Create inner dialog (nested)
      innerContainer = document.createElement('div');
      innerContainer.setAttribute('role', 'dialog');
      innerContainer.setAttribute('aria-modal', 'true');
      const innerButton = document.createElement('button');
      innerButton.textContent = 'Inner Button';
      innerButton.setAttribute('data-testid', 'inner');
      innerContainer.appendChild(innerButton);
      document.body.appendChild(innerContainer);

      const innerEnabled = ref(true);
      const inner = useFocusTrap({ enabled: innerEnabled });
      inner.containerRef.value = innerContainer;
      await nextTick();
      await nextTick();

      expect(inner.isActive.value).toBe(true);
      // Outer trap should still be active but paused
      expect(outer.isActive.value).toBe(true);

      // Deactivate inner trap
      innerEnabled.value = false;
      await nextTick();
      await nextTick();

      // Outer trap should resume
      expect(outer.isActive.value).toBe(true);
      expect(inner.isActive.value).toBe(false);
    });
  });

  describe('cleanup on unmount', () => {
    it('should deactivate on component unmount', async () => {
      container = createDialogContainer();
      const enabled = ref(true);

      const { containerRef, isActive } = useFocusTrap({ enabled });
      containerRef.value = container;
      await nextTick();
      await nextTick();

      expect(isActive.value).toBe(true);

      // Simulate component unmount
      const cleanup = (globalThis as Record<string, unknown>).__unmountCleanup as () => void;
      if (cleanup) cleanup();

      expect(isActive.value).toBe(false);
    });
  });

  describe('return type', () => {
    it('should return all expected properties', () => {
      const enabled = ref(false);
      const result = useFocusTrap({ enabled });

      expect(result).toHaveProperty('containerRef');
      expect(result).toHaveProperty('activate');
      expect(result).toHaveProperty('deactivate');
      expect(result).toHaveProperty('isActive');
      expect(typeof result.activate).toBe('function');
      expect(typeof result.deactivate).toBe('function');
    });
  });
});
