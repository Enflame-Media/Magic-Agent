/**
 * Unified error handling for the Happy monorepo.
 *
 * This package provides:
 * - A standardized AppError class that works across all projects
 * - Unified ErrorCodes covering CLI, Server, and App
 *
 * @module @happy/errors
 *
 * @example Basic usage with ErrorCodes
 * ```typescript
 * import { AppError, ErrorCodes } from '@happy/errors';
 *
 * // Throw with error code constant
 * throw new AppError(ErrorCodes.AUTH_FAILED, 'Session expired');
 *
 * // Throw with options
 * throw new AppError(ErrorCodes.FETCH_FAILED, 'Network error', { canTryAgain: true });
 *
 * // Wrap an existing error
 * try {
 *   await fetch(url);
 * } catch (error) {
 *   throw new AppError(ErrorCodes.API_ERROR, 'Failed to fetch data', {
 *     canTryAgain: true,
 *     cause: error instanceof Error ? error : undefined
 *   });
 * }
 * ```
 */

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Unified error codes for all Happy projects.
 *
 * Error codes are organized into categories:
 * - **Shared**: Used across all projects (CLI, Server, App)
 * - **CLI-specific**: Only used in happy-cli
 * - **App-specific**: Only used in happy-app
 * - **Server-specific**: Only used in happy-server
 *
 * @example
 * ```typescript
 * import { ErrorCodes } from '@happy/errors';
 *
 * throw new AppError(ErrorCodes.AUTH_FAILED, 'Authentication failed');
 * ```
 */
export const ErrorCodes = {
    // ========================================================================
    // SHARED - Used across all projects
    // ========================================================================

    // Authentication errors
    /** Authentication failed (bad credentials, expired session, etc.) */
    AUTH_FAILED: 'AUTH_FAILED',
    /** User is not authenticated (no credentials provided) */
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    /** Authentication token has expired */
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',

    // Encryption errors
    /** General encryption/decryption error */
    ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
    /** Failed to decrypt data */
    DECRYPTION_FAILED: 'DECRYPTION_FAILED',

    // Validation errors
    /** Invalid input provided */
    INVALID_INPUT: 'INVALID_INPUT',
    /** Validation of data failed */
    VALIDATION_FAILED: 'VALIDATION_FAILED',

    // Resource errors
    /** Requested resource was not found */
    NOT_FOUND: 'NOT_FOUND',

    // Internal errors
    /** Internal error occurred */
    INTERNAL_ERROR: 'INTERNAL_ERROR',

    // ========================================================================
    // CLI-SPECIFIC
    // ========================================================================

    // Connection/Network errors (CLI)
    /** Failed to connect to server */
    CONNECT_FAILED: 'CONNECT_FAILED',
    /** No response received from server */
    NO_RESPONSE: 'NO_RESPONSE',
    /** Error in request configuration */
    REQUEST_CONFIG_ERROR: 'REQUEST_CONFIG_ERROR',

    // Authentication errors (CLI)
    /** Token exchange during auth failed */
    TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',

    // Session/Process errors (CLI)
    /** Session not found */
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    /** Failed to start daemon process */
    DAEMON_START_FAILED: 'DAEMON_START_FAILED',
    /** Process timed out */
    PROCESS_TIMEOUT: 'PROCESS_TIMEOUT',
    /** Version mismatch between components */
    VERSION_MISMATCH: 'VERSION_MISMATCH',

    // Resource errors (CLI)
    /** Failed to acquire lock */
    LOCK_ACQUISITION_FAILED: 'LOCK_ACQUISITION_FAILED',
    /** Directory is required but not found */
    DIRECTORY_REQUIRED: 'DIRECTORY_REQUIRED',
    /** Resource not found (CLI-specific context) */
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

    // Encryption errors (CLI)
    /** Nonce is too short for encryption */
    NONCE_TOO_SHORT: 'NONCE_TOO_SHORT',

    // Operation errors (CLI)
    /** Operation was cancelled by user */
    OPERATION_CANCELLED: 'OPERATION_CANCELLED',
    /** Operation failed */
    OPERATION_FAILED: 'OPERATION_FAILED',
    /** Operation is not supported */
    UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',

    // Session revival errors (CLI)
    /** Session revival failed after automatic retry */
    SESSION_REVIVAL_FAILED: 'SESSION_REVIVAL_FAILED',

    // Queue/Stream errors (CLI)
    /** Queue was closed */
    QUEUE_CLOSED: 'QUEUE_CLOSED',
    /** Operation already started */
    ALREADY_STARTED: 'ALREADY_STARTED',

    // Generic errors (CLI)
    /** Unknown error occurred */
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',

    // ========================================================================
    // APP-SPECIFIC
    // ========================================================================

    // Authentication errors (App)
    /** Invalid encryption key */
    INVALID_KEY: 'INVALID_KEY',

    // Socket/RPC errors (App)
    /** WebSocket is not connected */
    SOCKET_NOT_CONNECTED: 'SOCKET_NOT_CONNECTED',
    /** RPC call was cancelled */
    RPC_CANCELLED: 'RPC_CANCELLED',
    /** RPC call failed */
    RPC_FAILED: 'RPC_FAILED',
    /** Data synchronization failed */
    SYNC_FAILED: 'SYNC_FAILED',

    // API errors (App)
    /** General API error */
    API_ERROR: 'API_ERROR',
    /** Failed to fetch data */
    FETCH_FAILED: 'FETCH_FAILED',
    /** Fetch was aborted */
    FETCH_ABORTED: 'FETCH_ABORTED',
    /** Request timed out */
    TIMEOUT: 'TIMEOUT',

    // Resource errors (App)
    /** Version conflict during update */
    VERSION_CONFLICT: 'VERSION_CONFLICT',
    /** Resource already exists */
    ALREADY_EXISTS: 'ALREADY_EXISTS',

    // Configuration errors (App)
    /** Service or feature is not configured */
    NOT_CONFIGURED: 'NOT_CONFIGURED',

    // Subscription/Purchase errors (App)
    /** Product not found in store */
    PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',

    // Service errors (App)
    /** General service error */
    SERVICE_ERROR: 'SERVICE_ERROR',
    /** Service is not connected */
    SERVICE_NOT_CONNECTED: 'SERVICE_NOT_CONNECTED',

    // ========================================================================
    // SERVER-SPECIFIC
    // ========================================================================

    /** Authentication not initialized on server */
    AUTH_NOT_INITIALIZED: 'AUTH_NOT_INITIALIZED',
    /** Invariant violation (unexpected state) */
    INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
    /** Configuration error */
    CONFIG_ERROR: 'CONFIG_ERROR',
} as const;

