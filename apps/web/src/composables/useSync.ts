/**
 * Sync Composable
 *
 * Vue composable for managing WebSocket synchronization lifecycle.
 * Automatically connects when authenticated and disconnects on logout.
 *
 * Features:
 * - Reactive connection based on auth state
 * - Automatic handler setup and cleanup
 * - Reconnection callback for data refresh
 *
 * @example
 * ```vue
 * <script setup>
 * import { useSync } from '@/composables/useSync';
 *
 * // Initialize sync in the root layout
 * const { isConnected, status, connect, disconnect } = useSync();
 * </script>
 * ```
 *
 * @see HAP-671 - WebSocket sync engine implementation
 */

import { onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useSyncStore } from '@/stores/sync';
import { wsService, setupSyncHandlers, areHandlersSetup } from '@/services/sync';
import { getApiBaseUrl } from '@/services/apiBase';

/** API server URL from environment */
const API_URL = getApiBaseUrl();

// Module-level state for handler cleanup
let handlersCleanup: (() => void) | null = null;

/**
 * Composable for WebSocket sync lifecycle management.
 *
 * Call this in your root App.vue or layout component to enable
 * automatic connection management based on authentication state.
 *
 * @returns Sync state and control functions
 */
export function useSync() {
    const authStore = useAuthStore();
    const syncStore = useSyncStore();

    // Extract reactive refs
    const { token, isAuthenticated } = storeToRefs(authStore);
    const { status, isConnected, isConnecting, hasError, statusMessage } = storeToRefs(syncStore);

    /**
     * Connect to the WebSocket server.
     * Uses the token from auth store.
     */
    async function connect(): Promise<void> {
        if (!token.value) {
            console.error('[useSync] No auth token available');
            syncStore.setError('Not authenticated');
            return;
        }

        // Set up handlers if not already done
        if (!areHandlersSetup()) {
            handlersCleanup = setupSyncHandlers();
        }

        await wsService.connect(API_URL, token.value);
    }

    /**
     * Disconnect from the WebSocket server.
     */
    function disconnect(): void {
        wsService.disconnect();
    }

    /**
     * Refresh connection (disconnect and reconnect).
     * Useful after major data changes.
     */
    async function refresh(): Promise<void> {
        disconnect();
        await connect();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle Management
    // ─────────────────────────────────────────────────────────────────────────

    onMounted(() => {
        // Connect if already authenticated
        if (isAuthenticated.value && token.value) {
            void connect();
        }
    });

    onUnmounted(() => {
        // Disconnect and cleanup
        disconnect();

        if (handlersCleanup) {
            handlersCleanup();
            handlersCleanup = null;
        }
    });

    // Watch for auth changes
    watch(isAuthenticated, (newIsAuth, oldIsAuth) => {
        if (newIsAuth && !oldIsAuth && token.value) {
            // Logged in - connect
            void connect();
        } else if (!newIsAuth && oldIsAuth) {
            // Logged out - disconnect
            disconnect();
        }
    });

    // Watch for token updates (e.g., token refresh)
    watch(token, (newToken, oldToken) => {
        if (newToken && oldToken && newToken !== oldToken) {
            // Token refreshed while connected - update the service
            wsService.updateToken(newToken);
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Reconnection Handler
    // ─────────────────────────────────────────────────────────────────────────

    // Register reconnection listener for data refresh
    let unsubReconnect: (() => void) | null = null;

    onMounted(() => {
        unsubReconnect = wsService.onReconnected(() => {
            // Trigger a sync refresh on reconnection
            // This ensures we catch up on any missed updates
            console.debug('[useSync] Reconnected, requesting sync refresh');
            syncStore.markSynced();

            // Could trigger a delta sync here in the future
            // For now, the server sends all recent updates on reconnect
        });
    });

    onUnmounted(() => {
        if (unsubReconnect) {
            unsubReconnect();
            unsubReconnect = null;
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Return API
    // ─────────────────────────────────────────────────────────────────────────

    return {
        // State (reactive)
        status,
        isConnected,
        isConnecting,
        hasError,
        statusMessage,

        // Actions
        connect,
        disconnect,
        refresh,

        // For advanced use, import wsService directly from '@/services/sync'
    };
}
