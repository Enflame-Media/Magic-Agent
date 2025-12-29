/**
 * Request ID Middleware
 *
 * HAP-630: Adds unique request IDs for error correlation and debugging.
 * The request ID is:
 * 1. Generated using crypto.randomUUID() (8-char prefix)
 * 2. Set as X-Request-ID response header
 * 3. Stored in context for error handlers
 *
 * @packageDocumentation
 * @module happy-admin-api/middleware/requestId
 */

import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../env';

/**
 * Generates a short request ID for correlation.
 * Uses first 8 characters of a UUID for brevity while maintaining uniqueness.
 *
 * @returns 8-character hex string (e.g., "a1b2c3d4")
 */
function generateRequestId(): string {
    return crypto.randomUUID().slice(0, 8);
}

/**
 * Request ID middleware that adds correlation IDs to all requests.
 *
 * Features:
 * - Sets `c.set('requestId', id)` for use in error handlers
 * - Adds `X-Request-ID` header to all responses
 * - Uses short IDs (8 chars) for log readability
 *
 * @example
 * ```typescript
 * // In index.ts
 * app.use('*', requestIdMiddleware());
 *
 * // In error handler
 * app.onError((err, c) => {
 *     const requestId = c.get('requestId');
 *     console.error(`[${requestId}]`, err.message);
 *     return c.json({ requestId, error: '...' }, 500);
 * });
 * ```
 */
export function requestIdMiddleware() {
    return createMiddleware<{ Bindings: Env; Variables: Variables }>(async (c, next) => {
        // Check if request already has an ID (from upstream proxy)
        const existingId = c.req.header('X-Request-ID');
        const requestId = existingId ?? generateRequestId();

        // Store in context for error handlers
        c.set('requestId', requestId);

        // Add to response headers for client correlation
        c.header('X-Request-ID', requestId);

        await next();
    });
}
