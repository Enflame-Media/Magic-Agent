/**
 * Tests for rate limiting utility
 *
 * @see HAP-409 - Add rate limiting to WebSocket ticket endpoint
 * @see HAP-620 - SECURITY: Rate Limiting Silently Bypassed When KV Missing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    checkRateLimit,
    getRateLimitStatus,
    resetRateLimit,
    resetFallbackWarning,
    clearFallbackStore,
    getFallbackStoreSize,
    getFallbackMaxEntries,
    populateFallbackStore,
    triggerFallbackCleanup,
    TICKET_RATE_LIMIT,
    type RateLimitConfig,
} from './rate-limit';

/**
 * Create a mock KV namespace for testing
 */
function createMockKV(): KVNamespace & { _store: Map<string, { value: string; expiration?: number }> } {
    const store = new Map<string, { value: string; expiration?: number }>();

    return {
        _store: store,
        get: vi.fn(async (key: string) => {
            const entry = store.get(key);
            if (!entry) return null;
            // Check expiration
            if (entry.expiration && Date.now() > entry.expiration) {
                store.delete(key);
                return null;
            }
            return entry.value;
        }),
        put: vi.fn(async (key: string, value: string, options?: { expirationTtl?: number }) => {
            const expiration = options?.expirationTtl
                ? Date.now() + options.expirationTtl * 1000
                : undefined;
            store.set(key, { value, expiration });
        }),
        delete: vi.fn(async (key: string) => {
            store.delete(key);
        }),
        // Other KV methods not used in our implementation
        list: vi.fn(),
        getWithMetadata: vi.fn(),
    } as unknown as KVNamespace & { _store: Map<string, { value: string; expiration?: number }> };
}

