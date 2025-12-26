import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { openAPI } from 'better-auth/plugins';
import type { Env } from './env';

/**
 * Dashboard frontend domains that are allowed to make authenticated requests
 * These are the Vue.js SPA domains that will call this API
 */
const DASHBOARD_ORIGINS = [
    // Local development
    'http://localhost:5173',
    'http://localhost:8787',
    // Production dashboard
    'https://happy-admin.enflamemedia.com',
    // Development dashboard
    'https://happy-admin-dev.enflamemedia.com',
];

/**
 * Better-Auth configuration factory for Cloudflare Workers
 *
 * Creates a Better-Auth instance configured for D1 database storage.
 * This handles both CLI schema generation and runtime scenarios.
 *
 * IMPORTANT: This API is served from a different domain than the dashboard.
 * Cross-origin cookie settings are configured to allow:
 * - API: happy-admin-api.enflamemedia.com
 * - Dashboard: happy-admin.enflamemedia.com
 *
 * @param env - Cloudflare Worker environment bindings
 * @returns Configured Better-Auth instance
 *
 * @remarks
 * - Uses email/password authentication for admin users
 * - Sessions stored in main happy D1 database (shared with other Happy services)
 * - OpenAPI plugin enabled for /api/auth/reference endpoint
 * - Cross-origin cookies enabled for dashboard ↔ API communication
 */
export function createAuth(env?: Env) {
    // For CLI schema generation, use a mock database
    // For runtime, use the actual D1 binding
    const db = env?.DB ? drizzle(env.DB) : ({} as ReturnType<typeof drizzle>);

    return betterAuth({
        database: drizzleAdapter(db, {
            provider: 'sqlite',
            usePlural: true,
        }),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false, // Simplified for admin dashboard
        },
        session: {
            expiresIn: 60 * 60 * 24 * 7, // 7 days
            updateAge: 60 * 60 * 24, // Update session age every 24 hours
            cookieCache: {
                enabled: true,
                maxAge: 60 * 5, // 5 minutes
            },
        },
        plugins: [openAPI()],
        trustedOrigins: DASHBOARD_ORIGINS,
        advanced: {
            cookiePrefix: 'happy-admin',
            generateId: () => crypto.randomUUID(),
            // Cross-subdomain cookies for API ↔ Dashboard communication
            // Both domains share .enflamemedia.com parent
            crossSubDomainCookies: {
                enabled: true,
                domain: '.enflamemedia.com',
            },
            // Default cookie attributes for cross-origin
            defaultCookieAttributes: {
                secure: true,
                sameSite: 'none', // Required for cross-origin requests
                httpOnly: true,
                path: '/',
            },
        },
    });
}

/**
 * Auth instance for CLI schema generation
 * Export this for `npx @better-auth/cli generate`
 */
export const auth = createAuth();

/**
 * Type exports for use in routes and middleware
 */
export type Auth = ReturnType<typeof createAuth>;
