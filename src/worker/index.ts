import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env, Variables } from './env';
import { metricsRoutes } from './routes/metrics';
import { authRoutes } from './routes/auth';
import { authMiddleware } from './middleware/auth';

/**
 * Application version (should match package.json)
 */
const APP_VERSION = '0.0.0';

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
app.use(
    '*',
    cors({
        origin: ['http://localhost:5173', 'http://localhost:8787'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
    })
);

/*
 * API Routes
 */

// Mount authentication routes (Better-Auth) - public
app.route('/api/auth', authRoutes);

// Protected metrics routes - require authentication
app.use('/api/metrics/*', authMiddleware());
app.route('/api/metrics', metricsRoutes);

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
            url: 'https://happy-admin.enflamemedia.com',
            description: 'Production server',
        },
        {
            url: 'http://localhost:8787',
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
    // Check if this is an API request or a frontend route
    if (c.req.path.startsWith('/api/')) {
        return c.json({ error: `Not found: ${c.req.path}` }, 404);
    }

    // For non-API routes, serve the SPA index.html (handled by Cloudflare Sites)
    // This fallback won't typically be reached since [site] handles static files
    return c.json({ error: 'Not found' }, 404);
});

/**
 * Export the Worker
 */
export default {
    fetch: app.fetch,
};
