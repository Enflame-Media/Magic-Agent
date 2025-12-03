import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import {
    DevLogRequestSchema,
    DevLogResponseSchema,
    DevLogDisabledSchema,
} from '@/schemas/dev';

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
}

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
        403: {
            content: {
                'application/json': {
                    schema: DevLogDisabledSchema,
                },
            },
            description: 'Debug logging is disabled',
        },
    },
    tags: ['Development'],
    summary: 'Combined debug logging',
    description:
        'Receives log entries from mobile and CLI clients for debugging. Only enabled when DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING is set.',
});

// @ts-expect-error - OpenAPI handler type doesn't infer all status code combinations correctly
devRoutes.openapi(combinedLoggingRoute, async (c) => {
    // Check if debug logging is enabled
    if (!c.env.DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
        return c.json({ error: 'Debug logging is disabled' as const }, 403);
    }

    const { timestamp, level, message, messageRawObject, source, platform } =
        c.req.valid('json');

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
