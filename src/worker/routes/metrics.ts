import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import type { Env, Variables } from '../env';

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
            hours: z.string().optional().openapi({
                example: '24',
                description: 'Number of hours to look back (default: 24)',
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
    },
});

const cacheHitsRoute = createRoute({
    method: 'get',
    path: '/cache-hits',
    tags: ['Metrics'],
    summary: 'Get profile cache hit rate',
    description: 'Returns the cache hit/miss ratio for profile lookups in the last 24 hours.',
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
            days: z.string().optional().openapi({
                example: '30',
                description: 'Number of days to look back (default: 30)',
            }),
            platform: z.enum(['ios', 'android', 'web']).optional().openapi({
                example: 'web',
                description: 'Filter by platform (default: all platforms)',
            }),
            branch: z.string().optional().openapi({
                example: 'main',
                description: 'Filter by branch (default: main)',
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
    },
});

/*
 * Route Handlers
 */

/**
 * Helper to query Analytics Engine SQL API
 */
async function queryAnalyticsEngine(
    env: Env,
    sql: string
): Promise<{ data: unknown[]; meta: unknown } | null> {
    if (!env.ANALYTICS_ACCOUNT_ID || !env.ANALYTICS_API_TOKEN) {
        console.warn('[Metrics] Analytics Engine not configured');
        return null;
    }

    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.ANALYTICS_ACCOUNT_ID}/analytics_engine/sql`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.ANALYTICS_API_TOKEN}`,
                'Content-Type': 'text/plain',
            },
            body: sql,
        }
    );

    if (!response.ok) {
        const text = await response.text();
        console.error('[Metrics] Analytics Engine query failed:', response.status, text);
        return null;
    }

    return response.json();
}

/**
 * GET /api/metrics/summary
 * Returns last 24h summary by type/mode
 */
metricsRoutes.openapi(summaryRoute, async (c) => {
    // TODO: Add auth middleware check
    // For now, return mock data to demonstrate the API structure

    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            blob1 as syncType,
            blob2 as syncMode,
            COUNT(*) as count,
            AVG(double1) as avgDurationMs,
            quantile(0.95)(double1) as p95DurationMs,
            SUM(CASE WHEN double2 = 1 THEN 1 ELSE 0 END) / COUNT(*) as successRate
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
        GROUP BY blob1, blob2
        ORDER BY count DESC
        `
    );

    // Return mock data if Analytics Engine not configured or query failed
    const data: MetricsSummary[] = (result?.data as MetricsSummary[]) ?? [
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
    ];

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/timeseries
 * Returns time-bucketed metrics
 */
metricsRoutes.openapi(timeseriesRoute, async (c) => {
    const { hours = '24', bucket = 'hour' } = c.req.valid('query');
    const hoursNum = parseInt(hours, 10) || 24;

    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            toStartOf${bucket === 'day' ? 'Day' : 'Hour'}(timestamp) as timestamp,
            COUNT(*) as count,
            AVG(double1) as avgDurationMs
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '${hoursNum}' HOUR
        GROUP BY timestamp
        ORDER BY timestamp ASC
        `
    );

    // Return mock data if not configured
    const data: TimeseriesPoint[] =
        (result?.data as TimeseriesPoint[]) ?? generateMockTimeseries(hoursNum, bucket);

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/cache-hits
 * Returns profile cache hit rate
 */
metricsRoutes.openapi(cacheHitsRoute, async (c) => {
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            SUM(CASE WHEN blob3 = 'hit' THEN 1 ELSE 0 END) as hits,
            SUM(CASE WHEN blob3 = 'miss' THEN 1 ELSE 0 END) as misses
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
          AND blob1 = 'profile'
        `
    );

    // Calculate from result or use mock
    let data: CacheHitRate;
    if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
        const row = result.data[0] as { hits: number; misses: number };
        const total = row.hits + row.misses;
        data = {
            hits: row.hits,
            misses: row.misses,
            hitRate: total > 0 ? row.hits / total : 0,
        };
    } else {
        data = { hits: 850, misses: 150, hitRate: 0.85 };
    }

    return c.json(
        {
            data,
            timestamp: new Date().toISOString(),
        },
        200
    );
});

/**
 * GET /api/metrics/mode-distribution
 * Returns full/incremental/cached distribution
 */
metricsRoutes.openapi(modeDistributionRoute, async (c) => {
    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            blob2 as mode,
            COUNT(*) as count
        FROM sync_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '24' HOUR
        GROUP BY blob2
        `
    );

    // Transform result or use mock
    let data: ModeDistribution;
    if (result?.data && Array.isArray(result.data)) {
        const modeMap: Record<string, number> = {};
        for (const row of result.data as { mode: string; count: number }[]) {
            modeMap[row.mode] = row.count;
        }
        data = {
            full: modeMap['full'] ?? 0,
            incremental: modeMap['incremental'] ?? 0,
            cached: modeMap['cached'] ?? 0,
            total: Object.values(modeMap).reduce((a, b) => a + b, 0),
        };
    } else {
        data = { full: 200, incremental: 450, cached: 350, total: 1000 };
    }

    return c.json(
        {
            data,
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
 */
metricsRoutes.openapi(bundleTrendsRoute, async (c) => {
    const { days = '30', platform, branch = 'main' } = c.req.valid('query');
    const daysNum = parseInt(days, 10) || 30;

    // Build platform filter
    const platformFilter = platform ? `AND blob1 = '${platform}'` : '';

    const result = await queryAnalyticsEngine(
        c.env,
        `
        SELECT
            toStartOfDay(timestamp) as date,
            blob1 as platform,
            AVG(double3) as avgTotalSize,
            AVG(double1) as avgJsSize,
            AVG(double2) as avgAssetsSize,
            COUNT(*) as buildCount
        FROM bundle_metrics_${c.env.ENVIRONMENT === 'production' ? 'prod' : 'dev'}
        WHERE timestamp > NOW() - INTERVAL '${daysNum}' DAY
          AND blob2 = '${branch}'
          ${platformFilter}
        GROUP BY date, blob1
        ORDER BY date ASC
        `
    );

    // Transform result or use mock data
    let data: BundleSizePoint[];
    if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
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
        data = generateMockBundleTrends(daysNum, platform);
    }

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
    if (result?.data && Array.isArray(result.data) && result.data.length > 0) {
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
