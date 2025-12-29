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

/**
 * Application version (should match package.json)
 */
const APP_VERSION = '0.1.0';

/**
 * Allowed origins for CORS
 * These are the dashboard domains that can make requests to this API
 */
const ALLOWED_ORIGINS = [
    // Local development
    'http://localhost:5173',
    'http://localhost:8787',
    // Production dashboard
    'https://happy-admin.enflamemedia.com',
    // Development dashboard
    'https://happy-admin-dev.enflamemedia.com',
];

/**
 * Main Hono application instance with OpenAPI support
 * Configured with typed environment bindings for Cloudflare Workers
 */
const app = new OpenAPIHono<{ Bindings: Env; Variables: Variables }>();

/*
 * Global Middleware
 * Applied in order: logging → CORS → routes → error handling
 */
app.use('*', logger());

/**
 * CORS Configuration for Cross-Origin Dashboard Requests
 *
 * This API is served from happy-admin-api.enflamemedia.com
 * The dashboard is served from happy-admin.enflamemedia.com
 *
 * Critical settings for cross-origin authentication:
 * - credentials: true - Allows cookies to be sent cross-origin
 * - exposeHeaders: ['Set-Cookie'] - Allows browser to read Set-Cookie header
 */
app.use(
    '*',
    cors({
        origin: ALLOWED_ORIGINS,
        allowHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-CSRF-Token'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
        exposeHeaders: ['Set-Cookie'],
        maxAge: 86400, // 24 hours preflight cache
    })
);

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

// Mount authentication routes (Better-Auth) - public
app.route('/api/auth', authRoutes);

/**
 * Protected metrics routes - require ADMIN authorization
 *
 * SECURITY FIX (HAP-612): Changed from authMiddleware to adminAuthMiddleware.
 * Now requires both:
 * 1. Valid session (authentication)
 * 2. Admin role (authorization)
 */
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
 */
app.get('/ready', async (c) => {
    const checks: Record<string, boolean> = {
        database: false,
        analyticsConfig: false,
    };

    // Check D1 database connectivity
    try {
        await c.env.DB.prepare('SELECT 1').first();
        checks.database = true;
    } catch {
        checks.database = false;
    }

    // Check Analytics Engine configuration
    checks.analyticsConfig = !!(c.env.ANALYTICS_ACCOUNT_ID && c.env.ANALYTICS_API_TOKEN);

    const isReady = Object.values(checks).every(Boolean);

    return c.json(
        {
            ready: isReady,
            checks,
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
 * Error Handling
 */
app.onError((err, c) => {
    console.error('[Error]', err.message, err.stack);
    return c.json(
        {
            error: 'Internal Server Error',
            message: c.env?.ENVIRONMENT === 'development' ? err.message : 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
        },
        500
    );
});

/*
 * 404 Handler
 */
app.notFound((c) => {
    return c.json({ error: `Not found: ${c.req.path}` }, 404);
});

/**
 * Export the Worker
 */
export default {
    fetch: app.fetch,
};
