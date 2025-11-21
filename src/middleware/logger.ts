import type { MiddlewareHandler } from 'hono';

/**
 * Logger middleware for Cloudflare Workers
 *
 * @remarks
 * Logs incoming HTTP requests with method, path, status code, and response time.
 * Uses high-resolution timing for accurate performance measurement.
 * Logs at different levels based on response status code for better observability.
 *
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * app.use('*', logger());
 * ```
 */
export const logger = (): MiddlewareHandler => {
    return async (c, next) => {
        // Capture start time with high precision
        const start = Date.now();
        const method = c.req.method;
        const path = c.req.path;

        // Extract request ID if present (for request tracing)
        const requestId = c.req.header('X-Request-Id') || crypto.randomUUID();

        // Execute the request handler
        await next();

        // Calculate response time
        const duration = Date.now() - start;
        const status = c.res.status;

        // Create structured log object
        const logData = {
            requestId,
            method,
            path,
            status,
            duration: `${duration}ms`,
            userAgent: c.req.header('User-Agent'),
        };

        // Log at different levels based on status code
        if (status >= 500) {
            console.error('[Request] Server error:', logData);
        } else if (status >= 400) {
            console.warn('[Request] Client error:', logData);
        } else {
            console.log('[Request] Success:', logData);
        }
    };
};
