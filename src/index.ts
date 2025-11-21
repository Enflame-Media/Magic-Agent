import { OpenAPIHono } from '@hono/zod-openapi';
import { logger } from '@/middleware/logger';
import { cors } from '@/middleware/cors';
import { errorHandler } from '@/middleware/error';
import { initAuth } from '@/lib/auth';
import authRoutes from '@/routes/auth';
import testRoutes from '@/routes/test/privacy-kit-test';

/**
 * Environment bindings interface for Cloudflare Workers
 *
 * @remarks
 * Define all environment variables and secrets here for type safety.
 * Access via `c.env` in route handlers, not `process.env`.
 */
interface Env {
    /**
     * Current deployment environment
     * @default 'production'
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';

    /**
     * D1 Database binding
     * @required
     */
    DB: D1Database;

    /**
     * Master secret for token generation/verification
     * @required Must be set via wrangler secret in production
     */
    HANDY_MASTER_SECRET: string;

    /**
     * Test secret for privacy-kit integration tests
     * @optional Only used in test routes
     */
    TEST_AUTH_SECRET?: string;
}

/**
 * Application version (should match package.json)
 */
const APP_VERSION = '0.0.0';

/**
 * Main Hono application instance with OpenAPI support
 * Configured with typed environment bindings for Cloudflare Workers
 */
const app = new OpenAPIHono<{ Bindings: Env }>();

/*
 * Global Middleware
 * Applied in order: logging → CORS → auth initialization → routes → error handling
 */
app.use('*', logger());
app.use('*', cors());

/*
 * Initialize auth module on every request
 * In Cloudflare Workers, we need to initialize per-request due to stateless nature
 * Skip initialization in test environments where HANDY_MASTER_SECRET might not be set
 */
app.use('*', async (c, next) => {
    if (c.env?.HANDY_MASTER_SECRET) {
        await initAuth(c.env.HANDY_MASTER_SECRET);
    }
    await next();
});

/*
 * API Routes
 */

// Mount authentication routes
app.route('/', authRoutes);

// Mount test routes
app.route('/test', testRoutes);

/**
 * Root endpoint - API information
 * @route GET /
 * @returns API welcome message with version and environment
 */
app.get('/', (c) => {
    return c.json({
        message: 'Welcome to Happy Server on Cloudflare Workers!',
        version: APP_VERSION,
        environment: c.env?.ENVIRONMENT ?? 'production',
        timestamp: new Date().toISOString(),
    });
});

/**
 * Health check endpoint
 * @route GET /health
 * @returns Service health status
 *
 * @remarks
 * Used by monitoring systems and load balancers to verify service availability.
 * Should always return 200 if the service is running.
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
 * @returns Service readiness status
 *
 * @remarks
 * Indicates whether the service is ready to accept traffic.
 * Different from /health - this checks dependencies (DB, external services).
 * For now, always ready since we have no dependencies yet.
 */
app.get('/ready', (c) => {
    // TODO: Add actual dependency checks when database/cache/external services are added
    const isReady = true;

    return c.json(
        {
            ready: isReady,
            timestamp: new Date().toISOString(),
        },
        isReady ? 200 : 503
    );
});

/*
 * Error Handling
 * Must be registered last to catch all errors from routes
 */
app.onError(errorHandler);

/*
 * 404 Handler
 * Catches all unmatched routes
 */
app.notFound((c) => {
    return c.json(
        {
            error: {
                message: 'Not Found',
                status: 404,
                path: c.req.path,
            },
        },
        404
    );
});

/*
 * OpenAPI 3.1 Documentation
 * Serves the complete API specification at /openapi.json
 */
app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: {
        version: APP_VERSION,
        title: 'Happy Server API',
        description: 'Cloudflare Workers API for Happy - Remote Claude Code/Codex control with end-to-end encryption',
    },
    servers: [
        {
            url: 'https://api.happy.example.com',
            description: 'Production server',
        },
        {
            url: 'http://localhost:8787',
            description: 'Local development server',
        },
    ],
});

/**
 * Export the Hono app as default for Cloudflare Workers
 */
export default app;
