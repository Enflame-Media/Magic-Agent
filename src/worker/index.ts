/**
 * Happy Admin Dashboard Worker
 *
 * This is a frontend-only worker that serves the Vue.js SPA.
 * All API requests are handled by the separate happy-admin-api worker.
 *
 * The [site] configuration in wrangler.toml uploads static files to Workers KV.
 * This worker uses @cloudflare/kv-asset-handler to serve them.
 */

import { getAssetFromKV, NotFoundError, MethodNotAllowedError } from '@cloudflare/kv-asset-handler';

export interface Env {
    /**
     * Current deployment environment
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';
    /**
     * Asset namespace binding (automatically provided by [site] config)
     */
    __STATIC_CONTENT: KVNamespace;
}

/**
 * Application version (should match package.json)
 */
const APP_VERSION = '0.1.0';

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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

        try {
            // Try to serve the requested asset from KV
            return await getAssetFromKV(
                { request, waitUntil: ctx.waitUntil.bind(ctx) },
                {
                    ASSET_NAMESPACE: env.__STATIC_CONTENT,
                    ASSET_MANIFEST: (await import('__STATIC_CONTENT_MANIFEST')).default,
                }
            );
        } catch (e) {
            if (e instanceof NotFoundError) {
                // For SPA routing: serve index.html for all non-asset routes
                // This allows vue-router to handle client-side routing
                try {
                    const indexRequest = new Request(new URL('/index.html', request.url).toString(), request);
                    return await getAssetFromKV(
                        { request: indexRequest, waitUntil: ctx.waitUntil.bind(ctx) },
                        {
                            ASSET_NAMESPACE: env.__STATIC_CONTENT,
                            ASSET_MANIFEST: (await import('__STATIC_CONTENT_MANIFEST')).default,
                        }
                    );
                } catch {
                    // If index.html is also not found, something is very wrong
                    return Response.json(
                        {
                            error: 'Configuration error',
                            message: 'Static assets not found. Please check deployment.',
                        },
                        { status: 500 }
                    );
                }
            }

            if (e instanceof MethodNotAllowedError) {
                return new Response('Method Not Allowed', { status: 405 });
            }

            // Log unexpected errors and return a generic error
            console.error('Asset serving error:', e);
            return Response.json(
                {
                    error: 'Internal error',
                    message: 'An unexpected error occurred.',
                },
                { status: 500 }
            );
        }
    },
};
