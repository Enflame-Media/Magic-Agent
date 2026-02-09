/**
 * Invitation Cleanup Utilities (HAP-824)
 *
 * Provides functions for automatically expiring pending share invitations
 * that have passed their expiration time. This ensures expired invitations
 * are no longer returned as 'pending' in invitation lists.
 *
 * Invitations expire after 7 days (configured in sharing.ts).
 * Previously, expired invitations were only marked as expired when
 * the token was accessed. This module provides batch cleanup for
 * data hygiene.
 *
 * @module lib/invitationCleanup
 */

import { and, eq, lt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { sessionShareInvitations } from '@/db/schema';

/**
 * Batch expire all pending invitations that have passed their expiration time.
 *
 * This function updates the status of all pending invitations where
 * expiresAt < now to 'expired'. Uses the composite index on
 * (status, expiresAt) for efficient querying (HAP-824).
 *
 * Called from:
 * - Scheduled cron job (daily at 2 AM UTC) for batch cleanup
 * - On-demand in sharing routes for immediate consistency
 *
 * @param db - D1 database binding
 * @returns Number of invitations marked as expired
 *
 * @example
 * ```typescript
 * const expired = await cleanupExpiredInvitations(env.DB);
 * console.log(`Marked ${expired} invitations as expired`);
 * ```
 */
export async function cleanupExpiredInvitations(db: D1Database): Promise<number> {
    const drizzle = getDb(db);
    const now = new Date();

    // Find all pending invitations that have expired
    // This query benefits from the statusExpiresIdx composite index
    const expiredInvitations = await drizzle
        .select({ id: sessionShareInvitations.id })
        .from(sessionShareInvitations)
        .where(
            and(
                eq(sessionShareInvitations.status, 'pending'),
                lt(sessionShareInvitations.expiresAt, now)
            )
        )
        .all();

    if (expiredInvitations.length === 0) {
        return 0;
    }

    // Batch update all expired invitations
    // Using individual updates for SQLite compatibility and auditability
    let updatedCount = 0;
    for (const invitation of expiredInvitations) {
        await drizzle
            .update(sessionShareInvitations)
            .set({ status: 'expired', updatedAt: now })
            .where(eq(sessionShareInvitations.id, invitation.id));
        updatedCount++;
    }

    return updatedCount;
}
