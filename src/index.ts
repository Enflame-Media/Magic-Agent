import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './env';
import { metricsRoutes } from './routes/metrics';
import { authRoutes } from './routes/auth';
import { adminRoutes } from './routes/admin';
import { adminAuthMiddleware } from './middleware/auth';
import { csrfMiddleware } from './middleware/csrf';
import { bodySizeLimits } from './middleware/bodySize';
import { requestIdMiddleware } from './middleware/requestId';
import { securityHeadersMiddleware } from './middleware/securityHeaders';
import { authRateLimitMiddleware, rateLimits } from './middleware/rateLimit';
import { CORS_CONFIG, getAllowedOrigins } from './lib/constants';
import { createSafeError, getErrorStatusCode } from '@happy/errors';
import { cleanupExpiredAuditLogs } from './scheduled/auditLogCleanup';

/**
 * Application version (should match package.json)
 */
const APP_VERSION = '0.1.0';

/**
 * Main Hono application instance with OpenAPI support
 * Configured with typed environment bindings for Cloudflare Workers
 */
const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

/*
 * Global Middleware
 * Applied in order: requestId → logging → CORS → body size → CSRF → routes → error handling
 */
app.use('*', requestIdMiddleware());
app.use('*', logger());

/*
 * Body size limiting (HAP-629)
 * Prevents DoS attacks via oversized request payloads.
 * Applied early before authentication overhead.
 */
app.use('*', bodySizeLimits.default()); // 1MB limit for admin API

/**
 * CORS Configuration for Cross-Origin Dashboard Requests
 *
 * This API is served from happy-admin-api.enflamemedia.com
 * The dashboard is served from happy-admin.enflamemedia.com
 *
 * Critical settings for cross-origin authentication:
 * - credentials: true - Allows cookies to be sent cross-origin
 * - exposeHeaders: ['Set-Cookie'] - Allows browser to read Set-Cookie header
 *
 * Environment-aware origin handling (HAP-632):
 * - Production: Only production origins allowed
 * - Development/Staging: Both production and localhost origins allowed
 */
app.use('*', async (c, next) => {
    const allowedOrigins = getAllowedOrigins(c.env?.ENVIRONMENT);
    return cors({
        origin: allowedOrigins,
        allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        exposeHeaders: ['Set-Cookie'],
        maxAge: CORS_CONFIG.PREFLIGHT_MAX_AGE, // 24 hours preflight cache
    })(c, next);
});

/**
 * Security Headers Middleware (HAP-627)
 *
 * Adds standard security headers to all responses:
 * - Content-Security-Policy: Prevents XSS and data injection
 * - X-Frame-Options: Prevents clickjacking
 * - X-Content-Type-Options: Prevents MIME sniffing
 * - Strict-Transport-Security: Enforces HTTPS (production only)
 * - X-XSS-Protection: Legacy XSS protection
 * - Referrer-Policy: Controls referrer leakage
 * - Permissions-Policy: Restricts browser features
 *
 * Applied after CORS to ensure headers are on final responses.
 */
app.use('*', securityHeadersMiddleware());

/**
 * CSRF Protection Middleware
 *
 * SECURITY FIX (HAP-616): Implements double-submit cookie pattern.
 * All state-changing requests (POST, PUT, DELETE, PATCH) require
 * a valid X-CSRF-Token header matching the csrf-token cookie.
 *
 * Applied after CORS to ensure preflight requests work correctly.
 */
app.use('*', csrfMiddleware());

/*
 * API Routes
 */

/**
 * Rate Limiting for Authentication Endpoints
 *
 * SECURITY FIX (HAP-617): Implements per-endpoint rate limiting to prevent:
 * - Brute force password attacks (5 req/min on sign-in)
 * - Mass account registration (3 req/min on sign-up)
 * - Email flooding (3 req/5min on forgot-password)
 *
 * Rate limits are tracked per IP using Cloudflare KV.
 * Returns 429 Too Many Requests with Retry-After header when exceeded.
 */
app.use('/api/auth/*', authRateLimitMiddleware());

// Mount authentication routes (Better-Auth) - public
app.route('/api/auth', authRoutes);

/**
 * Protected metrics routes - require ADMIN authorization
 *
 * SECURITY FIX (HAP-612): Changed from authMiddleware to adminAuthMiddleware.
 * Now requires both:
 * 1. Valid session (authentication)
 * 2. Admin role (authorization)
 *
 * SECURITY FIX (HAP-617): Rate limited to 60 req/min to prevent Analytics abuse.
 */
app.use('/api/metrics/*', rateLimits.metrics());
app.use('/api/metrics/*', adminAuthMiddleware());
app.route('/api/metrics', metricsRoutes);

/**
 * Protected admin routes - require ADMIN authorization
 *
 * HAP-639: Custom admin endpoints for user management
 * Provides role updates with self-protection and audit logging.
 */
app.use('/api/admin/*', adminAuthMiddleware());
app.route('/api/admin', adminRoutes);

/**
 * Root endpoint - API information
 * @route GET /
 * @returns API welcome message with version and environment
 */
app.get('/', (c) => {
    return c.json({
        message: 'Welcome to Happy Admin API!',
        version: APP_VERSION,
        environment: c.env?.ENVIRONMENT ?? 'production',
        timestamp: new Date().toISOString(),
        docs: '/api/docs',
    });
});

/**
 * Health check endpoint
 * @route GET /health
 * @returns Service health status
 */
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: APP_VERSION,
    });
});

