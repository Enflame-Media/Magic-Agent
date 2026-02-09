import { z } from '@hono/zod-openapi';

/**
 * Zod schemas for CI metrics ingestion endpoint with OpenAPI metadata
 *
 * These schemas define the request/response contracts for bundle size metrics ingestion:
 * - POST /v1/ci/metrics - Ingest bundle size metrics from CI/CD pipeline
 *
 * The metrics format matches what the bundle analyzer script sends.
 * Data is stored in Cloudflare Analytics Engine for later querying in the admin dashboard.
 *
 * @see HAP-564 - Add Cloudflare Analytics Engine integration for bundle size metrics
 */

// ============================================================================
// Platform and Build Types
// ============================================================================

/**
 * Schema for platform enum
 * Defines the target platform for the build
 */
const PlatformSchema = z
    .enum(['ios', 'android', 'web'])
    .openapi({
        description: 'Target platform for the build',
        example: 'web',
    });

// ============================================================================
// POST /v1/ci/metrics - Bundle Size Metrics Ingestion
// ============================================================================

/**
 * Schema for CI metrics request body
 *
 * Matches the data format sent from GitHub Actions bundle analyzer.
 * All numeric fields are in bytes for consistency.
 */
export const CIMetricRequestSchema = z
    .object({
        platform: PlatformSchema,
        branch: z.string().min(1).max(255).openapi({
            description: 'Git branch name',
            example: 'main',
        }),
        commitHash: z.string().min(7).max(40).openapi({
            description: 'Git commit SHA (short or full)',
            example: 'abc1234',
        }),
        jsBundleSize: z.number().int().min(0).openapi({
            description: 'JavaScript bundle size in bytes',
            example: 1048576,
        }),
        assetsSize: z.number().int().min(0).openapi({
            description: 'Total assets size in bytes (images, fonts, etc)',
            example: 524288,
        }),
        totalSize: z.number().int().min(0).openapi({
            description: 'Total bundle size in bytes',
            example: 1572864,
        }),
        prNumber: z.number().int().min(1).nullable().openapi({
            description: 'Pull request number (null if not from a PR)',
            example: 123,
        }),
        buildId: z.string().min(1).max(255).openapi({
            description: 'Unique build identifier (e.g., GitHub run ID + attempt)',
            example: '12345678-1',
        }),
    })
    .openapi('CIMetricRequest');

/**
 * Schema for CI metrics success response
 */
export const CIMetricResponseSchema = z
    .object({
        success: z.boolean().openapi({
            description: 'Whether the metric was successfully ingested',
            example: true,
        }),
    })
    .openapi('CIMetricResponse');

// ============================================================================
// Error Responses
// ============================================================================

/**
 * Schema for 401 Unauthorized error
 */
export const CIMetricsUnauthorizedErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Unauthorized',
        }),
    })
    .openapi('CIMetricsUnauthorizedError');

/**
 * Schema for 500 Internal Server Error
 */
export const CIMetricsInternalErrorSchema = z
    .object({
        error: z.string().openapi({
            description: 'Error message',
            example: 'Failed to ingest metric',
        }),
    })
    .openapi('CIMetricsInternalError');

// ============================================================================
// Type Exports
// ============================================================================

// Types inferred from schemas were previously exported, but they are currently unused and were removed to reduce API surface.
