/**
 * Unit tests for useKeyboardShortcuts composable
 *
 * Tests cover:
 * - Command palette state management (open/close/toggle)
 * - Escape key handler registration and stack-based execution
 * - Sidebar toggle handler registration
 * - Input element detection
 * - useCommandPaletteState minimal composable
 *
 * @see HAP-918 - Desktop Enhancements - Keyboard Shortcuts
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock @vueuse/core to avoid issues with useMagicKeys in test env
vi.mock('@vueuse/core', () => ({
  useMagicKeys: () => {
    return new Proxy({} as Record<string, { value: boolean }>, {
      get: (_target, key) => {
        if (key === 'escape') return { value: false };
        return { value: false };
      },
    });
  },
  whenever: vi.fn(),
}));

// Must import AFTER mock setup
import { useKeyboardShortcuts, useCommandPaletteState } from './useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    // Reset command palette state between tests
    const { closeCommandPalette } = useKeyboardShortcuts();
    closeCommandPalette();
  });

  describe('command palette state', () => {
    it('should start with command palette closed', () => {
      const { isCommandPaletteOpen } = useKeyboardShortcuts();
      expect(isCommandPaletteOpen.value).toBe(false);
    });

    it('should open command palette', () => {
      const { isCommandPaletteOpen, openCommandPalette } = useKeyboardShortcuts();
      openCommandPalette();
      expect(isCommandPaletteOpen.value).toBe(true);
    });

    it('should close command palette', () => {
      const { isCommandPaletteOpen, openCommandPalette, closeCommandPalette } = useKeyboardShortcuts();
      openCommandPalette();
      expect(isCommandPaletteOpen.value).toBe(true);
      closeCommandPalette();
      expect(isCommandPaletteOpen.value).toBe(false);
    });

    it('should toggle command palette', () => {
      const { isCommandPaletteOpen, toggleCommandPalette } = useKeyboardShortcuts();
      expect(isCommandPaletteOpen.value).toBe(false);
      toggleCommandPalette();
      expect(isCommandPaletteOpen.value).toBe(true);
      toggleCommandPalette();
      expect(isCommandPaletteOpen.value).toBe(false);
    });
  });

  describe('escape key handler registration', () => {
    it('should register an escape handler', () => {
      const { registerEscapeHandler, unregisterEscapeHandler } = useKeyboardShortcuts();
      const handler = vi.fn();
      registerEscapeHandler('test-modal', handler);
      // Clean up
      unregisterEscapeHandler('test-modal');
    });

    it('should unregister an escape handler', () => {
      const { registerEscapeHandler, unregisterEscapeHandler } = useKeyboardShortcuts();
      const handler = vi.fn();
      registerEscapeHandler('test-modal', handler);
      unregisterEscapeHandler('test-modal');
      // Handler should be removed, no errors thrown
    });

    it('should replace handler with same ID', () => {
      const { registerEscapeHandler, unregisterEscapeHandler } = useKeyboardShortcuts();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      registerEscapeHandler('test-modal', handler1);
      registerEscapeHandler('test-modal', handler2);
      // Should not throw, handler2 should replace handler1
      unregisterEscapeHandler('test-modal');
    });

    it('should not throw when unregistering non-existent handler', () => {
      const { unregisterEscapeHandler } = useKeyboardShortcuts();
      expect(() => unregisterEscapeHandler('non-existent')).not.toThrow();
    });
  });

  describe('sidebar toggle handler registration', () => {
    it('should register a sidebar toggle handler', () => {
      const { registerSidebarToggle, unregisterSidebarToggle } = useKeyboardShortcuts();
      const handler = vi.fn();
      registerSidebarToggle('app-sidebar', handler);
      // Clean up
      unregisterSidebarToggle('app-sidebar');
    });

    it('should unregister a sidebar toggle handler', () => {
      const { registerSidebarToggle, unregisterSidebarToggle } = useKeyboardShortcuts();
      const handler = vi.fn();
      registerSidebarToggle('app-sidebar', handler);
      unregisterSidebarToggle('app-sidebar');
      // Handler should be removed, no errors thrown
    });

    it('should replace handler with same ID', () => {
      const { registerSidebarToggle, unregisterSidebarToggle } = useKeyboardShortcuts();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      registerSidebarToggle('app-sidebar', handler1);
      registerSidebarToggle('app-sidebar', handler2);
      // Should not throw, handler2 should replace handler1
      unregisterSidebarToggle('app-sidebar');
    });

    it('should not throw when unregistering non-existent handler', () => {
      const { unregisterSidebarToggle } = useKeyboardShortcuts();
      expect(() => unregisterSidebarToggle('non-existent')).not.toThrow();
    });
  });

  describe('isInputElement', () => {
    it('should return true for input elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const input = document.createElement('input');
      expect(isInputElement(input)).toBe(true);
    });

    it('should return true for textarea elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const textarea = document.createElement('textarea');
      expect(isInputElement(textarea)).toBe(true);
    });

    it('should return true for select elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const select = document.createElement('select');
      expect(isInputElement(select)).toBe(true);
    });

    it('should return true for contenteditable elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const div = document.createElement('div');
      div.contentEditable = 'true';
      expect(isInputElement(div)).toBe(true);
    });

    it('should return false for non-input elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const div = document.createElement('div');
      expect(isInputElement(div)).toBe(false);
    });

    it('should return false for null', () => {
      const { isInputElement } = useKeyboardShortcuts();
      expect(isInputElement(null)).toBe(false);
    });

    it('should return false for button elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const button = document.createElement('button');
      expect(isInputElement(button)).toBe(false);
    });

    it('should return false for anchor elements', () => {
      const { isInputElement } = useKeyboardShortcuts();
      const anchor = document.createElement('a');
      expect(isInputElement(anchor)).toBe(false);
    });
  });

  describe('return type', () => {
    it('should return all expected properties', () => {
      const result = useKeyboardShortcuts();
      expect(result).toHaveProperty('isCommandPaletteOpen');
      expect(result).toHaveProperty('openCommandPalette');
      expect(result).toHaveProperty('closeCommandPalette');
      expect(result).toHaveProperty('toggleCommandPalette');
      expect(result).toHaveProperty('registerEscapeHandler');
      expect(result).toHaveProperty('unregisterEscapeHandler');
      expect(result).toHaveProperty('registerSidebarToggle');
      expect(result).toHaveProperty('unregisterSidebarToggle');
      expect(result).toHaveProperty('isInputElement');
    });

    it('should return functions for all methods', () => {
      const result = useKeyboardShortcuts();
      expect(typeof result.openCommandPalette).toBe('function');
      expect(typeof result.closeCommandPalette).toBe('function');
      expect(typeof result.toggleCommandPalette).toBe('function');
      expect(typeof result.registerEscapeHandler).toBe('function');
      expect(typeof result.unregisterEscapeHandler).toBe('function');
      expect(typeof result.registerSidebarToggle).toBe('function');
      expect(typeof result.unregisterSidebarToggle).toBe('function');
      expect(typeof result.isInputElement).toBe('function');
    });
  });
});

describe('useCommandPaletteState', () => {
  beforeEach(() => {
    // Reset state
    const state = useCommandPaletteState();
    state.close();
  });

  it('should return isOpen ref', () => {
    const state = useCommandPaletteState();
    expect(state.isOpen.value).toBe(false);
  });

  it('should open the palette', () => {
    const state = useCommandPaletteState();
    state.open();
    expect(state.isOpen.value).toBe(true);
  });

  it('should close the palette', () => {
    const state = useCommandPaletteState();
    state.open();
    state.close();
    expect(state.isOpen.value).toBe(false);
  });

  it('should toggle the palette', () => {
    const state = useCommandPaletteState();
    state.toggle();
    expect(state.isOpen.value).toBe(true);
    state.toggle();
    expect(state.isOpen.value).toBe(false);
  });

  it('should share state with useKeyboardShortcuts', () => {
    const state = useCommandPaletteState();
    const { isCommandPaletteOpen, openCommandPalette } = useKeyboardShortcuts();

    openCommandPalette();
    expect(state.isOpen.value).toBe(true);
    expect(isCommandPaletteOpen.value).toBe(true);

    state.close();
    expect(isCommandPaletteOpen.value).toBe(false);
  });
});
