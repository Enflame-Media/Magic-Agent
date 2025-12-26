/**
 * Happy Admin Dashboard Worker
 *
 * This is a frontend-only worker that serves the Vue.js SPA.
 * All API requests are handled by the separate happy-admin-api worker.
 *
 * The [site] configuration in wrangler.toml serves static files from ./dist.
 * This worker handles SPA routing - all non-asset routes serve index.html.
 */

export interface Env {
    /**
     * Current deployment environment
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';
}

/**
 * Application version (should match package.json)
 */
const APP_VERSION = '0.1.0';

export default {
    async fetch(request: Request, _env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Health check endpoint
        if (url.pathname === '/health') {
            return Response.json({
                status: 'healthy',
                type: 'frontend',
                version: APP_VERSION,
                timestamp: new Date().toISOString(),
            });
        }

        // For SPA routing, Cloudflare Sites handles this via the [site] bucket
        // Any non-asset request that reaches here should return 404
        // (The actual SPA routing is handled by vue-router on the client)

        // This response will rarely be seen - Cloudflare Sites serves index.html
        // for all non-matched paths when using [site] with a SPA
        return Response.json(
            {
                error: 'Not found',
                message: 'This is the Happy Admin Dashboard frontend. API requests should go to happy-admin-api.',
            },
            { status: 404 }
        );
    },
};
