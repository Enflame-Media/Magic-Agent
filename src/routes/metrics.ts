import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Env, Variables } from '../env';
import {
    createQueryBuilder,
    validateNumber,
    NumericBounds,
    ValidationPatterns,
    ALLOWED_PLATFORMS,
} from '../lib/analytics-query';

/**
 * Metrics API routes for Analytics Engine data
 *
 * These endpoints query the Analytics Engine SQL API to retrieve
 * sync performance metrics collected by happy-server-workers.
 *
 * All endpoints require admin authentication.
 */
export const metricsRoutes = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

/*
 * Zod Schemas for OpenAPI documentation
 */

// Error response schema for validation errors (HAP-611)
const ErrorResponseSchema = z
    .object({
        error: z.string().openapi({ example: 'Invalid hours: must be between 1 and 720' }),
    })
    .openapi('ErrorResponse');

const MetricsSummarySchema = z
    .object({
        syncType: z.string().openapi({ example: 'session' }),
        syncMode: z.string().openapi({ example: 'full' }),
        count: z.number().openapi({ example: 150 }),
        avgDurationMs: z.number().openapi({ example: 245.5 }),
        p95DurationMs: z.number().openapi({ example: 890 }),
        successRate: z.number().openapi({ example: 0.98 }),
    })
    .openapi('MetricsSummary');

const TimeseriesPointSchema = z
    .object({
        timestamp: z.string().openapi({ example: '2025-12-26T00:00:00Z' }),
        count: z.number().openapi({ example: 42 }),
        avgDurationMs: z.number().openapi({ example: 200 }),
    })
    .openapi('TimeseriesPoint');

const CacheHitRateSchema = z
    .object({
        hits: z.number().openapi({ example: 850 }),
        misses: z.number().openapi({ example: 150 }),
        hitRate: z.number().openapi({ example: 0.85 }),
    })
    .openapi('CacheHitRate');

const ModeDistributionSchema = z
    .object({
        full: z.number().openapi({ example: 200 }),
        incremental: z.number().openapi({ example: 450 }),
        cached: z.number().openapi({ example: 350 }),
        total: z.number().openapi({ example: 1000 }),
    })
    .openapi('ModeDistribution');

// Bundle Size Schemas (HAP-564)
const BundleSizePointSchema = z
    .object({
        date: z.string().openapi({ example: '2025-12-26' }),
        platform: z.string().openapi({ example: 'web' }),
        avgTotalSize: z.number().openapi({ example: 1572864 }),
        avgJsSize: z.number().openapi({ example: 1048576 }),
        avgAssetsSize: z.number().openapi({ example: 524288 }),
        buildCount: z.number().openapi({ example: 5 }),
    })
    .openapi('BundleSizePoint');

const BundleSizeLatestSchema = z
    .object({
        platform: z.string().openapi({ example: 'web' }),
        branch: z.string().openapi({ example: 'main' }),
        commitHash: z.string().openapi({ example: 'abc1234' }),
        totalSize: z.number().openapi({ example: 1572864 }),
        jsSize: z.number().openapi({ example: 1048576 }),
        assetsSize: z.number().openapi({ example: 524288 }),
        timestamp: z.string().openapi({ example: '2025-12-26T12:00:00Z' }),
    })
    .openapi('BundleSizeLatest');

/*
 * Type definitions for API responses
 */
type MetricsSummary = z.infer<typeof MetricsSummarySchema>;
type TimeseriesPoint = z.infer<typeof TimeseriesPointSchema>;
type CacheHitRate = z.infer<typeof CacheHitRateSchema>;
type ModeDistribution = z.infer<typeof ModeDistributionSchema>;
type BundleSizePoint = z.infer<typeof BundleSizePointSchema>;
type BundleSizeLatest = z.infer<typeof BundleSizeLatestSchema>;

/*
 * Route Definitions - Simplified to only return 200
 * Auth checking will be done via middleware
 */

// HAP-872: Error response schema for data unavailable scenarios
const DataUnavailableResponseSchema = z
    .object({
        error: z.string().openapi({ example: 'Data unavailable' }),
        reason: z.enum(['not_configured', 'empty_dataset', 'query_failed']).openapi({
            description: 'Reason why data is unavailable',
            example: 'empty_dataset',
        }),
        message: z.string().openapi({
            example: 'Analytics Engine returned no results. Check configuration.',
        }),
    })
    .openapi('DataUnavailableResponse');

