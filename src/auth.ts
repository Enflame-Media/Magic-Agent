import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { openAPI, admin } from 'better-auth/plugins';
import type { Env } from './env';
import * as schema from './db/schema';
import { SESSION_CONFIG, ORIGINS } from './lib/constants';

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
    // For runtime, use the actual D1 binding with schema
    const db = env?.DB ? drizzle(env.DB, { schema }) : ({} as ReturnType<typeof drizzle>);

    return betterAuth({
        secret: env?.BETTER_AUTH_SECRET,
        baseURL: env?.BETTER_AUTH_URL,
        basePath: '/api/auth', // Where Better-Auth is mounted in Hono
        database: drizzleAdapter(db, {
            provider: 'sqlite',
            schema,
            usePlural: true,
        }),
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: true, // Require email verification for security
            /**
             * SECURITY FIX (HAP-612): Disable public registration
             *
             * New admin users must be created by existing admins using:
             * 1. Better-Auth admin API (POST /api/auth/admin/create-user)
             * 2. Direct database insertion via Wrangler D1 console
             *
             * This prevents unauthorized account creation on the admin dashboard.
             */
            disableSignUp: true,
        },
        session: {
            expiresIn: SESSION_CONFIG.SESSION_EXPIRY, // 7 days
            updateAge: SESSION_CONFIG.SESSION_UPDATE_AGE, // Update session age every 24 hours
            cookieCache: {
                enabled: true,
                maxAge: SESSION_CONFIG.COOKIE_CACHE_MAX_AGE, // 5 minutes
            },
        },
        plugins: [
            openAPI(),
            admin({
                // Bootstrap admin - this user can manage other admins
                adminUserIds: ['C1zmGOgcvVNskKcTUDgLuYytHmCWOKMs'],
            }),
        ],
        trustedOrigins: [...ORIGINS.PRODUCTION, ...ORIGINS.DEVELOPMENT],
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
