/**
 * Tests for rate limiting utility
 *
 * @see HAP-409 - Add rate limiting to WebSocket ticket endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    checkRateLimit,
    getRateLimitStatus,
    resetRateLimit,
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
});
