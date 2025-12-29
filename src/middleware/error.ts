import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { HTTPException } from 'hono/http-exception';
import { AppError, type ErrorCode, createSafeError, getErrorStatusCode } from '@happy/errors';

/**
 * Maps AppError error codes to appropriate HTTP status codes.
 *
 * @param code - The error code from AppError
 * @returns Appropriate HTTP status code (typed for Hono's c.json())
 */
function getHttpStatusFromErrorCode(code: ErrorCode): ContentfulStatusCode {
    // Authentication errors → 401 Unauthorized
    if (
        code === 'AUTH_FAILED' ||
        code === 'NOT_AUTHENTICATED' ||
        code === 'TOKEN_EXPIRED' ||
        code === 'AUTH_NOT_INITIALIZED'
    ) {
        return 401;
    }

    // Not found errors → 404 Not Found
    if (code === 'NOT_FOUND' || code === 'SESSION_NOT_FOUND' || code === 'RESOURCE_NOT_FOUND') {
        return 404;
    }

    // Validation errors → 400 Bad Request
    if (code === 'INVALID_INPUT' || code === 'VALIDATION_FAILED') {
        return 400;
    }

    // Conflict errors → 409 Conflict
    if (code === 'ALREADY_EXISTS' || code === 'VERSION_CONFLICT') {
        return 409;
    }

    // Encryption errors → 400 Bad Request (client-side issue typically)
    if (code === 'ENCRYPTION_ERROR' || code === 'DECRYPTION_FAILED' || code === 'NONCE_TOO_SHORT') {
        return 400;
    }

    // Connection/network errors → 502 Bad Gateway or 503 Service Unavailable
    if (code === 'CONNECT_FAILED' || code === 'SERVICE_NOT_CONNECTED') {
        return 503;
    }

    // Timeout errors → 504 Gateway Timeout
    if (code === 'TIMEOUT' || code === 'PROCESS_TIMEOUT') {
        return 504;
    }

    // Default to 500 Internal Server Error
    return 500;
}

/**
 * Gets request ID from context with fallback generation.
 * Handles cases where requestId middleware is not registered (e.g., tests).
 *
 * @param c - Hono context (any type to work with all app configurations)
 * @returns Request ID string
 */
function getRequestId(c: { var?: { requestId?: string } }): string {
    // Access via var property (Hono's internal storage for context variables)
    const requestId = c.var?.requestId;
    if (requestId) {
        return requestId;
    }
    // Fallback: generate one for logging consistency
    return crypto.randomUUID().slice(0, 8);
}

/**
 * Global error handler middleware
 * Catches and formats errors consistently across all endpoints
 *
 * @remarks
 * HAP-646: Uses createSafeError for non-AppError errors to prevent information leakage.
 * AppError instances are considered safe (messages are designed for users).
 * Other errors get generic messages in production while full details are logged.
 *
 * @param err - The error that was thrown (AppError, HTTPException, or Error)
 * @param c - Hono context object
 * @returns JSON error response with consistent structure
 */
export const errorHandler: ErrorHandler = (err, c) => {
    // Get request ID for correlation (set by requestIdMiddleware)
    const requestId = getRequestId(c);

    // Check environment (safely access env.ENVIRONMENT)
    const env = c.env as { ENVIRONMENT?: string } | undefined;
    const isDevelopment = env?.ENVIRONMENT === 'development';

    // Handle AppError instances from @happy/errors
    // AppError messages are designed to be user-safe
    if (AppError.isAppError(err)) {
        const status = getHttpStatusFromErrorCode(err.code);
        const message = err.message || 'Internal server error';

        // Log based on status severity
        if (status >= 500) {
            console.error(`[${requestId}] Server error (AppError):`, {
                code: err.code,
                message,
                status,
                stack: err.stack,
                ...(err.cause ? { cause: err.cause.message } : {}),
                ...(err.context ? { context: err.context } : {}),
            });
        } else {
            console.warn(`[${requestId}] Client error (AppError):`, {
                code: err.code,
                message,
                status,
            });
        }

        // Return structured error response matching happy-server format
        // Include requestId for client correlation
        return c.json(
            {
                code: err.code,
                message,
                canTryAgain: err.canTryAgain,
                requestId,
                timestamp: new Date().toISOString(),
            },
            status
        );
    }

    // For all other errors (HTTPException, Error, unknown):
    // Use createSafeError to prevent information leakage (HAP-646)
    // This logs full details internally but returns generic message to clients
    const safeError = createSafeError(err, {
        requestId,
        isDevelopment,
        logger: (reqId, message, stack, context) => {
            const prefix = reqId ? `[${reqId}]` : '[Error]';
            if (err instanceof HTTPException) {
                console.error(`${prefix} HTTP error:`, { message, status: err.status });
            } else {
                console.error(`${prefix} Server error:`, { message, stack, context });
            }
        },
    });

    // Get appropriate status code
    const status = getErrorStatusCode(err) as ContentfulStatusCode;

    return c.json(safeError, status);
};
