import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { authMiddleware, type AuthVariables } from '@/middleware/auth';
import { getDb } from '@/db/client';
import { schema } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import {
    UsageQueryRequestSchema,
    UsageQueryResponseSchema,
    UnauthorizedErrorSchema,
    NotFoundErrorSchema,
    InternalErrorSchema,
} from '@/schemas/usage';

/**
 * Environment bindings for usage routes
 */
interface Env {
    DB: D1Database;
}

/**
 * Usage routes module
 *
 * Implements usage query endpoint for token/cost tracking:
 * - POST /v1/usage/query - Query aggregated usage data with optional filters
 *
 * The endpoint supports filtering by session, time range, and aggregation period.
 * All routes require authentication.
 */
const usageRoutes = new OpenAPIHono<{ Bindings: Env }>();

// Apply auth middleware to all usage routes
usageRoutes.use('/v1/usage/*', authMiddleware());

// ============================================================================
// POST /v1/usage/query - Query Usage Data
// ============================================================================

const queryUsageRoute = createRoute({
    method: 'post',
    path: '/v1/usage/query',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: UsageQueryRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: UsageQueryResponseSchema,
                },
            },
            description: 'Aggregated usage data',
        },
        401: {
            content: {
                'application/json': {
                    schema: UnauthorizedErrorSchema,
                },
            },
            description: 'Unauthorized',
        },
        404: {
            content: {
                'application/json': {
                    schema: NotFoundErrorSchema,
                },
            },
            description: 'Session not found or not owned by user',
        },
        500: {
            content: {
                'application/json': {
                    schema: InternalErrorSchema,
                },
            },
            description: 'Internal server error',
        },
    },
    tags: ['Usage'],
    summary: 'Query usage data',
    description: 'Query aggregated usage data with optional filtering by session, time range, and grouping period. Returns token counts and costs aggregated by hour or day.',
});

/**
 * Usage report data structure as stored in the database.
 * The data field contains JSON with tokens and cost breakdowns.
 */
interface UsageReportData {
    tokens: Record<string, number>;
    cost: Record<string, number>;
}

// @ts-expect-error - OpenAPI handler type inference doesn't carry Variables from middleware
usageRoutes.openapi(queryUsageRoute, async (c) => {
    const userId = (c as unknown as Context<{ Bindings: Env; Variables: AuthVariables }>).get('userId');
    const { sessionId, startTime, endTime, groupBy } = c.req.valid('json');
    const actualGroupBy = groupBy || 'day';
    const db = getDb(c.env.DB);

    try {
        // If sessionId provided, verify it belongs to the user
        if (sessionId) {
            const session = await db.query.sessions.findFirst({
                where: (sessions, { eq, and }) =>
                    and(eq(sessions.id, sessionId), eq(sessions.accountId, userId)),
            });
            if (!session) {
                return c.json({ error: 'Session not found' }, 404);
            }
        }

        // Build query conditions
        const conditions = [eq(schema.usageReports.accountId, userId)];

        if (sessionId) {
            conditions.push(eq(schema.usageReports.sessionId, sessionId));
        }

        if (startTime) {
            // Convert seconds to milliseconds for timestamp_ms field
            conditions.push(gte(schema.usageReports.createdAt, new Date(startTime * 1000)));
        }

        if (endTime) {
            // Convert seconds to milliseconds for timestamp_ms field
            conditions.push(lte(schema.usageReports.createdAt, new Date(endTime * 1000)));
        }

        // Fetch usage reports with all conditions
        const reports = await db
            .select()
            .from(schema.usageReports)
            .where(and(...conditions))
            .orderBy(schema.usageReports.createdAt);

        // Aggregate data by time period
        const aggregated = new Map<
            string,
            {
                tokens: Record<string, number>;
                cost: Record<string, number>;
                count: number;
                timestamp: number;
            }
        >();

        for (const report of reports) {
            const data = report.data as UsageReportData;
            const date = report.createdAt;

            // Calculate timestamp based on groupBy
            let timestamp: number;
            if (actualGroupBy === 'hour') {
                // Round down to hour
                const hourDate = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    date.getHours(),
                    0,
                    0,
                    0
                );
                timestamp = Math.floor(hourDate.getTime() / 1000);
            } else {
                // Round down to day
                const dayDate = new Date(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                    0,
                    0,
                    0,
                    0
                );
                timestamp = Math.floor(dayDate.getTime() / 1000);
            }

            const key = timestamp.toString();

            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    tokens: {},
                    cost: {},
                    count: 0,
                    timestamp,
                });
            }

            const agg = aggregated.get(key)!;
            agg.count++;

            // Aggregate tokens
            if (data.tokens) {
                for (const [tokenKey, tokenValue] of Object.entries(data.tokens)) {
                    if (typeof tokenValue === 'number') {
                        agg.tokens[tokenKey] = (agg.tokens[tokenKey] || 0) + tokenValue;
                    }
                }
            }

            // Aggregate costs
            if (data.cost) {
                for (const [costKey, costValue] of Object.entries(data.cost)) {
                    if (typeof costValue === 'number') {
                        agg.cost[costKey] = (agg.cost[costKey] || 0) + costValue;
                    }
                }
            }
        }

        // Convert to array and sort by timestamp
        const result = Array.from(aggregated.values())
            .map((data) => ({
                timestamp: data.timestamp,
                tokens: data.tokens,
                cost: data.cost,
                reportCount: data.count,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        return c.json({
            usage: result,
            groupBy: actualGroupBy,
            totalReports: reports.length,
        });
    } catch (error) {
        console.error('Failed to query usage reports:', error);
        return c.json({ error: 'Failed to query usage reports' }, 500);
    }
});

export default usageRoutes;
