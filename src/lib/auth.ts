import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { eq, sql, lt } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { revokedTokens } from '@/db/schema';
/**
 * Token extras type - additional data embedded in tokens
 */
export type TokenExtras = Record<string, unknown>;

/**
 * Token cache entry interface
 */
interface TokenCacheEntry {
    userId: string;
    extras?: TokenExtras;
    cachedAt: number;
}

/**
 * Auth state interface for persistent and ephemeral token management
 */
interface AuthState {
    persistentKey: CryptoKey;
    persistentPublicKey: string;
    persistentTtl: number;
    ephemeralKey: CryptoKey;
    ephemeralPublicKey: string;
    ephemeralTtl: number;
}

/**
 * Authentication module for Cloudflare Workers using jose
 *
 * Replaces privacy-kit (which is incompatible with Workers due to
 * createRequire(import.meta.url) usage) with jose, which explicitly
 * supports Cloudflare Workers and Web Crypto API.
 *
 * @remarks
 * Token format is designed to be compatible with happy-server's privacy-kit tokens:
 * - Service identifier in issuer claim
 * - User ID in 'user' claim
 * - Optional extras in 'extras' claim
 *
 * Key differences from privacy-kit version:
 * - Uses jose SignJWT/jwtVerify instead of privacy-kit generators
 * - Derives Ed25519 keys from seed using Web Crypto API (HKDF)
 * - Persistent tokens expire after 30 days (configurable via initAuth)
 * - Ephemeral tokens have configurable TTL (default 5 minutes)
 *
 * ## Security Model
 *
 * **Token Lifecycle:**
 * - Persistent tokens: 30-day lifetime with 7-day refresh grace period
 * - Ephemeral tokens: 5-minute lifetime (for OAuth flows)
 *
 * **Token Refresh:**
 * - Clients should refresh tokens before expiration using refreshToken()
 * - Grace period allows refresh up to 7 days after expiration
 * - After grace period, full re-authentication is required
 *
 * **Revocation:**
 * - Tokens can be revoked via D1 blacklist (distributed invalidation)
 * - Revocation is checked on every verification (after cache miss)
 *
 * @see HAP-264 for implementation details
 * @see HAP-26 for discovery of privacy-kit incompatibility
 * @see HAP-451 for token expiration security improvement
 */

let authState: AuthState | null = null;
const tokenCache = new Map<string, TokenCacheEntry>();

// Service identifier for token issuer (matches happy-server)
const SERVICE_NAME = 'handy';
const EPHEMERAL_SERVICE_NAME = 'github-happy';
const DEFAULT_EPHEMERAL_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_PERSISTENT_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const REFRESH_GRACE_PERIOD = 7 * 24 * 60 * 60 * 1000; // 7 days grace period for refresh

/**
 * Ed25519 PKCS8 prefix for wrapping a 32-byte private key seed
 *
 * This is the ASN.1 DER encoding for:
 * SEQUENCE {
 *   INTEGER 0 (version)
 *   SEQUENCE { OID 1.3.101.112 (Ed25519) }
 *   OCTET STRING containing OCTET STRING of 32-byte seed
 * }
 *
 * The prefix is 16 bytes, followed by the 32-byte seed = 48 bytes total
 */
const ED25519_PKCS8_PREFIX = new Uint8Array([
    0x30, 0x2e, // SEQUENCE, 46 bytes
    0x02, 0x01, 0x00, // INTEGER 0 (version)
    0x30, 0x05, // SEQUENCE, 5 bytes (AlgorithmIdentifier)
    0x06, 0x03, 0x2b, 0x65, 0x70, // OID 1.3.101.112 (Ed25519)
    0x04, 0x22, // OCTET STRING, 34 bytes
    0x04, 0x20, // OCTET STRING, 32 bytes (the actual key seed)
]);

