import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
    DevLogRequestSchema,
    DevLogResponseSchema,
    DevLogDisabledSchema,
    DevLogUnauthorizedSchema,
    DevLogRateLimitSchema,
    DevLogEnvironmentBlockedSchema,
    DevLogPayloadTooLargeSchema,
    DEV_LOG_SIZE_LIMITS,
} from '@/schemas/dev';
import { checkRateLimit, type RateLimitConfig } from '@/lib/rate-limit';

/**
 * Environment bindings for dev routes
 */
interface Env {
    DB: D1Database;
    /**
     * Current deployment environment
     * Used to enforce production guardrails (HAP-821)
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';
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
 * Maximum total request body size for dev logging (HAP-820)
 * This is a conservative limit that accounts for JSON overhead.
 * Individual field limits are enforced by Zod schema.
 */
const MAX_REQUEST_BODY_SIZE = 200 * 1024; // 200KB total body size

/**
 * Dev routes module
 *
 * Implements development/debugging endpoints:
 * - POST /logs-combined-from-cli-and-mobile-for-simple-ai-debugging - Combined logging
 *
 * These endpoints are gated behind environment variables for security.
 */
const devRoutes = new OpenAPIHono<{ Bindings: Env }>();

/**
 * Middleware to check request body size before Zod validation (HAP-820)
 * Returns 413 if Content-Length exceeds MAX_REQUEST_BODY_SIZE
 */
devRoutes.use('/logs-combined-from-cli-and-mobile-for-simple-ai-debugging', async (c, next) => {
    // Check Content-Length header if present (HAP-820)
    const contentLength = c.req.header('Content-Length');
    if (contentLength) {
        const size = parseInt(contentLength, 10);
        if (!isNaN(size) && size > MAX_REQUEST_BODY_SIZE) {
            return c.json(
                {
                    error: `Payload too large: request body exceeds ${MAX_REQUEST_BODY_SIZE} bytes limit`,
                    maxMessageLength: DEV_LOG_SIZE_LIMITS.MAX_MESSAGE_LENGTH,
                    maxRawObjectSize: DEV_LOG_SIZE_LIMITS.MAX_RAW_OBJECT_SIZE,
                },
                413
            );
        }
    }
    // Pass through to the next handler
    return next();
});

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
                    schema: DevLogDisabledSchema.or(DevLogEnvironmentBlockedSchema),
                },
            },
            description: 'Debug logging is disabled or blocked in production (HAP-821)',
        },
        413: {
            content: {
                'application/json': {
                    schema: DevLogPayloadTooLargeSchema,
                },
            },
            description: 'Payload too large - message or messageRawObject exceeds size limits (HAP-820)',
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
        `Receives log entries from mobile and CLI clients for debugging. IMPORTANT: This endpoint is disabled in production environments regardless of any configuration flags (HAP-821). In development/staging, requires DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING to be set. Optionally requires X-Dev-Logging-Token header for authentication. Rate limited to 60 requests per minute per source/IP. Payload limits: message max ${DEV_LOG_SIZE_LIMITS.MAX_MESSAGE_LENGTH} bytes, messageRawObject max ${DEV_LOG_SIZE_LIMITS.MAX_RAW_OBJECT_SIZE} bytes when serialized (HAP-820).`,
});

// @ts-expect-error - OpenAPI handler type doesn't infer all status code combinations correctly
devRoutes.openapi(combinedLoggingRoute, async (c) => {
    // HAP-821: Block dev logging in production regardless of env flag
    // This is a hard security guardrail that cannot be bypassed by configuration
    const environment = c.env.ENVIRONMENT ?? 'production'; // Default to production for safety
    if (environment === 'production') {
        return c.json({ error: 'Debug logging is not available in production' as const }, 403);
    }

    // Check if debug logging is enabled (only applies to development/staging)
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
