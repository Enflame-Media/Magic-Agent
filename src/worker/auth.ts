import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/d1';
import { openAPI } from 'better-auth/plugins';
import type { Env } from './env';

/**
 * Better-Auth configuration factory for Cloudflare Workers
 *
 * Creates a Better-Auth instance configured for D1 database storage.
 * This handles both CLI schema generation and runtime scenarios.
 *
 * @param env - Cloudflare Worker environment bindings
 * @returns Configured Better-Auth instance
 *
 * @remarks
 * - Uses email/password authentication for admin users
 * - Sessions stored in D1 database
 * - OpenAPI plugin enabled for /api/auth/reference endpoint
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
        trustedOrigins: [
            'http://localhost:5173',
            'http://localhost:8787',
            'https://happy-admin.enflamemedia.com',
            'https://happy-admin-dev.enflamemedia.com',
        ],
        advanced: {
            cookiePrefix: 'happy-admin',
            generateId: () => crypto.randomUUID(),
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
