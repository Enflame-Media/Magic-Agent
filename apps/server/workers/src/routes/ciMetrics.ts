import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
    CIMetricRequestSchema,
    CIMetricResponseSchema,
    CIMetricsUnauthorizedErrorSchema,
    CIMetricsInternalErrorSchema,
} from '@/schemas/ciMetrics';

/**
 * Environment bindings for CI metrics routes
 */
interface Env {
    BUNDLE_METRICS?: AnalyticsEngineDataset;
    CI_METRICS_API_KEY?: string;
}

/**
 * CI Metrics routes module
 *
 * Implements bundle size metrics ingestion from CI/CD pipelines:
 * - POST /v1/ci/metrics - Ingest bundle size metrics
 *
 * Uses API key authentication (not user auth) since this is called from GitHub Actions.
 * Metrics are written to Cloudflare Analytics Engine for later analysis in the dashboard.
 *
 * Analytics Engine Data Point Structure:
 * - blob1: platform ('ios' | 'android' | 'web')
 * - blob2: branch name
 * - blob3: commit hash
 * - double1: JS bundle size (bytes)
 * - double2: assets size (bytes)
 * - double3: total size (bytes)
 * - double4: PR number (0 if not from a PR)
 * - index1: build ID (for deduplication)
 *
 * @see HAP-564 Add Cloudflare Analytics Engine integration for bundle size metrics
 */
const ciMetricsRoutes = new OpenAPIHono<{ Bindings: Env }>();

// ============================================================================
// POST /v1/ci/metrics - Ingest Bundle Size Metrics
// ============================================================================

const ingestCIMetricRoute = createRoute({
    method: 'post',
    path: '/v1/ci/metrics',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: CIMetricRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: CIMetricResponseSchema,
                },
            },
            description: 'Metric successfully ingested',
        },
        401: {
            content: {
                'application/json': {
                    schema: CIMetricsUnauthorizedErrorSchema,
                },
            },
            description: 'Unauthorized - invalid or missing API key',
        },
        500: {
            content: {
                'application/json': {
                    schema: CIMetricsInternalErrorSchema,
                },
            },
            description: 'Internal server error',
        },
    },
    tags: ['CI'],
    summary: 'Ingest bundle size metrics',
    description:
        'Ingest bundle size metrics from CI/CD pipeline. ' +
        'Requires X-CI-API-Key header for authentication. ' +
        'Metrics are stored in Cloudflare Analytics Engine for trend analysis.',
});

// @ts-expect-error - OpenAPI handler type inference doesn't handle multiple response status codes correctly
ciMetricsRoutes.openapi(ingestCIMetricRoute, async (c) => {
    // Validate API key
    const apiKey = c.req.header('X-CI-API-Key');
    const expectedKey = c.env.CI_METRICS_API_KEY;

    // If API key is not configured, endpoint is disabled
    if (!expectedKey) {
        console.warn('[CI Metrics] CI_METRICS_API_KEY not configured, endpoint disabled');
        return c.json({ error: 'Unauthorized' }, 401);
    }

    // Validate the provided API key
    if (!apiKey || apiKey !== expectedKey) {
        console.warn('[CI Metrics] Invalid or missing API key');
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const metric = c.req.valid('json');

    try {
        // Check if Analytics Engine is configured
        if (!c.env.BUNDLE_METRICS) {
            // Silently accept but don't store - allows graceful degradation
            console.warn('[CI Metrics] BUNDLE_METRICS binding not configured, metric dropped');
            return c.json({ success: true });
        }

        // Write data point to Analytics Engine (fire-and-forget)
        // The writeDataPoint method returns void and writes asynchronously
        c.env.BUNDLE_METRICS.writeDataPoint({
            blobs: [
                metric.platform, // blob1: platform
                metric.branch, // blob2: branch name
                metric.commitHash, // blob3: commit hash
            ],
            doubles: [
                metric.jsBundleSize, // double1: JS bundle size
                metric.assetsSize, // double2: assets size
                metric.totalSize, // double3: total size
                metric.prNumber ?? 0, // double4: PR number (0 if not from PR)
            ],
            indexes: [
                metric.buildId, // index1: unique build identifier
            ],
        });

        console.log(
            `[CI Metrics] Ingested: platform=${metric.platform} branch=${metric.branch} total=${metric.totalSize}`
        );
        return c.json({ success: true });
    } catch (error) {
        console.error('[CI Metrics] Failed to ingest metric:', error);
        return c.json({ error: 'Failed to ingest metric' }, 500);
    }
});

export default ciMetricsRoutes;
