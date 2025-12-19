/**
 * Rate Limiting Utility for Cloudflare Workers KV
 *
 * Provides simple KV-based rate limiting with minute buckets.
 * Uses eventual consistency (acceptable for most rate limiting use cases).
 *
 * @module lib/rate-limit
 * @see HAP-409 - Add rate limiting to WebSocket ticket endpoint
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
    /** Maximum requests allowed per window */
    maxRequests: number;
    /** Window duration in milliseconds (default: 60000 = 1 minute) */
    windowMs?: number;
    /** Key expiration TTL in seconds (should be > window, default: 120) */
    expirationTtl?: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
    /** Whether the request is allowed */
    allowed: boolean;
    /** Current request count in this window */
    count: number;
    /** Maximum requests allowed */
    limit: number;
    /** Seconds until the rate limit resets */
    retryAfter: number;
    /** Seconds remaining in current window */
    remaining: number;
}

/**
 * Default rate limit configuration for ticket endpoint
 * 10 tickets per minute per user
 */
export const TICKET_RATE_LIMIT: RateLimitConfig = {
    maxRequests: 10,
    windowMs: 60_000, // 1 minute
    expirationTtl: 120, // 2 minutes (covers window + cleanup margin)
};

/**
 * Check and increment rate limit counter
 *
 * Uses minute buckets with the format: rate:{prefix}:{identifier}:{minuteBucket}
 * This provides a simple sliding window approximation.
 *
 * @param kv - Cloudflare KV namespace binding
 * @param prefix - Rate limit category (e.g., 'ticket')
 * @param identifier - Unique identifier (e.g., userId)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @example
 * ```typescript
 * const result = await checkRateLimit(
 *     env.RATE_LIMIT_KV,
 *     'ticket',
 *     userId,
 *     TICKET_RATE_LIMIT
 * );
 *
 * if (!result.allowed) {
 *     return c.json(
 *         { error: 'Rate limit exceeded' },
 *         429,
 *         { 'Retry-After': String(result.retryAfter) }
 *     );
 * }
 * ```
 */
export async function checkRateLimit(
    kv: KVNamespace,
    prefix: string,
    identifier: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const { maxRequests, windowMs = 60_000, expirationTtl = 120 } = config;

    // Calculate minute bucket
    const now = Date.now();
    const minuteBucket = Math.floor(now / windowMs);
    const key = `rate:${prefix}:${identifier}:${minuteBucket}`;

    // Get current count
    const currentValue = await kv.get(key);
    const currentCount = currentValue ? parseInt(currentValue, 10) : 0;

    // Calculate time until window resets
    const windowStartMs = minuteBucket * windowMs;
    const windowEndMs = windowStartMs + windowMs;
    const msUntilReset = windowEndMs - now;
    const retryAfter = Math.ceil(msUntilReset / 1000);

    // Check if limit exceeded BEFORE incrementing
    if (currentCount >= maxRequests) {
        return {
            allowed: false,
            count: currentCount,
            limit: maxRequests,
            retryAfter,
            remaining: 0,
        };
    }

    // Increment counter
    const newCount = currentCount + 1;
    await kv.put(key, String(newCount), { expirationTtl });

    return {
        allowed: true,
        count: newCount,
        limit: maxRequests,
        retryAfter,
        remaining: maxRequests - newCount,
    };
}

/**
 * Get current rate limit status without incrementing
 *
 * Useful for monitoring or showing remaining quota.
 *
 * @param kv - Cloudflare KV namespace binding
 * @param prefix - Rate limit category
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
    kv: KVNamespace,
    prefix: string,
    identifier: string,
    config: RateLimitConfig
): Promise<Omit<RateLimitResult, 'allowed'>> {
    const { maxRequests, windowMs = 60_000 } = config;

    const now = Date.now();
    const minuteBucket = Math.floor(now / windowMs);
    const key = `rate:${prefix}:${identifier}:${minuteBucket}`;

    const currentValue = await kv.get(key);
    const currentCount = currentValue ? parseInt(currentValue, 10) : 0;

    const windowStartMs = minuteBucket * windowMs;
    const windowEndMs = windowStartMs + windowMs;
    const msUntilReset = windowEndMs - now;
    const retryAfter = Math.ceil(msUntilReset / 1000);

    return {
        count: currentCount,
        limit: maxRequests,
        retryAfter,
        remaining: Math.max(0, maxRequests - currentCount),
    };
}

/**
 * Reset rate limit for a specific identifier
 *
 * Useful for testing or admin overrides.
 *
 * @param kv - Cloudflare KV namespace binding
 * @param prefix - Rate limit category
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export async function resetRateLimit(
    kv: KVNamespace,
    prefix: string,
    identifier: string,
    config: RateLimitConfig
): Promise<void> {
    const { windowMs = 60_000 } = config;

    const now = Date.now();
    const minuteBucket = Math.floor(now / windowMs);
    const key = `rate:${prefix}:${identifier}:${minuteBucket}`;

    await kv.delete(key);
}