/**
 * Wrap a 32-byte Ed25519 seed in PKCS8 format
 *
 * Cloudflare Workers doesn't support raw import of Ed25519 private keys,
 * but does support PKCS8 format. This function wraps the seed in the
 * correct ASN.1 DER structure.
 *
 * @param seed - 32-byte Ed25519 private key seed
 * @returns PKCS8-formatted key (48 bytes)
 */
function wrapEd25519SeedAsPkcs8(seed: Uint8Array): Uint8Array {
    if (seed.length !== 32) {
        throw new Error(`Ed25519 seed must be 32 bytes, got ${seed.length}`);
    }
    const pkcs8 = new Uint8Array(48);
    pkcs8.set(ED25519_PKCS8_PREFIX);
    pkcs8.set(seed, 16);
    return pkcs8;
}

/**
 * Derive a deterministic Ed25519 key pair from a seed string
 *
 * Uses HKDF to derive key material from the seed, then imports as Ed25519 key.
 * This ensures the same seed always produces the same key pair.
 *
 * Note: Cloudflare Workers doesn't support raw import of Ed25519 private keys,
 * so we wrap the derived seed in PKCS8 format before importing.
 *
 * @param seed - The master secret seed
 * @param salt - Salt for key derivation (uses service name for domain separation)
 * @returns Promise resolving to CryptoKeyPair
 */
async function deriveKeyPair(seed: string, salt: string): Promise<CryptoKeyPair> {
    // Import seed as raw key material for HKDF
    const seedBytes = new TextEncoder().encode(seed);
    const baseKey = await crypto.subtle.importKey('raw', seedBytes, 'HKDF', false, [
        'deriveBits',
    ]);

    // Derive 32 bytes for Ed25519 seed using HKDF
    const saltBytes = new TextEncoder().encode(salt);
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: saltBytes,
            info: new TextEncoder().encode('ed25519-key'),
        },
        baseKey,
        256
    );

    // Wrap the 32-byte seed in PKCS8 format
    // Cloudflare Workers doesn't support raw import of Ed25519 private keys
    const pkcs8Key = wrapEd25519SeedAsPkcs8(new Uint8Array(derivedBits));

    // Import as Ed25519 private key using PKCS8 format
    const privateKey = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8Key,
        { name: 'Ed25519' },
        true, // extractable - needed to derive public key
        ['sign']
    );

    // Export and re-import as public key
    const publicKeyJwk = (await crypto.subtle.exportKey('jwk', privateKey)) as JsonWebKey;
    // Remove private key component to get public key only
    delete publicKeyJwk.d;
    publicKeyJwk.key_ops = ['verify'];

    const publicKey = await crypto.subtle.importKey(
        'jwk',
        publicKeyJwk,
        { name: 'Ed25519' },
        true,
        ['verify']
    );

    return { privateKey, publicKey };
}

/**
 * Export public key as base64url-encoded string for sharing
 *
 * @param publicKey - CryptoKey to export
 * @returns Base64url-encoded public key (JWK 'x' parameter)
 */
async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
    const jwk = (await crypto.subtle.exportKey('jwk', publicKey)) as JsonWebKey;
    return jwk.x ?? '';
}

/**
 * Hash a token using SHA-256 for secure storage in the blacklist
 *
 * We never store actual tokens in the database - only their hashes.
 * This ensures that even if the database is compromised, tokens cannot be
 * extracted and used.
 *
 * @param token - The JWT token to hash
 * @returns Hex-encoded SHA-256 hash of the token
 */
