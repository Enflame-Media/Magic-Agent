import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
    DevLogRequestSchema,
    DevLogResponseSchema,
    DevLogDisabledSchema,
    DevLogUnauthorizedSchema,
    DevLogRateLimitSchema,
} from '@/schemas/dev';
import { checkRateLimit, type RateLimitConfig } from '@/lib/rate-limit';

/**
 * Environment bindings for dev routes
 */
interface Env {
    DB: D1Database;
    /**
     * Enable debug logging endpoint
     * Set via wrangler secret or .dev.vars
     * @security Only enable in development/staging environments
     */
    DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING?: string;
    /**
     * Shared secret token for authenticating dev logging requests
     * Must be provided via X-Dev-Logging-Token header
     * @security Keep this secret - only share with trusted clients
     */
    DEV_LOGGING_TOKEN?: string;
    /**
     * KV namespace for rate limiting (HAP-819)
     * Falls back to memory-based rate limiting if not configured
     */
    RATE_LIMIT_KV?: KVNamespace;
}

/**
 * Rate limit configuration for dev logging endpoint (HAP-819)
 *
 * 60 requests per minute per source/IP combination
 * This allows normal debug usage while preventing abuse
 */
const DEV_LOG_RATE_LIMIT: RateLimitConfig = {
    maxRequests: 60,
    windowMs: 60_000, // 1 minute
    expirationTtl: 120, // 2 minutes (covers window + cleanup margin)
};

/**
 * Dev routes module
 *
 * Implements development/debugging endpoints:
 * - POST /logs-combined-from-cli-and-mobile-for-simple-ai-debugging - Combined logging
 *
 * These endpoints are gated behind environment variables for security.
 */
const devRoutes = new OpenAPIHono<{ Bindings: Env }>();

// ============================================================================
// POST /logs-combined-from-cli-and-mobile-for-simple-ai-debugging
// ============================================================================

const combinedLoggingRoute = createRoute({
    method: 'post',
    path: '/logs-combined-from-cli-and-mobile-for-simple-ai-debugging',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: DevLogRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: DevLogResponseSchema,
                },
            },
            description: 'Log entry recorded successfully',
        },
        401: {
            content: {
                'application/json': {
                    schema: DevLogUnauthorizedSchema,
                },
            },
            description: 'Missing or invalid authentication token',
        },
        403: {
            content: {
                'application/json': {
                    schema: DevLogDisabledSchema,
                },
            },
            description: 'Debug logging is disabled',
        },
        429: {
            content: {
                'application/json': {
                    schema: DevLogRateLimitSchema,
                },
            },
            headers: {
                'Retry-After': {
                    description: 'Seconds until the rate limit resets',
                    schema: { type: 'string' },
                },
                'X-RateLimit-Limit': {
                    description: 'Maximum requests per window',
                    schema: { type: 'string' },
                },
                'X-RateLimit-Remaining': {
                    description: 'Remaining requests in current window',
                    schema: { type: 'string' },
                },
            },
            description: 'Rate limit exceeded (HAP-819)',
        },
    },
    tags: ['Development'],
    summary: 'Combined debug logging',
    description:
        'Receives log entries from mobile and CLI clients for debugging. Only enabled when DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING is set. Requires X-Dev-Logging-Token header for authentication. Rate limited to 60 requests per minute per source/IP.',
});

// @ts-expect-error - OpenAPI handler type doesn't infer all status code combinations correctly
devRoutes.openapi(combinedLoggingRoute, async (c) => {
    // Check if debug logging is enabled
    if (!c.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
        return c.json({ error: 'Debug logging is disabled' as const }, 403);
    }

    // Validate the dev logging token if one is configured
    // When DEV_LOGGING_TOKEN is set, requests must include a matching X-Dev-Logging-Token header
    if (c.env.DEV_LOGGING_TOKEN) {
        const providedToken = c.req.header('X-Dev-Logging-Token');
        if (!providedToken || providedToken !== c.env.DEV_LOGGING_TOKEN) {
            return c.json({ error: 'Unauthorized' as const }, 401);
        }
    }

    const { timestamp, level, message, messageRawObject, source, platform } =
        c.req.valid('json');

    // Rate limit by source and IP combination (HAP-819)
    // This prevents abuse while allowing legitimate debugging from multiple sources
    const clientIp = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown';
    const rateLimitIdentifier = `${source}:${clientIp}`;

    const rateLimitResult = await checkRateLimit(
        c.env.RATE_LIMIT_KV,
        'devlog',
        rateLimitIdentifier,
        DEV_LOG_RATE_LIMIT
    );

    if (!rateLimitResult.allowed) {
        return c.json(
            {
                error: 'Rate limit exceeded',
                retryAfter: rateLimitResult.retryAfter,
            } as const,
            429,
            {
                'Retry-After': String(rateLimitResult.retryAfter),
                'X-RateLimit-Limit': String(rateLimitResult.limit),
                'X-RateLimit-Remaining': '0',
            }
        );
    }

    // In Cloudflare Workers, we log to console which goes to Workers Logs
    // This is the equivalent of the file-based logging in the Node.js version
    const logData = {
        source,
        platform,
        timestamp,
        messageRawObject,
    };

    switch (level.toLowerCase()) {
        case 'error':
            console.error(`[${source}] ${message}`, logData);
            break;
        case 'warn':
        case 'warning':
            console.warn(`[${source}] ${message}`, logData);
            break;
        case 'debug':
            console.debug(`[${source}] ${message}`, logData);
            break;
        default:
            console.info(`[${source}] ${message}`, logData);
    }

    return c.json({ success: true as const });
});

export default devRoutes;
