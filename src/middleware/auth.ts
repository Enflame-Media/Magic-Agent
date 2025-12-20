import type { MiddlewareHandler } from 'hono';
import { verifyToken, type TokenExtras } from '@/lib/auth';

/**
 * Extended context with authenticated user information
 */
export interface AuthVariables {
    userId: string;
    sessionExtras?: TokenExtras;
}

/**
 * Authentication middleware for Hono
 *
 * Verifies the JWT token from the Authorization header and attaches
 * user information to the context. Protected routes should use this middleware.
 *
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { authMiddleware } from '@/middleware/auth';
 *
 * // Protect a route
 * app.get('/v1/sessions', authMiddleware(), async (c) => {
 *     const userId = c.get('userId');
 *     // ... fetch user's sessions
 * });
 * ```
 *
 * @remarks
 * **Token Format:**
 * - Header: `Authorization: Bearer <token>`
 * - The token is a jose JWT (EdDSA/Ed25519) containing user ID
 *
 * **Failure Modes:**
 * - 401 if no Authorization header
 * - 401 if token format is invalid
 * - 401 if token verification fails
 */
export function authMiddleware(): MiddlewareHandler<{ Variables: AuthVariables }> {
    return async (c, next) => {
        // Extract Authorization header
        const authHeader = c.req.header('Authorization');

        if (!authHeader) {
            return c.json({ error: 'Missing Authorization header' }, 401);
        }

        // Parse Bearer token
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return c.json(
                { error: 'Invalid Authorization header format (expected: Bearer <token>)' },
                401
            );
        }

        const token = parts[1];
        if (!token) {
            return c.json({ error: 'Empty token in Authorization header' }, 401);
        }

        // Verify token
        const verified = await verifyToken(token);

        if (!verified) {
            return c.json({ error: 'Invalid or expired token' }, 401);
        }

        // Attach user info to context
        c.set('userId', verified.userId);
        if (verified.extras) {
            c.set('sessionExtras', verified.extras);
        }

        return await next();
    };
}

/**
 * Optional authentication middleware
 *
 * Like authMiddleware(), but doesn't fail if no token is provided.
 * Useful for routes that have optional authentication (e.g., public data
 * with enhanced features for authenticated users).
 *
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { optionalAuthMiddleware } from '@/middleware/auth';
 *
 * app.get('/v1/public/sessions', optionalAuthMiddleware(), async (c) => {
 *     const userId = c.get('userId'); // May be undefined
 *     if (userId) {
 *         // Show user's private sessions
 *     } else {
 *         // Show public sessions only
 *     }
 * });
 * ```
 */
export function optionalAuthMiddleware(): MiddlewareHandler<{ Variables: Partial<AuthVariables> }> {
    return async (c, next) => {
        const authHeader = c.req.header('Authorization');

        if (authHeader) {
            const parts = authHeader.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
                const token = parts[1];
                if (token) {
                    const verified = await verifyToken(token);

                    if (verified) {
                        c.set('userId', verified.userId);
                        if (verified.extras) {
                            c.set('sessionExtras', verified.extras);
                        }
                    }
                }
            }
        }

        // Always proceed to next, regardless of auth status
        return await next();
    };
}