async function hashToken(token: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Initialize the auth module with master secret
 *
 * Must be called once during Worker initialization with the master secret.
 * Derives deterministic Ed25519 keys from the seed for persistent token generation.
 *
 * @param masterSecret - The master secret for token generation (from getMasterSecret(env))
 * @param options - Optional configuration for token TTLs
 * @param options.ephemeralTtl - TTL for ephemeral tokens in milliseconds (default: 5 minutes)
 * @param options.persistentTtl - TTL for persistent tokens in milliseconds (default: 30 days)
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * // In your worker handler
 * import { getMasterSecret } from '@/config/env';
 * export default {
 *     async fetch(request: Request, env: Env) {
 *         const secret = getMasterSecret(env);
 *         if (secret) await initAuth(secret);
 *         // ... rest of your handler
 *     }
 * }
 * ```
 */
export async function initAuth(
    masterSecret: string,
    options: {
        ephemeralTtl?: number;
        persistentTtl?: number;
    } = {}
): Promise<void> {
    const ephemeralTtl = options.ephemeralTtl ?? DEFAULT_EPHEMERAL_TTL;
    const persistentTtl = options.persistentTtl ?? DEFAULT_PERSISTENT_TTL;
    if (authState) {
        console.log('[Auth] Already initialized, public key:', authState.persistentPublicKey.substring(0, 10) + '...');
        return; // Already initialized
    }

    console.log('[Auth] Initializing with secret length:', masterSecret.length);

    // Derive persistent key pair for main authentication tokens
    const persistentKeyPair = await deriveKeyPair(masterSecret, SERVICE_NAME);
    const persistentPublicKey = await exportPublicKey(persistentKeyPair.publicKey);

    console.log('[Auth] Derived persistent public key:', persistentPublicKey.substring(0, 10) + '...');

    // Derive ephemeral key pair for short-lived tokens (GitHub OAuth, etc.)
    const ephemeralKeyPair = await deriveKeyPair(masterSecret, EPHEMERAL_SERVICE_NAME);
    const ephemeralPublicKey = await exportPublicKey(ephemeralKeyPair.publicKey);

    authState = {
        persistentKey: persistentKeyPair.privateKey,
        persistentPublicKey,
        persistentTtl,
        ephemeralKey: ephemeralKeyPair.privateKey,
        ephemeralPublicKey,
        ephemeralTtl,
    };

    console.log('[Auth] Initialization complete');
}

/**
 * Get the public key for persistent tokens
 *
 * Useful for sharing with other services that need to verify tokens.
 *
 * @returns Base64url-encoded public key string
 * @throws Error if auth module is not initialized
 */
export function getPublicKey(): string {
    if (!authState) {
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }
    return authState.persistentPublicKey;
}

/**
 * Get the public key for ephemeral tokens
 *
 * @returns Base64url-encoded public key string
 * @throws Error if auth module is not initialized
 */
export function getEphemeralPublicKey(): string {
    if (!authState) {
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }
    return authState.ephemeralPublicKey;
}

/**
 * Create a new authentication token for a user
 *
 * Generates a persistent JWT signed with Ed25519 that can be verified later.
 * Tokens expire after 30 days by default (configurable via initAuth).
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
 * // Returns: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."
 * // Token expires in 30 days - use refreshToken() before expiration
 * ```
 *
 * @see refreshToken for token refresh before expiration
 * @see HAP-451 for token expiration security improvement
 */
export async function createToken(userId: string, extras?: TokenExtras): Promise<string> {
    if (!authState) {
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }

    console.log('[Auth] Creating token for user:', userId, 'with public key:', authState.persistentPublicKey.substring(0, 10) + '...');

    // Calculate expiration time (30 days by default)
    const expirationTime = Math.floor((Date.now() + authState.persistentTtl) / 1000);

    const builder = new SignJWT({
        user: userId,
        ...(extras && { extras }),
    })
        .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
        .setIssuer(SERVICE_NAME)
        .setIssuedAt()
        .setExpirationTime(expirationTime);

    const token = await builder.sign(authState.persistentKey);

    console.log('[Auth] Token created, first 20 chars:', token.substring(0, 20) + '...');

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
 * Uses a two-tier verification strategy:
 * 1. In-memory cache (L1) - fast path for recently verified tokens
 * 2. D1 blacklist check (L2) - distributed revocation check
 * 3. Cryptographic verification - full JWT signature verification
 *
 * @param token - The token string to verify
 * @param db - Optional D1 database for distributed blacklist check. If not provided,
 *             only local cache is checked (useful for development/testing).
 * @returns Promise resolving to user data if valid, null if invalid
 * @throws Error if auth module is not initialized
 *
 * @example
 * ```typescript
 * // With distributed blacklist check (production)
 * const verified = await verifyToken(token, env.DB);
 *
 * // Without blacklist check (development)
 * const verified = await verifyToken(token);
 *
 * if (verified) {
 *     console.log(`User ID: ${verified.userId}`);
 * }
 * ```
 *
 * @see HAP-452 for distributed invalidation implementation
 */
export async function verifyToken(
    token: string,
    db?: D1Database
): Promise<{ userId: string; extras?: TokenExtras } | null> {
    console.log('[Auth] Verifying token, first 20 chars:', token.substring(0, 20) + '...');

    // Check cache first for fast path
    const cached = tokenCache.get(token);
    if (cached) {
        console.log('[Auth] Token found in cache for user:', cached.userId);
        return {
            userId: cached.userId,
            extras: cached.extras,
        };
    }

    console.log('[Auth] Token not in cache, checking blacklist and verifying...');

    // Check distributed blacklist if database is provided
    if (db) {
        const isRevoked = await isTokenRevoked(db, token);
        if (isRevoked) {
            console.log('[Auth] Token is revoked (found in distributed blacklist)');
            return null;
        }
    }

    // Cache miss - verify token cryptographically
    if (!authState) {
        console.error('[Auth] ERROR: Auth module not initialized!');
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }

    console.log('[Auth] Using public key:', authState.persistentPublicKey.substring(0, 10) + '...');

    try {
        // Derive public key from private key for verification
        const publicKeyJwk = (await crypto.subtle.exportKey(
            'jwk',
            authState.persistentKey
        )) as JsonWebKey;
        delete publicKeyJwk.d;
        publicKeyJwk.key_ops = ['verify'];

        const publicKey = await crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            { name: 'Ed25519' },
            false,
            ['verify']
        );

        const { payload } = await jwtVerify(token, publicKey, {
            issuer: SERVICE_NAME,
        });

        const userId = payload.user as string;
        const extras = payload.extras as TokenExtras | undefined;

        console.log('[Auth] Token verified successfully for user:', userId);

        // Cache the result for future fast verification
        tokenCache.set(token, {
            userId,
            extras,
            cachedAt: Date.now(),
        });

        return { userId, extras };
    } catch (error) {
        // Handle jose-specific errors gracefully
        if (
            error instanceof joseErrors.JWTExpired ||
            error instanceof joseErrors.JWTInvalid ||
            error instanceof joseErrors.JWSSignatureVerificationFailed ||
            error instanceof joseErrors.JWTClaimValidationFailed
        ) {
            console.log('[Auth] Token verification failed:', error instanceof Error ? error.message : String(error));
            return null;
        }
        console.error('[Auth] Token verification error:', error);
        return null;
    }
}

/**
 * Refresh an authentication token
 *
 * Issues a new token for a user whose token is valid or within the grace period.
 * This allows clients to maintain session continuity without full re-authentication.
 *
 * The grace period (7 days by default) allows tokens that have recently expired
 * to still be refreshed, preventing edge-case lockouts for users who open the
 * app shortly after their token expires.
 *
 * @param token - The current token (valid or within grace period)
 * @param db - Optional D1 database for blacklist check
 * @returns Promise resolving to new token and user info, or null if refresh not allowed
 * @throws Error if auth module is not initialized
 *
 * @example
 * ```typescript
 * // Refresh before expiration (recommended)
 * const result = await refreshToken(currentToken, env.DB);
 * if (result) {
 *     // Store new token, continue with result.userId
 *     saveToken(result.token);
 * } else {
 *     // Token expired beyond grace period, require re-authentication
 *     redirectToLogin();
 * }
 * ```
 *
 * @see HAP-451 for token expiration security improvement
 */
export async function refreshToken(
    token: string,
    db?: D1Database
): Promise<{ token: string; userId: string; extras?: TokenExtras } | null> {
    if (!authState) {
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }

    console.log('[Auth] Attempting to refresh token, first 20 chars:', token.substring(0, 20) + '...');

    // Check distributed blacklist if database is provided
    if (db) {
        const isRevoked = await isTokenRevoked(db, token);
        if (isRevoked) {
            console.log('[Auth] Token is revoked, cannot refresh');
            return null;
        }
    }

    try {
        // Derive public key from private key for verification
        const publicKeyJwk = (await crypto.subtle.exportKey(
            'jwk',
            authState.persistentKey
        )) as JsonWebKey;
        delete publicKeyJwk.d;
        publicKeyJwk.key_ops = ['verify'];

        const publicKey = await crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            { name: 'Ed25519' },
            false,
            ['verify']
        );

        // Try to verify with grace period for expired tokens
        // We use clockTolerance to allow tokens expired within the grace period
        const graceSeconds = Math.floor(REFRESH_GRACE_PERIOD / 1000);

        const { payload } = await jwtVerify(token, publicKey, {
            issuer: SERVICE_NAME,
            clockTolerance: graceSeconds, // Allow tokens expired within grace period
        });

        const userId = payload.user as string;
        const extras = payload.extras as TokenExtras | undefined;

        console.log('[Auth] Token valid for refresh, issuing new token for user:', userId);

        // Issue new token with fresh expiration
        const newToken = await createToken(userId, extras);

        // Remove old token from cache (it's being replaced)
        tokenCache.delete(token);

        return {
            token: newToken,
            userId,
            extras,
        };
    } catch (error) {
        // Token is invalid or expired beyond grace period
        if (error instanceof joseErrors.JWTExpired) {
            console.log('[Auth] Token expired beyond grace period, refresh denied');
        } else if (
            error instanceof joseErrors.JWTInvalid ||
            error instanceof joseErrors.JWSSignatureVerificationFailed ||
            error instanceof joseErrors.JWTClaimValidationFailed
        ) {
            console.log('[Auth] Token invalid, refresh denied:', error.message);
        } else {
            console.error('[Auth] Token refresh error:', error);
        }
        return null;
    }
}

