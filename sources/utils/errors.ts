/**
 * Error utilities for standardized error management in happy-server.
 *
 * This module provides:
 * - AppError: Custom error class with error codes and cause chain support
 * - ErrorCodes: Standardized error code constants for the server
 *
 * @module utils/errors
 *
 * @example Basic usage
 * ```typescript
 * import { AppError, ErrorCodes } from '@/utils/errors';
 *
 * // Throw a standardized error
 * throw new AppError(ErrorCodes.INVALID_INPUT, 'Invalid cursor format');
 *
 * // Wrap an unknown error safely
 * try {
 *   await dbOperation();
 * } catch (error) {
 *   throw AppError.fromUnknown(
 *     ErrorCodes.INTERNAL_ERROR,
 *     'Database operation failed',
 *     error
 *   );
 * }
 * ```
 */

/**
 * Standardized error codes for happy-server.
 * These codes provide programmatic error identification and consistent categorization.
 */
export const ErrorCodes = {
    // Validation errors
    INVALID_INPUT: 'INVALID_INPUT',
    VALIDATION_FAILED: 'VALIDATION_FAILED',

    // Authentication errors
    AUTH_FAILED: 'AUTH_FAILED',
    AUTH_NOT_INITIALIZED: 'AUTH_NOT_INITIALIZED',

    // Internal errors
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    INVARIANT_VIOLATION: 'INVARIANT_VIOLATION',
    CONFIG_ERROR: 'CONFIG_ERROR',
} as const;

/**
 * Type representing valid error codes from the ErrorCodes constant.
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Structured JSON representation of an AppError.
 * Used for serialization, logging, and API responses.
 */
export interface AppErrorJSON {
    code: ErrorCode;
    message: string;
    name: string;
    cause?: string;
    stack?: string;
}

/**
 * Application-specific error class with standardized error codes and cause chain support.
 *
 * AppError provides:
 * - Consistent error identification via error codes
 * - Error cause chain preservation (ES2022 compatible)
 * - Structured JSON serialization for logging and API responses
 * - Proper prototype chain for instanceof checks
 */
export class AppError extends Error {
    /** Error code for programmatic identification */
    public readonly code: ErrorCode;

    /**
     * Original error that caused this error, if any.
     * Note: Using Error.cause pattern from ES2022, but not using 'override' keyword
     * due to lib configuration compatibility.
     */
    public readonly cause?: Error;

    /**
     * Creates a new AppError instance.
     *
     * @param code - Error code from ErrorCodes constant
     * @param message - Human-readable error message
     * @param cause - Optional original error that caused this error
     */
    constructor(code: ErrorCode, message: string, cause?: Error) {
        super(message);
        this.code = code;
        this.cause = cause;
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
        };

        if (this.cause?.message) {
            json.cause = this.cause.message;
        }
        if (this.stack) {
            json.stack = this.stack;
        }

        return json;
    }

    /**
     * Creates an AppError from an unknown error value.
     * Useful for wrapping caught errors of unknown type.
     *
     * @param code - Error code to assign
     * @param message - Error message
     * @param error - Unknown error value to wrap
     * @returns AppError instance with cause chain if error was an Error
     */
    static fromUnknown(code: ErrorCode, message: string, error: unknown): AppError {
        const cause = error instanceof Error ? error : undefined;
        return new AppError(code, message, cause);
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
