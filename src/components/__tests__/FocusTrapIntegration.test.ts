/**
 * Integration tests for focus trapping in modal/dialog components
 *
 * Verifies that Tab/Shift+Tab cannot escape modal boundaries for:
 * - ShadCN Dialog (used by SessionErrorDialog, PaywallDialog, ShareSessionModal)
 * - ShadCN AlertDialog (used by AccountView, SessionInfoView confirmations)
 * - CommandDialog (used by CommandPalette)
 * - useFocusTrap composable standalone usage
 *
 * These tests validate WCAG 2.4.3 (Focus Order) compliance.
 *
 * @see HAP-967 - Implement focus trapping in modals/dialogs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref, nextTick } from 'vue';
import { useFocusTrap, getTabbableElements } from '@/composables/useFocusTrap';

// Mock onUnmounted since we're not in a component context
vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a modal container resembling a SessionErrorDialog structure
 */
function createSessionErrorDialog(): HTMLElement {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('data-testid', 'session-error-dialog');

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.setAttribute('data-testid', 'close-btn');

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.setAttribute('data-testid', 'copy-btn');

  // Dismiss button
  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.setAttribute('data-testid', 'dismiss-btn');

  // Archive button
  const archiveBtn = document.createElement('button');
  archiveBtn.textContent = 'Archive';
  archiveBtn.setAttribute('data-testid', 'archive-btn');

  dialog.appendChild(closeBtn);
  dialog.appendChild(copyBtn);
  dialog.appendChild(dismissBtn);
  dialog.appendChild(archiveBtn);
  document.body.appendChild(dialog);

  return dialog;
}

/**
 * Create a modal container resembling a PaywallDialog structure
 */
function createPaywallDialog(): HTMLElement {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('data-testid', 'paywall-dialog');

  // Package selection cards (clickable divs with tabindex)
  const card1 = document.createElement('div');
  card1.setAttribute('tabindex', '0');
  card1.setAttribute('data-testid', 'annual-plan');
  card1.textContent = 'Annual Plan';

  const card2 = document.createElement('div');
  card2.setAttribute('tabindex', '0');
  card2.setAttribute('data-testid', 'monthly-plan');
  card2.textContent = 'Monthly Plan';

  // Subscribe button
  const subscribeBtn = document.createElement('button');
  subscribeBtn.textContent = 'Subscribe Now';
  subscribeBtn.setAttribute('data-testid', 'subscribe-btn');

  // Restore button
  const restoreBtn = document.createElement('button');
  restoreBtn.textContent = 'Restore Purchases';
  restoreBtn.setAttribute('data-testid', 'restore-btn');

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.setAttribute('data-testid', 'cancel-btn');

  dialog.appendChild(card1);
  dialog.appendChild(card2);
  dialog.appendChild(subscribeBtn);
  dialog.appendChild(restoreBtn);
  dialog.appendChild(cancelBtn);
  document.body.appendChild(dialog);

  return dialog;
}

/**
 * Create a modal container resembling a CommandPalette structure
 */
function createCommandPalette(): HTMLElement {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('data-testid', 'command-palette');

  // Search input
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Type a command or search...';
  input.setAttribute('data-testid', 'search-input');

  // Command items
  const item1 = document.createElement('div');
  item1.setAttribute('tabindex', '0');
  item1.setAttribute('role', 'option');
  item1.setAttribute('data-testid', 'cmd-new-session');
  item1.textContent = 'New Session';

  const item2 = document.createElement('div');
  item2.setAttribute('tabindex', '0');
  item2.setAttribute('role', 'option');
  item2.setAttribute('data-testid', 'cmd-toggle-theme');
  item2.textContent = 'Toggle Theme';

  const item3 = document.createElement('div');
  item3.setAttribute('tabindex', '0');
  item3.setAttribute('role', 'option');
  item3.setAttribute('data-testid', 'cmd-settings');
  item3.textContent = 'Settings';

  dialog.appendChild(input);
  dialog.appendChild(item1);
  dialog.appendChild(item2);
  dialog.appendChild(item3);
  document.body.appendChild(dialog);

  return dialog;
}

