/**
 * Error utilities for safe error handling and standardized error management.
 *
 * This module provides:
 * - AppError: Custom error class with error codes and cause chain support
 * - ErrorCodes: Standardized error code constants for the application
 * - getSafeErrorMessage: Utility to extract safe error messages without leaking sensitive data
 *
 * @module utils/errors
 *
 * @example Basic usage
 * ```typescript
 * import { AppError, ErrorCodes } from '@/utils/errors';
 *
 * // Throw a standardized error
 * throw new AppError(ErrorCodes.AUTH_FAILED, 'Session expired');
 *
 * // Wrap an unknown error safely
 * try {
 *   await apiCall();
 * } catch (error) {
 *   throw AppError.fromUnknownSafe(
 *     ErrorCodes.CONNECT_FAILED,
 *     'Failed to connect to server',
 *     error
 *   );
 * }
 * ```
 */
import axios from 'axios'

/**
 * Standardized error codes for the application.
 * These codes provide programmatic error identification and consistent categorization.
 *
 * @example
 * ```typescript
 * throw new AppError(ErrorCodes.AUTH_FAILED, 'Authentication token expired');
 * ```
 */
export const ErrorCodes = {
  // Connection/Network errors
  CONNECT_FAILED: 'CONNECT_FAILED',
  NO_RESPONSE: 'NO_RESPONSE',
  REQUEST_CONFIG_ERROR: 'REQUEST_CONFIG_ERROR',

  // Authentication errors
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',

  // Session/Process errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  DAEMON_START_FAILED: 'DAEMON_START_FAILED',
  PROCESS_TIMEOUT: 'PROCESS_TIMEOUT',
  VERSION_MISMATCH: 'VERSION_MISMATCH',

  // Resource errors
  LOCK_ACQUISITION_FAILED: 'LOCK_ACQUISITION_FAILED',
  DIRECTORY_REQUIRED: 'DIRECTORY_REQUIRED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  // Encryption errors
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  NONCE_TOO_SHORT: 'NONCE_TOO_SHORT',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',

  // Operation errors
  OPERATION_CANCELLED: 'OPERATION_CANCELLED',
  OPERATION_FAILED: 'OPERATION_FAILED',
  UNSUPPORTED_OPERATION: 'UNSUPPORTED_OPERATION',

  // Queue/Stream errors
  QUEUE_CLOSED: 'QUEUE_CLOSED',
  ALREADY_STARTED: 'ALREADY_STARTED',

  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

/**
 * Type representing valid error codes from the ErrorCodes constant.
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

/**
 * Structured JSON representation of an AppError.
 * Used for serialization, logging, and API responses.
 */
export interface AppErrorJSON {
  code: ErrorCode
  message: string
  name: string
  cause?: string
  stack?: string
}

/**
 * Application-specific error class with standardized error codes and cause chain support.
 *
 * AppError provides:
 * - Consistent error identification via error codes
 * - Error cause chain preservation (ES2022 compatible)
 * - Structured JSON serialization for logging and API responses
 * - Proper prototype chain for instanceof checks
 *
 * @example
 * ```typescript
 * // Basic usage
 * throw new AppError(ErrorCodes.AUTH_FAILED, 'Session expired');
 *
 * // With cause chain
 * try {
 *   await connectToServer();
 * } catch (error) {
 *   throw new AppError(
 *     ErrorCodes.CONNECT_FAILED,
 *     'Failed to connect to server',
 *     error instanceof Error ? error : undefined
 *   );
 * }
 *
 * // Serialization
 * const appError = new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid input');
 * console.log(JSON.stringify(appError)); // Uses toJSON() automatically
 * ```
 */
export class AppError extends Error {
  /** Error code for programmatic identification */
  public readonly code: ErrorCode

  /**
   * Original error that caused this error, if any.
   * Note: Using Error.cause pattern from ES2022, but not using 'override' keyword
   * due to lib configuration compatibility.
   */
  public readonly cause?: Error

  /**
   * Creates a new AppError instance.
   *
   * @param code - Error code from ErrorCodes constant
   * @param message - Human-readable error message
   * @param cause - Optional original error that caused this error
   */
  constructor(code: ErrorCode, message: string, cause?: Error) {
    super(message)
    this.code = code
    this.cause = cause
    this.name = 'AppError'

    // Fix prototype chain for ES5 compatibility with extending built-ins
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * Converts the error to a structured JSON object.
   * Called automatically by JSON.stringify().
   *
   * @returns Structured error representation
   */
  toJSON(): AppErrorJSON {
    const json: AppErrorJSON = {
      code: this.code,
      message: this.message,
      name: this.name,
    }

    // Only include optional fields if they exist
    if (this.cause?.message) {
      json.cause = this.cause.message
    }
    if (this.stack) {
      json.stack = this.stack
    }

    return json
  }

  /**
   * Creates an AppError from an unknown error value.
   * Useful for wrapping caught errors of unknown type.
   *
   * @param code - Error code to assign
   * @param message - Error message
   * @param error - Unknown error value to wrap
   * @returns AppError instance with cause chain if error was an Error
   *
   * @example
   * ```typescript
   * try {
   *   await riskyOperation();
   * } catch (error) {
   *   throw AppError.fromUnknown(
   *     ErrorCodes.OPERATION_FAILED,
   *     'Failed to complete operation',
   *     error
   *   );
   * }
   * ```
   */
  static fromUnknown(code: ErrorCode, message: string, error: unknown): AppError {
    const cause = error instanceof Error ? error : undefined
    return new AppError(code, message, cause)
  }

  /**
   * Type guard to check if an error is an AppError.
   *
   * @param error - Value to check
   * @returns True if error is an AppError instance
   *
   * @example
   * ```typescript
   * try {
   *   await someOperation();
   * } catch (error) {
   *   if (AppError.isAppError(error)) {
   *     console.log('Error code:', error.code);
   *   }
   * }
   * ```
   */
  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError
  }

  /**
   * Wraps an error with a safe message using AppError.
   * Combines getSafeErrorMessage() logic with AppError creation.
   *
   * @param code - Error code to assign
   * @param contextMessage - Context message to prepend
   * @param error - Unknown error value to wrap
   * @returns AppError with safe message
   *
   * @example
   * ```typescript
   * try {
   *   await axios.post('/api/endpoint', data);
   * } catch (error) {
   *   throw AppError.fromUnknownSafe(
   *     ErrorCodes.CONNECT_FAILED,
   *     'Failed to connect to API',
   *     error
   *   );
   * }
   * ```
   */
  static fromUnknownSafe(code: ErrorCode, contextMessage: string, error: unknown): AppError {
    const safeMessage = getSafeErrorMessage(error)
    const fullMessage = `${contextMessage}: ${safeMessage}`
    const cause = error instanceof Error ? error : undefined
    return new AppError(code, fullMessage, cause)
  }
}

/**
 * Extracts a safe, user-facing error message from an axios error.
 * This prevents leaking sensitive information like auth tokens, URLs, or request bodies.
 * Full error details should be logged separately for debugging.
 *
 * @example
 * ```typescript
 * try {
 *   await axios.post('/api/endpoint', data);
 * } catch (error) {
 *   logger.debug('Full error:', error);  // Debug log for developers
 *   throw new Error(`Operation failed: ${getSafeErrorMessage(error)}`);  // Safe for users
 * }
 * ```
 */
export function getSafeErrorMessage(error: unknown): string {
  // Handle AppError specially - it's already safe to expose
  if (error instanceof AppError) {
    return error.message
  }

  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Server responded with an error status
      return `Server returned ${error.response.status}: ${error.response.statusText}`
    } else if (error.request) {
      // Request was made but no response received
      return 'No response from server'
    } else {
      // Error in request configuration
      return 'Request configuration error'
    }
  }
  // For non-axios errors, use generic message to avoid leaking internal details
  return error instanceof Error ? 'Internal error' : 'Unknown error'
}
