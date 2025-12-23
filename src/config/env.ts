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
     * Master secret for token generation
     * Used to generate cryptographic keys for persistent tokens
     * @required
     */
    HANDY_MASTER_SECRET: string;

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
}

/**
 * Type guard to validate environment configuration
 * @param env - Environment object to validate
 * @returns True if all required variables are present
 */
export function validateEnv(env: Partial<Env>): env is Env {
    if (!env.HANDY_MASTER_SECRET) {
        throw new Error(
            'HANDY_MASTER_SECRET is required. ' +
            'Generate a 32+ character secret with: openssl rand -hex 32. ' +
            'For local development, add it to .dev.vars file. ' +
            'For production, use: wrangler secret put HANDY_MASTER_SECRET. ' +
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

    return true;
}
