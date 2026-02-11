import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, AuthUser, AuthSession } from '../env';
import { createAuth } from '../auth';

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
