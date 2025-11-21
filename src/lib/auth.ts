import * as privacyKit from 'privacy-kit';

/**
 * Token cache entry interface
 */
interface TokenCacheEntry {
    userId: string;
    extras?: any;
    cachedAt: number;
}

/**
 * Auth tokens interface for privacy-kit generators and verifiers
 */
interface AuthTokens {
    generator: Awaited<ReturnType<typeof privacyKit.createPersistentTokenGenerator>>;
    verifier: Awaited<ReturnType<typeof privacyKit.createPersistentTokenVerifier>>;
}

/**
 * Authentication module for Cloudflare Workers
 *
 * Manages token generation and verification using privacy-kit persistent tokens.
 * Adapted from happy-server's auth module for Workers environment.
 *
 * @remarks
 * This module preserves the existing authentication flow:
 * 1. Public key challenge-response (TweetNaCl Ed25519)
 * 2. Token generation with privacy-kit
 * 3. Token verification with in-memory cache
 *
 * Key differences from Node.js version:
 * - No class-based singleton (Workers use module-level state)
 * - Initialization accepts secret parameter (no process.env)
 * - Tokens are created per-request, not globally cached in Workers
 */

let tokens: AuthTokens | null = null;
const tokenCache = new Map<string, TokenCacheEntry>();

/**
 * Initialize the auth module with master secret
 *
 * Must be called once during Worker initialization with the HANDY_MASTER_SECRET.
 * In Cloudflare Workers, this should be called at the module level or in the first request.
 *
 * @param masterSecret - The master secret for token generation (from env.HANDY_MASTER_SECRET)
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * // In your worker handler
 * export default {
 *     async fetch(request: Request, env: Env) {
 *         await initAuth(env.HANDY_MASTER_SECRET);
 *         // ... rest of your handler
 *     }
 * }
 * ```
 */
export async function initAuth(masterSecret: string): Promise<void> {
    if (tokens) {
        return; // Already initialized
    }

    const generator = await privacyKit.createPersistentTokenGenerator({
        service: 'handy',
        seed: masterSecret,
    });

    const verifier = await privacyKit.createPersistentTokenVerifier({
        service: 'handy',
        publicKey: generator.publicKey,
    });

    tokens = { generator, verifier };
}

/**
 * Create a new authentication token for a user
 *
 * Generates a persistent token using privacy-kit that can be verified later.
 * Tokens are automatically cached for fast verification.
 *
 * @param userId - The user ID to embed in the token
 * @param extras - Optional additional data to embed in the token (e.g., session ID)
 * @returns Promise resolving to the generated token string
 * @throws Error if auth module is not initialized
 *
 * @example
 * ```typescript
 * const token = await createToken('user_abc123', { session: 'session_xyz' });
 * // Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 * ```
 */
export async function createToken(userId: string, extras?: any): Promise<string> {
    if (!tokens) {
        throw new Error('Auth module not initialized - call initAuth() first');
    }

    const payload: any = { user: userId };
    if (extras) {
        payload.extras = extras;
    }

    const token = await tokens.generator.new(payload);

    // Cache the token immediately for fast verification
    tokenCache.set(token, {
        userId,
        extras,
        cachedAt: Date.now(),
    });

    return token;
}

/**
 * Verify an authentication token
 *
 * Checks if a token is valid and returns the embedded user ID and extras.
 * Uses in-memory cache for fast verification of recently seen tokens.
 *
 * @param token - The token string to verify
 * @returns Promise resolving to user data if valid, null if invalid
 * @throws Error if auth module is not initialized
 *
 * @example
 * ```typescript
 * const verified = await verifyToken(token);
 * if (verified) {
 *     console.log(`User ID: ${verified.userId}`);
 *     if (verified.extras?.session) {
 *         console.log(`Session: ${verified.extras.session}`);
 *     }
 * } else {
 *     console.log('Invalid token');
 * }
 * ```
 */
export async function verifyToken(token: string): Promise<{ userId: string; extras?: any } | null> {
    // Check cache first
    const cached = tokenCache.get(token);
    if (cached) {
        return {
            userId: cached.userId,
            extras: cached.extras,
        };
    }

    // Cache miss - verify token
    if (!tokens) {
        throw new Error('Auth module not initialized - call initAuth() first');
    }

    try {
        const verified = await tokens.verifier.verify(token);
        if (!verified) {
            return null;
        }

        const userId = verified.user as string;
        const extras = verified.extras;

        // Cache the result for future fast verification
        tokenCache.set(token, {
            userId,
            extras,
            cachedAt: Date.now(),
        });

        return { userId, extras };
    } catch (error) {
        console.error('Token verification failed:', error);
        return null;
    }
}

/**
 * Invalidate all tokens for a specific user
 *
 * Removes all cached tokens for a user. Useful when a user logs out or
 * their account is compromised and you need to force re-authentication.
 *
 * Note: This only clears the cache in this Worker instance. privacy-kit tokens
 * are cryptographically valid until they expire, so this is a best-effort invalidation.
 *
 * @param userId - The user ID whose tokens should be invalidated
 *
 * @example
 * ```typescript
 * // User logs out or changes password
 * invalidateUserTokens('user_abc123');
 * ```
 */
export function invalidateUserTokens(userId: string): void {
    // Remove all tokens for a specific user from the cache
    for (const [token, entry] of tokenCache.entries()) {
        if (entry.userId === userId) {
            tokenCache.delete(token);
        }
    }
}

/**
 * Invalidate a specific token
 *
 * Removes a token from the cache, forcing re-verification on next use.
 *
 * @param token - The token string to invalidate
 *
 * @example
 * ```typescript
 * invalidateToken(expiredToken);
 * ```
 */
export function invalidateToken(token: string): void {
    tokenCache.delete(token);
}

/**
 * Get token cache statistics
 *
 * Returns information about the current cache state for monitoring and debugging.
 *
 * @returns Object with cache size and oldest entry timestamp
 *
 * @example
 * ```typescript
 * const stats = getCacheStats();
 * console.log(`Cache has ${stats.size} tokens`);
 * if (stats.oldestEntry) {
 *     const age = Date.now() - stats.oldestEntry;
 *     console.log(`Oldest token cached ${age}ms ago`);
 * }
 * ```
 */
export function getCacheStats(): { size: number; oldestEntry: number | null } {
    if (tokenCache.size === 0) {
        return { size: 0, oldestEntry: null };
    }

    let oldest = Date.now();
    for (const entry of tokenCache.values()) {
        if (entry.cachedAt < oldest) {
            oldest = entry.cachedAt;
        }
    }

    return {
        size: tokenCache.size,
        oldestEntry: oldest,
    };
}