/**
 * Type representing any valid error code from the ErrorCodes constant.
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ============================================================================
// APP ERROR CLASS
// ============================================================================

/**
 * Options for creating an AppError instance.
 *
 * @property canTryAgain - Whether the user can retry the operation (default: false).
 *                         Used by UI components to show retry buttons.
 * @property cause - The original error that caused this error, for error chaining.
 * @property context - Additional metadata for logging and debugging (optional).
 */
export interface AppErrorOptions {
    canTryAgain?: boolean;
    cause?: Error;
    context?: Record<string, unknown>;
}

/**
 * Structured JSON representation of an AppError.
 * Used for serialization, logging, and API responses.
 *
 * @remarks
 * WARNING: This includes stack traces. Use SafeAppErrorJSON for client responses
 * to avoid leaking internal implementation details (HAP-630).
 */
export interface AppErrorJSON {
    code: ErrorCode;
    message: string;
    name: string;
    canTryAgain: boolean;
    cause?: string;
    context?: Record<string, unknown>;
    /** Stack trace - INTERNAL USE ONLY, never expose to clients */
    stack?: string;
}

/**
 * Safe JSON representation of an AppError for API responses.
 * Omits stack traces and internal context to prevent information leakage.
 *
 * @remarks
 * HAP-630: Use this for all client-facing error responses in production.
 */
export interface SafeAppErrorJSON {
    code: ErrorCode;
    message: string;
    canTryAgain: boolean;
}

