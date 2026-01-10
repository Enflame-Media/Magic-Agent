/**
 * Rate Limiting Utility for Cloudflare Workers KV
 *
 * Provides simple KV-based rate limiting with minute buckets.
 * Uses eventual consistency (acceptable for most rate limiting use cases).
 *
 * When KV is unavailable, falls back to per-isolate memory-based rate limiting.
 * This provides protection even when KV is not configured, though it's not
 * distributed across Workers isolates.
 *
 * @module lib/rate-limit
 * @see HAP-409 - Add rate limiting to WebSocket ticket endpoint
 * @see HAP-620 - SECURITY: Rate Limiting Silently Bypassed When KV Missing
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
 * Memory-based fallback rate limit store (per-isolate, not distributed)
 * Used when KV namespace is not configured. Provides better-than-nothing
 * protection, though rate limits are not shared across Workers isolates.
 *
 * @see HAP-620 - SECURITY: Rate Limiting Silently Bypassed When KV Missing
 */
const fallbackLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Maximum entries in fallback store to prevent memory exhaustion
 */
const FALLBACK_MAX_ENTRIES = 10_000;

/**
 * Track if fallback warning has been logged (to avoid log spam)
 */
let fallbackWarningLogged = false;

/**
 * Clean up expired entries from fallback store
 * Called periodically to prevent memory buildup
 */
function cleanupFallbackStore(): void {
    const now = Date.now();
    for (const [key, entry] of fallbackLimits) {
        if (now > entry.resetAt) {
            fallbackLimits.delete(key);
        }
    }
}

/**
 * Check rate limit using in-memory fallback store
 * Used when KV namespace is not available
 *
 * @param key - Unique rate limit key
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
function checkMemoryRateLimit(
    key: string,
    config: RateLimitConfig
): RateLimitResult {
    const { maxRequests, windowMs = 60_000 } = config;
    const now = Date.now();

    // Clean up expired entries periodically (every 100th call)
    if (fallbackLimits.size > 0 && Math.random() < 0.01) {
        cleanupFallbackStore();
    }

    // Enforce max entries to prevent memory exhaustion
    if (fallbackLimits.size >= FALLBACK_MAX_ENTRIES) {
        cleanupFallbackStore();
        // If still too many entries after cleanup, allow request
        // (graceful degradation is better than crash)
        if (fallbackLimits.size >= FALLBACK_MAX_ENTRIES) {
            console.warn('[RateLimit] Fallback store at capacity, allowing request');
            return {
                allowed: true,
                count: 0,
                limit: maxRequests,
                retryAfter: 0,
                remaining: maxRequests,
            };
        }
    }

    const entry = fallbackLimits.get(key);
    const windowEndMs = Math.ceil(now / windowMs) * windowMs;
    const retryAfter = Math.ceil((windowEndMs - now) / 1000);

    // Reset or create new entry if expired or doesn't exist
    if (!entry || now > entry.resetAt) {
        fallbackLimits.set(key, { count: 1, resetAt: now + windowMs });
        return {
            allowed: true,
            count: 1,
            limit: maxRequests,
            retryAfter,
            remaining: maxRequests - 1,
        };
    }

    // Check if limit exceeded BEFORE incrementing
    if (entry.count >= maxRequests) {
        return {
            allowed: false,
            count: entry.count,
            limit: maxRequests,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            remaining: 0,
        };
    }

    // Increment counter
    entry.count++;
    return {
        allowed: true,
        count: entry.count,
        limit: maxRequests,
        retryAfter,
        remaining: maxRequests - entry.count,
    };
}

/**
 * Reset fallback warning state (for testing only)
 */
export function resetFallbackWarning(): void {
    fallbackWarningLogged = false;
}

/**
 * Get fallback store size (for testing only)
 */
export function getFallbackStoreSize(): number {
    return fallbackLimits.size;
}

/**
 * Clear fallback store (for testing only)
 */
export function clearFallbackStore(): void {
    fallbackLimits.clear();
}

