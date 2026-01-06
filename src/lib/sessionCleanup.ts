/**
 * Session Cleanup Utilities
 *
 * Provides functions for cleaning up orphaned session data,
 * specifically empty archived sessions that have no messages.
 *
 * Empty archived sessions occur when a Claude Code session is created
 * but terminates before any messages are sent (crash, cancel, timeout
 * before first output).
 *
 * @module lib/sessionCleanup
 */

import { eq, count } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
    sessions,
    sessionMessages,
    usageReports,
    accessKeys,
} from '@/db/schema';

/**
 * Cleans up archived sessions that have no messages.
 *
 * These sessions are orphaned records that provide no value to users
 * and should be removed to keep the database clean.
 *
 * @param db - D1 database binding
 * @returns Number of sessions deleted
 *
 * @example
 * ```typescript
 * const deleted = await cleanupEmptyArchivedSessions(env.DB);
 * console.log(`Removed ${deleted} empty archived sessions`);
 * ```
 */
export async function cleanupEmptyArchivedSessions(db: D1Database): Promise<number> {
    const drizzle = getDb(db);

    // Find all archived sessions with no messages
    // Using a subquery approach for SQLite compatibility
    const emptyArchivedSessions = await drizzle
        .select({ id: sessions.id, accountId: sessions.accountId })
        .from(sessions)
        .where(eq(sessions.active, false))
        .all();

    let deletedCount = 0;

    for (const session of emptyArchivedSessions) {
        // Check if this session has any messages
        const [messageCount] = await drizzle
            .select({ count: count() })
            .from(sessionMessages)
            .where(eq(sessionMessages.sessionId, session.id));

        if ((messageCount?.count ?? 0) === 0) {
            // Delete related data first
            await drizzle.delete(usageReports).where(eq(usageReports.sessionId, session.id));
            await drizzle.delete(accessKeys).where(eq(accessKeys.sessionId, session.id));
            // Delete the session
            await drizzle.delete(sessions).where(eq(sessions.id, session.id));
            deletedCount++;
        }
    }

    return deletedCount;
}
