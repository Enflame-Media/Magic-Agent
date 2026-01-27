/**
 * Store Access Composable
 *
 * Provides convenient access to all stores in a single call.
 * Useful when a component needs multiple stores.
 *
 * @example
 * ```typescript
 * const { auth, sessions, sync } = useStores();
 *
 * if (auth.isAuthenticated && sync.isConnected) {
 *     console.log(`${sessions.count} sessions available`);
 * }
 * ```
 */

import { useAuthStore } from '@/stores/auth';
import { useSyncStore } from '@/stores/sync';
import { useSessionsStore } from '@/stores/sessions';
import { useMachinesStore } from '@/stores/machines';
import { useMessagesStore } from '@/stores/messages';
import { useSettingsStore } from '@/stores/settings';
import { useUiStore } from '@/stores/ui';

/**
 * Get all stores in a single call
 *
 * Note: Each store is instantiated lazily via getters to avoid
 * unnecessary initialization if not all stores are needed.
 */
export function useStores() {
    return {
        /** Authentication store */
        get auth() {
            return useAuthStore();
        },
        /** Sync connection store */
        get sync() {
            return useSyncStore();
        },
        /** Sessions collection store */
        get sessions() {
            return useSessionsStore();
        },
        /** Machines collection store */
        get machines() {
            return useMachinesStore();
        },
        /** Messages collection store */
        get messages() {
            return useMessagesStore();
        },
        /** User settings store */
        get settings() {
            return useSettingsStore();
        },
        /** UI state store */
        get ui() {
            return useUiStore();
        },
    };
}

/**
 * Reset all stores to initial state
 *
 * Useful for logout or testing scenarios.
 */
export function resetAllStores() {
    useAuthStore().$reset();
    useSyncStore().$reset();
    useSessionsStore().$reset();
    useMachinesStore().$reset();
    useMessagesStore().$reset();
    useSettingsStore().$reset();
    useUiStore().$reset();
}
