/**
 * Unit tests for the UI store
 *
 * Tests Pinia store functionality for:
 * - Modal management
 * - Toast notifications
 * - Sidebar state
 * - Loading state
 * - Navigation path
 *
 * @see HAP-877 - Increase test coverage to 80%
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from '@/stores/ui';

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have default values initially', () => {
      const store = useUiStore();

      expect(store.activeModal).toBeNull();
      expect(store.toastList).toEqual([]);
      expect(store.sidebarState).toBe('expanded');
      expect(store.isLoading).toBe(false);
      expect(store.loadingMessage).toBeNull();
      expect(store.currentPath).toEqual([]);
      expect(store.isMobileMenuOpen).toBe(false);
      expect(store.isCommandPaletteOpen).toBe(false);
    });
  });

  describe('Modal Management', () => {
    describe('openModal', () => {
      it('should open a modal without data', () => {
        const store = useUiStore();

        store.openModal('settings');

        expect(store.activeModal).toEqual({ type: 'settings', data: undefined });
        expect(store.hasActiveModal).toBe(true);
      });

      it('should open a modal with data', () => {
        const store = useUiStore();
        const data = { sessionId: 'session-123' };

        store.openModal('session-details', data);

        expect(store.activeModal).toEqual({ type: 'session-details', data });
      });

      it('should replace existing modal', () => {
        const store = useUiStore();

        store.openModal('settings');
        store.openModal('profile');

        expect(store.activeModal?.type).toBe('profile');
      });
    });

    describe('closeModal', () => {
      it('should close the modal', () => {
        const store = useUiStore();

        store.openModal('settings');
        store.closeModal();

        expect(store.activeModal).toBeNull();
        expect(store.hasActiveModal).toBe(false);
      });

      it('should be safe to call when no modal is open', () => {
        const store = useUiStore();

        expect(() => store.closeModal()).not.toThrow();
        expect(store.activeModal).toBeNull();
      });
    });
  });

  describe('Toast Notifications', () => {
    describe('showToast', () => {
      it('should add a toast', () => {
        const store = useUiStore();

        const id = store.showToast({ type: 'success', message: 'Test message' });

        expect(id).toMatch(/^toast-/);
        expect(store.toastList.length).toBe(1);
        expect(store.toastList[0]?.message).toBe('Test message');
      });

      it('should auto-dismiss toast after duration', () => {
        const store = useUiStore();

        store.showToast({ type: 'success', message: 'Test', duration: 3000 });
        expect(store.toastList.length).toBe(1);

        vi.advanceTimersByTime(3000);
        expect(store.toastList.length).toBe(0);
      });

      it('should not auto-dismiss toast with duration 0', () => {
        const store = useUiStore();

        store.showToast({ type: 'success', message: 'Test', duration: 0 });

        vi.advanceTimersByTime(10000);
        expect(store.toastList.length).toBe(1);
      });

      it('should use default duration of 5000ms', () => {
        const store = useUiStore();

        store.showToast({ type: 'info', message: 'Test' });

        vi.advanceTimersByTime(4999);
        expect(store.toastList.length).toBe(1);

        vi.advanceTimersByTime(1);
        expect(store.toastList.length).toBe(0);
      });

      it('should support title and action', () => {
        const store = useUiStore();
        const action = { label: 'Undo', onClick: vi.fn() };

        store.showToast({ type: 'warning', message: 'Deleted', title: 'Item Removed', action });

        const toast = store.toastList[0];
        expect(toast?.title).toBe('Item Removed');
        expect(toast?.action?.label).toBe('Undo');
      });
    });

    describe('dismissToast', () => {
      it('should dismiss a specific toast', () => {
        const store = useUiStore();

        const id1 = store.showToast({ type: 'success', message: 'One', duration: 0 });
        store.showToast({ type: 'info', message: 'Two', duration: 0 });

        store.dismissToast(id1);

        expect(store.toastList.length).toBe(1);
        expect(store.toastList[0]?.message).toBe('Two');
      });

      it('should be safe to dismiss non-existent toast', () => {
        const store = useUiStore();

        expect(() => store.dismissToast('non-existent')).not.toThrow();
      });
    });

    describe('clearToasts', () => {
      it('should clear all toasts', () => {
        const store = useUiStore();

        store.showToast({ type: 'success', message: 'One', duration: 0 });
        store.showToast({ type: 'info', message: 'Two', duration: 0 });
        store.showToast({ type: 'warning', message: 'Three', duration: 0 });

        store.clearToasts();

        expect(store.toastList.length).toBe(0);
      });
    });

    describe('convenience methods', () => {
      it('success should create success toast', () => {
        const store = useUiStore();

        store.success('Success message', 'Success Title');

        expect(store.toastList[0]?.type).toBe('success');
        expect(store.toastList[0]?.message).toBe('Success message');
        expect(store.toastList[0]?.title).toBe('Success Title');
      });

      it('error should create error toast with longer duration', () => {
        const store = useUiStore();

        store.error('Error message', 'Error Title');

        expect(store.toastList[0]?.type).toBe('error');

        // Error toast should have 8s duration
        vi.advanceTimersByTime(7999);
        expect(store.toastList.length).toBe(1);

        vi.advanceTimersByTime(1);
        expect(store.toastList.length).toBe(0);
      });

      it('warning should create warning toast', () => {
        const store = useUiStore();

        store.warning('Warning message');

        expect(store.toastList[0]?.type).toBe('warning');
      });

      it('info should create info toast', () => {
        const store = useUiStore();

        store.info('Info message');

        expect(store.toastList[0]?.type).toBe('info');
      });
    });
  });

  describe('Sidebar State', () => {
    describe('setSidebarState', () => {
      it('should set sidebar to collapsed', () => {
        const store = useUiStore();

        store.setSidebarState('collapsed');

        expect(store.sidebarState).toBe('collapsed');
        expect(store.isSidebarExpanded).toBe(false);
        expect(store.isSidebarVisible).toBe(true);
      });

      it('should set sidebar to hidden', () => {
        const store = useUiStore();

        store.setSidebarState('hidden');

        expect(store.sidebarState).toBe('hidden');
        expect(store.isSidebarVisible).toBe(false);
      });

      it('should set sidebar to expanded', () => {
        const store = useUiStore();

        store.setSidebarState('collapsed');
        store.setSidebarState('expanded');

        expect(store.sidebarState).toBe('expanded');
        expect(store.isSidebarExpanded).toBe(true);
      });
    });

    describe('toggleSidebar', () => {
      it('should toggle from expanded to collapsed', () => {
        const store = useUiStore();

        expect(store.sidebarState).toBe('expanded');
        store.toggleSidebar();
        expect(store.sidebarState).toBe('collapsed');
      });

      it('should toggle from collapsed to expanded', () => {
        const store = useUiStore();

        store.setSidebarState('collapsed');
        store.toggleSidebar();
        expect(store.sidebarState).toBe('expanded');
      });
    });
  });

  describe('Loading State', () => {
    describe('setLoading', () => {
      it('should set loading state', () => {
        const store = useUiStore();

        store.setLoading(true);

        expect(store.isLoading).toBe(true);
        expect(store.loadingMessage).toBeNull();
      });

      it('should set loading state with message', () => {
        const store = useUiStore();

        store.setLoading(true, 'Loading data...');

        expect(store.isLoading).toBe(true);
        expect(store.loadingMessage).toBe('Loading data...');
      });

      it('should clear loading state', () => {
        const store = useUiStore();

        store.setLoading(true, 'Loading...');
        store.setLoading(false);

        expect(store.isLoading).toBe(false);
        expect(store.loadingMessage).toBeNull();
      });
    });
  });

  describe('Navigation', () => {
    describe('setCurrentPath', () => {
      it('should set current path', () => {
        const store = useUiStore();

        store.setCurrentPath(['home', 'sessions', 'session-123']);

        expect(store.currentPath).toEqual(['home', 'sessions', 'session-123']);
      });

      it('should replace existing path', () => {
        const store = useUiStore();

        store.setCurrentPath(['home']);
        store.setCurrentPath(['settings', 'account']);

        expect(store.currentPath).toEqual(['settings', 'account']);
      });
    });
  });

  describe('Mobile Menu', () => {
    describe('toggleMobileMenu', () => {
      it('should toggle mobile menu open', () => {
        const store = useUiStore();

        expect(store.isMobileMenuOpen).toBe(false);
        store.toggleMobileMenu();
        expect(store.isMobileMenuOpen).toBe(true);
      });

      it('should toggle mobile menu closed', () => {
        const store = useUiStore();

        store.toggleMobileMenu();
        store.toggleMobileMenu();

        expect(store.isMobileMenuOpen).toBe(false);
      });
    });
  });

  describe('Command Palette', () => {
    describe('toggleCommandPalette', () => {
      it('should toggle command palette open', () => {
        const store = useUiStore();

        expect(store.isCommandPaletteOpen).toBe(false);
        store.toggleCommandPalette();
        expect(store.isCommandPaletteOpen).toBe(true);
      });

      it('should toggle command palette closed', () => {
        const store = useUiStore();

        store.toggleCommandPalette();
        store.toggleCommandPalette();

        expect(store.isCommandPaletteOpen).toBe(false);
      });
    });
  });

  describe('$reset', () => {
    it('should reset all state to initial values', () => {
      const store = useUiStore();

      // Set various states
      store.openModal('settings');
      store.showToast({ type: 'success', message: 'Test', duration: 0 });
      store.setSidebarState('collapsed');
      store.setLoading(true, 'Loading...');
      store.setCurrentPath(['home']);
      store.toggleMobileMenu();
      store.toggleCommandPalette();

      // Reset
      store.$reset();

      expect(store.activeModal).toBeNull();
      expect(store.toastList.length).toBe(0);
      expect(store.sidebarState).toBe('expanded');
      expect(store.isLoading).toBe(false);
      expect(store.loadingMessage).toBeNull();
      expect(store.currentPath).toEqual([]);
      expect(store.isMobileMenuOpen).toBe(false);
      expect(store.isCommandPaletteOpen).toBe(false);
    });
  });
});
