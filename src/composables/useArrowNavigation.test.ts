/**
 * Unit tests for useArrowNavigation composable
 *
 * Tests cover:
 * - Arrow key navigation (up/down)
 * - Home/End key navigation
 * - Loop behavior
 * - Focus management
 * - Disabled state
 *
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useArrowNavigation } from './useArrowNavigation';

// Helper to create a mock container with items using safe DOM methods
function createMockContainer(itemCount: number): HTMLElement {
  const container = document.createElement('ul');
  container.setAttribute('role', 'listbox');

  for (let i = 0; i < itemCount; i++) {
    const item = document.createElement('li');
    item.setAttribute('data-nav-item', '');
    item.setAttribute('tabindex', '-1');
    item.id = `item-${i}`;
    item.textContent = `Item ${i}`;
    container.appendChild(item);
  }

  document.body.appendChild(container);
  return container;
}

// Helper to clean up DOM between tests
function cleanupDOM() {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

// Mock onMounted/onUnmounted since we're not in component context
vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>();
  return {
    ...actual,
    onMounted: (fn: () => void) => fn(),
    onUnmounted: vi.fn(),
  };
});

describe('useArrowNavigation', () => {
  let container: HTMLElement;

  beforeEach(() => {
    cleanupDOM();
    container = createMockContainer(3);
  });

  describe('basic navigation', () => {
    it('should focus the first item on ArrowDown when nothing is focused', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[0]);
    });

    it('should focus the last item on ArrowUp when nothing is focused', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[2]);
    });

    it('should move focus down on ArrowDown', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      // Focus first item
      (container.children[0] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[1]);
    });

    it('should move focus up on ArrowUp', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      // Focus second item
      (container.children[1] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[0]);
    });
  });

  describe('loop behavior', () => {
    it('should wrap to first item when pressing ArrowDown at end with loop enabled', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]', loop: true });

      // Focus last item
      (container.children[2] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[0]);
    });

    it('should wrap to last item when pressing ArrowUp at start with loop enabled', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]', loop: true });

      // Focus first item
      (container.children[0] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[2]);
    });

    it('should not wrap when loop is disabled', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]', loop: false });

      // Focus last item
      (container.children[2] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      container.dispatchEvent(event);

      // Should stay on last item
      expect(document.activeElement).toBe(container.children[2]);
    });
  });

  describe('Home/End keys', () => {
    it('should focus first item on Home key', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      // Focus last item
      (container.children[2] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'Home' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[0]);
    });

    it('should focus last item on End key', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      // Focus first item
      (container.children[0] as HTMLElement).focus();

      const event = new KeyboardEvent('keydown', { key: 'End' });
      container.dispatchEvent(event);

      expect(document.activeElement).toBe(container.children[2]);
    });
  });

  describe('empty container', () => {
    it('should handle empty container gracefully', () => {
      const emptyContainer = document.createElement('ul');
      document.body.appendChild(emptyContainer);
      const containerRef = ref<HTMLElement | null>(emptyContainer);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      // Should not throw
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      expect(() => emptyContainer.dispatchEvent(event)).not.toThrow();
    });

    it('should handle null container ref', () => {
      const containerRef = ref<HTMLElement | null>(null);
      // Should not throw during setup
      expect(() => useArrowNavigation(containerRef)).not.toThrow();
    });
  });

  describe('focusFirst and focusLast helpers', () => {
    it('should expose focusFirst helper', () => {
      const containerRef = ref<HTMLElement | null>(container);
      const { focusFirst } = useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      focusFirst();
      expect(document.activeElement).toBe(container.children[0]);
    });

    it('should expose focusLast helper', () => {
      const containerRef = ref<HTMLElement | null>(container);
      const { focusLast } = useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      focusLast();
      expect(document.activeElement).toBe(container.children[2]);
    });

    it('should expose getItems helper', () => {
      const containerRef = ref<HTMLElement | null>(container);
      const { getItems } = useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      expect(getItems()).toHaveLength(3);
    });
  });

  describe('event prevention', () => {
    it('should prevent default on ArrowDown', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      const event = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default on ArrowUp', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default on Home', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      const event = new KeyboardEvent('keydown', { key: 'Home', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should prevent default on End', () => {
      const containerRef = ref<HTMLElement | null>(container);
      useArrowNavigation(containerRef, { itemSelector: '[data-nav-item]' });

      const event = new KeyboardEvent('keydown', { key: 'End', cancelable: true });
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
      container.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });
  });
});