/**
 * Readiness check endpoint
 * @route GET /ready
 * @returns Service readiness status with dependency checks
 *
 * @remarks
 * HAP-638: Enhanced to test actual Secrets Store retrieval for Analytics Engine
 */
app.get('/ready', async (c) => {
    const checks: Record<string, boolean> = {
        database: false,
        analyticsBindings: false,
        analyticsSecrets: false,
    };
    const details: Record<string, string> = {};

    // Check D1 database connectivity
    try {
        await c.env.DB.prepare('SELECT 1').first();
        checks.database = true;
    } catch (error) {
        checks.database = false;
        details.database = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check Analytics Engine bindings exist
    checks.analyticsBindings = !!(c.env.ANALYTICS_ACCOUNT_ID && c.env.ANALYTICS_API_TOKEN);
    if (!checks.analyticsBindings) {
        details.analyticsBindings = 'Missing ANALYTICS_ACCOUNT_ID or ANALYTICS_API_TOKEN binding';
    }

    // Check Analytics Engine secrets can be retrieved (HAP-638)
    if (checks.analyticsBindings) {
        try {
            const accountId = await c.env.ANALYTICS_ACCOUNT_ID!.get();
            const apiToken = await c.env.ANALYTICS_API_TOKEN!.get();

            if (accountId && apiToken) {
                checks.analyticsSecrets = true;
                // Log partial values for debugging (safe - only shows format, not full value)
                details.analyticsAccountId = accountId.length > 8
                    ? `${accountId.substring(0, 4)}...${accountId.substring(accountId.length - 4)} (${accountId.length} chars)`
                    : `[${accountId.length} chars]`;
                details.analyticsApiToken = apiToken.length > 8
                    ? `${apiToken.substring(0, 4)}...${apiToken.substring(apiToken.length - 4)} (${apiToken.length} chars)`
                    : `[${apiToken.length} chars]`;
            } else {
                details.analyticsSecrets = 'Secrets Store returned empty values';
            }
        } catch (error) {
            checks.analyticsSecrets = false;
            details.analyticsSecrets = error instanceof Error ? error.message : 'Failed to retrieve secrets';
        }
    }

    const isReady = checks.database && checks.analyticsBindings && checks.analyticsSecrets;

    return c.json(
        {
            ready: isReady,
            checks,
            details,
            timestamp: new Date().toISOString(),
        },
        isReady ? 200 : 503
    );
});

/*
 * OpenAPI 3.1 Documentation
 */
app.doc('/api/openapi.json', {
    openapi: '3.1.0',
    info: {
        version: APP_VERSION,
        title: 'Happy Admin API',
        description: 'Analytics Engine dashboard API for Happy sync metrics visualization',
    },
    servers: [
        {
            url: 'https://happy-admin-api.enflamemedia.com',
            description: 'Production API server',
        },
        {
            url: 'https://happy-admin-api-dev.enflamemedia.com',
            description: 'Development API server',
        },
        {
            url: 'http://localhost:8788',
            description: 'Local development server',
        },
    ],
});

/**
 * Swagger UI endpoint
 * @route GET /api/docs
 * @returns Interactive API documentation
 */
app.get('/api/docs', swaggerUI({ url: '/api/openapi.json' }));

/*
 * Error Handling (HAP-630)
 *
 * Security: Uses createSafeError to prevent information leakage.
 * - Stack traces are logged internally, never sent to clients
 * - Request ID included for support correlation
 * - AppError messages are user-safe by design
 * - Unknown errors get generic messages in production
 */
app.onError((err, c) => {
    const requestId = c.get('requestId');
    const isDevelopment = c.env?.ENVIRONMENT === 'development';

    // createSafeError logs full error internally and returns sanitized response
    const safeError = createSafeError(err, { requestId, isDevelopment });

    // Determine appropriate status code
    const statusCode = getErrorStatusCode(err);

    return c.json(safeError, statusCode);
});

/*
 * 404 Handler
 * Includes request ID for correlation (HAP-630)
 */
app.notFound((c) => {
    const requestId = c.get('requestId');
    return c.json({
        error: 'Not found',
        requestId,
        timestamp: new Date().toISOString(),
    }, 404);
});

/**
 * Export the Worker
 *
 * Includes both HTTP fetch handler and scheduled handler for cron triggers.
 *
 * @remarks
 * Scheduled handler (HAP-865):
 * - Runs daily at 03:00 UTC via Cloudflare Cron Trigger
 * - Cleans up audit logs older than 90 days
 */
export default {
    fetch: app.fetch,

    /**
     * Scheduled event handler for Cloudflare Cron Triggers
     *
     * @param event - Scheduled event from Cloudflare
     * @param env - Environment bindings
     * @param ctx - Execution context for waitUntil
     *
     * @remarks
     * Currently handles:
     * - Audit log cleanup (HAP-865): Deletes records older than 90 days
     */
    async scheduled(
        event: ScheduledEvent,
        env: Env,
        _ctx: ExecutionContext
    ): Promise<void> {
        console.log(`[Scheduled] Cron trigger fired: ${event.cron} at ${new Date(event.scheduledTime).toISOString()}`);

        try {
            const result = await cleanupExpiredAuditLogs(env);

            console.log(
                `[Scheduled] Audit log cleanup completed: deleted=${result.deleted}, ` +
                `cutoff=${result.cutoffDate}, duration=${result.durationMs}ms`
            );
        } catch (error) {
            console.error(
                '[Scheduled] Audit log cleanup failed:',
                error instanceof Error ? error.message : error
            );
            throw error; // Re-throw to mark the scheduled event as failed
        }
    },
};
