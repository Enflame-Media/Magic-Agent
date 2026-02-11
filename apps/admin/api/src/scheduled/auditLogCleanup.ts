import { drizzle } from 'drizzle-orm/d1';
import { lt, count } from 'drizzle-orm';
import type { Env } from '../env';
import * as schema from '../db/schema';
import { AUDIT_LOG_RETENTION } from '../lib/constants';

/**
 * Audit Log Cleanup Handler (HAP-865)
 *
 * Scheduled job that runs daily via Cloudflare Cron Trigger.
 * Deletes admin audit logs older than the configured retention period.
 *
 * @param env - Cloudflare Worker environment bindings
 * @returns Object with deletion statistics
 *
 * @remarks
 * - Runs daily at 03:00 UTC (configured in wrangler.toml)
 * - Uses batch deletion for efficiency
 * - Logs results for observability
 *
 * Retention Policy:
 * - Default: 90 days (configurable in constants.ts)
 * - Records are permanently deleted (no archive to R2)
 *
 * @see AUDIT_LOG_RETENTION in constants.ts for retention configuration
 * @see HAP-804 for audit log creation
 */
export async function cleanupExpiredAuditLogs(
    env: Env
): Promise<{ deleted: number; cutoffDate: string; durationMs: number }> {
    const startTime = Date.now();

    // Calculate the cutoff timestamp
    // Any records with created_at < cutoffTimestamp will be deleted
    const cutoffTimestamp = Date.now() - AUDIT_LOG_RETENTION.RETENTION_MS;
    const cutoffDate = new Date(cutoffTimestamp);

    const db = drizzle(env.DB, { schema });

    // Count records to delete before deletion (D1 doesn't return affected rows reliably)
    const countResult = await db
        .select({ count: count() })
        .from(schema.adminAuditLogs)
        .where(lt(schema.adminAuditLogs.createdAt, cutoffDate));

    const deletedCount = countResult[0]?.count ?? 0;

    // Only delete if there are records to delete
    if (deletedCount > 0) {
        await db
            .delete(schema.adminAuditLogs)
            .where(lt(schema.adminAuditLogs.createdAt, cutoffDate));
    }

    const durationMs = Date.now() - startTime;

    return {
        deleted: deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        durationMs,
    };
}
