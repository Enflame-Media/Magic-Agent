import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';

/**
 * Global error handler middleware
 * Catches and formats errors consistently across all endpoints
 *
 * @remarks
 * Handles both HTTPException (thrown via Hono) and generic Error objects.
 * Logs full error stack in development, sanitized message in production.
 *
 * @param err - The error that was thrown (HTTPException or Error)
 * @param c - Hono context object
 * @returns JSON error response with consistent structure
 */
export const errorHandler: ErrorHandler = (err, c) => {
    // Determine if this is a known HTTP exception
    const isHTTPException = err instanceof HTTPException;

    // Extract status code (default to 500 for unknown errors)
    const status = isHTTPException ? err.status : 500;

    // Extract error message
    const message = err.message || 'Internal server error';

    // Log error details (include stack trace for debugging)
    if (status >= 500) {
        // Server errors should be logged with full context
        // Note: err.cause is not always present, so we check for it safely
        const errorCause =
            'cause' in err
                ? (err as Error & { cause?: unknown }).cause
                : undefined;

        console.error('[Error Handler] Server error:', {
            message,
            status,
            stack: err.stack,
            // Include cause if available (not all Error objects have it)
            ...(errorCause !== undefined ? { cause: errorCause } : {}),
        });
    } else {
        // Client errors logged at lower severity
        console.warn('[Error Handler] Client error:', {
            message,
            status,
        });
    }

    // Return flat error response matching route handler format
    // This ensures consistent { error: string } structure across all error responses
    return c.json({ error: message }, status);
};
