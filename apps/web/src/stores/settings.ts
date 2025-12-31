/**
 * Settings Store
 *
 * Manages user preferences and application settings.
 * Settings are persisted locally and synced with server.
 *
 * @example
 * ```typescript
 * const settings = useSettingsStore();
 * settings.setTheme('dark');
 * settings.toggleNotifications();
 * ```
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Theme preference
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Notification preferences
 */
export interface NotificationSettings {
    /** Enable push notifications */
    enabled: boolean;
    /** Notify on new messages */
    messages: boolean;
    /** Notify on session activity */
    sessionActivity: boolean;
    /** Notify on machine status changes */
    machineStatus: boolean;
    /** Play sounds for notifications */
    sounds: boolean;
}

/**
 * Display preferences
 */
export interface DisplaySettings {
    /** Show session previews in list */
    showPreviews: boolean;
    /** Compact mode for lists */
    compactMode: boolean;
    /** Show timestamps */
    showTimestamps: boolean;
    /** Default sort order */
    sortOrder: 'recent' | 'created' | 'name';
}

/**
 * All user settings
 */
export interface UserSettings {
    theme: ThemeMode;
    notifications: NotificationSettings;
    display: DisplaySettings;
    /** Server-synced settings version */
    version: number;
}

const defaultNotifications: NotificationSettings = {
    enabled: true,
    messages: true,
    sessionActivity: true,
    machineStatus: false,
    sounds: true,
};

const defaultDisplay: DisplaySettings = {
    showPreviews: true,
    compactMode: false,
    showTimestamps: true,
    sortOrder: 'recent',
};

const defaultSettings: UserSettings = {
    theme: 'system',
    notifications: defaultNotifications,
    display: defaultDisplay,
    version: 0,
};

export const useSettingsStore = defineStore('settings', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /** Current theme preference */
    const theme = ref<ThemeMode>(defaultSettings.theme);

    /** Notification settings */
    const notifications = ref<NotificationSettings>({ ...defaultNotifications });

    /** Display settings */
    const display = ref<DisplaySettings>({ ...defaultDisplay });

    /** Settings version (for sync) */
    const version = ref(0);

    /** Whether settings have been loaded */
    const isLoaded = ref(false);

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether dark theme should be applied */
    const isDarkMode = computed(() => {
        if (theme.value === 'dark') return true;
        if (theme.value === 'light') return false;
        // System preference
        if (typeof window !== 'undefined') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    /** All settings as a single object */
    const allSettings = computed<UserSettings>(() => ({
        theme: theme.value,
        notifications: notifications.value,
        display: display.value,
        version: version.value,
    }));

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Set theme preference
     */
    function setTheme(newTheme: ThemeMode) {
        theme.value = newTheme;
    }

    /**
     * Toggle notifications on/off
     */
    function toggleNotifications() {
        notifications.value.enabled = !notifications.value.enabled;
    }

    /**
     * Update notification settings
     */
    function updateNotifications(updates: Partial<NotificationSettings>) {
        notifications.value = { ...notifications.value, ...updates };
    }

    /**
     * Update display settings
     */
    function updateDisplay(updates: Partial<DisplaySettings>) {
        display.value = { ...display.value, ...updates };
    }

    /**
     * Load settings from storage or server
     */
    function loadSettings(settings: Partial<UserSettings>) {
        if (settings.theme) theme.value = settings.theme;
        if (settings.notifications) {
            notifications.value = { ...defaultNotifications, ...settings.notifications };
        }
        if (settings.display) {
            display.value = { ...defaultDisplay, ...settings.display };
        }
        if (settings.version !== undefined) version.value = settings.version;
        isLoaded.value = true;
    }

    /**
     * Increment version (for sync)
     */
    function incrementVersion() {
        version.value++;
    }

    /**
     * Reset to defaults
     */
    function resetToDefaults() {
        theme.value = defaultSettings.theme;
        notifications.value = { ...defaultNotifications };
        display.value = { ...defaultDisplay };
        version.value = 0;
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        resetToDefaults();
        isLoaded.value = false;
    }

    return {
        // State
        theme,
        notifications,
        display,
        version,
        isLoaded,
        // Getters
        isDarkMode,
        allSettings,
        // Actions
        setTheme,
        toggleNotifications,
        updateNotifications,
        updateDisplay,
        loadSettings,
        incrementVersion,
        resetToDefaults,
        $reset,
    };
});