const summaryRoute = createRoute({
    method: 'get',
    path: '/summary',
    tags: ['Metrics'],
    summary: 'Get 24h metrics summary',
    description: 'Returns aggregated sync metrics for the last 24 hours, grouped by sync type and mode.',
    responses: {
        200: {
            description: 'Metrics summary retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(MetricsSummarySchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

const timeseriesRoute = createRoute({
    method: 'get',
    path: '/timeseries',
    tags: ['Metrics'],
    summary: 'Get time-bucketed metrics',
    description: 'Returns sync metrics bucketed by hour for the specified time range.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
            bucket: z.enum(['hour', 'day']).optional().openapi({
                example: 'hour',
                description: 'Time bucket size (default: hour)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Timeseries data retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(TimeseriesPointSchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

const cacheHitsRoute = createRoute({
    method: 'get',
    path: '/cache-hits',
    tags: ['Metrics'],
    summary: 'Get profile cache hit rate',
    description: 'Returns the cache hit/miss ratio for profile lookups in the last 24 hours. HAP-808: Uses explicit cache status field (blob4) for accurate metrics, with backward compatibility fallback to sync mode heuristic for legacy data.',
    responses: {
        200: {
            description: 'Cache hit rate retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: CacheHitRateSchema,
                        timestamp: z.string(),
                    }),
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

const modeDistributionRoute = createRoute({
    method: 'get',
    path: '/mode-distribution',
    tags: ['Metrics'],
    summary: 'Get sync mode distribution',
    description: 'Returns the distribution of sync modes (full/incremental/cached) in the last 24 hours.',
    responses: {
        200: {
            description: 'Mode distribution retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: ModeDistributionSchema,
                        timestamp: z.string(),
                    }),
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

// Bundle Size Routes (HAP-564)
const bundleTrendsRoute = createRoute({
    method: 'get',
    path: '/bundle-trends',
    tags: ['Metrics', 'Bundle Size'],
    summary: 'Get bundle size trends',
    description: 'Returns daily bundle size averages for the specified time range. Used for trend visualization.',
    request: {
        query: z.object({
            days: z
                .string()
                .regex(/^\d{1,3}$/, 'Days must be a number between 1-365')
                .optional()
                .openapi({
                    example: '30',
                    description: 'Number of days to look back (1-365, default: 30)',
                }),
            platform: z.enum(ALLOWED_PLATFORMS).optional().openapi({
                example: 'web',
                description: 'Filter by platform (default: all platforms)',
            }),
            branch: z
                .string()
                .regex(/^[a-zA-Z0-9_/.-]{1,64}$/, 'Invalid branch name format')
                .optional()
                .openapi({
                    example: 'main',
                    description: 'Filter by branch - alphanumeric, hyphens, underscores, slashes only (default: main)',
                }),
        }),
    },
    responses: {
        200: {
            description: 'Bundle trends retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(BundleSizePointSchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

const bundleLatestRoute = createRoute({
    method: 'get',
    path: '/bundle-latest',
    tags: ['Metrics', 'Bundle Size'],
    summary: 'Get latest bundle sizes',
    description: 'Returns the most recent bundle size for each platform from the main branch.',
    responses: {
        200: {
            description: 'Latest bundle sizes retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(BundleSizeLatestSchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

/*
 * Route Handlers
 */

/**
 * HAP-872: Type for data unavailability reasons
 */
type DataUnavailableReason = 'not_configured' | 'empty_dataset' | 'query_failed';

/**
 * HAP-872: Result type for Analytics Engine queries
 * Either returns data or an error reason
 */
type AnalyticsQueryResult =
    | { success: true; data: unknown[]; meta: unknown }
    | { success: false; reason: DataUnavailableReason; message: string };

/**
 * Helper to query Analytics Engine SQL API
 * Uses Secrets Store bindings which require async .get() calls
 *
 * @remarks
 * Field mappings for sync_metrics dataset (from happy-server-workers):
 * - blob1: sync type ('messages' | 'profile' | 'artifacts')
 * - blob2: sync mode ('full' | 'incremental' | 'cached')
 * - blob3: sessionId (optional)
 * - double1: bytesReceived
 * - double2: itemsReceived
 * - double3: itemsSkipped
 * - double4: durationMs
 * - index1: userId/accountId
 *
 * @see HAP-638 Fixed field mappings to match actual ingestion schema
 * @see HAP-872 Returns typed error reasons instead of null for better error handling
 */
async function queryAnalyticsEngine(
    env: Env,
    sql: string
): Promise<AnalyticsQueryResult> {
    if (!env.ANALYTICS_ACCOUNT_ID || !env.ANALYTICS_API_TOKEN) {
        console.warn('[Metrics] Analytics Engine not configured - ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN binding missing');
        return {
            success: false,
            reason: 'not_configured',
            message: 'Analytics Engine not configured. Ensure ANALYTICS_ACCOUNT_ID and ANALYTICS_API_TOKEN are set in Secrets Store.',
        };
    }

    // Retrieve secrets from Secrets Store
    let accountId: string;
    let apiToken: string;
    try {
        accountId = await env.ANALYTICS_ACCOUNT_ID.get();
        apiToken = await env.ANALYTICS_API_TOKEN.get();
    } catch (error) {
        console.error('[Metrics] Failed to retrieve secrets from Secrets Store:', error);
        return {
            success: false,
            reason: 'not_configured',
            message: 'Failed to retrieve Analytics Engine credentials from Secrets Store.',
        };
    }

    if (!accountId || !apiToken) {
        console.warn('[Metrics] Secrets Store returned empty values for ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN');
        return {
            success: false,
            reason: 'not_configured',
            message: 'Secrets Store returned empty values for ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN.',
        };
    }

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${apiToken}`,
                'Content-Type': 'text/plain',
            },
            body: sql,
        }
    );

    if (!response.ok) {
        const text = await response.text();
        console.error('[Metrics] Analytics Engine query failed:', {
            status: response.status,
            statusText: response.statusText,
            body: text,
            query: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''),
        });
        return {
            success: false,
            reason: 'query_failed',
            message: `Analytics Engine query failed: ${response.status} ${response.statusText}`,
        };
    }

    const result = await response.json() as { data: unknown[]; meta: unknown };

    // HAP-638: Enhanced debug logging for query results
    const rowCount = Array.isArray(result.data) ? result.data.length : 0;
    console.log('[Metrics] Analytics Engine query result:', {
        query: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        rowCount,
        hasData: rowCount > 0,
        meta: result.meta,
    });

    return { success: true, data: result.data, meta: result.meta };
}

/**
 * GET /api/metrics/summary
 * Returns last 24h summary by type/mode
 *
 * @remarks
 * Field mappings (HAP-638):
 * - blob1 = syncType, blob2 = syncMode
 * - double4 = durationMs (NOT double1 which is bytesReceived)
 * - successRate is estimated as (itemsReceived > 0) since explicit success flag isn't tracked
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(summaryRoute, async (c) => {
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            blob1 as syncType,
            blob2 as syncMode,
            COUNT() as count,
            AVG(double4) as avgDurationMs,
            quantile(0.95)(double4) as p95DurationMs,
            SUM(CASE WHEN double2 > 0 THEN 1 ELSE 0 END) * 1.0 / COUNT() as successRate
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
        GROUP BY blob1, blob2
        ORDER BY count DESC
        `
    );

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /summary returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /summary returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: 'No sync metrics data found in the last 24 hours. Ensure happy-server-workers is writing to Analytics Engine.',
            },
            503
        );
    }

    return c.json(
        {
            data: result.data as MetricsSummary[],
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/timeseries
 * Returns time-bucketed metrics
 *
 * @remarks
 * Field mappings (HAP-638):
 * - double4 = durationMs (NOT double1 which is bytesReceived)
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(timeseriesRoute, async (c) => {
    const { hours = '24', bucket = 'hour' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    // Build safe query using query builder
    // HAP-638: Use double4 for durationMs (not double1 which is bytesReceived)
    const bucketFunc = bucket === 'day' ? 'Day' : 'Hour';
    const query = createQueryBuilder('sync_metrics', c.env.ENVIRONMENT);
    query
        .select([
            `toStartOf${bucketFunc}(timestamp) as timestamp`,
            'COUNT() as count',
            'AVG(double4) as avgDurationMs',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .groupBy(['timestamp'])
        .orderBy('timestamp', 'ASC');

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /timeseries returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /timeseries returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No sync metrics data found in the last ${hoursNum} hours. Ensure happy-server-workers is writing to Analytics Engine.`,
            },
            503
        );
    }

    return c.json(
        {
            data: result.data as TimeseriesPoint[],
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/cache-hits
 * Returns profile cache hit rate
 *
 * @remarks
 * HAP-808: Cache hit/miss tracking is now implemented via blob4 (cacheStatus).
 * The query uses explicit cache status field for accurate metrics.
 *
 * Field mappings:
 * - blob1: sync type ('profile')
 * - blob4: cacheStatus ('hit' | 'miss')
 *
 * For backward compatibility with older data that lacks blob4:
 * - Falls back to blob2='cached' heuristic if blob4 is empty
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(cacheHitsRoute, async (c) => {
    // HAP-808: Query using explicit cache status field (blob4)
    // Uses COALESCE to handle backward compatibility:
    // - If blob4 has 'hit'/'miss', use that directly
    // - If blob4 is empty (legacy data), fall back to blob2='cached' heuristic
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            SUM(CASE
                WHEN blob4 = 'hit' THEN 1
                WHEN blob4 = '' AND blob2 = 'cached' THEN 1
                ELSE 0
            END) as hits,
            SUM(CASE
                WHEN blob4 = 'miss' THEN 1
                WHEN blob4 = '' AND blob2 != 'cached' THEN 1
                ELSE 0
            END) as misses
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
          AND blob1 = 'profile'
        `
    );

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /cache-hits returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty or no profile syncs occurred
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /cache-hits returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: 'No profile sync data found in the last 24 hours.',
            },
            503
        );
    }

    const row = result.data[0] as { hits: number; misses: number };
    const total = (row.hits ?? 0) + (row.misses ?? 0);

    // HAP-872: Return 503 if no profile syncs in timeframe
    if (total === 0) {
        console.warn('[Metrics] /cache-hits returning 503 - no profile syncs in timeframe');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: 'No profile sync data found in the last 24 hours. Profile syncs may not have occurred.',
            },
            503
        );
    }

    return c.json(
        {
            data: {
                hits: row.hits ?? 0,
                misses: row.misses ?? 0,
                hitRate: (row.hits ?? 0) / total,
            },
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/mode-distribution
 * Returns full/incremental/cached distribution
 *
 * @remarks
 * Field mappings (HAP-638): blob2 = syncMode - this query is correct
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(modeDistributionRoute, async (c) => {
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            blob2 as mode,
            COUNT() as count
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
        GROUP BY blob2
        `
    );

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /mode-distribution returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /mode-distribution returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: 'No sync metrics data found in the last 24 hours. Ensure happy-server-workers is writing to Analytics Engine.',
            },
            503
        );
    }

    // Transform result
    const modeMap: Record<string, number> = {};
    for (const row of result.data as { mode: string; count: number }[]) {
        modeMap[row.mode] = row.count;
    }
    const total = Object.values(modeMap).reduce((a, b) => a + b, 0);

    // HAP-872: Return 503 if no syncs in timeframe
    if (total === 0) {
        console.warn('[Metrics] /mode-distribution returning 503 - no syncs in timeframe');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: 'No sync metrics data found in the last 24 hours.',
            },
            503
        );
    }

    return c.json(
        {
            data: {
                full: modeMap['full'] ?? 0,
                incremental: modeMap['incremental'] ?? 0,
                cached: modeMap['cached'] ?? 0,
                total,
            },
            timestamp: new Date().toISOString(),
        },
        200
    );
});

// HAP-872: Removed generateMockTimeseries function - mock data fallbacks are no longer used

// ============================================================================
// Bundle Size Route Handlers (HAP-564)
// ============================================================================

/**
 * GET /api/metrics/bundle-trends
 * Returns daily bundle size averages for trend visualization
 *
 * SECURITY: This endpoint was vulnerable to SQL injection via the branch parameter.
 * Fixed in HAP-611 by using AnalyticsQueryBuilder with strict input validation.
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(bundleTrendsRoute, async (c) => {
    const { days = '30', platform, branch = 'main' } = c.req.valid('query');

    // Validate days with bounds checking
    const daysResult = validateNumber(days, NumericBounds.DAYS, 'days', 30);
    if (!daysResult.success) {
        return c.json({ error: daysResult.error }, 400);
    }
    const daysNum = daysResult.value;

    // Build safe query using query builder
    // CRITICAL: branch parameter is now validated against ValidationPatterns.BRANCH
    // which only allows alphanumeric, hyphens, underscores, and slashes (max 64 chars)
    const query = createQueryBuilder('bundle_metrics', c.env.ENVIRONMENT);
    query
        .select([
            'toStartOfDay(timestamp) as date',
            'blob1 as platform',
            'AVG(double3) as avgTotalSize',
            'AVG(double1) as avgJsSize',
            'AVG(double2) as avgAssetsSize',
            'COUNT() as buildCount',
        ])
        .whereTimestampInterval(daysNum, 'DAY')
        .whereString('blob2', '=', branch, ValidationPatterns.BRANCH, 'branch')
        .wherePlatform('blob1', platform)
        .groupBy(['date', 'blob1'])
        .orderBy('date', 'ASC');

    // Check for validation errors
    if (query.hasErrors) {
        return c.json({ error: query.errors.join('; ') }, 400);
    }

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /bundle-trends returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /bundle-trends returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No bundle metrics data found in the last ${daysNum} days for branch '${branch}'.`,
            },
            503
        );
    }

    const data = (result.data as Array<{
        date: string;
        platform: string;
        avgTotalSize: number;
        avgJsSize: number;
        avgAssetsSize: number;
        buildCount: number;
    }>).map((row) => ({
        date: row.date,
        platform: row.platform,
        avgTotalSize: Math.round(row.avgTotalSize),
        avgJsSize: Math.round(row.avgJsSize),
        avgAssetsSize: Math.round(row.avgAssetsSize),
        buildCount: row.buildCount,
    }));

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/bundle-latest
 * Returns the most recent bundle size for each platform
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(bundleLatestRoute, async (c) => {
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            blob1 as platform,
            blob2 as branch,
            blob3 as commitHash,
            double3 as totalSize,
            double1 as jsSize,
            double2 as assetsSize,
            timestamp
        FROM bundle_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '7' DAY
          AND blob2 = 'main'
        ORDER BY timestamp DESC
        LIMIT 10
        `
    );

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /bundle-latest returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /bundle-latest returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: 'No bundle metrics data found in the last 7 days for main branch.',
            },
            503
        );
    }

    // Get the latest entry for each platform
    const platformMap = new Map<string, BundleSizeLatest>();
    for (const row of result.data as Array<{
        platform: string;
        branch: string;
        commitHash: string;
        totalSize: number;
        jsSize: number;
        assetsSize: number;
        timestamp: string;
    }>) {
        if (!platformMap.has(row.platform)) {
            platformMap.set(row.platform, {
                platform: row.platform,
                branch: row.branch,
                commitHash: row.commitHash,
                totalSize: Math.round(row.totalSize),
                jsSize: Math.round(row.jsSize),
                assetsSize: Math.round(row.assetsSize),
                timestamp: row.timestamp,
            });
        }
    }

    return c.json(
        {
            data: Array.from(platformMap.values()),
            timestamp: new Date().toISOString(),
        },
        200
    );
});

// HAP-872: Removed generateMockBundleTrends function - mock data fallbacks are no longer used

// ============================================================================
// Validation Metrics Route Handlers (HAP-577)
// ============================================================================

// Validation Metrics Schemas
const ValidationSummarySchema = z
    .object({
        totalFailures: z.number().openapi({ example: 150 }),
        schemaFailures: z.number().openapi({ example: 20 }),
        unknownTypes: z.number().openapi({ example: 125 }),
        strictFailures: z.number().openapi({ example: 5 }),
        uniqueUsers: z.number().openapi({ example: 42 }),
        avgSessionDurationMs: z.number().openapi({ example: 180000 }),
    })
    .openapi('ValidationSummary');

const UnknownTypeBreakdownSchema = z
    .object({
        typeName: z.string().openapi({ example: 'thinking' }),
        count: z.number().openapi({ example: 75 }),
        percentage: z.number().openapi({ example: 60.0 }),
    })
    .openapi('UnknownTypeBreakdown');

const ValidationTimeseriesPointSchema = z
    .object({
        timestamp: z.string().openapi({ example: '2025-12-26T00:00:00Z' }),
        totalFailures: z.number().openapi({ example: 15 }),
        schemaFailures: z.number().openapi({ example: 2 }),
        unknownTypes: z.number().openapi({ example: 12 }),
        strictFailures: z.number().openapi({ example: 1 }),
    })
    .openapi('ValidationTimeseriesPoint');

type ValidationSummary = z.infer<typeof ValidationSummarySchema>;
type UnknownTypeBreakdown = z.infer<typeof UnknownTypeBreakdownSchema>;
type ValidationTimeseriesPoint = z.infer<typeof ValidationTimeseriesPointSchema>;

// Validation Summary Route
// HAP-638: Added hours parameter for time range filtering
const validationSummaryRoute = createRoute({
    method: 'get',
    path: '/validation-summary',
    tags: ['Metrics', 'Validation'],
    summary: 'Get validation failure summary',
    description: 'Returns aggregated validation failure metrics for the specified time range.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
        }),
    },
    responses: {
        200: {
            description: 'Validation summary retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: ValidationSummarySchema,
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

// Unknown Type Breakdown Route
const unknownTypeBreakdownRoute = createRoute({
    method: 'get',
    path: '/validation-unknown-types',
    tags: ['Metrics', 'Validation'],
    summary: 'Get unknown type breakdown',
    description: 'Returns the breakdown of unknown message types encountered, sorted by frequency.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
            limit: z
                .string()
                .regex(/^\d{1,3}$/, 'Limit must be a number between 1-100')
                .optional()
                .openapi({
                    example: '10',
                    description: 'Maximum number of types to return (1-100, default: 10)',
                }),
        }),
    },
    responses: {
        200: {
            description: 'Unknown type breakdown retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(UnknownTypeBreakdownSchema),
                        total: z.number(),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

// Validation Timeseries Route
const validationTimeseriesRoute = createRoute({
    method: 'get',
    path: '/validation-timeseries',
    tags: ['Metrics', 'Validation'],
    summary: 'Get validation failure timeseries',
    description: 'Returns time-bucketed validation failure metrics.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
            bucket: z.enum(['hour', 'day']).optional().openapi({
                example: 'hour',
                description: 'Time bucket size (default: hour)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Validation timeseries retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(ValidationTimeseriesPointSchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable - Analytics Engine not configured or empty',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

/**
 * GET /api/metrics/validation-summary
 * Returns validation failure summary for the specified time range
 * HAP-638: Added hours parameter support
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(validationSummaryRoute, async (c) => {
    const { hours = '24' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    // Build safe query using query builder
    const query = createQueryBuilder('client_metrics', c.env.ENVIRONMENT);
    query
        .select([
            'SUM(double1) as totalFailures',
            'SUM(double3) as schemaFailures',
            'SUM(double4) as strictFailures',
            'COUNT(DISTINCT index1) as uniqueUsers',
            'AVG(double2) as avgSessionDurationMs',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'validation'")
        .whereRaw("blob2 = 'summary'");

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /validation-summary returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /validation-summary returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No validation metrics data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    const row = result.data[0] as {
        totalFailures: number;
        schemaFailures: number;
        strictFailures: number;
        uniqueUsers: number;
        avgSessionDurationMs: number;
    };

    return c.json(
        {
            data: {
                totalFailures: row.totalFailures ?? 0,
                schemaFailures: row.schemaFailures ?? 0,
                unknownTypes: (row.totalFailures ?? 0) - (row.schemaFailures ?? 0) - (row.strictFailures ?? 0),
                strictFailures: row.strictFailures ?? 0,
                uniqueUsers: row.uniqueUsers ?? 0,
                avgSessionDurationMs: Math.round(row.avgSessionDurationMs ?? 0),
            },
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/validation-unknown-types
 * Returns breakdown of unknown message types
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(unknownTypeBreakdownRoute, async (c) => {
    const { hours = '24', limit = '10' } = c.req.valid('query');

    // Validate hours and limit with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    const limitResult = validateNumber(limit, NumericBounds.LIMIT, 'limit', 10);
    if (!limitResult.success) {
        return c.json({ error: limitResult.error }, 400);
    }
    const limitNum = limitResult.value;

    // Build safe query using query builder
    const query = createQueryBuilder('client_metrics', c.env.ENVIRONMENT);
    query
        .select(['blob3 as typeName', 'SUM(double1) as count'])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'validation'")
        .whereRaw("blob2 = 'unknown'")
        .groupBy(['blob3'])
        .orderBy('count', 'DESC')
        .limit(limitNum);

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /validation-unknown-types returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /validation-unknown-types returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No unknown type data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    const rows = result.data as Array<{ typeName: string; count: number }>;
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const data = rows.map((row) => ({
        typeName: row.typeName,
        count: row.count,
        percentage: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
    }));

    return c.json(
        {
            data,
            total,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/validation-timeseries
 * Returns time-bucketed validation metrics
 *
 * HAP-872: Removed mock data fallback - returns 503 when data unavailable
 */
metricsRoutes.openapi(validationTimeseriesRoute, async (c) => {
    const { hours = '24', bucket = 'hour' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    // Build safe query using query builder
    const bucketFunc = bucket === 'day' ? 'Day' : 'Hour';
    const query = createQueryBuilder('client_metrics', c.env.ENVIRONMENT);
    query
        .select([
            `toStartOf${bucketFunc}(timestamp) as timestamp`,
            'SUM(double1) as totalFailures',
            'SUM(double3) as schemaFailures',
            'SUM(double4) as strictFailures',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'validation'")
        .whereRaw("blob2 = 'summary'")
        .groupBy(['timestamp'])
        .orderBy('timestamp', 'ASC');

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /validation-timeseries returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /validation-timeseries returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No validation metrics data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    const data = (result.data as Array<{
        timestamp: string;
        totalFailures: number;
        schemaFailures: number;
        strictFailures: number;
    }>).map((row) => ({
        timestamp: row.timestamp,
        totalFailures: row.totalFailures ?? 0,
        schemaFailures: row.schemaFailures ?? 0,
        unknownTypes: (row.totalFailures ?? 0) - (row.schemaFailures ?? 0) - (row.strictFailures ?? 0),
        strictFailures: row.strictFailures ?? 0,
    }));

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

// HAP-872: Removed generateMockValidationTimeseries function - mock data fallbacks are no longer used

// ============================================================================
// WebSocket Metrics Route Handlers (HAP-896)
// ============================================================================

// WebSocket Metrics Schemas
const WebSocketSummarySchema = z
    .object({
        totalConnections: z.number().openapi({ example: 1250 }),
        totalBroadcasts: z.number().openapi({ example: 8500 }),
        totalErrors: z.number().openapi({ example: 25 }),
        avgConnectionTimeMs: z.number().openapi({ example: 45.5 }),
        avgBroadcastLatencyMs: z.number().openapi({ example: 2.3 }),
        avgSessionDurationMs: z.number().openapi({ example: 180000 }),
        byClientType: z.object({
            userScoped: z.number().openapi({ example: 500 }),
            sessionScoped: z.number().openapi({ example: 350 }),
            machineScoped: z.number().openapi({ example: 400 }),
        }),
        byAuthMethod: z.object({
            ticketAuth: z.number().openapi({ example: 600 }),
            headerAuth: z.number().openapi({ example: 400 }),
            messageAuth: z.number().openapi({ example: 250 }),
        }),
    })
    .openapi('WebSocketSummary');

const ConnectionTimePointSchema = z
    .object({
        timestamp: z.string().openapi({ example: '2025-12-26T00:00:00Z' }),
        count: z.number().openapi({ example: 42 }),
        avgTimeMs: z.number().openapi({ example: 45.5 }),
        p50TimeMs: z.number().openapi({ example: 35 }),
        p95TimeMs: z.number().openapi({ example: 120 }),
        p99TimeMs: z.number().openapi({ example: 250 }),
    })
    .openapi('ConnectionTimePoint');

const BroadcastLatencyPointSchema = z
    .object({
        timestamp: z.string().openapi({ example: '2025-12-26T00:00:00Z' }),
        count: z.number().openapi({ example: 150 }),
        avgLatencyMs: z.number().openapi({ example: 2.3 }),
        p50LatencyMs: z.number().openapi({ example: 1.5 }),
        p95LatencyMs: z.number().openapi({ example: 8 }),
        avgRecipients: z.number().openapi({ example: 3.2 }),
    })
    .openapi('BroadcastLatencyPoint');

const ErrorBreakdownSchema = z
    .object({
        errorType: z.string().openapi({ example: 'error:4001' }),
        count: z.number().openapi({ example: 15 }),
        percentage: z.number().openapi({ example: 60.0 }),
    })
    .openapi('ErrorBreakdown');

type WebSocketSummary = z.infer<typeof WebSocketSummarySchema>;
type ConnectionTimePoint = z.infer<typeof ConnectionTimePointSchema>;
type BroadcastLatencyPoint = z.infer<typeof BroadcastLatencyPointSchema>;
type ErrorBreakdown = z.infer<typeof ErrorBreakdownSchema>;

// WebSocket Summary Route
const websocketSummaryRoute = createRoute({
    method: 'get',
    path: '/websocket/summary',
    tags: ['Metrics', 'WebSocket'],
    summary: 'Get WebSocket performance summary',
    description: 'Returns aggregated WebSocket metrics including connection times, broadcast latency, and error rates.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
        }),
    },
    responses: {
        200: {
            description: 'WebSocket summary retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: WebSocketSummarySchema,
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

// WebSocket Connections Timeseries Route
const websocketConnectionsRoute = createRoute({
    method: 'get',
    path: '/websocket/connections',
    tags: ['Metrics', 'WebSocket'],
    summary: 'Get WebSocket connection time trends',
    description: 'Returns time-bucketed connection establishment time metrics.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
            bucket: z.enum(['hour', 'day']).optional().openapi({
                example: 'hour',
                description: 'Time bucket size (default: hour)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Connection metrics retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(ConnectionTimePointSchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

// WebSocket Broadcast Latency Route
const websocketBroadcastsRoute = createRoute({
    method: 'get',
    path: '/websocket/broadcasts',
    tags: ['Metrics', 'WebSocket'],
    summary: 'Get WebSocket broadcast latency trends',
    description: 'Returns time-bucketed broadcast delivery latency metrics.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
            bucket: z.enum(['hour', 'day']).optional().openapi({
                example: 'hour',
                description: 'Time bucket size (default: hour)',
            }),
        }),
    },
    responses: {
        200: {
            description: 'Broadcast metrics retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(BroadcastLatencyPointSchema),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

// WebSocket Errors Route
const websocketErrorsRoute = createRoute({
    method: 'get',
    path: '/websocket/errors',
    tags: ['Metrics', 'WebSocket'],
    summary: 'Get WebSocket error breakdown',
    description: 'Returns breakdown of WebSocket errors by type.',
    request: {
        query: z.object({
            hours: z
                .string()
                .regex(/^\d{1,3}$/, 'Hours must be a number between 1-720')
                .optional()
                .openapi({
                    example: '24',
                    description: 'Number of hours to look back (1-720, default: 24)',
                }),
        }),
    },
    responses: {
        200: {
            description: 'Error breakdown retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: z.array(ErrorBreakdownSchema),
                        total: z.number(),
                        timestamp: z.string(),
                    }),
                },
            },
        },
        400: {
            description: 'Validation error',
            content: {
                'application/json': {
                    schema: ErrorResponseSchema,
                },
            },
        },
        503: {
            description: 'Data unavailable',
            content: {
                'application/json': {
                    schema: DataUnavailableResponseSchema,
                },
            },
        },
    },
});

/**
 * GET /api/metrics/websocket/summary
 * Returns WebSocket performance summary
 *
 * @remarks
 * Field mappings for ws_metrics dataset:
 * - blob1: metric type ('ws_connect' | 'ws_broadcast' | 'ws_disconnect' | 'ws_error')
 * - blob2: userId
 * - blob3: clientType ('user-scoped' | 'session-scoped' | 'machine-scoped')
 * - blob4: context (auth method for connect, filter type for broadcast, error code for error)
 * - double1: durationMs / latencyMs
 * - double2: recipientCount (for broadcasts)
 * - index1: sessionId or machineId
 */
metricsRoutes.openapi(websocketSummaryRoute, async (c) => {
    const { hours = '24' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    // Query for overall metrics
    const summaryQuery = createQueryBuilder('ws_metrics', c.env.ENVIRONMENT);
    summaryQuery
        .select([
            'blob1 as metricType',
            'COUNT() as count',
            'AVG(double1) as avgValue',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .groupBy(['blob1']);

    // Query for client type breakdown
    const clientTypeQuery = createQueryBuilder('ws_metrics', c.env.ENVIRONMENT);
    clientTypeQuery
        .select([
            'blob3 as clientType',
            'COUNT() as count',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'ws_connect'")
        .groupBy(['blob3']);

    // Query for auth method breakdown
    const authMethodQuery = createQueryBuilder('ws_metrics', c.env.ENVIRONMENT);
    authMethodQuery
        .select([
            'blob4 as authMethod',
            'COUNT() as count',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'ws_connect'")
        .groupBy(['blob4']);

    const [summaryResult, clientTypeResult, authMethodResult] = await Promise.all([
        queryAnalyticsEngine(c.env, summaryQuery.build()),
        queryAnalyticsEngine(c.env, clientTypeQuery.build()),
        queryAnalyticsEngine(c.env, authMethodQuery.build()),
    ]);

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!summaryResult.success) {
        console.warn(`[Metrics] /websocket/summary returning 503 - ${summaryResult.reason}: ${summaryResult.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: summaryResult.reason,
                message: summaryResult.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!summaryResult.data || summaryResult.data.length === 0) {
        console.warn('[Metrics] /websocket/summary returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No WebSocket metrics data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    // Process summary metrics
    const metricsMap: Record<string, { count: number; avgValue: number }> = {};
    for (const row of summaryResult.data as Array<{ metricType: string; count: number; avgValue: number }>) {
        metricsMap[row.metricType] = { count: row.count, avgValue: row.avgValue };
    }

    // Process client type breakdown
    const clientTypeMap: Record<string, number> = {};
    if (clientTypeResult.success && clientTypeResult.data) {
        for (const row of clientTypeResult.data as Array<{ clientType: string; count: number }>) {
            clientTypeMap[row.clientType] = row.count;
        }
    }

    // Process auth method breakdown
    const authMethodMap: Record<string, number> = {};
    if (authMethodResult.success && authMethodResult.data) {
        for (const row of authMethodResult.data as Array<{ authMethod: string; count: number }>) {
            authMethodMap[row.authMethod] = row.count;
        }
    }

    const data: WebSocketSummary = {
        totalConnections: metricsMap['ws_connect']?.count ?? 0,
        totalBroadcasts: metricsMap['ws_broadcast']?.count ?? 0,
        totalErrors: metricsMap['ws_error']?.count ?? 0,
        avgConnectionTimeMs: Math.round((metricsMap['ws_connect']?.avgValue ?? 0) * 10) / 10,
        avgBroadcastLatencyMs: Math.round((metricsMap['ws_broadcast']?.avgValue ?? 0) * 10) / 10,
        avgSessionDurationMs: Math.round(metricsMap['ws_disconnect']?.avgValue ?? 0),
        byClientType: {
            userScoped: clientTypeMap['user-scoped'] ?? 0,
            sessionScoped: clientTypeMap['session-scoped'] ?? 0,
            machineScoped: clientTypeMap['machine-scoped'] ?? 0,
        },
        byAuthMethod: {
            ticketAuth: authMethodMap['ticket-auth'] ?? 0,
            headerAuth: authMethodMap['header-auth'] ?? 0,
            messageAuth: authMethodMap['message-auth'] ?? 0,
        },
    };

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/websocket/connections
 * Returns connection time trends
 */
metricsRoutes.openapi(websocketConnectionsRoute, async (c) => {
    const { hours = '24', bucket = 'hour' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    const bucketFunc = bucket === 'day' ? 'Day' : 'Hour';
    const query = createQueryBuilder('ws_metrics', c.env.ENVIRONMENT);
    query
        .select([
            `toStartOf${bucketFunc}(timestamp) as timestamp`,
            'COUNT() as count',
            'AVG(double1) as avgTimeMs',
            'quantile(0.50)(double1) as p50TimeMs',
            'quantile(0.95)(double1) as p95TimeMs',
            'quantile(0.99)(double1) as p99TimeMs',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'ws_connect'")
        .groupBy(['timestamp'])
        .orderBy('timestamp', 'ASC');

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /websocket/connections returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /websocket/connections returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No WebSocket connection metrics data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    const data = (result.data as Array<{
        timestamp: string;
        count: number;
        avgTimeMs: number;
        p50TimeMs: number;
        p95TimeMs: number;
        p99TimeMs: number;
    }>).map((row) => ({
        timestamp: row.timestamp,
        count: row.count,
        avgTimeMs: Math.round(row.avgTimeMs * 10) / 10,
        p50TimeMs: Math.round(row.p50TimeMs),
        p95TimeMs: Math.round(row.p95TimeMs),
        p99TimeMs: Math.round(row.p99TimeMs),
    }));

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/websocket/broadcasts
 * Returns broadcast latency trends
 */
metricsRoutes.openapi(websocketBroadcastsRoute, async (c) => {
    const { hours = '24', bucket = 'hour' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    const bucketFunc = bucket === 'day' ? 'Day' : 'Hour';
    const query = createQueryBuilder('ws_metrics', c.env.ENVIRONMENT);
    query
        .select([
            `toStartOf${bucketFunc}(timestamp) as timestamp`,
            'COUNT() as count',
            'AVG(double1) as avgLatencyMs',
            'quantile(0.50)(double1) as p50LatencyMs',
            'quantile(0.95)(double1) as p95LatencyMs',
            'AVG(double2) as avgRecipients',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'ws_broadcast'")
        .groupBy(['timestamp'])
        .orderBy('timestamp', 'ASC');

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /websocket/broadcasts returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /websocket/broadcasts returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No WebSocket broadcast metrics data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    const data = (result.data as Array<{
        timestamp: string;
        count: number;
        avgLatencyMs: number;
        p50LatencyMs: number;
        p95LatencyMs: number;
        avgRecipients: number;
    }>).map((row) => ({
        timestamp: row.timestamp,
        count: row.count,
        avgLatencyMs: Math.round(row.avgLatencyMs * 10) / 10,
        p50LatencyMs: Math.round(row.p50LatencyMs * 10) / 10,
        p95LatencyMs: Math.round(row.p95LatencyMs * 10) / 10,
        avgRecipients: Math.round(row.avgRecipients * 10) / 10,
    }));

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/websocket/errors
 * Returns error breakdown
 */
metricsRoutes.openapi(websocketErrorsRoute, async (c) => {
    const { hours = '24' } = c.req.valid('query');

    // Validate hours with bounds checking
    const hoursResult = validateNumber(hours, NumericBounds.HOURS, 'hours', 24);
    if (!hoursResult.success) {
        return c.json({ error: hoursResult.error }, 400);
    }
    const hoursNum = hoursResult.value;

    const query = createQueryBuilder('ws_metrics', c.env.ENVIRONMENT);
    query
        .select([
            'blob4 as errorType',
            'COUNT() as count',
        ])
        .whereTimestampInterval(hoursNum, 'HOUR')
        .whereRaw("blob1 = 'ws_disconnect'")
        .whereRaw("blob4 != 'clean'")
        .groupBy(['blob4'])
        .orderBy('count', 'DESC')
        .limit(20);

    const result = await queryAnalyticsEngine(c.env, query.build());

    // HAP-872: Return 503 if Analytics Engine is not configured or query failed
    if (!result.success) {
        console.warn(`[Metrics] /websocket/errors returning 503 - ${result.reason}: ${result.message}`);
        return c.json(
            {
                error: 'Data unavailable',
                reason: result.reason,
                message: result.message,
            },
            503
        );
    }

    // HAP-872: Return 503 if dataset is empty
    if (!result.data || result.data.length === 0) {
        console.warn('[Metrics] /websocket/errors returning 503 - empty dataset');
        return c.json(
            {
                error: 'Data unavailable',
                reason: 'empty_dataset' as const,
                message: `No WebSocket error data found in the last ${hoursNum} hours.`,
            },
            503
        );
    }

    const rows = result.data as Array<{ errorType: string; count: number }>;
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    const data: ErrorBreakdown[] = rows.map((row) => ({
        errorType: row.errorType,
        count: row.count,
        percentage: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
    }));

    return c.json(
        {
            data,
            total,
            timestamp: new Date().toISOString(),
        },
        200
    );
});