/**
 * Create an ephemeral token with TTL (for OAuth flows like GitHub)
 *
 * Ephemeral tokens automatically expire after the configured TTL.
 * Use these for temporary authorization flows.
 *
 * @param userId - The user ID to embed in the token
 * @param purpose - Purpose identifier (e.g., 'github-oauth')
 * @returns Promise resolving to the generated token string
 * @throws Error if auth module is not initialized
 *
 * @example
 * ```typescript
 * const token = await createEphemeralToken('user_123', 'github-oauth');
 * // Token expires after 5 minutes (default TTL)
 * ```
 */
export async function createEphemeralToken(userId: string, purpose: string): Promise<string> {
    if (!authState) {
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }

    const expirationTime = Math.floor((Date.now() + authState.ephemeralTtl) / 1000);

    const token = await new SignJWT({
        user: userId,
        purpose,
    })
        .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT' })
        .setIssuer(EPHEMERAL_SERVICE_NAME)
        .setIssuedAt()
        .setExpirationTime(expirationTime)
        .sign(authState.ephemeralKey);

    return token;
}

/**
 * Verify an ephemeral token (for OAuth flows)
 *
 * Ephemeral tokens are validated including expiration check.
 * Returns null if the token is expired or invalid.
 *
 * @param token - The token string to verify
 * @returns Promise resolving to user data if valid, null if invalid or expired
 * @throws Error if auth module is not initialized
 */