/**
 * Check and increment rate limit counter
 *
 * Uses minute buckets with the format: rate:{prefix}:{identifier}:{minuteBucket}
 * This provides a simple sliding window approximation.
 *
 * When KV is not provided (undefined), falls back to per-isolate memory-based
 * rate limiting. This provides protection even when KV is misconfigured, though
 * limits are not distributed across Workers isolates.
 *
 * @param kv - Cloudflare KV namespace binding (optional, falls back to memory)
 * @param prefix - Rate limit category (e.g., 'ticket')
 * @param identifier - Unique identifier (e.g., userId)
 * @param config - Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 *
 * @see HAP-620 - SECURITY: Rate Limiting Silently Bypassed When KV Missing
 *
 * @example
 * ```typescript
 * // With KV (distributed rate limiting)
 * const result = await checkRateLimit(
 *     env.RATE_LIMIT_KV,
 *     'ticket',
 *     userId,
 *     TICKET_RATE_LIMIT
 * );
 *
 * // Without KV (fallback to memory-based)
 * const result = await checkRateLimit(
 *     undefined,
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
    kv: KVNamespace | undefined,
    prefix: string,
    identifier: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const { maxRequests, windowMs = 60_000, expirationTtl = 120 } = config;
    const key = `rate:${prefix}:${identifier}`;

    // Fallback to memory-based rate limiting when KV is not available
    if (!kv) {
        if (!fallbackWarningLogged) {
            console.warn(
                '[RateLimit] RATE_LIMIT_KV not configured, using fallback memory-based rate limiting. ' +
                'This provides per-isolate protection but is not distributed across Workers. ' +
                'Configure RATE_LIMIT_KV for production-grade distributed rate limiting.'
            );
            fallbackWarningLogged = true;
        }
        return checkMemoryRateLimit(key, config);
    }

    // Calculate minute bucket for KV-based rate limiting
    const now = Date.now();
    const minuteBucket = Math.floor(now / windowMs);
    const kvKey = `${key}:${minuteBucket}`;

    // Get current count
    const currentValue = await kv.get(kvKey);
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
    await kv.put(kvKey, String(newCount), { expirationTtl });

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
 * When KV is not available, returns status from fallback memory store.
 *
 * @param kv - Cloudflare KV namespace binding (optional)
 * @param prefix - Rate limit category
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
    kv: KVNamespace | undefined,
    prefix: string,
    identifier: string,
    config: RateLimitConfig
): Promise<Omit<RateLimitResult, 'allowed'>> {
    const { maxRequests, windowMs = 60_000 } = config;
    const now = Date.now();

    // Fallback to memory-based status when KV is not available
    if (!kv) {
        const key = `rate:${prefix}:${identifier}`;
        const entry = fallbackLimits.get(key);

        if (!entry || now > entry.resetAt) {
            return {
                count: 0,
                limit: maxRequests,
                retryAfter: Math.ceil(windowMs / 1000),
                remaining: maxRequests,
            };
        }

        return {
            count: entry.count,
            limit: maxRequests,
            retryAfter: Math.ceil((entry.resetAt - now) / 1000),
            remaining: Math.max(0, maxRequests - entry.count),
        };
    }

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
 * When KV is not available, clears from fallback memory store.
 *
 * @param kv - Cloudflare KV namespace binding (optional)
 * @param prefix - Rate limit category
 * @param identifier - Unique identifier
 * @param config - Rate limit configuration
 */
export async function resetRateLimit(
    kv: KVNamespace | undefined,
    prefix: string,
    identifier: string,
    config: RateLimitConfig
): Promise<void> {
    const { windowMs = 60_000 } = config;
    const key = `rate:${prefix}:${identifier}`;

    // Reset in fallback store
    fallbackLimits.delete(key);

    // Also reset in KV if available
    if (kv) {
        const now = Date.now();
        const minuteBucket = Math.floor(now / windowMs);
        const kvKey = `${key}:${minuteBucket}`;
        await kv.delete(kvKey);
    }
}
