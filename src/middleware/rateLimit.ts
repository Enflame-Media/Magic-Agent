/**
 * Rate Limiting Middleware for Hono (KV-based)
 *
 * Security: Prevents brute force attacks, credential stuffing, and DoS
 * by limiting request rates per IP address.
 *
 * Uses Cloudflare KV for distributed rate limiting across edge locations.
 *
 * @see HAP-617 - SECURITY: No Rate Limiting on Admin API Authentication Endpoints
 * @see https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../env';

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
    /** Maximum requests allowed in the window */
    limit: number;
    /** Time window in seconds */
    windowSeconds: number;
    /** Key prefix for KV storage (helps distinguish endpoint types) */
    keyPrefix?: string;
    /** Custom function to extract the rate limit key (defaults to IP) */
    keyFn?: (c: Context<{ Bindings: Env; Variables: Variables }>) => string;
    /** Whether to skip rate limiting (useful for testing) */
    skip?: (c: Context<{ Bindings: Env; Variables: Variables }>) => boolean;
}

/**
 * Rate limit response body
 */
export interface RateLimitExceededResponse {
    error: 'Too Many Requests';
    message: string;
    code: 'RATE_LIMIT_EXCEEDED';
    retryAfter: number;
}

/**
 * Rate limit state stored in KV
 */
interface RateLimitState {
    count: number;
    resetAt: number;
}

/**
 * Extract client IP address from Cloudflare headers
 *
 * @param c - Hono context
 * @returns Client IP address or 'unknown'
 */
function getClientIp(c: Context<{ Bindings: Env; Variables: Variables }>): string {
    // Cloudflare provides the real client IP in CF-Connecting-IP header
    // This is the most reliable way to get the client IP on Workers
    return (
        c.req.header('CF-Connecting-IP') ??
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
        'unknown'
    );
}

/**
 * Creates a KV-based rate limiting middleware
 *
 * How it works:
 * 1. Extract rate limit key (IP address by default)
 * 2. Get current count from KV for the time window
 * 3. If count >= limit, reject with 429 and Retry-After header
 * 4. Otherwise, increment count and allow request
 *
 * @param options - Rate limiting configuration
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * // 5 requests per minute per IP
 * app.use('/api/auth/sign-in/*', rateLimitMiddleware({
 *     limit: 5,
 *     windowSeconds: 60,
 *     keyPrefix: 'signin',
 * }));
 * ```
 */
export function rateLimitMiddleware(
    options: RateLimitOptions
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
    const {
        limit,
        windowSeconds,
        keyPrefix = 'rate',
        keyFn = getClientIp,
        skip,
    } = options;

    return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
        // Check if rate limiting should be skipped
        if (skip?.(c)) {
            return next();
        }

        // Get the KV namespace
        const kv = c.env.RATE_LIMIT_KV;
        if (!kv) {
            // If KV is not configured, log warning and allow request
            // This prevents breaking the app during development without KV
            console.warn('[RateLimit] KV namespace not configured, skipping rate limit check');
            return next();
        }

        // Generate rate limit key
        const identifier = keyFn(c);
        const windowId = Math.floor(Date.now() / (windowSeconds * 1000));
        const key = `${keyPrefix}:${identifier}:${windowId}`;

        try {
            // Get current state from KV
            const stateJson = await kv.get(key);
            let state: RateLimitState;

            if (stateJson) {
                state = JSON.parse(stateJson);
            } else {
                state = {
                    count: 0,
                    resetAt: (windowId + 1) * windowSeconds * 1000,
                };
            }

            // Check if limit exceeded
            if (state.count >= limit) {
                const retryAfter = Math.ceil((state.resetAt - Date.now()) / 1000);

                console.warn(
                    `[RateLimit] Limit exceeded for ${keyPrefix}:${identifier}. ` +
                        `Count: ${state.count}/${limit}, Retry after: ${retryAfter}s`
                );

                c.header('Retry-After', String(Math.max(1, retryAfter)));
                c.header('X-RateLimit-Limit', String(limit));
                c.header('X-RateLimit-Remaining', '0');
                c.header('X-RateLimit-Reset', String(Math.floor(state.resetAt / 1000)));

                return c.json<RateLimitExceededResponse>(
                    {
                        error: 'Too Many Requests',
                        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter,
                    },
                    429
                );
            }

            // Increment count and store
            state.count += 1;
            await kv.put(key, JSON.stringify(state), {
                expirationTtl: windowSeconds + 1, // Slightly longer than window to handle edge cases
            });

            // Add rate limit headers to successful responses
            c.header('X-RateLimit-Limit', String(limit));
            c.header('X-RateLimit-Remaining', String(limit - state.count));
            c.header('X-RateLimit-Reset', String(Math.floor(state.resetAt / 1000)));

            return next();
        } catch (error) {
            // Log error but allow request to proceed
            // This prevents KV failures from blocking legitimate users
            console.error('[RateLimit] KV error, allowing request:', error);
            return next();
        }
    };
}