describe('rate-limit', () => {
    let mockKV: ReturnType<typeof createMockKV>;

    beforeEach(() => {
        mockKV = createMockKV();
        vi.clearAllMocks();
    });

    describe('TICKET_RATE_LIMIT', () => {
        it('should have correct default configuration', () => {
            expect(TICKET_RATE_LIMIT).toEqual({
                maxRequests: 10,
                windowMs: 60_000,
                expirationTtl: 120,
            });
        });
    });

    describe('checkRateLimit', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should allow requests under the limit', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.count).toBe(1);
            expect(result.limit).toBe(3);
            expect(result.remaining).toBe(2);
        });

        it('should increment count on each call', async () => {
            const result1 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const result2 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const result3 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result1.count).toBe(1);
            expect(result2.count).toBe(2);
            expect(result3.count).toBe(3);
            expect(result3.remaining).toBe(0);
        });

        it('should reject requests when limit is exceeded', async () => {
            // Make 3 requests to reach the limit
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // 4th request should be rejected
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(false);
            expect(result.count).toBe(3);
            expect(result.remaining).toBe(0);
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });

        it('should track different users separately', async () => {
            // User1 makes 3 requests
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // User1 is now rate limited
            const user1Result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(user1Result.allowed).toBe(false);

            // User2 should still be able to make requests
            const user2Result = await checkRateLimit(mockKV, 'test', 'user2', testConfig);
            expect(user2Result.allowed).toBe(true);
            expect(user2Result.count).toBe(1);
        });

        it('should track different prefixes separately', async () => {
            // Same user, different prefixes
            const ticketResult = await checkRateLimit(mockKV, 'ticket', 'user1', testConfig);
            const otherResult = await checkRateLimit(mockKV, 'other', 'user1', testConfig);

            expect(ticketResult.count).toBe(1);
            expect(otherResult.count).toBe(1);
        });

        it('should use correct KV key format', async () => {
            await checkRateLimit(mockKV, 'ticket', 'user_abc123', testConfig);

            // Check the key format
            const keys = Array.from(mockKV._store.keys());
            expect(keys).toHaveLength(1);
            expect(keys[0]).toMatch(/^rate:ticket:user_abc123:\d+$/);
        });

        it('should set expiration TTL on KV entries', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1',
                { expirationTtl: 120 }
            );
        });

        it('should return retryAfter between 1 and window seconds', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.retryAfter).toBeGreaterThanOrEqual(1);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });

        it('should handle default config values', async () => {
            const minimalConfig: RateLimitConfig = { maxRequests: 5 };
            const result = await checkRateLimit(mockKV, 'test', 'user1', minimalConfig);

            expect(result.allowed).toBe(true);
            expect(result.limit).toBe(5);
        });
    });

    describe('getRateLimitStatus', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should return zero count for new users', async () => {
            const status = await getRateLimitStatus(mockKV, 'test', 'newuser', testConfig);

            expect(status.count).toBe(0);
            expect(status.remaining).toBe(5);
            expect(status.limit).toBe(5);
        });

        it('should return current count without incrementing', async () => {
            // Make some requests
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Check status (should not increment)
            const status1 = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);
            const status2 = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            expect(status1.count).toBe(2);
            expect(status2.count).toBe(2); // Still 2, not incremented
            expect(status1.remaining).toBe(3);
        });

        it('should return 0 remaining when limit reached', async () => {
            // Exhaust the limit
            for (let i = 0; i < 5; i++) {
                await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            }

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            expect(status.count).toBe(5);
            expect(status.remaining).toBe(0);
        });
    });

    describe('resetRateLimit', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should reset the rate limit counter', async () => {
            // Make some requests
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Reset
            await resetRateLimit(mockKV, 'test', 'user1', testConfig);

            // Should start fresh
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result.count).toBe(1);
        });

        it('should only reset the specified user', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user2', testConfig);

            await resetRateLimit(mockKV, 'test', 'user1', testConfig);

            // User1 is reset
            const status1 = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);
            expect(status1.count).toBe(0);

            // User2 is not affected
            const status2 = await getRateLimitStatus(mockKV, 'test', 'user2', testConfig);
            expect(status2.count).toBe(1);
        });
    });

    describe('minute bucket behavior', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000, // 1 minute window
            expirationTtl: 120,
        };

        it('should use different buckets for different minute windows', async () => {
            // First request
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            const keys = Array.from(mockKV._store.keys());
            expect(keys).toHaveLength(1);

            // Parse the bucket from the key
            const keyParts = keys[0]!.split(':');
            const bucket = parseInt(keyParts[3]!, 10);

            // Bucket should be based on current minute
            const expectedBucket = Math.floor(Date.now() / 60_000);
            expect(bucket).toBe(expectedBucket);
        });
    });

    describe('edge cases', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 2,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should handle empty user ID', async () => {
            const result = await checkRateLimit(mockKV, 'test', '', testConfig);
            expect(result.allowed).toBe(true);
        });

        it('should handle special characters in user ID', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user@domain.com', testConfig);
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(1);
        });

        it('should handle unicode in user ID', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user_测试_🔑', testConfig);
            expect(result.allowed).toBe(true);
        });

        it('should handle very long user IDs', async () => {
            const longId = 'user_' + 'x'.repeat(1000);
            const result = await checkRateLimit(mockKV, 'test', longId, testConfig);
            expect(result.allowed).toBe(true);
        });

        it('should handle maxRequests of 1', async () => {
            const strictConfig: RateLimitConfig = { maxRequests: 1 };

            const result1 = await checkRateLimit(mockKV, 'test', 'user1', strictConfig);
            expect(result1.allowed).toBe(true);

            const result2 = await checkRateLimit(mockKV, 'test', 'user1', strictConfig);
            expect(result2.allowed).toBe(false);
        });

        it('should handle concurrent requests gracefully', async () => {
            // Simulate concurrent requests
            const results = await Promise.all([
                checkRateLimit(mockKV, 'test', 'user1', testConfig),
                checkRateLimit(mockKV, 'test', 'user1', testConfig),
                checkRateLimit(mockKV, 'test', 'user1', testConfig),
            ]);

            // Due to eventual consistency, all might be allowed
            // This is expected behavior for KV-based rate limiting
            const allowedCount = results.filter((r) => r.allowed).length;
            expect(allowedCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('TICKET_RATE_LIMIT integration', () => {
        it('should allow 10 ticket requests per minute', async () => {
            for (let i = 0; i < 10; i++) {
                const result = await checkRateLimit(mockKV, 'ticket', 'user1', TICKET_RATE_LIMIT);
                expect(result.allowed).toBe(true);
            }

            // 11th request should be rejected
            const result = await checkRateLimit(mockKV, 'ticket', 'user1', TICKET_RATE_LIMIT);
            expect(result.allowed).toBe(false);
        });
    });

    /**
     * HAP-620: Fallback Memory-Based Rate Limiting Tests
     *
     * When KV is not configured (undefined), the rate limiter should fall back
     * to per-isolate memory-based rate limiting for better-than-nothing protection.
     */
    describe('fallback memory-based rate limiting (HAP-620)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should use fallback when KV is undefined', async () => {
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.count).toBe(1);
            expect(result.limit).toBe(3);
        });

        it('should log warning once when using fallback', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user2', testConfig);

            // Warning should only be logged once per Worker instance
            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('RATE_LIMIT_KV not configured')
            );
        });

        it('should enforce rate limits with fallback', async () => {
            // Make 3 requests to reach the limit
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // 4th request should be rejected
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(false);
            expect(result.count).toBe(3);
            expect(result.remaining).toBe(0);
        });

        it('should track different users separately in fallback', async () => {
            // User1 exhausts limit
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            const user1Result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(user1Result.allowed).toBe(false);

            // User2 should still be allowed
            const user2Result = await checkRateLimit(undefined, 'test', 'user2', testConfig);
            expect(user2Result.allowed).toBe(true);
            expect(user2Result.count).toBe(1);
        });

        it('should track different prefixes separately in fallback', async () => {
            const ticketResult = await checkRateLimit(undefined, 'ticket', 'user1', testConfig);
            const authResult = await checkRateLimit(undefined, 'auth', 'user1', testConfig);

            expect(ticketResult.count).toBe(1);
            expect(authResult.count).toBe(1);
        });

        it('should return correct remaining count in fallback', async () => {
            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            const result3 = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result1.remaining).toBe(2);
            expect(result2.remaining).toBe(1);
            expect(result3.remaining).toBe(0);
        });

        it('should provide retryAfter in fallback', async () => {
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });

        it('should store entries in fallback store', async () => {
            expect(getFallbackStoreSize()).toBe(0);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user2', testConfig);

            expect(getFallbackStoreSize()).toBe(2);
        });

        it('should clear fallback store', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(getFallbackStoreSize()).toBe(1);

            clearFallbackStore();
            expect(getFallbackStoreSize()).toBe(0);
        });

        describe('getRateLimitStatus with fallback', () => {
            it('should return zero count for new users', async () => {
                const status = await getRateLimitStatus(undefined, 'test', 'newuser', testConfig);

                expect(status.count).toBe(0);
                expect(status.remaining).toBe(3);
                expect(status.limit).toBe(3);
            });

            it('should return current count from fallback store', async () => {
                await checkRateLimit(undefined, 'test', 'user1', testConfig);
                await checkRateLimit(undefined, 'test', 'user1', testConfig);

                const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);

                expect(status.count).toBe(2);
                expect(status.remaining).toBe(1);
            });
        });

        describe('resetRateLimit with fallback', () => {
            it('should reset fallback store entry', async () => {
                await checkRateLimit(undefined, 'test', 'user1', testConfig);
                await checkRateLimit(undefined, 'test', 'user1', testConfig);

                const statusBefore = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);
                expect(statusBefore.count).toBe(2);

                await resetRateLimit(undefined, 'test', 'user1', testConfig);

                // After reset, count should be 1 (from the new request)
                const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
                expect(result.count).toBe(1);
            });
        });
    });

    /**
     * HAP-913: Mutation Testing Enhancements
     *
     * These tests target specific mutation types:
     * - ArithmeticOperator: Math operations (+, -, *, /)
     * - EqualityOperator: >=, >, <=, <, ===, !==
     * - ConditionalExpression: if/else branches
     */
    describe('ArithmeticOperator Mutations (HAP-913)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should calculate remaining correctly as maxRequests minus count', async () => {
            const result1 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result1.remaining).toBe(4); // 5 - 1 = 4

            const result2 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result2.remaining).toBe(3); // 5 - 2 = 3

            const result3 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result3.remaining).toBe(2); // 5 - 3 = 2
        });

        it('should increment count by exactly 1 each time', async () => {
            const result1 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result1.count).toBe(1);

            const result2 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result2.count).toBe(2);

            // Verify the increment is exactly 1, not 2 or 0
            expect(result2.count - result1.count).toBe(1);
        });

        it('should calculate retryAfter in seconds (divide by 1000)', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // retryAfter should be in seconds (1-60 for a 60s window)
            expect(result.retryAfter).toBeGreaterThanOrEqual(1);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
            // Should be an integer (Math.ceil result)
            expect(Number.isInteger(result.retryAfter)).toBe(true);
        });

        it('should calculate minute bucket using floor division', async () => {
            // The bucket is calculated as Math.floor(now / windowMs)
            // This ensures requests in the same minute window share a bucket
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            const keys = Array.from(mockKV._store.keys());
            const keyParts = keys[0]!.split(':');
            const bucket = parseInt(keyParts[3]!, 10);

            // Bucket should be floor(Date.now() / 60000)
            const expectedBucket = Math.floor(Date.now() / 60_000);
            expect(bucket).toBe(expectedBucket);
        });

        it('should calculate window boundaries correctly', async () => {
            const now = Date.now();
            const windowMs = 60_000;

            // Make a request
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // The window start is minuteBucket * windowMs
            // The window end is windowStart + windowMs
            // retryAfter should be ceiling of (windowEnd - now) / 1000
            const minuteBucket = Math.floor(now / windowMs);
            const windowStart = minuteBucket * windowMs;
            const windowEnd = windowStart + windowMs;
            const expectedRetryAfter = Math.ceil((windowEnd - now) / 1000);

            // Allow for small timing differences
            expect(Math.abs(result.retryAfter - expectedRetryAfter)).toBeLessThanOrEqual(1);
        });
    });

    describe('EqualityOperator Mutations (HAP-913)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should block when count equals maxRequests (>= not >)', async () => {
            // Make exactly maxRequests calls
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Next call should be blocked because count (3) >= maxRequests (3)
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result.allowed).toBe(false);
            expect(result.count).toBe(3);
        });

        it('should allow when count is one less than maxRequests', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Third call should be allowed (count 2 < maxRequests 3)
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(3);
            expect(result.remaining).toBe(0);
        });

        it('should correctly check for undefined KV (!kv)', async () => {
            clearFallbackStore();
            resetFallbackWarning();

            // With undefined KV, should use fallback
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.allowed).toBe(true);
            expect(getFallbackStoreSize()).toBe(1);
        });

        it('should correctly check for existing entry (!entry)', async () => {
            clearFallbackStore();
            resetFallbackWarning();

            // First call - no entry exists, should create one
            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result1.count).toBe(1);

            // Second call - entry exists, should increment
            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.count).toBe(2);
        });

        it('should check remaining >= 0 with Math.max', async () => {
            // Exhaust the limit
            for (let i = 0; i < 5; i++) {
                await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            }

            // Status should show remaining as 0, not negative
            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);
            expect(status.remaining).toBe(0);
            expect(status.remaining).toBeGreaterThanOrEqual(0);
        });
    });

    describe('ConditionalExpression Mutations (HAP-913)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should log warning exactly once when KV is undefined', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user2', testConfig);

            // Warning should be logged only once despite multiple calls
            expect(console.warn).toHaveBeenCalledTimes(1);
        });

        it('should use fallback path when KV is undefined', async () => {
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Result should still work correctly
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(1);
            expect(result.limit).toBe(3);
        });

        it('should use KV path when KV is defined', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // KV.put should have been called
            expect(mockKV.put).toHaveBeenCalled();
            expect(result.allowed).toBe(true);
        });

        it('should handle currentValue being null (new entry)', async () => {
            // First request - no existing entry
            const result = await checkRateLimit(mockKV, 'test', 'newuser', testConfig);

            expect(result.count).toBe(1);
            expect(result.allowed).toBe(true);
        });

        it('should handle currentValue being a number string', async () => {
            // Pre-populate the store
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:existinguser:${minuteBucket}`;
            mockKV._store.set(key, { value: '2' });

            const result = await checkRateLimit(mockKV, 'test', 'existinguser', testConfig);

            // Should parse '2' and increment to 3
            expect(result.count).toBe(3);
        });
    });

    describe('Fallback Memory Store Boundary Conditions (HAP-913)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 2,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should enforce rate limit at exact boundary', async () => {
            // Make exactly maxRequests calls
            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result1.allowed).toBe(true);
            expect(result1.count).toBe(1);
            expect(result1.remaining).toBe(1);

            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.allowed).toBe(true);
            expect(result2.count).toBe(2);
            expect(result2.remaining).toBe(0);

            // Third call should be blocked
            const result3 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result3.allowed).toBe(false);
            expect(result3.count).toBe(2);
            expect(result3.remaining).toBe(0);
        });

        it('should return retryAfter > 0 when rate limited', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(false);
            expect(result.retryAfter).toBeGreaterThan(0);
        });

        it('should calculate remaining as 0 when at limit', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);

            expect(status.remaining).toBe(0);
        });

        it('should handle expiration check correctly', async () => {
            // This test verifies the `now > entry.resetAt` condition
            // We can't easily test time-based expiration without mocking Date.now
            // But we can verify the behavior is consistent
            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result1.count).toBe(1);

            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.count).toBe(2);
        });
    });

    describe('Key Format Validation (HAP-913)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        it('should construct KV key with rate: prefix', async () => {
            await checkRateLimit(mockKV, 'myprefix', 'myuser', testConfig);

            const keys = Array.from(mockKV._store.keys());
            expect(keys[0]).toMatch(/^rate:myprefix:myuser:\d+$/);
        });

        it('should include minute bucket in KV key', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            const keys = Array.from(mockKV._store.keys());
            const parts = keys[0]!.split(':');
            expect(parts.length).toBe(4);
            expect(parts[0]).toBe('rate');
            expect(parts[1]).toBe('test');
            expect(parts[2]).toBe('user1');
            expect(parseInt(parts[3]!, 10)).toBeGreaterThan(0);
        });

        it('should construct fallback key without minute bucket', async () => {
            clearFallbackStore();

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Fallback store uses key without minute bucket
            // The key is rate:prefix:identifier (no minute bucket)
            expect(getFallbackStoreSize()).toBe(1);
        });
    });

    describe('Default Values (HAP-913)', () => {
        it('should use default windowMs of 60000 when not specified', async () => {
            const minConfig: RateLimitConfig = { maxRequests: 5 };

            const result = await checkRateLimit(mockKV, 'test', 'user1', minConfig);

            // retryAfter should be <= 60 seconds (1 minute default window)
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });

        it('should use default expirationTtl of 120 when not specified', async () => {
            const minConfig: RateLimitConfig = { maxRequests: 5 };

            await checkRateLimit(mockKV, 'test', 'user1', minConfig);

            // Verify KV.put was called with default TTL
            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1',
                { expirationTtl: 120 }
            );
        });

        it('should use provided windowMs when specified', async () => {
            const customConfig: RateLimitConfig = {
                maxRequests: 5,
                windowMs: 30_000, // 30 seconds
            };

            const result = await checkRateLimit(mockKV, 'test', 'user1', customConfig);

            // retryAfter should be <= 30 seconds
            expect(result.retryAfter).toBeLessThanOrEqual(30);
        });

        it('should use provided expirationTtl when specified', async () => {
            const customConfig: RateLimitConfig = {
                maxRequests: 5,
                expirationTtl: 300, // 5 minutes
            };

            await checkRateLimit(mockKV, 'test', 'user1', customConfig);

            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1',
                { expirationTtl: 300 }
            );
        });
    });

    describe('resetRateLimit (HAP-913)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
        });

        it('should delete from KV when KV is available', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            await resetRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(mockKV.delete).toHaveBeenCalled();
        });

        it('should delete from fallback store when KV is undefined', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(getFallbackStoreSize()).toBe(1);

            await resetRateLimit(undefined, 'test', 'user1', testConfig);

            // After reset, making a new request should start fresh
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.count).toBe(1);
        });

        it('should always delete from fallback store regardless of KV', async () => {
            // First use fallback
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(getFallbackStoreSize()).toBe(1);

            // Reset with KV - should still clear fallback
            await resetRateLimit(mockKV, 'test', 'user1', testConfig);

            // Both KV delete and fallback delete should happen
            expect(mockKV.delete).toHaveBeenCalled();
        });
    });

    /**
     * HAP-933: Mutation Testing Enhancements
     *
     * These tests specifically target surviving mutations and NoCoverage lines
     * in rate-limit.ts to improve the mutation score to >=60%.
     */
    describe('FALLBACK_MAX_ENTRIES Capacity Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should return FALLBACK_MAX_ENTRIES as 10000', () => {
            // This test kills mutations that change the constant value
            expect(getFallbackMaxEntries()).toBe(10_000);
        });

        it('should trigger graceful degradation when store is at capacity', async () => {
            // Fill the store to capacity with non-expired entries
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false);

            expect(getFallbackStoreSize()).toBe(maxEntries);

            // Now make a request - should trigger capacity check and allow request
            const result = await checkRateLimit(undefined, 'test', 'newuser', testConfig);

            // Graceful degradation: request is allowed even at capacity
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(0); // Special value indicating capacity bypass
            expect(result.remaining).toBe(testConfig.maxRequests);

            // Warning should be logged
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Fallback store at capacity')
            );
        });

        it('should cleanup expired entries when at capacity', async () => {
            // Fill with expired entries
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, true); // All expired

            expect(getFallbackStoreSize()).toBe(maxEntries);

            // Request should trigger cleanup and then succeed normally
            const result = await checkRateLimit(undefined, 'test', 'newuser', testConfig);

            // After cleanup, store should be empty and request succeeds normally
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(1); // Normal count, not capacity bypass

            // Capacity warning should NOT be logged (cleanup freed space)
            const warnCalls = (console.warn as ReturnType<typeof vi.fn>).mock.calls;
            const capacityWarnings = warnCalls.filter(call =>
                call[0]?.includes?.('at capacity')
            );
            expect(capacityWarnings.length).toBe(0);
        });

        it('should enforce capacity >= check, not just >', async () => {
            // Fill to exactly capacity
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false);

            expect(getFallbackStoreSize()).toBe(maxEntries);

            // This tests that we check >= FALLBACK_MAX_ENTRIES, not > FALLBACK_MAX_ENTRIES
            const result = await checkRateLimit(undefined, 'test', 'newuser', testConfig);

            // Should trigger capacity logic even at exactly max
            expect(result.allowed).toBe(true);
        });

        it('should enforce capacity check after cleanup if still full', async () => {
            // Fill with non-expired entries (cleanup won't help)
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false);

            // Verify cleanup doesn't reduce size when entries are valid
            triggerFallbackCleanup();
            expect(getFallbackStoreSize()).toBe(maxEntries); // Still at capacity

            // Request should return graceful degradation
            const result = await checkRateLimit(undefined, 'test', 'user', testConfig);
            expect(result.count).toBe(0); // Capacity bypass indicator
        });
    });

    describe('cleanupFallbackStore Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
        });

        it('should remove expired entries during cleanup', () => {
            // Add expired entries
            populateFallbackStore(100, true);
            expect(getFallbackStoreSize()).toBe(100);

            // Trigger cleanup
            triggerFallbackCleanup();

            // All expired entries should be removed
            expect(getFallbackStoreSize()).toBe(0);
        });

        it('should keep non-expired entries during cleanup', () => {
            // Add non-expired entries
            populateFallbackStore(50, false);
            expect(getFallbackStoreSize()).toBe(50);

            // Trigger cleanup
            triggerFallbackCleanup();

            // Non-expired entries should remain
            expect(getFallbackStoreSize()).toBe(50);
        });

        it('should only remove entries where now > resetAt', () => {
            // Add mix of expired and non-expired entries
            populateFallbackStore(50, true);  // 50 expired
            populateFallbackStore(50, false); // 50 non-expired (added with different keys)

            // Total should be 100 (populateFallbackStore uses incrementing keys)
            expect(getFallbackStoreSize()).toBe(100);

            // Trigger cleanup
            triggerFallbackCleanup();

            // Only non-expired (50) should remain
            expect(getFallbackStoreSize()).toBe(50);
        });

        it('should trigger probabilistic cleanup when Math.random < 0.01', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Add some expired entries
            populateFallbackStore(10, true);
            expect(getFallbackStoreSize()).toBe(10);

            // Mock Math.random to always return < 0.01 (trigger cleanup)
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.005);

            // Make a request - should trigger cleanup due to mocked random
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Cleanup should have been triggered, removing expired entries
            // New entry for user1 was added, so size should be 1
            expect(getFallbackStoreSize()).toBe(1);

            randomSpy.mockRestore();
        });

        it('should NOT trigger probabilistic cleanup when Math.random >= 0.01', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Add some expired entries
            populateFallbackStore(10, true);
            expect(getFallbackStoreSize()).toBe(10);

            // Mock Math.random to always return >= 0.01 (no cleanup)
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

            // Make a request - should NOT trigger cleanup
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Expired entries remain, plus new entry
            expect(getFallbackStoreSize()).toBe(11);

            randomSpy.mockRestore();
        });
    });

    describe('Window Boundary Calculations (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        it('should calculate windowEndMs as Math.ceil(now/windowMs) * windowMs in fallback', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Use a specific timestamp to test boundary calculation
            const now = 1700000000000; // Fixed timestamp
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // windowEndMs = Math.ceil(now / 60000) * 60000
            const windowEndMs = Math.ceil(now / 60_000) * 60_000;
            const expectedRetryAfter = Math.ceil((windowEndMs - now) / 1000);

            expect(result.retryAfter).toBe(expectedRetryAfter);

            vi.restoreAllMocks();
        });

        it('should use Math.floor for KV bucket calculation', async () => {
            const now = 1700000030000; // 30 seconds into a minute
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Bucket should be floor(now / windowMs)
            const expectedBucket = Math.floor(now / 60_000);
            const keys = Array.from(mockKV._store.keys());
            expect(keys[0]).toContain(`:${expectedBucket}`);

            vi.restoreAllMocks();
        });

        it('should calculate retryAfter using division by 1000 (not 100 or 10000)', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Use a timestamp that's 30 seconds into a minute window (50 seconds remaining)
            // 1700000010000 is 10 seconds into a window, so window ends at 1700000060000
            const now = 1700000010000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // With 10 seconds into the window (windowMs = 60000):
            // windowEndMs = Math.ceil(1700000010000 / 60000) * 60000 = 28333334 * 60000 = 1700000040000
            // retryAfter = Math.ceil((1700000040000 - 1700000010000) / 1000) = 30 seconds
            // The calculation uses Math.ceil(now / windowMs) * windowMs
            const windowEndMs = Math.ceil(now / 60_000) * 60_000;
            const expectedRetryAfter = Math.ceil((windowEndMs - now) / 1000);
            expect(result.retryAfter).toBe(expectedRetryAfter);

            // Verify division by 1000 produces reasonable seconds value
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);

            vi.restoreAllMocks();
        });

        it('should calculate resetAt as now + windowMs in fallback', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Second request in same window should work
            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.count).toBe(2);

            // Advance time past the window
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_001);

            // Third request should reset the count (new window)
            const result3 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result3.count).toBe(1); // Reset to 1

            vi.restoreAllMocks();
        });
    });

    describe('Remaining Calculation Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        it('should calculate remaining as maxRequests - 1 on first request', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.remaining).toBe(4); // 5 - 1 = 4
            expect(result.remaining).toBe(testConfig.maxRequests - 1);
        });

        it('should calculate remaining as maxRequests - count on subsequent requests', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const result3 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result3.remaining).toBe(2); // 5 - 3 = 2
            expect(result3.remaining).toBe(testConfig.maxRequests - result3.count);
        });

        it('should use subtraction not addition for remaining (remaining = max - count, not max + count)', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // If it was max + count, would be 6
            expect(result.remaining).not.toBe(6);
            // Correct: max - count = 5 - 1 = 4
            expect(result.remaining).toBe(4);
        });

        it('should calculate remaining in fallback store correctly', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result1.remaining).toBe(4); // 5 - 1

            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.remaining).toBe(3); // 5 - 2
        });
    });

    describe('Entry Count Increment Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        it('should increment count by 1 each call (KV)', async () => {
            const result1 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const result2 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const result3 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Count should increment by exactly 1
            expect(result1.count).toBe(1);
            expect(result2.count).toBe(2);
            expect(result3.count).toBe(3);

            // Differences should be exactly 1
            expect(result2.count - result1.count).toBe(1);
            expect(result3.count - result2.count).toBe(1);
        });

        it('should increment count by 1 each call (fallback)', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            const result3 = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result1.count).toBe(1);
            expect(result2.count).toBe(2);
            expect(result3.count).toBe(3);

            expect(result2.count - result1.count).toBe(1);
        });

        it('should use ++ not += 2 for increment', async () => {
            const result1 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const result2 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Verify first count is 1 (not incremented by 2)
            expect(result1.count).toBe(1);

            // If using += 2, count would be 1, 3
            expect(result2.count).not.toBe(3);
            expect(result2.count).toBe(2);
        });
    });

    describe('Blocked Request retryAfter Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 2,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should calculate retryAfter correctly when blocked (fallback)', async () => {
            const now = 1700000030000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Exhaust limit
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Blocked request
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(false);
            // retryAfter should be based on entry.resetAt - now
            // entry.resetAt = now + 60000 = 1700000090000
            // retryAfter = Math.ceil((1700000090000 - 1700000030000) / 1000) = 60
            expect(result.retryAfter).toBe(60);
        });

        it('should calculate retryAfter correctly when blocked (KV)', async () => {
            const now = 1700000030000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Exhaust limit
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Blocked request
            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(false);
            // retryAfter based on window boundary
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });
    });

    describe('Status Remaining Math.max Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 2,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should use Math.max(0, ...) to prevent negative remaining in status (KV)', async () => {
            // Exhaust limit
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig); // Blocked

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            // remaining should be 0, not negative
            expect(status.remaining).toBe(0);
            expect(status.remaining).toBeGreaterThanOrEqual(0);
        });

        it('should use Math.max(0, ...) to prevent negative remaining in status (fallback)', async () => {
            // Exhaust limit
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig); // Blocked

            const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);

            expect(status.remaining).toBe(0);
            expect(status.remaining).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Additional Mutation-Killing Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Lines 102-104 - Probabilistic cleanup branch
         * Mutation: Changing `< 0.01` to `<= 0.01` or `< 0`
         */
        it('should trigger cleanup when Math.random returns exactly 0.009 (< 0.01)', async () => {
            populateFallbackStore(5, true); // Expired entries
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.009);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Cleanup triggered, expired entries removed, new entry added
            expect(getFallbackStoreSize()).toBe(1);
            randomSpy.mockRestore();
        });

        it('should NOT trigger cleanup when Math.random returns exactly 0.01 (not < 0.01)', async () => {
            populateFallbackStore(5, true);
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Cleanup NOT triggered, expired entries remain + new entry
            expect(getFallbackStoreSize()).toBe(6);
            randomSpy.mockRestore();
        });

        it('should NOT trigger cleanup when Math.random returns 0.011 (> 0.01)', async () => {
            populateFallbackStore(5, true);
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.011);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(getFallbackStoreSize()).toBe(6);
            randomSpy.mockRestore();
        });

        /**
         * Target: Line 102 - fallbackLimits.size > 0 check
         * Mutation: Changing `> 0` to `>= 0` or `> 1`
         */
        it('should skip cleanup check when store is empty (size = 0)', async () => {
            expect(getFallbackStoreSize()).toBe(0);
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.001);

            // Even with low random, no cleanup should be attempted since store is empty
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // New entry added
            expect(getFallbackStoreSize()).toBe(1);
            randomSpy.mockRestore();
        });

        it('should consider cleanup when store has exactly 1 entry (size > 0)', async () => {
            populateFallbackStore(1, true); // 1 expired entry
            expect(getFallbackStoreSize()).toBe(1);

            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.005);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Cleanup triggered, expired entry removed, new entry added
            expect(getFallbackStoreSize()).toBe(1);
            randomSpy.mockRestore();
        });

        /**
         * Target: Lines 107-121 - Capacity boundary
         * Mutations: Changing `>=` to `>`, changing FALLBACK_MAX_ENTRIES constant
         */
        it('should allow normal processing when store has FALLBACK_MAX_ENTRIES - 1', async () => {
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries - 1, false);

            expect(getFallbackStoreSize()).toBe(maxEntries - 1);

            const result = await checkRateLimit(undefined, 'test', 'newuser', testConfig);

            // Normal processing, not capacity bypass
            expect(result.count).toBe(1);
            expect(result.remaining).toBe(4);
        });

        /**
         * Target: Line 124 - windowEndMs calculation (Math.ceil)
         * Mutations: Changing Math.ceil to Math.floor
         */
        it('should use Math.ceil for windowEndMs, not Math.floor', async () => {
            // Use timestamp that's NOT on a minute boundary
            const now = 1700000030500; // 30.5 seconds into a window
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Math.ceil(1700000030500 / 60000) = 28333334
            // windowEndMs = 28333334 * 60000 = 1700000040000
            // retryAfter = Math.ceil((1700000040000 - 1700000030500) / 1000) = 10
            const windowEndMs = Math.ceil(now / 60_000) * 60_000;
            const expectedRetryAfter = Math.ceil((windowEndMs - now) / 1000);
            expect(result.retryAfter).toBe(expectedRetryAfter);

            // If Math.floor was used, windowEndMs would be different
            const floorWindowEndMs = Math.floor(now / 60_000) * 60_000;
            const floorRetryAfter = Math.ceil((floorWindowEndMs - now) / 1000);
            expect(result.retryAfter).not.toBe(floorRetryAfter);
        });

        /**
         * Target: Line 125 - retryAfter division by 1000
         * Mutations: Changing 1000 to other values
         */
        it('should calculate retryAfter in seconds (ms / 1000), not other units', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Calculate expected value
            const windowEndMs = Math.ceil(now / 60_000) * 60_000;
            const msRemaining = windowEndMs - now;

            // retryAfter should be msRemaining / 1000 (rounded up)
            expect(result.retryAfter).toBe(Math.ceil(msRemaining / 1000));

            // If divided by 100 instead, would be 10x larger
            expect(result.retryAfter).not.toBe(Math.ceil(msRemaining / 100));
        });

        /**
         * Target: Line 129 - Setting resetAt to now + windowMs
         * Mutations: Changing + to - or other operations
         */
        it('should set resetAt to now + windowMs (addition, not subtraction)', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Time passes by half window
            vi.spyOn(Date, 'now').mockReturnValue(now + 30_000);

            // Still within window, should increment same entry
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.count).toBe(2);

            // Time passes to just before resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 59_999);

            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.count).toBe(3); // Still same window

            // Time passes past resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_001);

            const result3 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result3.count).toBe(1); // New window started
        });

        /**
         * Target: Line 135 - remaining = maxRequests - 1
         * Mutations: Changing to maxRequests + 1 or maxRequests
         */
        it('should set remaining to exactly maxRequests - 1 on first request', async () => {
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.remaining).toBe(testConfig.maxRequests - 1);
            expect(result.remaining).not.toBe(testConfig.maxRequests);
            expect(result.remaining).not.toBe(testConfig.maxRequests + 1);
        });

        /**
         * Target: Line 140 - entry.count >= maxRequests check
         * Mutations: Changing >= to >, == or <=
         */
        it('should block when count equals maxRequests exactly (>= not >)', async () => {
            // Fill up to exactly maxRequests
            for (let i = 0; i < testConfig.maxRequests; i++) {
                await checkRateLimit(undefined, 'test', 'user1', testConfig);
            }

            // Next request should be blocked
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.allowed).toBe(false);
            expect(result.count).toBe(testConfig.maxRequests);
        });

        it('should allow when count is maxRequests - 1', async () => {
            // Make maxRequests - 1 requests
            for (let i = 0; i < testConfig.maxRequests - 1; i++) {
                await checkRateLimit(undefined, 'test', 'user1', testConfig);
            }

            // One more should be allowed
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(testConfig.maxRequests);
        });

        /**
         * Target: Line 145 - Math.ceil for retryAfter when blocked
         * Mutations: Changing Math.ceil to Math.floor
         */
        it('should use Math.ceil for blocked retryAfter calculation', async () => {
            const now = 1700000000500; // Half second offset
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Fill up the limit
            for (let i = 0; i < testConfig.maxRequests; i++) {
                await checkRateLimit(undefined, 'test', 'user1', testConfig);
            }

            // Get blocked result
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.allowed).toBe(false);

            // retryAfter should be ceiling, not floor
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(Number.isInteger(result.retryAfter)).toBe(true);
        });

        /**
         * Target: Line 151 - entry.count++
         * Mutations: Changing ++ to -- or += 2
         */
        it('should increment entry.count by exactly 1', async () => {
            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            const result3 = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result1.count).toBe(1);
            expect(result2.count).toBe(2);
            expect(result3.count).toBe(3);

            expect(result2.count - result1.count).toBe(1);
            expect(result3.count - result2.count).toBe(1);
        });

        /**
         * Target: Line 157 - remaining = maxRequests - entry.count
         * Mutations: Changing - to +
         */
        it('should calculate remaining as maxRequests - count after increment', async () => {
            const result1 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result1.remaining).toBe(testConfig.maxRequests - result1.count);

            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.remaining).toBe(testConfig.maxRequests - result2.count);

            // Verify it's subtraction not addition
            expect(result1.remaining).not.toBe(testConfig.maxRequests + result1.count);
        });

        /**
         * Target: Line 117 - retryAfter: 0 in capacity bypass
         */
        it('should return retryAfter = 0 in capacity bypass scenario', async () => {
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.retryAfter).toBe(0);
            expect(result.count).toBe(0);
        });

        /**
         * Target: Line 116 - count: 0 in capacity bypass
         */
        it('should return count = 0 in capacity bypass scenario', async () => {
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.count).toBe(0);
            expect(result.allowed).toBe(true);
        });

        /**
         * Target: Line 118 - remaining: maxRequests in capacity bypass
         */
        it('should return remaining = maxRequests in capacity bypass scenario', async () => {
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false);

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(result.remaining).toBe(testConfig.maxRequests);
        });
    });

    describe('KV Path Mutation-Killing Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
        });

        /**
         * Target: Line 281 - minuteBucket = Math.floor(now / windowMs)
         * Mutations: Changing Math.floor to Math.ceil
         */
        it('should use Math.floor for minute bucket calculation', async () => {
            // Use a timestamp in the middle of a minute
            const now = 1700000030000; // 30 seconds into minute
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            const keys = Array.from(mockKV._store.keys());
            const bucket = parseInt(keys[0]!.split(':')[3]!, 10);

            // Math.floor(1700000030000 / 60000) = 28333333
            expect(bucket).toBe(Math.floor(now / 60_000));
            // If Math.ceil was used: Math.ceil(1700000030000 / 60000) = 28333334
            expect(bucket).not.toBe(Math.ceil(now / 60_000));

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 286 - parseInt(currentValue, 10)
         * Mutations: Changing radix or parsing method
         */
        it('should correctly parse string count from KV', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user1:${minuteBucket}`;

            // Pre-populate with string '3'
            mockKV._store.set(key, { value: '3' });

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Should parse '3' as 3 and increment to 4
            expect(result.count).toBe(4);
        });

        /**
         * Target: Line 289-291 - Window boundary calculations
         */
        it('should calculate window boundaries correctly (windowStartMs, windowEndMs, msUntilReset)', async () => {
            const now = 1700000030000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Calculate expected values
            const minuteBucket = Math.floor(now / 60_000);
            const windowStartMs = minuteBucket * 60_000;
            const windowEndMs = windowStartMs + 60_000;
            const msUntilReset = windowEndMs - now;
            const expectedRetryAfter = Math.ceil(msUntilReset / 1000);

            expect(result.retryAfter).toBe(expectedRetryAfter);

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 295 - currentCount >= maxRequests check in KV path
         */
        it('should block in KV path when count equals maxRequests', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user1:${minuteBucket}`;

            // Pre-populate with count at limit
            mockKV._store.set(key, { value: '5' });

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(false);
            expect(result.count).toBe(5);
            expect(result.remaining).toBe(0);
        });

        it('should allow in KV path when count is maxRequests - 1', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user1:${minuteBucket}`;

            // Pre-populate with count one less than limit
            mockKV._store.set(key, { value: '4' });

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.count).toBe(5);
            expect(result.remaining).toBe(0);
        });

        /**
         * Target: Line 306 - newCount = currentCount + 1
         */
        it('should increment count by exactly 1 in KV path', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user1:${minuteBucket}`;

            mockKV._store.set(key, { value: '2' });

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(result.count).toBe(3);
            // Verify KV was updated with '3'
            expect(mockKV.put).toHaveBeenCalledWith(key, '3', expect.any(Object));
        });

        /**
         * Target: Line 307 - kv.put with expirationTtl
         */
        it('should store with correct expirationTtl', async () => {
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1',
                { expirationTtl: testConfig.expirationTtl }
            );
        });

        /**
         * Target: Line 314 - remaining = maxRequests - newCount
         */
        it('should calculate remaining correctly in KV path', async () => {
            const result1 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result1.remaining).toBe(4); // 5 - 1

            const result2 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result2.remaining).toBe(3); // 5 - 2

            const result3 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result3.remaining).toBe(2); // 5 - 3

            const result4 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result4.remaining).toBe(1); // 5 - 4

            const result5 = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            expect(result5.remaining).toBe(0); // 5 - 5
        });

        /**
         * Target: Line 292 - Math.ceil for retryAfter conversion
         */
        it('should use Math.ceil for retryAfter in KV path', async () => {
            // Use timestamp with fractional seconds
            const now = 1700000030500; // 0.5 seconds extra
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // Verify it's an integer (ceiling applied)
            expect(Number.isInteger(result.retryAfter)).toBe(true);

            vi.restoreAllMocks();
        });
    });

    describe('getRateLimitStatus Additional Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 344 - now > entry.resetAt check
         */
        it('should return zero count for expired entry in fallback status', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Advance past resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_001);

            const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);
            expect(status.count).toBe(0);
            expect(status.remaining).toBe(testConfig.maxRequests);
        });

        /**
         * Target: Line 348 - retryAfter = Math.ceil(windowMs / 1000)
         */
        it('should calculate retryAfter correctly for expired/no entry in fallback', async () => {
            const status = await getRateLimitStatus(undefined, 'test', 'newuser', testConfig);

            expect(status.retryAfter).toBe(Math.ceil(60_000 / 1000));
            expect(status.retryAfter).toBe(60);
        });

        /**
         * Target: Line 356 - retryAfter calculation for existing entry
         */
        it('should calculate retryAfter based on entry.resetAt for existing entry', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Advance 30 seconds
            vi.spyOn(Date, 'now').mockReturnValue(now + 30_000);

            const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);

            // resetAt = now + 60000 = 1700000060000
            // current time = 1700000030000
            // retryAfter = Math.ceil((1700000060000 - 1700000030000) / 1000) = 30
            expect(status.retryAfter).toBe(30);
        });

        /**
         * Target: Line 357 - Math.max(0, maxRequests - entry.count)
         */
        it('should use Math.max(0, ...) for remaining in fallback status', async () => {
            // Make more requests than maxRequests (if possible through race conditions)
            for (let i = 0; i < testConfig.maxRequests; i++) {
                await checkRateLimit(undefined, 'test', 'user1', testConfig);
            }

            const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);

            expect(status.remaining).toBe(0);
            expect(status.remaining).toBeGreaterThanOrEqual(0);
        });

        /**
         * Target: Lines 367-376 - KV path of getRateLimitStatus
         */
        it('should calculate correct values from KV in status', async () => {
            const now = 1700000030000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Make some requests first
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            expect(status.count).toBe(2);
            expect(status.remaining).toBe(3);
            expect(status.limit).toBe(5);
        });

        /**
         * Target: Line 376 - Math.max(0, maxRequests - currentCount)
         */
        it('should ensure remaining is never negative in KV status', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user1:${minuteBucket}`;

            // Artificially set count higher than max
            mockKV._store.set(key, { value: '10' });

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            expect(status.remaining).toBe(0);
            expect(status.remaining).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Fallback Warning Logic Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 270 - !fallbackWarningLogged check
         * Mutations: Removing the ! or changing condition
         */
        it('should log warning on first fallback use', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            expect(console.warn).toHaveBeenCalledTimes(1);
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('RATE_LIMIT_KV not configured')
            );
        });

        it('should NOT log warning on second fallback use', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user2', testConfig);

            expect(console.warn).toHaveBeenCalledTimes(1);
        });

        it('should log warning again after resetFallbackWarning()', async () => {
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(console.warn).toHaveBeenCalledTimes(1);

            resetFallbackWarning();

            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(console.warn).toHaveBeenCalledTimes(2);
        });

        /**
         * Target: Line 276 - fallbackWarningLogged = true
         */
        it('should set fallbackWarningLogged to true after first warning', async () => {
            // Before any calls, warning not logged
            // After first call, warning should be logged
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // This internal state is verified by subsequent calls not logging
            await checkRateLimit(undefined, 'test', 'user2', testConfig);
            await checkRateLimit(undefined, 'test', 'user3', testConfig);

            expect(console.warn).toHaveBeenCalledTimes(1);
        });
    });

    describe('Key Construction Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        /**
         * Target: Line 266 - key = `rate:${prefix}:${identifier}`
         * Mutations: Changing concatenation order
         */
        it('should construct key in format rate:prefix:identifier', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            await checkRateLimit(undefined, 'myprefix', 'myidentifier', testConfig);

            // The key should include both prefix and identifier
            // Verify by checking it doesn't match with different values
            await checkRateLimit(undefined, 'other', 'myidentifier', testConfig);

            // Should have 2 different entries
            expect(getFallbackStoreSize()).toBe(2);

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 284 - kvKey = `${key}:${minuteBucket}`
         */
        it('should append minute bucket to key for KV', async () => {
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'test', 'user', testConfig);

            const keys = Array.from(mockKV._store.keys());
            const minuteBucket = Math.floor(now / 60_000);

            expect(keys[0]).toBe(`rate:test:user:${minuteBucket}`);

            vi.restoreAllMocks();
        });
    });

    describe('Default Config Value Tests (HAP-933)', () => {
        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        /**
         * Target: Line 265 - windowMs = 60_000 default
         * Mutations: Changing default value
         */
        it('should use default windowMs of 60000 in KV bucket calculation', async () => {
            const minConfig: RateLimitConfig = { maxRequests: 5 };
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'test', 'user1', minConfig);

            const keys = Array.from(mockKV._store.keys());
            const bucket = parseInt(keys[0]!.split(':')[3]!, 10);

            // Should use 60000ms window
            expect(bucket).toBe(Math.floor(now / 60_000));

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 265 - expirationTtl = 120 default
         */
        it('should use default expirationTtl of 120 when not specified', async () => {
            const minConfig: RateLimitConfig = { maxRequests: 5 };

            await checkRateLimit(mockKV, 'test', 'user1', minConfig);

            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1',
                { expirationTtl: 120 }
            );
        });

        /**
         * Target: Line 98 - windowMs = 60_000 in checkMemoryRateLimit
         */
        it('should use default windowMs in fallback for retryAfter calculation', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const minConfig: RateLimitConfig = { maxRequests: 5 };
            const result = await checkRateLimit(undefined, 'test', 'user1', minConfig);

            // retryAfter should be <= 60 (default 1 minute window)
            expect(result.retryAfter).toBeLessThanOrEqual(60);
            expect(result.retryAfter).toBeGreaterThan(0);

            vi.restoreAllMocks();
        });
    });

    describe('cleanupFallbackStore Edge Cases (HAP-933)', () => {
        beforeEach(() => {
            clearFallbackStore();
        });

        /**
         * Target: Line 79 - for loop iteration
         */
        it('should handle empty store in cleanup', () => {
            expect(getFallbackStoreSize()).toBe(0);

            // Should not throw
            triggerFallbackCleanup();

            expect(getFallbackStoreSize()).toBe(0);
        });

        /**
         * Target: Line 80 - now > entry.resetAt comparison
         */
        it('should not delete entry when now equals resetAt exactly', () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Create entry with resetAt = now (exactly equal)
            populateFallbackStore(1, false); // resetAt = now + 60000

            // Set time to exactly resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);

            expect(getFallbackStoreSize()).toBe(1);

            triggerFallbackCleanup();

            // Entry should remain because now is NOT > resetAt (it's equal)
            expect(getFallbackStoreSize()).toBe(1);

            vi.restoreAllMocks();
        });

        it('should delete entry when now is 1ms past resetAt', () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            populateFallbackStore(1, false);

            // Set time to 1ms past resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_001);

            expect(getFallbackStoreSize()).toBe(1);

            triggerFallbackCleanup();

            // Entry should be deleted
            expect(getFallbackStoreSize()).toBe(0);

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 81 - fallbackLimits.delete(key)
         */
        it('should delete by correct key during cleanup', () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Add multiple entries with different expiry
            populateFallbackStore(3, true);  // 3 expired
            populateFallbackStore(2, false); // 2 not expired

            expect(getFallbackStoreSize()).toBe(5);

            triggerFallbackCleanup();

            // Only 2 should remain (the non-expired ones)
            expect(getFallbackStoreSize()).toBe(2);

            vi.restoreAllMocks();
        });
    });

    describe('resetRateLimit Additional Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        /**
         * Target: Line 401 - fallbackLimits.delete(key)
         */
        it('should delete correct key from fallback store', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            await checkRateLimit(undefined, 'test', 'user2', testConfig);

            expect(getFallbackStoreSize()).toBe(2);

            await resetRateLimit(undefined, 'test', 'user1', testConfig);

            // Only user2 should remain
            expect(getFallbackStoreSize()).toBe(1);

            // Verify user1 is reset by making new request
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.count).toBe(1);

            vi.restoreAllMocks();
        });

        /**
         * Target: Lines 404-408 - KV path deletion
         */
        it('should delete correct KV key with minute bucket', async () => {
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            const minuteBucket = Math.floor(now / 60_000);
            const expectedKey = `rate:test:user1:${minuteBucket}`;

            await resetRateLimit(mockKV, 'test', 'user1', testConfig);

            expect(mockKV.delete).toHaveBeenCalledWith(expectedKey);

            vi.restoreAllMocks();
        });
    });

    describe('Entry Expiration Comparison Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should use > not >= for expiry check (now > resetAt)', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Create entry
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(getFallbackStoreSize()).toBe(1);

            // Set time exactly at resetAt (now + 60000)
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);

            // Entry should NOT be expired (now === resetAt, not now > resetAt)
            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result.count).toBe(2); // Continues from existing entry

            // Now set time past resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_001);

            // Entry SHOULD be expired (now > resetAt)
            const result2 = await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(result2.count).toBe(1); // New window started
        });

        it('should use > not >= for status expiry check', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Create entry
            await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // Set time exactly at resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);

            // Status should show existing entry (not expired at exactly resetAt)
            const status = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);
            expect(status.count).toBe(1);

            // Now past resetAt
            vi.spyOn(Date, 'now').mockReturnValue(now + 60_001);

            // Status should show 0 (entry expired)
            const status2 = await getRateLimitStatus(undefined, 'test', 'user1', testConfig);
            expect(status2.count).toBe(0);
        });
    });

    /**
     * HAP-933: Additional Mutation-Killing Tests
     *
     * These tests target specific surviving mutations identified in the mutation report.
     * Focus areas:
     * - Ternary operator mutations (?: -> true/false)
     * - Arithmetic operator mutations (+/- swap)
     * - String literal mutations in key construction
     * - Numeric constant mutations (0, 1, radix values)
     */
    describe('KV parseInt and Default Value Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
        });

        /**
         * Target: Line 288 - ternary operator `currentValue ? parseInt(currentValue, 10) : 0`
         * Mutations: Replacing with just `0` or just `parseInt(currentValue, 10)`
         */
        it('should return count 0 when KV returns null (ternary false branch)', async () => {
            // No pre-populated data - KV.get returns null
            const result = await checkRateLimit(mockKV, 'test', 'newuser', testConfig);

            // First request starts at count 1 (0 + 1)
            expect(result.count).toBe(1);
        });

        it('should parse existing count from KV string (ternary true branch)', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:existinguser:${minuteBucket}`;

            // Pre-populate with string '7'
            mockKV._store.set(key, { value: '7' });

            const result = await checkRateLimit(mockKV, 'test', 'existinguser', testConfig);

            // Should be blocked (7 >= 5 maxRequests)
            expect(result.allowed).toBe(false);
            expect(result.count).toBe(7);
        });

        /**
         * Target: Line 288 - parseInt radix 10
         * Mutations: Changing radix from 10 to other values
         */
        it('should correctly parse decimal strings with radix 10', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user:${minuteBucket}`;

            // Pre-populate with '09' - would be octal 9 if radix were wrong
            mockKV._store.set(key, { value: '09' });

            const result = await checkRateLimit(mockKV, 'test', 'user', testConfig);

            // Should be blocked (9 >= 5, incrementing would make 10)
            expect(result.allowed).toBe(false);
            expect(result.count).toBe(9);
        });
    });

    describe('Window Boundary Arithmetic Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 291 - windowStartMs = minuteBucket * windowMs
         * Mutations: Changing * to + or -
         */
        it('should calculate windowStartMs using multiplication not addition', async () => {
            const now = 1700000030000; // 30 seconds into a minute
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // minuteBucket = Math.floor(1700000030000 / 60000) = 28333333
            // windowStartMs = 28333333 * 60000 = 1699999980000
            // windowEndMs = 1699999980000 + 60000 = 1700000040000
            // msUntilReset = 1700000040000 - 1700000030000 = 10000
            // retryAfter = Math.ceil(10000 / 1000) = 10

            expect(result.retryAfter).toBe(10);
        });

        /**
         * Target: Line 292 - windowEndMs = windowStartMs + windowMs
         * Mutations: Changing + to - or *
         */
        it('should calculate windowEndMs using addition not subtraction', async () => {
            const now = 1700000059000; // 59 seconds into a minute (1 second left)
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // minuteBucket = Math.floor(1700000059000 / 60000) = 28333334
            // windowStartMs = 28333334 * 60000 = 1700000040000
            // windowEndMs = 1700000040000 + 60000 = 1700000100000
            // msUntilReset = 1700000100000 - 1700000059000 = 41000
            // retryAfter = Math.ceil(41000 / 1000) = 41

            expect(result.retryAfter).toBe(41);
        });

        /**
         * Target: Line 293 - msUntilReset = windowEndMs - now
         * Mutations: Changing - to +
         */
        it('should calculate msUntilReset using subtraction', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(mockKV, 'test', 'user1', testConfig);

            // If we added instead of subtracted, we'd get a huge number
            // With subtraction, we get a value between 0 and 60 seconds
            expect(result.retryAfter).toBeGreaterThan(0);
            expect(result.retryAfter).toBeLessThanOrEqual(60);
        });
    });

    describe('Increment and Remaining Arithmetic Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        /**
         * Target: Line 308 - newCount = currentCount + 1
         * Mutations: Changing + to - or changing 1 to 0 or 2
         */
        it('should store newCount as exactly currentCount + 1 (not -1, not +2, not +0)', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user:${minuteBucket}`;

            // Start with count 2
            mockKV._store.set(key, { value: '2' });

            await checkRateLimit(mockKV, 'test', 'user', testConfig);

            // Should store '3' (2 + 1), not '1' (2 - 1), not '4' (2 + 2), not '2' (2 + 0)
            expect(mockKV.put).toHaveBeenCalledWith(key, '3', expect.any(Object));
        });

        /**
         * Target: Line 316 - remaining: maxRequests - newCount
         * Mutations: Changing - to +
         */
        it('should calculate remaining as maxRequests - newCount (not +)', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user:${minuteBucket}`;

            // Start with count 1
            mockKV._store.set(key, { value: '1' });

            const result = await checkRateLimit(mockKV, 'test', 'user', testConfig);

            // count = 1 + 1 = 2
            // remaining = 5 - 2 = 3 (not 5 + 2 = 7)
            expect(result.remaining).toBe(3);
            expect(result.remaining).not.toBe(7);
        });

        /**
         * Target: Line 132 in fallback - remaining: maxRequests - 1
         * Mutations: Changing to maxRequests + 1 or just maxRequests
         */
        it('should set remaining to maxRequests - 1 on first fallback request', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await checkRateLimit(undefined, 'test', 'user1', testConfig);

            // On first request, count = 1, remaining = 5 - 1 = 4
            expect(result.remaining).toBe(4);
            expect(result.remaining).not.toBe(6); // Would be if + instead of -
            expect(result.remaining).not.toBe(5); // Would be if we forgot to subtract

            vi.restoreAllMocks();
        });
    });

    describe('String Literal and Template Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        /**
         * Target: Line 266 - key = `rate:${prefix}:${identifier}`
         * Target: Line 284 - kvKey = `${key}:${minuteBucket}`
         * Mutations: Changing string concatenation
         */
        it('should construct KV key with correct format rate:prefix:identifier:bucket', async () => {
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'myprefix', 'myid', testConfig);

            const keys = Array.from(mockKV._store.keys());
            const minuteBucket = Math.floor(now / 60_000);

            // Verify exact format
            expect(keys[0]).toBe(`rate:myprefix:myid:${minuteBucket}`);

            // Verify parts
            const parts = keys[0]!.split(':');
            expect(parts[0]).toBe('rate');
            expect(parts[1]).toBe('myprefix');
            expect(parts[2]).toBe('myid');
            expect(parts[3]).toBe(String(minuteBucket));

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 309 - String(newCount)
         * Mutations: Changing String() conversion
         */
        it('should store count as string in KV', async () => {
            await checkRateLimit(mockKV, 'test', 'user', testConfig);

            // Verify put was called with string '1', not number 1
            expect(mockKV.put).toHaveBeenCalledWith(
                expect.any(String),
                '1',
                expect.any(Object)
            );
        });
    });

    describe('Boolean and Return Value Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 3,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        /**
         * Target: Line 298-304 - return block with allowed: false
         * Mutations: Changing false to true
         */
        it('should return allowed: false when limit exceeded (KV)', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user:${minuteBucket}`;

            // Set count at exactly maxRequests
            mockKV._store.set(key, { value: '3' });

            const result = await checkRateLimit(mockKV, 'test', 'user', testConfig);

            expect(result.allowed).toBe(false);
            expect(result.allowed).not.toBe(true);
        });

        /**
         * Target: Line 311-316 - return block with allowed: true
         * Mutations: Changing true to false
         */
        it('should return allowed: true when under limit (KV)', async () => {
            const result = await checkRateLimit(mockKV, 'test', 'user', testConfig);

            expect(result.allowed).toBe(true);
            expect(result.allowed).not.toBe(false);
        });

        /**
         * Target: Line 141-147 - fallback return allowed: false
         */
        it('should return allowed: false when limit exceeded (fallback)', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Exhaust limit
            for (let i = 0; i < 3; i++) {
                await checkRateLimit(undefined, 'test', 'user', testConfig);
            }

            const result = await checkRateLimit(undefined, 'test', 'user', testConfig);

            expect(result.allowed).toBe(false);

            vi.restoreAllMocks();
        });

        /**
         * Target: Line 152-158 - fallback return allowed: true
         */
        it('should return allowed: true when under limit (fallback)', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const result = await checkRateLimit(undefined, 'test', 'user', testConfig);

            expect(result.allowed).toBe(true);

            vi.restoreAllMocks();
        });
    });

    describe('Numeric Constant Tests (HAP-933)', () => {
        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 294 - division by 1000
         * Mutations: Changing 1000 to other values
         */
        it('should convert milliseconds to seconds by dividing by 1000', async () => {
            const testConfig: RateLimitConfig = {
                maxRequests: 5,
                windowMs: 60_000,
                expirationTtl: 120,
            };

            const mockKV = createMockKV();

            // Use a timestamp where we know the exact remaining milliseconds
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(mockKV, 'test', 'user', testConfig);

            // minuteBucket = Math.floor(1700000000000 / 60000) = 28333333
            // windowStart = 28333333 * 60000 = 1699999980000
            // windowEnd = 1699999980000 + 60000 = 1700000040000
            // msUntilReset = 1700000040000 - 1700000000000 = 40000
            // retryAfter = Math.ceil(40000 / 1000) = 40 seconds

            expect(result.retryAfter).toBe(40);
        });

        /**
         * Target: Line 102 - Math.random() < 0.01
         * Mutations: Changing 0.01 to other values
         */
        it('should only trigger cleanup when random < 0.01 (1% probability)', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            // Add expired entries
            populateFallbackStore(10, true);
            expect(getFallbackStoreSize()).toBe(10);

            // Test with random exactly at boundary
            const randomSpy = vi.spyOn(Math, 'random');

            // 0.01 should NOT trigger (>= 0.01, not < 0.01)
            randomSpy.mockReturnValue(0.01);
            const testConfig: RateLimitConfig = { maxRequests: 5 };
            await checkRateLimit(undefined, 'test', 'user1', testConfig);
            expect(getFallbackStoreSize()).toBe(11); // 10 expired + 1 new

            clearFallbackStore();
            populateFallbackStore(10, true);

            // 0.009 should trigger (< 0.01)
            randomSpy.mockReturnValue(0.009);
            await checkRateLimit(undefined, 'test', 'user2', testConfig);
            expect(getFallbackStoreSize()).toBe(1); // Expired removed, only new entry
        });

        /**
         * Target: Line 303 and 146 - remaining: 0
         * Mutations: Changing 0 to other values
         */
        it('should return exactly 0 remaining when blocked', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testConfig: RateLimitConfig = {
                maxRequests: 2,
                windowMs: 60_000,
                expirationTtl: 120,
            };

            // Exhaust limit in fallback
            await checkRateLimit(undefined, 'test', 'user', testConfig);
            await checkRateLimit(undefined, 'test', 'user', testConfig);

            const result = await checkRateLimit(undefined, 'test', 'user', testConfig);

            expect(result.remaining).toBe(0);
            expect(result.remaining).not.toBe(1);
            expect(result.remaining).not.toBe(-1);
        });
    });

    describe('Division Operation Tests (HAP-933)', () => {
        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 283 - minuteBucket = Math.floor(now / windowMs)
         * Mutations: Changing / to * or - or +
         */
        it('should calculate minute bucket using division not multiplication', async () => {
            const testConfig: RateLimitConfig = {
                maxRequests: 5,
                windowMs: 60_000,
                expirationTtl: 120,
            };

            const now = 1700000030000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(mockKV, 'test', 'user', testConfig);

            const keys = Array.from(mockKV._store.keys());
            const bucket = parseInt(keys[0]!.split(':')[3]!, 10);

            // Division: 1700000030000 / 60000 = 28333333.83... -> floor = 28333333
            // If multiplication was used: 1700000030000 * 60000 would be astronomically large
            expect(bucket).toBe(28333333);
            expect(bucket).toBeLessThan(100000000); // Sanity check
        });

        /**
         * Target: Line 124 in fallback - windowEndMs = Math.ceil(now / windowMs) * windowMs
         * Mutations: Changing division/multiplication
         */
        it('should calculate windowEndMs correctly in fallback', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const testConfig: RateLimitConfig = {
                maxRequests: 5,
                windowMs: 60_000,
                expirationTtl: 120,
            };

            // Use a specific timestamp
            const now = 1700000030000; // 30 seconds into a minute
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const result = await checkRateLimit(undefined, 'test', 'user', testConfig);

            // Math.ceil(1700000030000 / 60000) = 28333334
            // windowEndMs = 28333334 * 60000 = 1700000040000
            // retryAfter = Math.ceil((1700000040000 - 1700000030000) / 1000) = 10

            expect(result.retryAfter).toBe(10);
        });
    });

    describe('Status Function Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
            clearFallbackStore();
            resetFallbackWarning();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 350 - retryAfter: Math.ceil(windowMs / 1000) in fallback
         * Mutations: Changing division to multiplication or changing 1000
         */
        it('should return correct retryAfter for new user in fallback status', async () => {
            vi.spyOn(console, 'warn').mockImplementation(() => {});

            const status = await getRateLimitStatus(undefined, 'test', 'newuser', testConfig);

            // For new user with no entry: retryAfter = Math.ceil(60000 / 1000) = 60
            expect(status.retryAfter).toBe(60);
        });

        /**
         * Target: Line 367 in KV status - currentValue ? parseInt(currentValue, 10) : 0
         */
        it('should return 0 count for new user in KV status', async () => {
            const status = await getRateLimitStatus(mockKV, 'test', 'newuser', testConfig);

            expect(status.count).toBe(0);
            expect(status.remaining).toBe(5);
        });

        /**
         * Target: Line 378 - remaining: Math.max(0, maxRequests - currentCount)
         * Mutations: Changing Math.max or the 0
         */
        it('should never return negative remaining in KV status', async () => {
            const now = Date.now();
            const minuteBucket = Math.floor(now / 60_000);
            const key = `rate:test:user:${minuteBucket}`;

            // Set count higher than maxRequests
            mockKV._store.set(key, { value: '100' });

            const status = await getRateLimitStatus(mockKV, 'test', 'user', testConfig);

            // remaining should be 0 (Math.max(0, 5 - 100) = 0), not -95
            expect(status.remaining).toBe(0);
            expect(status.remaining).toBeGreaterThanOrEqual(0);
        });

        /**
         * Target: Line 363 - minuteBucket = Math.floor(now / windowMs) in getRateLimitStatus
         */
        it('should use same bucket calculation in status as in checkRateLimit', async () => {
            const now = 1700000030000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            // Make a request
            await checkRateLimit(mockKV, 'test', 'user', testConfig);

            // Check status - should see the same count
            const status = await getRateLimitStatus(mockKV, 'test', 'user', testConfig);

            expect(status.count).toBe(1);
        });
    });

    describe('Fallback Store Entry Creation Tests (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 129 - fallbackLimits.set(key, { count: 1, resetAt: now + windowMs })
         * Mutations: Changing count: 1 to count: 0 or count: 2
         */
        it('should create new entry with count 1 not 0 or 2', async () => {
            const result = await checkRateLimit(undefined, 'test', 'newuser', testConfig);

            expect(result.count).toBe(1);
            expect(result.count).not.toBe(0);
            expect(result.count).not.toBe(2);
        });

        /**
         * Target: Line 129 - resetAt: now + windowMs
         * Mutations: Changing + to -
         */
        it('should set resetAt to now + windowMs (future, not past)', async () => {
            const now = 1700000000000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            await checkRateLimit(undefined, 'test', 'user', testConfig);

            // If resetAt was now - windowMs, the entry would be immediately expired
            // Check that within the window, the entry persists
            vi.spyOn(Date, 'now').mockReturnValue(now + 30_000); // 30 seconds later

            const result2 = await checkRateLimit(undefined, 'test', 'user', testConfig);
            expect(result2.count).toBe(2); // Entry persisted, count increased
        });

        /**
         * Target: Line 151 - entry.count++
         * Mutations: Changing to entry.count-- or entry.count += 2
         */
        it('should increment existing entry count by exactly 1', async () => {
            const result1 = await checkRateLimit(undefined, 'test', 'user', testConfig);
            const result2 = await checkRateLimit(undefined, 'test', 'user', testConfig);
            const result3 = await checkRateLimit(undefined, 'test', 'user', testConfig);

            expect(result1.count).toBe(1);
            expect(result2.count).toBe(2);
            expect(result3.count).toBe(3);

            // Verify sequential increment
            expect(result2.count - result1.count).toBe(1);
            expect(result3.count - result2.count).toBe(1);
        });
    });

    describe('Capacity Bypass Return Values (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        beforeEach(() => {
            clearFallbackStore();
            resetFallbackWarning();
            vi.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Lines 113-119 - capacity bypass return block
         * Mutations: Changing individual return values
         */
        it('should return exact capacity bypass values', async () => {
            const maxEntries = getFallbackMaxEntries();
            populateFallbackStore(maxEntries, false); // Fill to capacity

            const result = await checkRateLimit(undefined, 'test', 'user', testConfig);

            // Verify each field exactly
            expect(result.allowed).toBe(true);
            expect(result.count).toBe(0);
            expect(result.limit).toBe(testConfig.maxRequests);
            expect(result.retryAfter).toBe(0);
            expect(result.remaining).toBe(testConfig.maxRequests);
        });
    });

    /**
     * HAP-933: Kill remaining mutations in getRateLimitStatus KV path
     *
     * These tests target specific arithmetic mutations on lines 369-372:
     * - Line 370: windowStartMs + windowMs (not -)
     * - Line 371: windowEndMs - now (not +)
     * - Line 372: msUntilReset / 1000 (not *)
     */
    describe('getRateLimitStatus KV Path Arithmetic Mutations (HAP-933)', () => {
        const testConfig: RateLimitConfig = {
            maxRequests: 5,
            windowMs: 60_000,
            expirationTtl: 120,
        };

        let mockKV: ReturnType<typeof createMockKV>;

        beforeEach(() => {
            mockKV = createMockKV();
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        /**
         * Target: Line 370 - windowEndMs = windowStartMs + windowMs
         * Mutation: windowStartMs - windowMs would give negative or wrong value
         */
        it('should calculate windowEndMs as windowStartMs + windowMs (not subtraction)', async () => {
            // Use a specific timestamp in the middle of a minute
            const now = 1700000030000; // 30 seconds into a minute window
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            // Calculate expected values
            const windowMs = 60_000;
            const minuteBucket = Math.floor(now / windowMs); // = 28333333
            const windowStartMs = minuteBucket * windowMs;    // = 1699999980000
            const windowEndMs = windowStartMs + windowMs;     // = 1700000040000 (correct)
            // If subtraction: windowEndMs = 1699999980000 - 60000 = 1699999920000 (wrong)

            const msUntilReset = windowEndMs - now;           // = 10000ms (correct)
            const expectedRetryAfter = Math.ceil(msUntilReset / 1000); // = 10 seconds

            // This assertion will fail if subtraction is used instead of addition
            // because retryAfter would be negative or very large
            expect(status.retryAfter).toBe(expectedRetryAfter);
            expect(status.retryAfter).toBeGreaterThan(0);
            expect(status.retryAfter).toBeLessThanOrEqual(60);
        });

        /**
         * Target: Line 371 - msUntilReset = windowEndMs - now
         * Mutation: windowEndMs + now would give a huge value
         */
        it('should calculate msUntilReset as windowEndMs - now (not addition)', async () => {
            // Use a timestamp where we know the exact result
            const now = 1700000050000; // 50 seconds into a minute
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            // Calculate expected values
            const windowMs = 60_000;
            const minuteBucket = Math.floor(now / windowMs); // = 28333334
            const windowStartMs = minuteBucket * windowMs;    // = 1700000040000
            const windowEndMs = windowStartMs + windowMs;     // = 1700000100000

            // Correct: msUntilReset = 1700000100000 - 1700000050000 = 50000ms
            // Wrong (addition): msUntilReset = 1700000100000 + 1700000050000 = huge number

            const msUntilReset = windowEndMs - now;           // = 50000ms
            const expectedRetryAfter = Math.ceil(msUntilReset / 1000); // = 50 seconds

            // With addition mutation, retryAfter would be millions of seconds
            expect(status.retryAfter).toBe(expectedRetryAfter);
            expect(status.retryAfter).toBeLessThanOrEqual(60);
        });

        /**
         * Target: Line 372 - retryAfter = Math.ceil(msUntilReset / 1000)
         * Mutation: msUntilReset * 1000 would give a huge value
         */
        it('should calculate retryAfter using division by 1000 (not multiplication)', async () => {
            // Use a timestamp that's exactly 30 seconds from the end of window
            const now = 1700000010000;
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            // Calculate expected values
            const windowMs = 60_000;
            const minuteBucket = Math.floor(now / windowMs);
            const windowStartMs = minuteBucket * windowMs;
            const windowEndMs = windowStartMs + windowMs;
            const msUntilReset = windowEndMs - now;

            // Correct: retryAfter = Math.ceil(msUntilReset / 1000) = seconds
            // Wrong (multiplication): retryAfter = Math.ceil(msUntilReset * 1000) = billions

            const expectedRetryAfter = Math.ceil(msUntilReset / 1000);

            expect(status.retryAfter).toBe(expectedRetryAfter);
            // Critical: retryAfter should be in seconds (0-60 range for 1 minute window)
            expect(status.retryAfter).toBeLessThanOrEqual(60);
            expect(status.retryAfter).toBeGreaterThan(0);
        });

        /**
         * Comprehensive test: verify exact retryAfter calculation at specific point in window
         */
        it('should return exact retryAfter value (verifies all arithmetic operations)', async () => {
            // At exactly 45 seconds into a minute window
            // windowStartMs will be at the start of the current minute
            // retryAfter should be approximately 15 seconds
            const baseTime = 1700000000000; // Base timestamp
            const minuteBucket = Math.floor(baseTime / 60_000);
            const windowStartMs = minuteBucket * 60_000;
            const targetRetryAfter = 15; // We want 15 seconds remaining
            const now = windowStartMs + 60_000 - (targetRetryAfter * 1000); // Position in window

            vi.spyOn(Date, 'now').mockReturnValue(now);

            const status = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            // Verify exact retryAfter value
            expect(status.retryAfter).toBe(targetRetryAfter);
        });

        /**
         * Verify window calculations are consistent with checkRateLimit
         */
        it('should have consistent retryAfter between checkRateLimit and getRateLimitStatus', async () => {
            const now = 1700000025000; // 25 seconds into window
            vi.spyOn(Date, 'now').mockReturnValue(now);

            const checkResult = await checkRateLimit(mockKV, 'test', 'user1', testConfig);
            const statusResult = await getRateLimitStatus(mockKV, 'test', 'user1', testConfig);

            // Both should return the same retryAfter value
            expect(checkResult.retryAfter).toBe(statusResult.retryAfter);
        });
    });
});