export async function verifyEphemeralToken(
    token: string
): Promise<{ userId: string; purpose?: string } | null> {
    if (!authState) {
        throw new Error(
            'Auth module not initialized. ' +
            'In Cloudflare Workers, initAuth must be called before accessing auth functions. ' +
            'This is typically done in src/middleware/auth.ts which runs before route handlers. ' +
            'Ensure your route is registered after the auth middleware in src/index.ts. ' +
            'See docs/SECRETS.md for HAPPY_MASTER_SECRET configuration.'
        );
    }

    try {
        // Derive public key from private key for verification
        const publicKeyJwk = (await crypto.subtle.exportKey(
            'jwk',
            authState.ephemeralKey
        )) as JsonWebKey;
        delete publicKeyJwk.d;
        publicKeyJwk.key_ops = ['verify'];

        const publicKey = await crypto.subtle.importKey(
            'jwk',
            publicKeyJwk,
            { name: 'Ed25519' },
            false,
            ['verify']
        );

        const { payload } = await jwtVerify(token, publicKey, {
            issuer: EPHEMERAL_SERVICE_NAME,
        });

        return {
            userId: payload.user as string,
            purpose: payload.purpose as string | undefined,
        };
    } catch (error) {
        // Expired or invalid tokens return null
        if (
            error instanceof joseErrors.JWTExpired ||
            error instanceof joseErrors.JWTInvalid ||
            error instanceof joseErrors.JWSSignatureVerificationFailed ||
            error instanceof joseErrors.JWTClaimValidationFailed
        ) {
            return null;
        }
        console.error('Ephemeral token verification failed:', error);
        return null;
    }
}

