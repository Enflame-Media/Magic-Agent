/**
 * User Presence Tracker
 *
 * Tracks user online/offline status across WebSocket connections and broadcasts
 * status changes to friends in real-time.
 *
 * Architecture:
 * - In-memory Map tracks active connection IDs per user (fast lookups)
 * - Redis stores presence state for distributed deployment (TTL-based)
 * - Broadcasts to friends use the existing eventRouter infrastructure
 *
 * @see HAP-716 - Implement real-time friend online status
 */

import { redis } from '@/storage/redis';
import { db } from '@/storage/db';
import { eventRouter } from '@/app/events/eventRouter';
import { log } from '@/utils/log';
import { RelationshipStatus } from '@prisma/client';
import type { ApiEphemeralFriendStatusUpdate } from '@happy/protocol';

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

/** Redis TTL for presence keys (seconds) - refreshed by heartbeat */
const PRESENCE_TTL = 60;

/** Redis key prefix for presence status */
const PRESENCE_KEY_PREFIX = 'presence:';

/** Redis key prefix for last seen timestamps */
const LAST_SEEN_KEY_PREFIX = 'presence:lastSeen:';

// ═══════════════════════════════════════════════════════════════════════════
// PresenceTracker Class
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Manages user presence state and broadcasts status changes to friends.
 *
 * This class tracks active WebSocket connections per user. When a user's first
 * connection opens, they're marked online. When their last connection closes,
 * they're marked offline. Status changes are broadcast to all online friends.
 */
class PresenceTracker {
    /**
     * In-memory map of userId -> Set of connectionIds
     *
     * Using a Set allows O(1) add/remove and ensures uniqueness.
     * The Map provides O(1) lookup by userId.
     */
    private connections = new Map<string, Set<string>>();

    // ─────────────────────────────────────────────────────────────────────────
    // Connection Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Handle user connection (WebSocket opened).
     *
     * Called when a user-scoped WebSocket connection is established.
     * If this is the user's first connection, broadcasts online status to friends.
     *
     * @param userId - The user ID
     * @param connectionId - Unique identifier for this connection (socket.id)
     */
    async handleUserConnect(userId: string, connectionId: string): Promise<void> {
        // Track connection in memory
        let userConnections = this.connections.get(userId);
        const wasOffline = !userConnections || userConnections.size === 0;

        if (!userConnections) {
            userConnections = new Set();
            this.connections.set(userId, userConnections);
        }
        userConnections.add(connectionId);

        // Update Redis presence (for distributed deployments)
        await redis.setex(`${PRESENCE_KEY_PREFIX}${userId}`, PRESENCE_TTL, 'online');

        // Broadcast to friends if coming online
        if (wasOffline) {
            log({ module: 'presence', userId }, 'User came online, broadcasting to friends');
            await this.broadcastStatusToFriends(userId, true);
        }
    }

