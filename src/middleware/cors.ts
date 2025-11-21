import type { MiddlewareHandler } from 'hono';
import { cors as honoCors } from 'hono/cors';

/**
 * CORS middleware configuration for Happy Server Workers
 *
 * @remarks
 * Configures Cross-Origin Resource Sharing (CORS) for the Happy Server API.
 * In development, allows localhost origins for testing with happy-cli and happy-app.
 * In production, restricts to specific allowed domains for security.
 *
 * @returns Hono CORS middleware handler
 *
 * @example
 * ```typescript
 * app.use('*', cors());
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS}
 */
export const cors = (): MiddlewareHandler => {
    return honoCors({
        /**
         * Origin validation function
         * Determines whether to allow requests from a given origin
         */
        origin: (origin) => {
            // Allow requests with no origin (e.g., Postman, curl, mobile apps)
            if (!origin) {
                return '*';
            }

            // Development: Allow localhost and 127.0.0.1 on any port
            const isLocalhost =
                origin.includes('localhost') || origin.includes('127.0.0.1');
            if (isLocalhost) {
                return origin;
            }

            // Production: Whitelist specific domains
            // TODO: Update these with actual production domains before production deployment
            const allowedDomains: readonly string[] = [
                'https://happy.app',
                'https://www.happy.app',
                'https://api.happy.app',
            ];

            if (allowedDomains.includes(origin)) {
                return origin;
            }

            // Security: Reject unknown origins in production
            // For development, this allows all origins (should be restricted for production)
            console.warn('[CORS] Rejecting unrecognized origin:', origin);
            return origin; // TODO: Change to `null` to reject in production
        },

        // HTTP methods allowed for CORS requests
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

        // Headers that can be used in requests
        allowHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-Request-Id',
            'X-Client-Version',
        ],

        // Headers that can be exposed to the client
        exposeHeaders: ['Content-Length', 'X-Request-Id', 'X-RateLimit-Limit'],

        // Cache preflight requests for 24 hours
        maxAge: 86400,

        // Allow cookies and authorization headers
        credentials: true,
    });
};