/**
 * Application-specific error class with standardized error codes and retry support.
 *
 * AppError provides:
 * - Consistent error identification via error codes
 * - Retry capability indication for UI handling
 * - Error cause chain preservation (ES2022 compatible)
 * - Optional context for logging and debugging
 * - Structured JSON serialization for logging and API responses
 * - Proper prototype chain for instanceof checks
 *
 * @example Basic usage
 * ```typescript
 * throw new AppError(ErrorCodes.AUTH_FAILED, 'Session expired');
 * ```
 *
 * @example With retry capability
 * ```typescript
 * throw new AppError(ErrorCodes.FETCH_FAILED, 'Network error', { canTryAgain: true });
 * ```
 *
 * @example With cause chain and context
 * ```typescript
 * try {
 *   await fetch(url);
 * } catch (error) {
 *   throw new AppError(ErrorCodes.API_ERROR, 'Failed to fetch data', {
 *     canTryAgain: true,
 *     cause: error instanceof Error ? error : undefined,
 *     context: { url, attemptNumber: 3 }
 *   });
 * }
 * ```
 *
 * @example Static factory for wrapping unknown errors
 * ```typescript
 * catch (error) {
 *   throw AppError.fromUnknown(ErrorCodes.OPERATION_FAILED, 'Failed', error, true);
 * }
 * ```
 */
export class AppError extends Error {
    /** Error code for programmatic identification */
    public readonly code: ErrorCode;

    /** Whether the user can retry the operation */
    public readonly canTryAgain: boolean;

    /**
     * Original error that caused this error, if any.
     * Uses Error.cause pattern from ES2022.
     */
    public readonly cause?: Error;

    /** Additional context for logging and debugging */
    public readonly context?: Record<string, unknown>;

    /**
     * Creates a new AppError instance.
     *
     * @param code - Error code from ErrorCodes for type-safe programmatic identification
     * @param message - Human-readable error message
     * @param options - Optional configuration
     * @param options.canTryAgain - Whether the operation can be retried (default: false)
     * @param options.cause - Optional original error that caused this error
     * @param options.context - Optional additional metadata for logging
     */
    constructor(
        code: ErrorCode,
        message: string,
        options?: AppErrorOptions
    ) {
        super(message);
        this.code = code;
        this.canTryAgain = options?.canTryAgain ?? false;
        this.cause = options?.cause;
        this.context = options?.context;
        this.name = 'AppError';

        // Fix prototype chain for ES5 compatibility with extending built-ins
        Object.setPrototypeOf(this, AppError.prototype);
    }

    /**
     * Converts the error to a structured JSON object.
     * Called automatically by JSON.stringify().
     */
    toJSON(): AppErrorJSON {
        const json: AppErrorJSON = {
            code: this.code,
            message: this.message,
            name: this.name,
            canTryAgain: this.canTryAgain,
        };

        if (this.cause?.message) {
            json.cause = this.cause.message;
        }
        if (this.context) {
            json.context = this.context;
        }
        if (this.stack) {
            json.stack = this.stack;
        }

        return json;
    }


    /**
     * Converts the error to a safe JSON object for API responses.
     * Omits stack traces and internal context to prevent information leakage.
     *
     * @remarks
     * HAP-630: Always use this method for client-facing error responses.
     * Use toJSON() only for internal logging where stack traces are needed.
     *
     * @returns Safe error object without sensitive details
     */
    toSafeJSON(): SafeAppErrorJSON {
        return {
            code: this.code,
            message: this.message,
            canTryAgain: this.canTryAgain,
        };
    }

    /**
     * Creates an AppError from an unknown error value.
     *
     * @param code - Error code from ErrorCodes to assign
     * @param message - Error message
     * @param error - Unknown error value to wrap
     * @param canTryAgain - Whether the operation can be retried (default: false)
     * @returns AppError instance with cause chain if error was an Error
     */
    static fromUnknown(
        code: ErrorCode,
        message: string,
        error: unknown,
        canTryAgain: boolean = false
    ): AppError {
        const cause = error instanceof Error ? error : undefined;
        return new AppError(code, message, { canTryAgain, cause });
    }

    /**
     * Creates an AppError with just a cause (backward-compatible helper).
     * Useful for CLI where canTryAgain is not typically needed.
     *
     * @param code - Error code from ErrorCodes to assign
     * @param message - Error message
     * @param cause - Optional error that caused this error
     * @returns AppError instance with cause
     */
    static withCause(code: ErrorCode, message: string, cause?: Error): AppError {
        return new AppError(code, message, { cause });
    }

    /**
     * Type guard to check if an error is an AppError.
     *
     * @param error - Value to check
     * @returns True if error is an AppError instance
     */
    static isAppError(error: unknown): error is AppError {
        return error instanceof AppError;
    }
}

// Re-export safe error utilities (HAP-630)
export { createSafeError, getErrorStatusCode } from './safeError';
export type { SafeErrorResponse, SafeErrorOptions, ErrorStatusCode } from './safeError';
