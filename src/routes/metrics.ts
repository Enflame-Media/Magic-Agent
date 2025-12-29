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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data (Analytics Engine unavailable or empty)',
                            example: false,
                        }),
                        timestamp: z.string(),
                    }),
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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
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
    },
});

const cacheHitsRoute = createRoute({
    method: 'get',
    path: '/cache-hits',
    tags: ['Metrics'],
    summary: 'Get profile cache hit rate',
    description: 'Returns the cache hit/miss ratio for profile lookups in the last 24 hours. Note: Currently estimates cache usage from sync mode distribution.',
    responses: {
        200: {
            description: 'Cache hit rate retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: CacheHitRateSchema,
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
                        timestamp: z.string(),
                    }),
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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
                        timestamp: z.string(),
                    }),
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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
                        timestamp: z.string(),
                    }),
                },
            },
        },
    },
});

/*
 * Route Handlers
 */

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
 */
async function queryAnalyticsEngine(
    env: Env,
    sql: string
): Promise<{ data: unknown[]; meta: unknown } | null> {
    if (!env.ANALYTICS_ACCOUNT_ID || !env.ANALYTICS_API_TOKEN) {
        console.warn('[Metrics] Analytics Engine not configured - ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN binding missing');
        return null;
    }

    // Retrieve secrets from Secrets Store
    let accountId: string;
    let apiToken: string;
    try {
        accountId = await env.ANALYTICS_ACCOUNT_ID.get();
        apiToken = await env.ANALYTICS_API_TOKEN.get();
    } catch (error) {
        console.error('[Metrics] Failed to retrieve secrets from Secrets Store:', error);
        return null;
    }

    if (!accountId || !apiToken) {
        console.warn('[Metrics] Secrets Store returned empty values for ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN');
        return null;
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
        return null;
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

    return result;
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

    // Determine if we're using mock data
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (isMockData) {
        console.warn('[Metrics] /summary returning mock data - Analytics Engine query returned no results');
    }

    // Return real data or mock fallback
    const data: MetricsSummary[] = isMockData
        ? [
              {
                  syncType: 'session',
                  syncMode: 'full',
                  count: 150,
                  avgDurationMs: 245.5,
                  p95DurationMs: 890,
                  successRate: 0.98,
              },
              {
                  syncType: 'session',
                  syncMode: 'incremental',
                  count: 450,
                  avgDurationMs: 85.2,
                  p95DurationMs: 210,
                  successRate: 0.99,
              },
          ]
        : (result.data as MetricsSummary[]);

    return c.json(
        {
            data,
            isMockData,
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

    // Determine if we're using mock data
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (isMockData) {
        console.warn('[Metrics] /timeseries returning mock data - Analytics Engine query returned no results');
    }

    // Return real data or mock fallback
    const data: TimeseriesPoint[] = isMockData
        ? generateMockTimeseries(hoursNum, bucket)
        : (result.data as TimeseriesPoint[]);

    return c.json(
        {
            data,
            isMockData,
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
 * HAP-638: Cache hit/miss tracking is NOT currently implemented in the ingestion layer.
 * The blob3 field contains sessionId, not cache status.
 *
 * This endpoint currently returns mock data until cache tracking is added to:
 * - happy-server-workers/src/routes/analytics.ts (ingestion)
 * - Or a separate cache metrics endpoint is created
 *
 * TODO: Implement cache hit tracking in happy-app sync logic and ingest to Analytics Engine
 */
metricsRoutes.openapi(cacheHitsRoute, async (c) => {
    // HAP-638: Cache hit tracking is not implemented in ingestion
    // blob3 contains sessionId, not 'hit'/'miss' values
    // For now, we can estimate cache usage from sync mode = 'cached'
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            SUM(CASE WHEN blob2 = 'cached' THEN 1 ELSE 0 END) as hits,
            SUM(CASE WHEN blob2 != 'cached' THEN 1 ELSE 0 END) as misses
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
          AND blob1 = 'profile'
        `
    );

    // Calculate from result or use mock
    let data: CacheHitRate;
    let isMockData = false;

    if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        const row = result.data[0] as { hits: number; misses: number };
        const total = (row.hits ?? 0) + (row.misses ?? 0);
        if (total > 0) {
            data = {
                hits: row.hits ?? 0,
                misses: row.misses ?? 0,
                hitRate: row.hits / total,
            };
        } else {
            // No profile syncs in timeframe, use mock
            isMockData = true;
            data = { hits: 850, misses: 150, hitRate: 0.85 };
        }
    } else {
        isMockData = true;
        console.warn('[Metrics] /cache-hits returning mock data - Analytics Engine query returned no results');
        data = { hits: 850, misses: 150, hitRate: 0.85 };
    }

    return c.json(
        {
            data,
            isMockData,
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

    // Transform result or use mock
    let data: ModeDistribution;
    let isMockData = false;

    if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        const modeMap: Record<string, number> = {};
        for (const row of result.data as { mode: string; count: number }[]) {
            modeMap[row.mode] = row.count;
        }
        const total = Object.values(modeMap).reduce((a, b) => a + b, 0);
        if (total > 0) {
            data = {
                full: modeMap['full'] ?? 0,
                incremental: modeMap['incremental'] ?? 0,
                cached: modeMap['cached'] ?? 0,
                total,
            };
        } else {
            isMockData = true;
            data = { full: 200, incremental: 450, cached: 350, total: 1000 };
        }
    } else {
        isMockData = true;
        console.warn('[Metrics] /mode-distribution returning mock data - Analytics Engine query returned no results');
        data = { full: 200, incremental: 450, cached: 350, total: 1000 };
    }

    return c.json(
        {
            data,
            isMockData,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * Generate mock timeseries data for development
 */
function generateMockTimeseries(hours: number, bucket: string): TimeseriesPoint[] {
    const data: TimeseriesPoint[] = [];
    const now = new Date();
    const bucketSize = bucket === 'day' ? 24 : 1;
    const numBuckets = Math.ceil(hours / bucketSize);

    for (let i = numBuckets - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * bucketSize * 60 * 60 * 1000);
        data.push({
            timestamp: timestamp.toISOString(),
            count: Math.floor(Math.random() * 50) + 10,
            avgDurationMs: Math.floor(Math.random() * 200) + 50,
        });
    }

    return data;
}

// ============================================================================
// Bundle Size Route Handlers (HAP-564)
// ============================================================================

/**
 * GET /api/metrics/bundle-trends
 * Returns daily bundle size averages for trend visualization
 *
 * SECURITY: This endpoint was vulnerable to SQL injection via the branch parameter.
 * Fixed in HAP-611 by using AnalyticsQueryBuilder with strict input validation.
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

    // Transform result or use mock data
    let data: BundleSizePoint[];
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (!isMockData) {
        data = (result.data as Array<{
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
    } else {
        // Generate mock data for development
        console.warn('[Metrics] /bundle-trends returning mock data - Analytics Engine query returned no results');
        data = generateMockBundleTrends(daysNum, platform);
    }

    return c.json(
        {
            data,
            isMockData,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/bundle-latest
 * Returns the most recent bundle size for each platform
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

    // Transform result or use mock data
    let data: BundleSizeLatest[];
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (!isMockData) {
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
        data = Array.from(platformMap.values());
    } else {
        // Mock data for development
        console.warn('[Metrics] /bundle-latest returning mock data - Analytics Engine query returned no results');
        data = [
            {
                platform: 'web',
                branch: 'main',
                commitHash: 'abc1234',
                totalSize: 1572864,
                jsSize: 1048576,
                assetsSize: 524288,
                timestamp: new Date().toISOString(),
            },
        ];
    }

    return c.json(
        {
            data,
            isMockData,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * Generate mock bundle trends data for development
 */
function generateMockBundleTrends(days: number, platform?: string): BundleSizePoint[] {
    const data: BundleSizePoint[] = [];
    const now = new Date();
    const platforms = platform ? [platform] : ['web'];
    const baseSize = 1500000; // ~1.5MB base

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        for (const p of platforms) {
            // Simulate gradual growth with some variance
            const growth = (days - i) * 1000; // ~1KB per day growth
            const variance = Math.floor(Math.random() * 20000) - 10000; // ±10KB variance
            const totalSize = baseSize + growth + variance;
            const jsSize = Math.floor(totalSize * 0.7); // ~70% JS
            const assetsSize = totalSize - jsSize;

            data.push({
                date: date.toISOString().split('T')[0] ?? date.toISOString(),
                platform: p,
                avgTotalSize: totalSize,
                avgJsSize: jsSize,
                avgAssetsSize: assetsSize,
                buildCount: Math.floor(Math.random() * 5) + 1,
            });
        }
    }

    return data;
}

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
const validationSummaryRoute = createRoute({
    method: 'get',
    path: '/validation-summary',
    tags: ['Metrics', 'Validation'],
    summary: 'Get validation failure summary',
    description: 'Returns aggregated validation failure metrics for the last 24 hours.',
    responses: {
        200: {
            description: 'Validation summary retrieved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        data: ValidationSummarySchema,
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
                        timestamp: z.string(),
                    }),
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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
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
                        isMockData: z.boolean().openapi({
                            description: 'True if using fallback mock data',
                            example: false,
                        }),
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
    },
});

/**
 * GET /api/metrics/validation-summary
 * Returns 24h validation failure summary
 */
metricsRoutes.openapi(validationSummaryRoute, async (c) => {
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            SUM(double1) as totalFailures,
            SUM(double3) as schemaFailures,
            SUM(double4) as strictFailures,
            COUNT(DISTINCT index1) as uniqueUsers,
            AVG(double2) as avgSessionDurationMs
        FROM client_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
          AND blob1 = 'validation'
          AND blob2 = 'summary'
        `
    );

    // Calculate unknown types from total - schema - strict
    let data: ValidationSummary;
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (!isMockData) {
        const row = result.data[0] as {
            totalFailures: number;
            schemaFailures: number;
            strictFailures: number;
            uniqueUsers: number;
            avgSessionDurationMs: number;
        };
        data = {
            totalFailures: row.totalFailures ?? 0,
            schemaFailures: row.schemaFailures ?? 0,
            unknownTypes: (row.totalFailures ?? 0) - (row.schemaFailures ?? 0) - (row.strictFailures ?? 0),
            strictFailures: row.strictFailures ?? 0,
            uniqueUsers: row.uniqueUsers ?? 0,
            avgSessionDurationMs: Math.round(row.avgSessionDurationMs ?? 0),
        };
    } else {
        // Mock data for development
        console.warn('[Metrics] /validation-summary returning mock data - Analytics Engine query returned no results');
        data = {
            totalFailures: 150,
            schemaFailures: 20,
            unknownTypes: 125,
            strictFailures: 5,
            uniqueUsers: 42,
            avgSessionDurationMs: 180000,
        };
    }

    return c.json(
        {
            data,
            isMockData,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/validation-unknown-types
 * Returns breakdown of unknown message types
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

    let data: UnknownTypeBreakdown[];
    let total = 0;
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (!isMockData) {
        const rows = result.data as Array<{ typeName: string; count: number }>;
        total = rows.reduce((sum, row) => sum + row.count, 0);
        data = rows.map((row) => ({
            typeName: row.typeName,
            count: row.count,
            percentage: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
        }));
    } else {
        // Mock data for development
        console.warn('[Metrics] /validation-unknown-types returning mock data - Analytics Engine query returned no results');
        data = [
            { typeName: 'thinking', count: 75, percentage: 60.0 },
            { typeName: 'status', count: 30, percentage: 24.0 },
            { typeName: 'progress', count: 20, percentage: 16.0 },
        ];
        total = 125;
    }

    return c.json(
        {
            data,
            total,
            isMockData,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/validation-timeseries
 * Returns time-bucketed validation metrics
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

    let data: ValidationTimeseriesPoint[];
    const isMockData = !result?.data || (Array.isArray(result.data) && result.data.length === 0);

    if (!isMockData) {
        data = (result.data as Array<{
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
    } else {
        // Generate mock timeseries data
        console.warn('[Metrics] /validation-timeseries returning mock data - Analytics Engine query returned no results');
        data = generateMockValidationTimeseries(hoursNum, bucket);
    }

    return c.json(
        {
            data,
            isMockData,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * Generate mock validation timeseries data for development
 */
function generateMockValidationTimeseries(hours: number, bucket: string): ValidationTimeseriesPoint[] {
    const data: ValidationTimeseriesPoint[] = [];
    const now = new Date();
    const bucketSize = bucket === 'day' ? 24 : 1;
    const numBuckets = Math.ceil(hours / bucketSize);

    for (let i = numBuckets - 1; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * bucketSize * 60 * 60 * 1000);
        const schemaFailures = Math.floor(Math.random() * 5);
        const unknownTypes = Math.floor(Math.random() * 20) + 5;
        const strictFailures = Math.floor(Math.random() * 2);
        data.push({
            timestamp: timestamp.toISOString(),
            totalFailures: schemaFailures + unknownTypes + strictFailures,
            schemaFailures,
            unknownTypes,
            strictFailures,
        });
    }

    return data;
}