/**
 * Check if a token has been revoked in the distributed blacklist
 *
 * This checks the D1 database for the token's hash. Used internally by
 * verifyToken().
 *
 * @param db - D1 database instance
 * @param token - The token to check
 * @returns Promise resolving to true if revoked, false if not
 * @internal Called internally by verifyToken
 *
 * @see HAP-452 for distributed invalidation implementation
 */
async function isTokenRevoked(db: D1Database, token: string): Promise<boolean> {
    const tokenHash = await hashToken(token);
    const drizzle = getDb(db);

    const result = await drizzle
        .select({ id: revokedTokens.id })
        .from(revokedTokens)
        .where(eq(revokedTokens.tokenHash, tokenHash))
        .limit(1);

    return result.length > 0;
}

/**
 * Get token cache statistics
 *
 * Returns information about the current cache state for monitoring and debugging.
 *
 * @returns Object with cache size and oldest entry timestamp
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

/**
 * Reset auth state (primarily for testing)
 *
 * Clears all cached tokens and resets the auth state.
 * This should generally not be used in production.
 */
export function resetAuth(): void {
    authState = null;
    tokenCache.clear();
}

/**
 * Clean up expired entries from the token blacklist
 *
 * This should be called periodically (e.g., via a scheduled Worker) to
 * remove old blacklist entries that are no longer needed. Entries are
 * safe to delete after their expiresAt time because the underlying
 * tokens would have been rejected anyway.
 *
 * @param db - D1 database instance
 * @returns Number of entries deleted
 * @internal Reserved for scheduled worker implementation
 *
 * @example
 * ```typescript
 * // In a scheduled Worker
 * export default {
 *     async scheduled(event, env, ctx) {
 *         const deleted = await cleanupExpiredTokens(env.DB);
 *         console.log(`Cleaned up ${deleted} expired blacklist entries`);
 *     }
 * };
 * ```
 *
 * @see HAP-452 for distributed invalidation implementation
 */
export async function cleanupExpiredTokens(db: D1Database): Promise<number> {
    const drizzle = getDb(db);
    const now = Date.now();

    // First count how many we'll delete (for logging)
    const countResult = await drizzle
        .select({ count: sql<number>`COUNT(*)` })
        .from(revokedTokens)
        .where(lt(revokedTokens.expiresAt, new Date(now)));

    const toDelete = countResult[0]?.count ?? 0;

    if (toDelete === 0) {
        return 0;
    }

    // Delete entries where expiresAt < now
    await drizzle
        .delete(revokedTokens)
        .where(lt(revokedTokens.expiresAt, new Date(now)));

    console.log(`[Auth] Cleaned up ${toDelete} expired blacklist entries`);

    return toDelete;
}

