/**
 * Unit tests for the Settings store
 *
 * Tests Pinia store functionality for:
 * - Theme preference management
 * - Notification settings
 * - Display settings
 * - Settings persistence
 *
 * @see HAP-877 - Increase test coverage to 80%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore } from '@/stores/settings';

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should have default values initially', () => {
      const store = useSettingsStore();

      expect(store.theme).toBe('system');
      expect(store.notifications.enabled).toBe(true);
      expect(store.notifications.messages).toBe(true);
      expect(store.notifications.sessionActivity).toBe(true);
      expect(store.notifications.machineStatus).toBe(false);
      expect(store.notifications.sounds).toBe(true);
      expect(store.display.showPreviews).toBe(true);
      expect(store.display.compactMode).toBe(false);
      expect(store.display.showTimestamps).toBe(true);
      expect(store.display.sortOrder).toBe('recent');
      expect(store.version).toBe(0);
      expect(store.isLoaded).toBe(false);
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      const store = useSettingsStore();

      store.setTheme('light');

      expect(store.theme).toBe('light');
    });

    it('should set theme to dark', () => {
      const store = useSettingsStore();

      store.setTheme('dark');

      expect(store.theme).toBe('dark');
    });

    it('should set theme to system', () => {
      const store = useSettingsStore();

      store.setTheme('dark');
      store.setTheme('system');

      expect(store.theme).toBe('system');
    });
  });

  describe('isDarkMode', () => {
    it('should return true when theme is dark', () => {
      const store = useSettingsStore();

      store.setTheme('dark');

      expect(store.isDarkMode).toBe(true);
    });

    it('should return false when theme is light', () => {
      const store = useSettingsStore();

      store.setTheme('light');

      expect(store.isDarkMode).toBe(false);
    });

    it('should use system preference when theme is system', () => {
      const store = useSettingsStore();

      // Mock matchMedia for system preference
      const mockMatchMedia = vi.fn().mockReturnValue({ matches: true });
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      store.setTheme('system');

      expect(store.isDarkMode).toBe(true);
      expect(mockMatchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    });

    it('should return false for system theme when prefers-color-scheme is light', () => {
      const store = useSettingsStore();

      const mockMatchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: mockMatchMedia,
      });

      store.setTheme('system');

      expect(store.isDarkMode).toBe(false);
    });
  });

  describe('toggleNotifications', () => {
    it('should toggle notifications off', () => {
      const store = useSettingsStore();

      expect(store.notifications.enabled).toBe(true);
      store.toggleNotifications();
      expect(store.notifications.enabled).toBe(false);
    });

    it('should toggle notifications on', () => {
      const store = useSettingsStore();

      store.toggleNotifications(); // Off
      store.toggleNotifications(); // On

      expect(store.notifications.enabled).toBe(true);
    });
  });

  describe('updateNotifications', () => {
    it('should update partial notification settings', () => {
      const store = useSettingsStore();

      store.updateNotifications({ messages: false, sounds: false });

      expect(store.notifications.messages).toBe(false);
      expect(store.notifications.sounds).toBe(false);
      expect(store.notifications.enabled).toBe(true); // Unchanged
    });

    it('should update all notification settings', () => {
      const store = useSettingsStore();

      store.updateNotifications({
        enabled: false,
        messages: false,
        sessionActivity: false,
        machineStatus: true,
        sounds: false,
      });

      expect(store.notifications.enabled).toBe(false);
      expect(store.notifications.messages).toBe(false);
      expect(store.notifications.sessionActivity).toBe(false);
      expect(store.notifications.machineStatus).toBe(true);
      expect(store.notifications.sounds).toBe(false);
    });
  });

  describe('updateDisplay', () => {
    it('should update partial display settings', () => {
      const store = useSettingsStore();

      store.updateDisplay({ compactMode: true, sortOrder: 'name' });

      expect(store.display.compactMode).toBe(true);
      expect(store.display.sortOrder).toBe('name');
      expect(store.display.showPreviews).toBe(true); // Unchanged
    });

    it('should update all display settings', () => {
      const store = useSettingsStore();

      store.updateDisplay({
        showPreviews: false,
        compactMode: true,
        showTimestamps: false,
        sortOrder: 'created',
      });

      expect(store.display.showPreviews).toBe(false);
      expect(store.display.compactMode).toBe(true);
      expect(store.display.showTimestamps).toBe(false);
      expect(store.display.sortOrder).toBe('created');
    });
  });

  describe('loadSettings', () => {
    it('should load theme from settings', () => {
      const store = useSettingsStore();

      store.loadSettings({ theme: 'dark' });

      expect(store.theme).toBe('dark');
      expect(store.isLoaded).toBe(true);
    });

    it('should load notification settings', () => {
      const store = useSettingsStore();

      store.loadSettings({
        notifications: { enabled: false, messages: false, sessionActivity: false, machineStatus: true, sounds: false },
      });

      expect(store.notifications.enabled).toBe(false);
      expect(store.notifications.machineStatus).toBe(true);
    });

    it('should load display settings', () => {
      const store = useSettingsStore();

      store.loadSettings({
        display: { showPreviews: false, compactMode: true, showTimestamps: false, sortOrder: 'name' },
      });

      expect(store.display.compactMode).toBe(true);
      expect(store.display.sortOrder).toBe('name');
    });

    it('should load version', () => {
      const store = useSettingsStore();

      store.loadSettings({ version: 42 });

      expect(store.version).toBe(42);
    });

    it('should merge partial settings with defaults', () => {
      const store = useSettingsStore();

      store.loadSettings({
        notifications: { enabled: false } as any,
      });

      expect(store.notifications.enabled).toBe(false);
      expect(store.notifications.messages).toBe(true); // Default value
    });

    it('should mark as loaded', () => {
      const store = useSettingsStore();

      expect(store.isLoaded).toBe(false);
      store.loadSettings({});
      expect(store.isLoaded).toBe(true);
    });
  });

  describe('incrementVersion', () => {
    it('should increment version', () => {
      const store = useSettingsStore();

      expect(store.version).toBe(0);
      store.incrementVersion();
      expect(store.version).toBe(1);
      store.incrementVersion();
      expect(store.version).toBe(2);
    });
  });

  describe('allSettings', () => {
    it('should return all settings as a single object', () => {
      const store = useSettingsStore();

      store.setTheme('dark');
      store.updateNotifications({ sounds: false });
      store.updateDisplay({ compactMode: true });

      const settings = store.allSettings;

      expect(settings.theme).toBe('dark');
      expect(settings.notifications.sounds).toBe(false);
      expect(settings.display.compactMode).toBe(true);
      expect(settings.version).toBe(0);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      const store = useSettingsStore();

      // Modify all settings
      store.setTheme('dark');
      store.updateNotifications({ enabled: false, messages: false });
      store.updateDisplay({ compactMode: true, sortOrder: 'name' });
      store.loadSettings({ version: 10 });

      // Reset
      store.resetToDefaults();

      expect(store.theme).toBe('system');
      expect(store.notifications.enabled).toBe(true);
      expect(store.notifications.messages).toBe(true);
      expect(store.display.compactMode).toBe(false);
      expect(store.display.sortOrder).toBe('recent');
      expect(store.version).toBe(0);
    });
  });

  describe('$reset', () => {
    it('should reset store to initial state', () => {
      const store = useSettingsStore();

      store.setTheme('dark');
      store.loadSettings({ version: 5 });

      store.$reset();

      expect(store.theme).toBe('system');
      expect(store.version).toBe(0);
      expect(store.isLoaded).toBe(false);
    });
  });
});
