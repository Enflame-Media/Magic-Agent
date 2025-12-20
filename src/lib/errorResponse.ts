import type { Context } from 'hono';

/**
 * Standard error response type matching Zod error schemas
 *
 * All API error responses use this flat structure:
 * - Routes return { error: 'string' }
 * - Middleware returns { error: 'string' }
 * - Error handlers return { error: 'string' }
 */
export interface ApiError {
    error: string;
}

/**
 * HTTP status codes for common error scenarios
 */
export const HttpStatus = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = (typeof HttpStatus)[keyof typeof HttpStatus];

/**
 * Creates a standardized JSON error response
 *
 * @param c - Hono context
 * @param message - Human-readable error message
 * @param status - HTTP status code
 * @returns JSON response with consistent { error: string } structure
 *
 * @example
 * ```typescript
 * // In a route handler
 * if (!session) {
 *     return errorResponse(c, 'Session not found', 404);
 * }
 *
 * // In middleware
 * if (!authHeader) {
 *     return errorResponse(c, 'Missing Authorization header', 401);
 * }
 * ```
 */
export function errorResponse<T extends Record<string, unknown>>(
    c: Context<T>,
    message: string,
    status: HttpStatusCode | number
) {
    return c.json({ error: message } satisfies ApiError, status as Parameters<typeof c.json>[1]);
}

/**
 * Common error messages for consistency across the API
 *
 * Use these for standard error scenarios to maintain consistent messaging.
 */
export const ErrorMessages = {
    // Authentication errors (401)
    UNAUTHORIZED: 'Unauthorized',
    MISSING_AUTH_HEADER: 'Missing Authorization header',
    INVALID_AUTH_FORMAT: 'Invalid Authorization header format (expected: Bearer <token>)',
    EMPTY_TOKEN: 'Empty token in Authorization header',
    INVALID_TOKEN: 'Invalid or expired token',

    // Not found errors (404)
    SESSION_NOT_FOUND: 'Session not found',
    MACHINE_NOT_FOUND: 'Machine not found',
    ACCOUNT_NOT_FOUND: 'Account not found',
    ARTIFACT_NOT_FOUND: 'Artifact not found',
    ACCESS_KEY_NOT_FOUND: 'Access key not found',
    NOT_FOUND: 'Resource not found',

    // Bad request errors (400)
    INVALID_CURSOR: 'Invalid cursor format',
    INVALID_REQUEST: 'Invalid request',

    // Conflict errors (409)
    USERNAME_TAKEN: 'username-taken',

    // Internal errors (500)
    INTERNAL_ERROR: 'Internal server error',
    FAILED_TO_CREATE: 'Failed to create resource',
    FAILED_TO_UPDATE: 'Failed to update resource',
} as const;
