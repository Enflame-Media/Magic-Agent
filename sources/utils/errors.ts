/**
 * Error utilities for standardized error management in happy-server.
 *
 * This module re-exports the shared AppError from @happy/errors and provides
 * server-specific error codes.
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

// Re-export AppError and types from shared package
export { AppError } from '@happy/errors';
export type { AppErrorOptions, AppErrorJSON } from '@happy/errors';

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
