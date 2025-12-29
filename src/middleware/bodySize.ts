/**
 * Body Size Limiting Middleware for Hono
 *
 * Security: Prevents DoS attacks via oversized request payloads.
 * Checks Content-Length header early to reject large payloads before parsing.
 *
 * @see https://owasp.org/www-community/controls/Input_Validation
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { BODY_SIZE_LIMITS } from '@happy/protocol';

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
 * // Default limit (5MB)
 * app.use('*', bodySizeLimit());
 *
 * // Custom limit for upload routes
 * app.use('/api/uploads/*', bodySizeLimit({ maxSize: BODY_SIZE_LIMITS.UPLOAD }));
 * ```
 */
export function bodySizeLimit(options: BodySizeLimitOptions = {}): MiddlewareHandler {
    const maxSize = options.maxSize ?? BODY_SIZE_LIMITS.DEFAULT;
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
 * Pre-configured middleware for common use cases
 */
export const bodySizeLimits = {
    /** Default limit for most API endpoints (5MB) */
    default: () => bodySizeLimit({ maxSize: BODY_SIZE_LIMITS.DEFAULT }),

    /** Limit for file upload endpoints (50MB) */
    upload: () => bodySizeLimit({ maxSize: BODY_SIZE_LIMITS.UPLOAD }),

    /** Limit for sync payloads (10MB) */
    sync: () => bodySizeLimit({ maxSize: BODY_SIZE_LIMITS.SYNC }),

    /** Limit for admin API endpoints (1MB) */
    admin: () => bodySizeLimit({ maxSize: BODY_SIZE_LIMITS.ADMIN }),
} as const;
