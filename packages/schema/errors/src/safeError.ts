/**
 * Safe Error Response Utilities
 *
 * HAP-630: Prevents information leakage in error responses.
 * Ensures production errors never expose internal implementation details
 * (stack traces, file paths, dependency versions) to clients.
 *
 * @packageDocumentation
 * @module @happy/errors/safeError
 */

import { AppError, type ErrorCode } from './index';

/**
 * Safe error response structure for API clients.
 * Contains only user-safe information with no internal implementation details.
 */
export interface SafeErrorResponse {
    /** User-friendly error message */
    error: string;
    /** Machine-readable error code for programmatic handling */
    code?: ErrorCode;
    /** Request correlation ID for support and debugging */
    requestId?: string;
    /** ISO timestamp of when the error occurred */
    timestamp: string;
    /** Whether the client can retry the operation */
    canTryAgain?: boolean;
}

/**
 * Options for creating a safe error response.
 */
export interface SafeErrorOptions {
    /** Request ID for correlation (recommended for all API responses) */
    requestId?: string;
    /** Whether running in development mode (allows more verbose errors) */
    isDevelopment?: boolean;
    /** Optional custom logger function (defaults to console.error) */
    logger?: (requestId: string | undefined, message: string, stack?: string, context?: Record<string, unknown>) => void;
}

/**
 * Default logger that logs to console.error with structured output.
 * Internal details are logged here, never sent to the client.
 */
function defaultLogger(
    requestId: string | undefined,
    message: string,
    stack?: string,
    context?: Record<string, unknown>
): void {
    const prefix = requestId ? `[${requestId}]` : '[Error]';
    console.error(prefix, message);
    if (stack) {
        console.error(prefix, 'Stack:', stack);
    }
    if (context && Object.keys(context).length > 0) {
        console.error(prefix, 'Context:', JSON.stringify(context));
    }
}

/**
 * Creates a safe error response suitable for API clients.
 *
 * This function:
 * 1. Logs the full error internally (including stack traces)
 * 2. Returns a sanitized response with no sensitive details
 * 3. Preserves user-safe AppError messages
 * 4. Uses generic messages for unknown errors in production
 *
 * @param err - The error to convert (Error, AppError, or unknown)
 * @param options - Configuration options
 * @returns Safe error response object
 *
 * @example
 * ```typescript
 * // In Hono error handler
 * app.onError((err, c) => {
 *     const requestId = c.get('requestId');
 *     const safeError = createSafeError(err, {
 *         requestId,
 *         isDevelopment: c.env?.ENVIRONMENT === 'development'
 *     });
 *     return c.json(safeError, 500);
 * });
 * ```
 */
export function createSafeError(
    err: Error | AppError | unknown,
    options: SafeErrorOptions = {}
): SafeErrorResponse {
    const { requestId, isDevelopment = false, logger = defaultLogger } = options;

    // Normalize to Error type
    const error = err instanceof Error ? err : new Error(String(err));

    // Extract context if available
    const context = AppError.isAppError(error) ? error.context : undefined;

    // Log full error internally (this is safe - never sent to client)
    logger(requestId, error.message, error.stack, context);

    // Build safe response
    const response: SafeErrorResponse = {
        error: getSafeMessage(error, isDevelopment),
        timestamp: new Date().toISOString(),
    };

    // Include code and canTryAgain for AppErrors (these are user-safe by design)
    if (AppError.isAppError(error)) {
        response.code = error.code;
        if (error.canTryAgain) {
            response.canTryAgain = true;
        }
    }

    // Always include requestId if provided (helps with support correlation)
    if (requestId) {
        response.requestId = requestId;
    }

    return response;
}

/**
 * Gets a user-safe error message.
 *
 * - AppError messages are considered safe (they're explicitly user-facing)
 * - In development, original messages are shown for debugging
 * - In production, unknown errors get a generic message
 *
 * @param error - The error to get a message from
 * @param isDevelopment - Whether to show verbose messages
 * @returns Safe message string
 */
function getSafeMessage(error: Error, isDevelopment: boolean): string {
    // AppError messages are designed to be user-safe
    if (AppError.isAppError(error)) {
        return error.message;
    }

    // In development, show actual error for debugging
    if (isDevelopment) {
        return error.message;
    }

    // Production: generic message for unknown errors
    // This prevents leaking internal details like:
    // - "Cannot read property 'x' of undefined"
    // - "ECONNREFUSED 127.0.0.1:5432"
    // - "Prisma query failed: SELECT..."
    return 'An unexpected error occurred';
}

/**
 * HTTP error status codes returned by getErrorStatusCode.
 * Limited to valid error codes to satisfy strict framework type requirements.
 */
export type ErrorStatusCode = 400 | 401 | 403 | 404 | 409 | 500 | 502 | 503;

/**
 * Extracts HTTP status code from an error.
 *
 * Uses AppError properties when available, otherwise defaults to 500.
 * This is a helper for error handlers that need status codes.
 *
 * @param err - The error to extract status from
 * @returns HTTP status code (400-599 range)
 */
export function getErrorStatusCode(err: Error | AppError | unknown): ErrorStatusCode {
    // AppError doesn't have statusCode currently, but we can infer from code
    if (AppError.isAppError(err)) {
        return getStatusCodeFromErrorCode(err.code);
    }

    // HTTPException from Hono or similar frameworks
    if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number') {
        // Validate it's a known error status code, default to 500 if not
        const status = err.status;
        if (status === 400 || status === 401 || status === 403 || status === 404 ||
            status === 409 || status === 500 || status === 502 || status === 503) {
            return status;
        }
        return 500;
    }

    // Default to 500 Internal Server Error
    return 500;
}

/**
 * Maps error codes to appropriate HTTP status codes.
 */
function getStatusCodeFromErrorCode(code: ErrorCode): ErrorStatusCode {
    // 4xx Client Errors
    const clientErrors: ErrorCode[] = [
        'NOT_FOUND',
        'SESSION_NOT_FOUND',
        'RESOURCE_NOT_FOUND',
        'PRODUCT_NOT_FOUND',
        'INVALID_INPUT',
        'VALIDATION_FAILED',
        'INVALID_KEY',
        'NONCE_TOO_SHORT',
        'DIRECTORY_REQUIRED',
    ];

    const authErrors: ErrorCode[] = [
        'NOT_AUTHENTICATED',
        'AUTH_FAILED',
        'AUTH_NOT_INITIALIZED',
        'TOKEN_EXPIRED',
        'TOKEN_EXCHANGE_FAILED',
    ];

    const conflictErrors: ErrorCode[] = [
        'ALREADY_EXISTS',
        'ALREADY_STARTED',
        'VERSION_CONFLICT',
        'VERSION_MISMATCH',
    ];

    if (clientErrors.includes(code)) {
        return code.includes('NOT_FOUND') ? 404 : 400;
    }

    if (authErrors.includes(code)) {
        return 401;
    }

    if (conflictErrors.includes(code)) {
        return 409;
    }

    // 5xx Server Errors (default)
    return 500;
}
