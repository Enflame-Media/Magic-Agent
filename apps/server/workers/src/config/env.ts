/**
 * Environment Bindings for Cloudflare Workers
 *
 * @remarks
 * This interface defines all environment variables, secrets, and Cloudflare
 * bindings (D1, KV, R2) that are available in the Workers runtime.
 *
 * Access via `c.env` in route handlers, NOT `process.env`.
 */
export interface Env {
    /**
     * Current deployment environment
     * @default 'production'
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';

    /**
     * Master secret for token generation (preferred)
     * Used to generate cryptographic keys for persistent tokens
     * @required (either this or HANDY_MASTER_SECRET)
     */
    HAPPY_MASTER_SECRET?: string;

    /**
     * Master secret for token generation (deprecated)
     * @deprecated Use HAPPY_MASTER_SECRET instead. This will be removed in a future version.
     */
    HANDY_MASTER_SECRET?: string;

    /**
     * Trusted origins for CORS
     * Comma-separated list of allowed origins
     * @default "*" in development
     * @example "https://app.example.com,https://cli.example.com"
     */
    CORS_ORIGINS?: string;

    /**
     * D1 Database binding
     * Primary database for user accounts, sessions, and auth requests
     */
    DB: D1Database;

    /**
     * KV namespace for token caching
     * Optional - improves token verification performance
     */
    TOKEN_CACHE?: KVNamespace;

    /**
     * KV namespace for rate limiting (HAP-453, HAP-620)
     * Required in production for security-critical auth endpoints.
     * In development, falls back to per-isolate memory-based rate limiting.
     */
    RATE_LIMIT_KV?: KVNamespace;

    /**
     * Analytics Engine dataset for sync metrics (HAP-546)
     * Used to store sync performance metrics for analysis
     * @optional - metrics are silently dropped if not configured
     */
    SYNC_METRICS?: AnalyticsEngineDataset;
}

// Track whether deprecation warning has been logged (per Worker instance)
let deprecationWarningLogged = false;

// Track whether rate limit KV warning has been logged (HAP-620)
let rateLimitKvWarningLogged = false;

/**
 * Get the master secret from environment with backward compatibility.
 *
 * Prefers HAPPY_MASTER_SECRET (new standard) but falls back to HANDY_MASTER_SECRET
 * (legacy) with a deprecation warning.
 *
 * @param env - Environment object containing secrets
 * @returns The master secret string, or undefined if neither is set
 *
 * @example
 * ```typescript
 * const secret = getMasterSecret(c.env);
 * if (secret) {
 *     await initAuth(secret);
 * }
 * ```
 */
export function getMasterSecret(env: Partial<Env> | undefined): string | undefined {
    // Handle undefined env (e.g., in tests without environment bindings)
    if (!env) {
        return undefined;
    }

    // Prefer the new HAPPY_MASTER_SECRET
    if (env.HAPPY_MASTER_SECRET) {
        return env.HAPPY_MASTER_SECRET;
    }

    // Fall back to legacy HANDY_MASTER_SECRET with deprecation warning
    if (env.HANDY_MASTER_SECRET) {
        if (!deprecationWarningLogged) {
            console.warn(
                '[DEPRECATED] HANDY_MASTER_SECRET is deprecated. ' +
                'Please migrate to HAPPY_MASTER_SECRET. ' +
                'For local development, update your .dev.vars file. ' +
                'For production, run: wrangler secret put HAPPY_MASTER_SECRET --env prod'
            );
            deprecationWarningLogged = true;
        }
        return env.HANDY_MASTER_SECRET;
    }

    return undefined;
}

/**
 * Reset deprecation warning state (for testing only)
 */
export function resetDeprecationWarning(): void {
    deprecationWarningLogged = false;
}

/**
 * Reset rate limit KV warning state (for testing only)
 */
export function resetRateLimitKvWarning(): void {
    rateLimitKvWarningLogged = false;
}

/**
 * Type guard to validate environment configuration.
 * Provides clear, actionable error messages for missing required variables.
 * Integrated in worker initialization via middleware (HAP-523).
 *
 * @param env - Environment object to validate
 * @returns True if all required variables are present
 * @throws Error with detailed setup instructions for missing config
 *
 * @example
 * ```typescript
 * // In worker fetch handler
 * if (!validateEnv(env)) {
 *     return new Response('Configuration error', { status: 500 });
 * }
 * ```
 */
export function validateEnv(env: Partial<Env>): env is Env {
    const secret = getMasterSecret(env);
    if (!secret) {
        throw new Error(
            'HAPPY_MASTER_SECRET is required (HANDY_MASTER_SECRET is deprecated). ' +
            'Generate a 32+ character secret with: openssl rand -hex 32. ' +
            'For local development, add it to .dev.vars file. ' +
            'For production, use: wrangler secret put HAPPY_MASTER_SECRET. ' +
            'See docs/SECRETS.md for detailed setup instructions.'
        );
    }

    if (!env.DB) {
        throw new Error(
            'DB (D1 binding) is required. ' +
            'Ensure your wrangler.toml includes D1 database configuration: ' +
            '[[d1_databases]] binding = "DB" database_name = "happy-dev" database_id = "your-id". ' +
            'Create a D1 database with: wrangler d1 create happy-dev. ' +
            'See wrangler.toml and Cloudflare D1 documentation for setup.'
        );
    }

    // HAP-620: Warn about missing RATE_LIMIT_KV in production
    // In production, auth endpoints will return 503 if RATE_LIMIT_KV is not configured
    if (env.ENVIRONMENT === 'production' && !env.RATE_LIMIT_KV && !rateLimitKvWarningLogged) {
        console.warn(
            '[Config] WARNING: RATE_LIMIT_KV is not configured in production. ' +
            'Authentication endpoints will return 503 Service Unavailable to prevent rate limit bypass. ' +
            'Configure a KV namespace binding in wrangler.toml: ' +
            '[[kv_namespaces]] binding = "RATE_LIMIT_KV" id = "your-kv-id". ' +
            'Create a KV namespace with: wrangler kv:namespace create RATE_LIMIT_KV. ' +
            'See HAP-620 for security implications.'
        );
        rateLimitKvWarningLogged = true;
    }

    return true;
}