    /**
     * Handle user disconnection (WebSocket closed).
     *
     * Called when a user-scoped WebSocket connection is closed.
     * If this was the user's last connection, broadcasts offline status to friends.
     *
     * @param userId - The user ID
     * @param connectionId - Unique identifier for this connection (socket.id)
     */
    async handleUserDisconnect(userId: string, connectionId: string): Promise<void> {
        const userConnections = this.connections.get(userId);
        if (!userConnections) {
            return;
        }

        userConnections.delete(connectionId);

        // Check if user is now offline (no more connections)
        if (userConnections.size === 0) {
            this.connections.delete(userId);

            // Update last seen timestamp
            await redis.set(
                `${LAST_SEEN_KEY_PREFIX}${userId}`,
                Date.now().toString()
            );

            // Remove presence key
            await redis.del(`${PRESENCE_KEY_PREFIX}${userId}`);

            // Broadcast offline status to friends
            log({ module: 'presence', userId }, 'User went offline, broadcasting to friends');
            await this.broadcastStatusToFriends(userId, false);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Status Broadcasting
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Broadcast status change to all online friends.
     *
     * Queries the database for the user's friends, then sends an ephemeral
     * event to each friend who has an active connection.
     *
     * @param userId - The user whose status changed
     * @param isOnline - Whether the user is now online
     */
    private async broadcastStatusToFriends(userId: string, isOnline: boolean): Promise<void> {
        try {
            // TODO: Check user's privacy settings before broadcasting
            // const settings = await getUserPrivacySettings(userId);
            // if (!settings.showOnlineStatus) {
            //     return;
            // }

            // Get user's friends (bidirectional - they must also be my friend)
            const friends = await db.userRelationship.findMany({
                where: {
                    fromUserId: userId,
                    status: RelationshipStatus.friend
                },
                select: { toUserId: true }
            });

            if (friends.length === 0) {
                return;
            }

            // Build the event payload
            const event: ApiEphemeralFriendStatusUpdate = {
                type: 'friend-status',
                userId,
                isOnline,
                lastSeen: isOnline ? undefined : new Date().toISOString()
            };

            // Send to each online friend
            for (const { toUserId } of friends) {
                eventRouter.emitEphemeral({
                    userId: toUserId,
                    payload: event,
                    // Only send to user-scoped connections (mobile/web apps)
                    recipientFilter: { type: 'user-scoped-only' }
                });
            }

            log(
                { module: 'presence', userId },
                `Broadcast ${isOnline ? 'online' : 'offline'} status to ${friends.length} friends`
            );
        } catch (error) {
            log(
                { module: 'presence', level: 'error', userId },
                `Failed to broadcast status: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Status Queries
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Check if a user is currently online.
     *
     * First checks in-memory state (fast), falls back to Redis (distributed).
     *
     * @param userId - The user ID to check
     * @returns True if the user has at least one active connection
     */
    async isUserOnline(userId: string): Promise<boolean> {
        // Check in-memory first (local connections)
        const localConnections = this.connections.get(userId);
        if (localConnections && localConnections.size > 0) {
            return true;
        }

        // Check Redis (for distributed deployment)
        const status = await redis.get(`${PRESENCE_KEY_PREFIX}${userId}`);
        return status === 'online';
    }

    /**
     * Get when a user was last seen online.
     *
     * @param userId - The user ID
     * @returns Date of last activity, or null if never seen/currently online
     */
    async getLastSeen(userId: string): Promise<Date | null> {
        const timestamp = await redis.get(`${LAST_SEEN_KEY_PREFIX}${userId}`);
        return timestamp ? new Date(parseInt(timestamp, 10)) : null;
    }

    /**
     * Refresh presence TTL (called periodically to maintain online status).
     *
     * Should be called on each WebSocket ping/pong or activity.
     *
     * @param userId - The user ID
     */
    async heartbeat(userId: string): Promise<void> {
        const connections = this.connections.get(userId);
        if (connections && connections.size > 0) {
            await redis.setex(`${PRESENCE_KEY_PREFIX}${userId}`, PRESENCE_TTL, 'online');
        }
    }

    /**
     * Get the online status of multiple users at once.
     *
     * Useful for bulk-loading friend list status.
     *
     * @param userIds - Array of user IDs to check
     * @returns Map of userId -> isOnline
     */
    async getBulkOnlineStatus(userIds: string[]): Promise<Map<string, boolean>> {
        const result = new Map<string, boolean>();

        if (userIds.length === 0) {
            return result;
        }

        // Check local connections first
        for (const userId of userIds) {
            const localConnections = this.connections.get(userId);
            if (localConnections && localConnections.size > 0) {
                result.set(userId, true);
            }
        }

        // For users not found locally, check Redis
        const notFoundLocally = userIds.filter(id => !result.has(id));
        if (notFoundLocally.length > 0) {
            const keys = notFoundLocally.map(id => `${PRESENCE_KEY_PREFIX}${id}`);
            const values = await redis.mget(...keys);

            notFoundLocally.forEach((userId, index) => {
                result.set(userId, values[index] === 'online');
            });
        }

        return result;
    }

    /**
     * Get the number of active connections for a user.
     *
     * Useful for debugging and metrics.
     *
     * @param userId - The user ID
     * @returns Number of active connections
     */
    getConnectionCount(userId: string): number {
        const connections = this.connections.get(userId);
        return connections ? connections.size : 0;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Global presence tracker instance.
 *
 * Import this in socket.ts to hook into connection lifecycle.
 */
export const presenceTracker = new PresenceTracker();

// ═══════════════════════════════════════════════════════════════════════════
// Helper for Building Ephemeral Events
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a friend status ephemeral event.
 *
 * Can be used by eventRouter for consistency with other ephemeral builders.
 *
 * @param userId - The user whose status changed
 * @param isOnline - Whether the user is online
 * @returns Ephemeral event payload
 */
export function buildFriendStatusEphemeral(
    userId: string,
    isOnline: boolean
): ApiEphemeralFriendStatusUpdate {
    return {
        type: 'friend-status',
        userId,
        isOnline,
        lastSeen: isOnline ? undefined : new Date().toISOString()
    };
}
