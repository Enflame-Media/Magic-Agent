import { db } from "@/storage/db";
import type { PlanLimitsResponse, UsageLimit } from "@magic-agent/protocol";

/**
 * Default plan limits for users.
 *
 * Since the server does not yet have a subscription/tier system,
 * we use reasonable defaults. These can be replaced with actual
 * plan-based limits once a billing integration is added.
 */
const DEFAULT_LIMITS = {
    maxActiveSessions: 10,
    maxTotalTokensPerWeek: 1_000_000,
} as const;

/**
 * Fetches usage limits for the authenticated user.
 *
 * Queries active session count and weekly usage report data from
 * the database, computes usage percentages against default plan
 * limits, and returns a PlanLimitsResponse conforming to the
 * @magic-agent/protocol schema.
 *
 * Logic:
 * 1. Count active sessions for the user
 * 2. Query usage reports from the last 7 days
 * 3. Aggregate total tokens used across all reports
 * 4. Compute percentage used for sessions and tokens
 * 5. Return structured response with reset times
 */
export async function accountUsageLimitsGet(userId: string): Promise<PlanLimitsResponse> {
    // Query active sessions and weekly usage reports in parallel
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate next Monday at midnight UTC as the weekly reset time
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysUntilMonday,
        0, 0, 0, 0
    ));
    const weeklyResetAt = nextMonday.getTime();

    const [activeSessionCount, usageReports] = await Promise.all([
        db.session.count({
            where: {
                accountId: userId,
                active: true
            }
        }),
        db.usageReport.findMany({
            where: {
                accountId: userId,
                createdAt: { gte: oneWeekAgo }
            }
        })
    ]);

    // Aggregate total tokens from weekly reports
    let totalTokensUsed = 0;
    for (const report of usageReports) {
        const data = report.data as PrismaJson.UsageReportData;
        if (data.tokens && typeof data.tokens.total === 'number') {
            totalTokensUsed += data.tokens.total;
        }
    }

    // Build session limit
    const sessionPercentage = DEFAULT_LIMITS.maxActiveSessions > 0
        ? Math.min(100, (activeSessionCount / DEFAULT_LIMITS.maxActiveSessions) * 100)
        : 0;

    const sessionLimit: UsageLimit = {
        id: 'active_sessions',
        label: 'Active Sessions',
        percentageUsed: Math.round(sessionPercentage * 10) / 10,
        resetsAt: null,
        resetDisplayType: 'datetime',
        description: `${activeSessionCount} of ${DEFAULT_LIMITS.maxActiveSessions} sessions`,
    };

    // Build weekly token usage limit
    const tokenPercentage = DEFAULT_LIMITS.maxTotalTokensPerWeek > 0
        ? Math.min(100, (totalTokensUsed / DEFAULT_LIMITS.maxTotalTokensPerWeek) * 100)
        : 0;

    const weeklyLimits: UsageLimit[] = [
        {
            id: 'weekly_tokens',
            label: 'Weekly Tokens',
            percentageUsed: Math.round(tokenPercentage * 10) / 10,
            resetsAt: weeklyResetAt,
            resetDisplayType: 'countdown',
            description: `${totalTokensUsed.toLocaleString()} of ${DEFAULT_LIMITS.maxTotalTokensPerWeek.toLocaleString()} tokens`,
        },
    ];

    return {
        sessionLimit,
        weeklyLimits,
        lastUpdatedAt: now.getTime(),
        limitsAvailable: true,
        provider: 'anthropic',
    };
}
