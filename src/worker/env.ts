/**
 * Environment bindings interface for Cloudflare Workers
 *
 * @remarks
 * Define all environment variables and secrets here for type safety.
 * Access via `c.env` in route handlers, not `process.env`.
 */
export interface Env {
    /**
     * Current deployment environment
     * @default 'production'
     */
    ENVIRONMENT?: 'development' | 'staging' | 'production';

    /**
     * D1 Database binding for Better-Auth storage
     * @required
     */
    DB: D1Database;

    /**
     * Analytics Engine Account ID (for SQL API queries)
     * @required Set via wrangler secret
     */
    ANALYTICS_ACCOUNT_ID?: string;

    /**
     * Analytics Engine API Token (for SQL API queries)
     * @required Set via wrangler secret
     */
    ANALYTICS_API_TOKEN?: string;

    /**
     * Better-Auth secret for session signing
     * @required Set via wrangler secret
     */
    BETTER_AUTH_SECRET?: string;

    /**
     * Better-Auth URL for callbacks
     * @required
     */
    BETTER_AUTH_URL?: string;
}

/**
 * Better-Auth user type (matches what getSession returns)
 */
export interface AuthUser {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Better-Auth session type (matches what getSession returns)
 */
export interface AuthSession {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Hono app variable types
 * Used to type the context variables set by middleware
 */
export interface Variables {
    /**
     * Authenticated user from Better-Auth session
     */
    user: AuthUser | null;

    /**
     * Session information from Better-Auth
     */
    session: AuthSession | null;
}