/**
 * Create an AlertDialog structure (confirmation dialog)
 */
function createAlertDialog(): HTMLElement {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('data-testid', 'alert-dialog');

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.setAttribute('data-testid', 'alert-cancel');

  // Confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Confirm';
  confirmBtn.setAttribute('data-testid', 'alert-confirm');

  dialog.appendChild(cancelBtn);
  dialog.appendChild(confirmBtn);
  document.body.appendChild(dialog);

  return dialog;
}

function createTabEvent(shiftKey = false): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Focus trap integration - modal boundary enforcement', () => {
  let dialog: HTMLElement;
  let backgroundButton: HTMLElement;

  beforeEach(() => {
    // Create background content that focus should NOT reach
    backgroundButton = document.createElement('button');
    backgroundButton.textContent = 'Background Button';
    backgroundButton.setAttribute('data-testid', 'background');
    document.body.appendChild(backgroundButton);
  });

  afterEach(() => {
    dialog?.remove();
    backgroundButton?.remove();
  });

  describe('SessionErrorDialog focus boundary', () => {
    it('should keep Tab cycling within the dialog', async () => {
      dialog = createSessionErrorDialog();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();

      // Focus should be on the first button (close)
      const tabbable = getTabbableElements(dialog);
      expect(tabbable.length).toBe(4); // close, copy, dismiss, archive

      // Focus the last button
      const lastBtn = dialog.querySelector<HTMLElement>('[data-testid="archive-btn"]')!;
      lastBtn.focus();

      // Press Tab - should not escape to background
      const event = createTabEvent();
      dialog.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      // Focus should NOT be on background button
      expect(document.activeElement).not.toBe(backgroundButton);
    });

    it('should keep Shift+Tab cycling within the dialog', async () => {
      dialog = createSessionErrorDialog();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();

      // Focus the first button
      const firstBtn = dialog.querySelector<HTMLElement>('[data-testid="close-btn"]')!;
      firstBtn.focus();

      // Press Shift+Tab - should not escape to background
      const event = createTabEvent(true);
      dialog.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).not.toBe(backgroundButton);
    });
  });

  describe('PaywallDialog focus boundary', () => {
    it('should trap focus within the paywall dialog', async () => {
      dialog = createPaywallDialog();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();

      const tabbable = getTabbableElements(dialog);
      expect(tabbable.length).toBe(5); // 2 cards + subscribe + restore + cancel

      // Focus the last element
      const cancelBtn = dialog.querySelector<HTMLElement>('[data-testid="cancel-btn"]')!;
      cancelBtn.focus();

      // Tab should not escape
      const event = createTabEvent();
      dialog.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).not.toBe(backgroundButton);
    });

    it('should auto-focus the first tabbable element', async () => {
      dialog = createPaywallDialog();
      backgroundButton.focus();

      const enabled = ref(true);
      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();
      await nextTick();

      const firstCard = dialog.querySelector<HTMLElement>('[data-testid="annual-plan"]');
      expect(document.activeElement).toBe(firstCard);
    });
  });

  describe('CommandPalette focus boundary', () => {
    it('should trap focus within the command palette', async () => {
      dialog = createCommandPalette();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();

      const tabbable = getTabbableElements(dialog);
      expect(tabbable.length).toBe(4); // input + 3 command items

      // Focus the last command item
      const lastItem = dialog.querySelector<HTMLElement>('[data-testid="cmd-settings"]')!;
      lastItem.focus();

      // Tab should wrap to first element (input), not escape
      const event = createTabEvent();
      dialog.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should auto-focus the search input', async () => {
      dialog = createCommandPalette();
      backgroundButton.focus();

      const enabled = ref(true);
      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();
      await nextTick();

      const searchInput = dialog.querySelector<HTMLElement>('[data-testid="search-input"]');
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('AlertDialog focus boundary', () => {
    it('should trap focus within alert dialog', async () => {
      dialog = createAlertDialog();
      const enabled = ref(true);

      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();

      const tabbable = getTabbableElements(dialog);
      expect(tabbable.length).toBe(2); // cancel + confirm

      // Focus the confirm button (last)
      const confirmBtn = dialog.querySelector<HTMLElement>('[data-testid="alert-confirm"]')!;
      confirmBtn.focus();

      // Tab should not escape
      const event = createTabEvent();
      dialog.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('should restore focus when alert dialog closes', async () => {
      dialog = createAlertDialog();
      backgroundButton.focus();

      const enabled = ref(true);
      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();
      await nextTick();

      // Focus is in the dialog
      expect(dialog.contains(document.activeElement)).toBe(true);

      // Close the dialog
      enabled.value = false;
      await nextTick();
      await nextTick();
      await nextTick();

      // Focus should return to the background button (trigger)
      expect(document.activeElement).toBe(backgroundButton);
    });
  });

  describe('nested modals', () => {
    let innerDialog: HTMLElement;

    afterEach(() => {
      innerDialog?.remove();
    });

    it('should maintain separate focus trap scopes for nested dialogs', async () => {
      // Open outer dialog
      dialog = createPaywallDialog();
      const outerEnabled = ref(true);
      const outer = useFocusTrap({ enabled: outerEnabled });
      outer.containerRef.value = dialog;
      await nextTick();
      await nextTick();

      expect(outer.isActive.value).toBe(true);

      // Open inner dialog (e.g., confirmation over paywall)
      innerDialog = createAlertDialog();
      const innerEnabled = ref(true);
      const inner = useFocusTrap({ enabled: innerEnabled });
      inner.containerRef.value = innerDialog;
      await nextTick();
      await nextTick();

      expect(inner.isActive.value).toBe(true);

      // Tab in the inner dialog should stay within it
      const confirmBtn = innerDialog.querySelector<HTMLElement>('[data-testid="alert-confirm"]')!;
      confirmBtn.focus();
      const event = createTabEvent();
      innerDialog.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);

      // Close inner dialog
      innerEnabled.value = false;
      await nextTick();
      await nextTick();

      expect(inner.isActive.value).toBe(false);
      expect(outer.isActive.value).toBe(true);

      // Tab in the outer dialog should still be trapped
      const cancelBtn = dialog.querySelector<HTMLElement>('[data-testid="cancel-btn"]')!;
      cancelBtn.focus();
      const event2 = createTabEvent();
      dialog.dispatchEvent(event2);
      expect(event2.defaultPrevented).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle dialog with only one focusable element', async () => {
      dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      const singleBtn = document.createElement('button');
      singleBtn.textContent = 'Only';
      singleBtn.setAttribute('data-testid', 'single');
      dialog.appendChild(singleBtn);
      document.body.appendChild(dialog);

      const enabled = ref(true);
      const { containerRef } = useFocusTrap({ enabled });
      containerRef.value = dialog;
      await nextTick();
      await nextTick();

      singleBtn.focus();

      // Tab should be prevented (single element, loops to itself)
      const tabEvent = createTabEvent();
      dialog.dispatchEvent(tabEvent);
      expect(tabEvent.defaultPrevented).toBe(true);

      // Shift+Tab should also be prevented
      const shiftTabEvent = createTabEvent(true);
      dialog.dispatchEvent(shiftTabEvent);
      expect(shiftTabEvent.defaultPrevented).toBe(true);
    });

    it('should handle rapid open/close cycles', async () => {
      dialog = createSessionErrorDialog();
      const enabled = ref(false);
      const { containerRef, isActive } = useFocusTrap({ enabled });
      containerRef.value = dialog;

      // Rapid toggle
      enabled.value = true;
      await nextTick();
      enabled.value = false;
      await nextTick();
      enabled.value = true;
      await nextTick();
      await nextTick();

      expect(isActive.value).toBe(true);
    });
  });
});
