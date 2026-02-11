/**
 * Sync Store
 *
 * Tracks WebSocket connection status and sync engine state.
 * Provides real-time status updates for UI feedback.
 *
 * @example
 * ```typescript
 * const sync = useSyncStore();
 * sync.setStatus('connecting');
 * // ... connection established
 * sync.setStatus('connected');
 * ```
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Possible sync connection states
 *
 * - disconnected: Not connected to the server
 * - connecting: Establishing WebSocket connection
 * - authenticating: WebSocket open, waiting for auth confirmation (HAP-360/HAP-375)
 * - connected: Authenticated and receiving updates
 * - reconnecting: Temporarily disconnected, attempting to reconnect
 * - error: Connection failed with an error
 */
export type SyncStatus = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'reconnecting' | 'error';

export const useSyncStore = defineStore('sync', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /** Current connection status */
    const status = ref<SyncStatus>('disconnected');

    /** Timestamp of last successful sync */
    const lastSyncAt = ref<number | null>(null);

    /** Error message if status is 'error' */
    const error = ref<string | null>(null);

    /** Number of reconnection attempts */
    const reconnectAttempts = ref(0);

    /** Sequence number for ordering updates */
    const sequence = ref(0);

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether currently connected to the sync server */
    const isConnected = computed(() => status.value === 'connected');

    /** Whether currently attempting to connect */
    const isConnecting = computed(() =>
        status.value === 'connecting' || status.value === 'reconnecting'
    );

    /** Whether there's an active error */
    const hasError = computed(() => status.value === 'error' && !!error.value);

    /** Human-readable status message */
    const statusMessage = computed((): string => {
        switch (status.value) {
            case 'disconnected':
                return 'Disconnected';
            case 'connecting':
                return 'Connecting...';
            case 'authenticating':
                return 'Authenticating...';
            case 'connected':
                return 'Connected';
            case 'reconnecting':
                return `Reconnecting (attempt ${String(reconnectAttempts.value)})...`;
            case 'error':
                return error.value ?? 'Connection error';
            default:
                return 'Unknown';
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Update connection status
     */
    function setStatus(newStatus: SyncStatus) {
        status.value = newStatus;

        if (newStatus === 'connected') {
            lastSyncAt.value = Date.now();
            error.value = null;
            reconnectAttempts.value = 0;
        } else if (newStatus === 'disconnected') {
            error.value = null;
        }
    }

    /**
     * Set error state with message
     */
    function setError(message: string) {
        status.value = 'error';
        error.value = message;
    }

    /**
     * Increment reconnect attempt counter
     */
    function incrementReconnectAttempts() {
        reconnectAttempts.value++;
        status.value = 'reconnecting';
    }

    /**
     * Update sequence number (for ordering updates)
     */
    function setSequence(seq: number) {
        sequence.value = seq;
    }

    /**
     * Mark sync as complete (update lastSyncAt)
     */
    function markSynced() {
        lastSyncAt.value = Date.now();
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        status.value = 'disconnected';
        lastSyncAt.value = null;
        error.value = null;
        reconnectAttempts.value = 0;
        sequence.value = 0;
    }

    return {
        // State
        status,
        lastSyncAt,
        error,
        reconnectAttempts,
        sequence,
        // Getters
        isConnected,
        isConnecting,
        hasError,
        statusMessage,
        // Actions
        setStatus,
        setError,
        incrementReconnectAttempts,
        setSequence,
        markSynced,
        $reset,
    };
});
