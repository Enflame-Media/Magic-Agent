/**
 * Body Size Limiting Middleware for Hono
 *
 * Security: Prevents DoS attacks via oversized request payloads.
 * Checks Content-Length header early to reject large payloads before parsing.
 *
 * @see https://owasp.org/www-community/controls/Input_Validation
 */

import type { Context, Next, MiddlewareHandler } from 'hono';

/**
 * Body size limits for admin API (more restrictive than main API)
 */
const ADMIN_BODY_SIZE_LIMITS = {
    /** Default limit for admin endpoints (1MB) */
    DEFAULT: 1 * 1024 * 1024,
    /** Limit for user list/search endpoints (256KB) */
    SEARCH: 256 * 1024,
} as const;

/**
 * Response for 413 Payload Too Large
 */
interface PayloadTooLargeResponse {
    error: 'Payload Too Large';
    message: string;
    code: 'payload-too-large';
    maxSize: number;
}

/**
 * Body size limiting middleware options
 */
export interface BodySizeLimitOptions {
    /** Maximum body size in bytes */
    maxSize?: number;
    /** Custom error message */
    message?: string;
}

/**
 * Creates a middleware that limits request body size
 *
 * @param options - Configuration options
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * // Default limit (1MB for admin)
 * app.use('*', bodySizeLimit());
 * ```
 */
export function bodySizeLimit(options: BodySizeLimitOptions = {}): MiddlewareHandler {
    const maxSize = options.maxSize ?? ADMIN_BODY_SIZE_LIMITS.DEFAULT;
    const message = options.message ?? `Request body exceeds maximum size of ${formatBytes(maxSize)}`;

    return async (c: Context, next: Next) => {
        // Skip for GET, HEAD, OPTIONS requests (no body expected)
        const method = c.req.method.toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
            return next();
        }

        // Check Content-Length header first (fast path)
        const contentLength = c.req.header('content-length');
        if (contentLength) {
            const length = parseInt(contentLength, 10);
            if (!isNaN(length) && length > maxSize) {
                return c.json<PayloadTooLargeResponse>(
                    {
                        error: 'Payload Too Large',
                        message,
                        code: 'payload-too-large',
                        maxSize,
                    },
                    413
                );
            }
        }

        // For chunked transfers or missing Content-Length,
        // the body will be validated during parsing by Zod schemas.
        // This middleware provides early rejection for known-large payloads.
        return next();
    };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Pre-configured middleware for admin API
 */
export const bodySizeLimits = {
    /** Default limit for admin endpoints (1MB) */
    default: () => bodySizeLimit({ maxSize: ADMIN_BODY_SIZE_LIMITS.DEFAULT }),
    /** Limit for search/list endpoints (256KB) */
    search: () => bodySizeLimit({ maxSize: ADMIN_BODY_SIZE_LIMITS.SEARCH }),
} as const;
