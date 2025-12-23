/**
 * Unified error handling for the Happy monorepo.
 *
 * This package provides a standardized AppError class that works across all projects
 * (CLI, Server, App) with a consistent options-based constructor pattern.
 *
 * @module @happy/errors
 *
 * @example Basic usage
 * ```typescript
 * import { AppError } from '@happy/errors';
 *
 * // Throw with just code and message
 * throw new AppError('AUTH_FAILED', 'Session expired');
 *
 * // Throw with options
 * throw new AppError('FETCH_FAILED', 'Network error', { canTryAgain: true });
 *
 * // Wrap an existing error
 * try {
 *   await fetch(url);
 * } catch (error) {
 *   throw new AppError('API_ERROR', 'Failed to fetch data', {
 *     canTryAgain: true,
 *     cause: error instanceof Error ? error : undefined
 *   });
 * }
 * ```
 */

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
 */
export interface AppErrorJSON {
    code: string;
    message: string;
    name: string;
    canTryAgain: boolean;
    cause?: string;
    context?: Record<string, unknown>;
    stack?: string;
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
 * throw new AppError('AUTH_FAILED', 'Session expired');
 * ```
 *
 * @example With retry capability
 * ```typescript
 * throw new AppError('FETCH_FAILED', 'Network error', { canTryAgain: true });
 * ```
 *
 * @example With cause chain and context
 * ```typescript
 * try {
 *   await fetch(url);
 * } catch (error) {
 *   throw new AppError('API_ERROR', 'Failed to fetch data', {
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
 *   throw AppError.fromUnknown('OPERATION_FAILED', 'Failed', error, true);
 * }
 * ```
 */
export class AppError extends Error {
    /** Error code for programmatic identification */
    public readonly code: string;

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
     * @param code - Error code string for programmatic identification
     * @param message - Human-readable error message
     * @param options - Optional configuration
     * @param options.canTryAgain - Whether the operation can be retried (default: false)
     * @param options.cause - Optional original error that caused this error
     * @param options.context - Optional additional metadata for logging
     */
    constructor(
        code: string,
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
     * Creates an AppError from an unknown error value.
     *
     * @param code - Error code to assign
     * @param message - Error message
     * @param error - Unknown error value to wrap
     * @param canTryAgain - Whether the operation can be retried (default: false)
     * @returns AppError instance with cause chain if error was an Error
     */
    static fromUnknown(
        code: string,
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
     * @param code - Error code to assign
     * @param message - Error message
     * @param cause - Optional error that caused this error
     * @returns AppError instance with cause
     */
    static withCause(code: string, message: string, cause?: Error): AppError {
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