/**
 * Pre-configured rate limit tiers for admin API endpoints
 *
 * @see HAP-617 for rationale behind each limit
 */
export const rateLimits = {
    /**
     * Sign-in endpoint: 5 requests per minute
     * Prevents brute force password attacks
     */
    signIn: () =>
        rateLimitMiddleware({
            limit: 5,
            windowSeconds: 60,
            keyPrefix: 'auth-signin',
        }),

    /**
     * Sign-up endpoint: 3 requests per minute
     * Prevents mass account registration
     */
    signUp: () =>
        rateLimitMiddleware({
            limit: 3,
            windowSeconds: 60,
            keyPrefix: 'auth-signup',
        }),

    /**
     * Forgot password endpoint: 3 requests per 5 minutes
     * Prevents email flooding/enumeration
     */
    forgotPassword: () =>
        rateLimitMiddleware({
            limit: 3,
            windowSeconds: 300, // 5 minutes
            keyPrefix: 'auth-forgot',
        }),

    /**
     * General auth endpoint fallback: 10 requests per minute
     * Catches any other auth endpoints not specifically limited
     */
    authGeneral: () =>
        rateLimitMiddleware({
            limit: 10,
            windowSeconds: 60,
            keyPrefix: 'auth-general',
        }),

    /**
     * Metrics endpoint: 60 requests per minute
     * Higher limit for legitimate dashboard use, prevents abuse
     */
    metrics: () =>
        rateLimitMiddleware({
            limit: 60,
            windowSeconds: 60,
            keyPrefix: 'metrics',
        }),
} as const;

/**
 * Combined auth rate limiter that applies appropriate limits
 * based on the specific auth endpoint being accessed.
 *
 * This is more efficient than applying multiple separate middlewares
 * as it only makes one KV lookup per request.
 */
export function authRateLimitMiddleware(): MiddlewareHandler<{
    Bindings: Env;
    Variables: Variables;
}> {
    return async (c, next) => {
        const path = c.req.path;

        // Determine rate limit tier based on endpoint
        let limit: number;
        let windowSeconds: number;
        let keyPrefix: string;

        if (path.includes('/sign-in')) {
            limit = 5;
            windowSeconds = 60;
            keyPrefix = 'auth-signin';
        } else if (path.includes('/sign-up')) {
            limit = 3;
            windowSeconds = 60;
            keyPrefix = 'auth-signup';
        } else if (path.includes('/forgot-password') || path.includes('/reset-password')) {
            limit = 3;
            windowSeconds = 300;
            keyPrefix = 'auth-forgot';
        } else {
            // Default for other auth endpoints
            limit = 10;
            windowSeconds = 60;
            keyPrefix = 'auth-general';
        }

        // Create and invoke the appropriate rate limiter
        const middleware = rateLimitMiddleware({
            limit,
            windowSeconds,
            keyPrefix,
        });

        return middleware(c, next);
    };
}
