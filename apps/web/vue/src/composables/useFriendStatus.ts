/**
 * Friend Status Composable
 *
 * Vue composable for real-time friend online/offline status tracking.
 * Subscribes to friend-status ephemeral events from the WebSocket connection.
 *
 * Features:
 * - Reactive online status tracking per friend
 * - Last seen timestamps for offline friends
 * - Human-readable "last seen" text formatting
 *
 * @example
 * ```vue
 * <script setup>
 * import { useFriendStatus } from '@/composables/useFriendStatus';
 *
 * const { isOnline, getLastSeenText } = useFriendStatus();
 *
 * // In template
 * // <span v-if="isOnline(friend.id)" class="online-indicator" />
 * // <span v-else>{{ getLastSeenText(friend.id) }}</span>
 * </script>
 * ```
 *
 * @see HAP-716 - Implement real-time friend online status
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import type { ApiEphemeralFriendStatusUpdate } from '@magic-agent/protocol';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return type for the useFriendStatus composable.
 */
export interface UseFriendStatusReturn {
    /** Reactive map of userId -> isOnline */
    onlineStatus: Ref<Record<string, boolean>>;
    /** Reactive map of userId -> lastSeen ISO timestamp */
    lastSeen: Ref<Record<string, string>>;
    /** Check if a specific user is online */
    isOnline: (userId: string) => boolean;
    /** Get human-readable "last seen" text for a user */
    getLastSeenText: (userId: string) => string;
    /** Manually set a user's status (for initial load from API) */
    setStatus: (userId: string, online: boolean, lastSeenTime?: string) => void;
    /** Set multiple users' statuses at once (for bulk load) */
    setBulkStatus: (statuses: Array<{ userId: string; isOnline: boolean; lastSeen?: string }>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable for tracking friend online/offline status.
 *
 * Listens to 'friend-status' CustomEvents dispatched by the sync handlers
 * and maintains reactive state for each friend's status.
 *
 * @returns Object with reactive status refs and helper functions
 */
export function useFriendStatus(): UseFriendStatusReturn {
    // ─────────────────────────────────────────────────────────────────────────
    // Reactive State
    // ─────────────────────────────────────────────────────────────────────────

    /** Map of userId -> online status */
    const onlineStatus = ref<Record<string, boolean>>({});

    /** Map of userId -> last seen ISO timestamp */
    const lastSeen = ref<Record<string, string>>({});

    // ─────────────────────────────────────────────────────────────────────────
    // Event Handler
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Handle friend status update from WebSocket.
     * Called via CustomEvent from sync/handlers.ts
     */
    function handleStatusUpdate(event: CustomEvent<ApiEphemeralFriendStatusUpdate>): void {
        const { userId, isOnline: online, lastSeen: lastSeenTime } = event.detail;

        onlineStatus.value[userId] = online;

        if (lastSeenTime) {
            lastSeen.value[userId] = lastSeenTime;
        } else if (online) {
            // Remove lastSeen when user comes online
            // Using destructuring to avoid no-dynamic-delete lint rule
            const { [userId]: _removed, ...rest } = lastSeen.value;
            lastSeen.value = rest;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    onMounted(() => {
        window.addEventListener('friend-status', handleStatusUpdate as EventListener);
    });

    onUnmounted(() => {
        window.removeEventListener('friend-status', handleStatusUpdate as EventListener);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Helper Functions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Check if a user is currently online.
     *
     * @param userId - The user ID to check
     * @returns true if online, false otherwise
     */
    function isOnline(userId: string): boolean {
        return onlineStatus.value[userId] ?? false;
    }

    /**
     * Get human-readable "last seen" text for a user.
     *
     * @param userId - The user ID
     * @returns Formatted string like "Just now", "5m ago", "2h ago", "3d ago"
     */
    function getLastSeenText(userId: string): string {
        const timestamp = lastSeen.value[userId];
        if (!timestamp) {
            return '';
        }

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) {
            return 'Just now';
        }
        if (diffMins < 60) {
            return `${String(diffMins)}m ago`;
        }
        if (diffMins < 1440) {
            return `${String(Math.floor(diffMins / 60))}h ago`;
        }
        return `${String(Math.floor(diffMins / 1440))}d ago`;
    }

    /**
     * Manually set a user's status.
     * Useful for initializing status from API response on friend list load.
     *
     * @param userId - The user ID
     * @param online - Whether the user is online
     * @param lastSeenTime - Optional ISO timestamp of last activity
     */
    function setStatus(userId: string, online: boolean, lastSeenTime?: string): void {
        onlineStatus.value[userId] = online;
        if (lastSeenTime) {
            lastSeen.value[userId] = lastSeenTime;
        }
    }

    /**
     * Set multiple users' statuses at once.
     * Useful for bulk loading friend list with presence data.
     *
     * @param statuses - Array of user status objects
     */
    function setBulkStatus(
        statuses: Array<{ userId: string; isOnline: boolean; lastSeen?: string }>
    ): void {
        for (const status of statuses) {
            onlineStatus.value[status.userId] = status.isOnline;
            if (status.lastSeen) {
                lastSeen.value[status.userId] = status.lastSeen;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Return API
    // ─────────────────────────────────────────────────────────────────────────

    return {
        // Reactive state
        onlineStatus,
        lastSeen,

        // Helper functions
        isOnline,
        getLastSeenText,
        setStatus,
        setBulkStatus,
    };
}
