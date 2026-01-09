import { describe, it, expect } from 'vitest';
import { AppError, ErrorCodes, type ErrorCode } from './index';

describe('ErrorCodes', () => {
    it('should have all expected error codes', () => {
        // Verify shared codes exist
        expect(ErrorCodes.AUTH_FAILED).toBe('AUTH_FAILED');
        expect(ErrorCodes.NOT_AUTHENTICATED).toBe('NOT_AUTHENTICATED');
        expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
        expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
        expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
        expect(ErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED');
    });

    it('should be readonly (const assertion)', () => {
        // TypeScript ensures this at compile time via 'as const'
        // Runtime verification that values are strings
        for (const [key, value] of Object.entries(ErrorCodes)) {
            expect(typeof key).toBe('string');
            expect(typeof value).toBe('string');
            // Key and value should match (self-documenting pattern)
            expect(key).toBe(value);
        }
    });
});

describe('AppError type safety', () => {
    it('should accept valid error codes from ErrorCodes', () => {
        const error = new AppError(ErrorCodes.AUTH_FAILED, 'Test message');
        expect(error.code).toBe('AUTH_FAILED');
        expect(error.message).toBe('Test message');
        expect(error.name).toBe('AppError');
    });

    it('should not accept arbitrary strings at compile time', () => {
        // This test verifies TypeScript catches invalid codes at compile time
        // @ts-expect-error - 'INVALID_CODE' is not a valid ErrorCode
        const error = new AppError('INVALID_CODE', 'Test');
        // Runtime still works (for backwards compatibility during migration)
        expect(error.code).toBe('INVALID_CODE');
    });

    it('should work with all static factory methods', () => {
        // fromUnknown
        const error1 = AppError.fromUnknown(
            ErrorCodes.OPERATION_FAILED,
            'Operation failed',
            new Error('Original'),
            true
        );
        expect(error1.code).toBe('OPERATION_FAILED');
        expect(error1.canTryAgain).toBe(true);
        expect(error1.cause?.message).toBe('Original');

        // withCause
        const error2 = AppError.withCause(
            ErrorCodes.FETCH_FAILED,
            'Fetch failed',
            new Error('Network error')
        );
        expect(error2.code).toBe('FETCH_FAILED');
        expect(error2.cause?.message).toBe('Network error');
    });

    it('should serialize to JSON with typed code', () => {
        const error = new AppError(ErrorCodes.NOT_FOUND, 'Resource not found', {
            canTryAgain: false,
            context: { resourceId: '123' },
        });

        const json = error.toJSON();
        expect(json.code).toBe('NOT_FOUND');
        expect(json.message).toBe('Resource not found');
        expect(json.canTryAgain).toBe(false);
        expect(json.context).toEqual({ resourceId: '123' });
    });

    it('should be instanceof AppError', () => {
        const error = new AppError(ErrorCodes.INTERNAL_ERROR, 'Test');
        expect(error instanceof AppError).toBe(true);
        expect(error instanceof Error).toBe(true);
    });

    it('should work with isAppError type guard', () => {
        const error = new AppError(ErrorCodes.AUTH_FAILED, 'Auth failed');
        expect(AppError.isAppError(error)).toBe(true);
        expect(AppError.isAppError(new Error('Regular error'))).toBe(false);
        expect(AppError.isAppError(null)).toBe(false);
        expect(AppError.isAppError(undefined)).toBe(false);
    });
});

describe('ErrorCode type', () => {
    it('should be a union of all error code strings', () => {
        // TypeScript ensures this type is correct at compile time
        // This test documents the expected behavior
        const code: ErrorCode = ErrorCodes.AUTH_FAILED;
        expect(code).toBe('AUTH_FAILED');

        // Verify the type includes various error categories
        const codes: ErrorCode[] = [
            // Shared
            ErrorCodes.AUTH_FAILED,
            ErrorCodes.NOT_AUTHENTICATED,
            ErrorCodes.VALIDATION_FAILED,
            ErrorCodes.INTERNAL_ERROR,
            // CLI-specific
            ErrorCodes.CONNECT_FAILED,
            ErrorCodes.SESSION_NOT_FOUND,
            // App-specific
            ErrorCodes.SOCKET_NOT_CONNECTED,
            ErrorCodes.FETCH_FAILED,
            // Server-specific
            ErrorCodes.AUTH_NOT_INITIALIZED,
        ];

        expect(codes).toHaveLength(9);
    });
});
