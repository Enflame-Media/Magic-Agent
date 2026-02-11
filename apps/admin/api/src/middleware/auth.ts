import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import type { Env, Variables, AuthUser, AuthSession } from '../env';
import { createAuth } from '../auth';
import * as schema from '../db/schema';

/**
 * Authentication middleware for protected routes
 *
 * Verifies the user has a valid Better-Auth session before
 * allowing access to protected endpoints. Sets user and session
 * in the Hono context for use in route handlers.
 *
 * @returns Middleware handler that checks authentication
 *
 * @example
 * ```typescript
 * // Apply to specific routes
 * app.use('/api/metrics/*', authMiddleware());
 *
 * // Access user in handler
 * app.get('/api/metrics/summary', (c) => {
 *     const user = c.get('user');
 *     // ...
 * });
 * ```
 */
export const authMiddleware = (): MiddlewareHandler<{
    Bindings: Env;
    Variables: Variables;
}> => {
    return async (c, next) => {
        const auth = createAuth(c.env);

        try {
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });

            if (!session) {
                return c.json(
                    {
                        error: 'Unauthorized',
                        message: 'Authentication required',
                    },
                    401
                );
            }

            // Set user and session in context for route handlers
            // Cast to our interface types (Better-Auth may have additional fields)
            c.set('user', session.user as AuthUser);
            c.set('session', session.session as AuthSession);

            await next();
            return;
        } catch (error) {
            console.error('[Auth Middleware] Session verification failed:', error);
            return c.json(
                {
                    error: 'Unauthorized',
                    message: 'Invalid or expired session',
                },
                401
            );
        }
    };
};

/**
 * Optional authentication middleware
 *
 * Similar to authMiddleware but doesn't reject unauthenticated requests.
 * Sets user/session to null if not authenticated.
 *
 * @returns Middleware handler that optionally sets auth context
 */
export const optionalAuthMiddleware = (): MiddlewareHandler<{
    Bindings: Env;
    Variables: Variables;
}> => {
    return async (c, next) => {
        const auth = createAuth(c.env);

        try {
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });

            if (session) {
                c.set('user', session.user as AuthUser);
                c.set('session', session.session as AuthSession);
            } else {
                c.set('user', null);
                c.set('session', null);
            }
        } catch {
            c.set('user', null);
            c.set('session', null);
        }

        await next();
    };
};

/**
 * Admin authorization middleware for protected routes
 *
 * SECURITY FIX (HAP-612): Implements role-based access control.
 * Requires both a valid session AND admin role to access protected routes.
 *
 * Authorization flow:
 * 1. Verify session exists (authentication)
 * 2. Query database for user's role
 * 3. Check if role === 'admin' (authorization)
 * 4. Reject with 403 Forbidden if not admin
 *
 * @returns Middleware handler that checks admin authorization
 *
 * @example
 * ```typescript
 * // Apply to admin-only routes
 * app.use('/api/metrics/*', adminAuthMiddleware());
 * app.use('/api/admin/*', adminAuthMiddleware());
 * ```
 */
export const adminAuthMiddleware = (): MiddlewareHandler<{
    Bindings: Env;
    Variables: Variables;
}> => {
    return async (c, next) => {
        const auth = createAuth(c.env);

        try {
            // Step 1: Verify session (authentication)
            const session = await auth.api.getSession({
                headers: c.req.raw.headers,
            });

            if (!session) {
                return c.json(
                    {
                        error: 'Unauthorized',
                        message: 'Authentication required',
                    },
                    401
                );
            }

            // Step 2: Query user role from database
            const db = drizzle(c.env.DB, { schema });
            const user = await db
                .select({ role: schema.users.role })
                .from(schema.users)
                .where(eq(schema.users.id, session.user.id))
                .get();

            // Step 3: Check admin role (authorization)
            if (!user || user.role !== 'admin') {
                console.warn(
                    `[Admin Auth] Access denied for user ${session.user.id} (${session.user.email}), role: ${user?.role ?? 'none'}`
                );
                return c.json(
                    {
                        error: 'Forbidden',
                        message: 'Admin access required',
                    },
                    403
                );
            }

            // Step 4: Set context and proceed
            const authUser: AuthUser = {
                ...session.user,
                role: user.role,
            } as AuthUser;

            c.set('user', authUser);
            c.set('session', session.session as AuthSession);

            await next();
            return;
        } catch (error) {
            console.error('[Admin Auth Middleware] Authorization failed:', error);
            return c.json(
                {
                    error: 'Unauthorized',
                    message: 'Invalid or expired session',
                },
                401
            );
        }
    };
};
