import type { MiddlewareHandler } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import type { Env, Variables } from '../env';

/**
 * CSRF (Cross-Site Request Forgery) Protection Middleware
 *
 * SECURITY FIX (HAP-616): Implements double-submit cookie pattern for CSRF protection.
 *
 * How it works:
 * 1. On any request, if no CSRF cookie exists, generate and set one
 * 2. For state-changing requests (POST, PUT, DELETE, PATCH), validate that
 *    the X-CSRF-Token header matches the csrf-token cookie
 * 3. Reject requests without matching tokens with 403 Forbidden
 *
 * Why this pattern?
 * - The browser's Same-Origin Policy prevents malicious sites from reading cookies
 * - Even though the cookie is sent automatically, attackers can't read it to set the header
 * - This provides CSRF protection without server-side token storage
 *
 * Cookie settings:
 * - httpOnly: false - MUST be readable by JavaScript to include in headers
 * - secure: true - Only sent over HTTPS
 * - sameSite: 'None' - Required for cross-origin requests (separate API domain)
 * - path: '/' - Available site-wide
 * - maxAge: 24 hours - Reasonable session duration
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/** HTTP methods that don't require CSRF validation (safe methods) */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * CSRF Protection Middleware Factory
 *
 * @returns Hono middleware handler for CSRF protection
 *
 * @example
 * ```typescript
 * // Apply after CORS, before routes
 * app.use('*', csrfMiddleware());
 * ```
 */
export function csrfMiddleware(): MiddlewareHandler<{
    Bindings: Env;
    Variables: Variables;
}> {
    return async (c, next) => {
        // Get existing CSRF token from cookie
        let token = getCookie(c, CSRF_COOKIE_NAME);

        // Generate new token if not present
        if (!token) {
            token = crypto.randomUUID();
            setCookie(c, CSRF_COOKIE_NAME, token, {
                httpOnly: false, // Must be readable by JavaScript
                secure: true, // HTTPS only
                sameSite: 'None', // Cross-origin (API on different domain)
                path: '/',
                maxAge: 60 * 60 * 24, // 24 hours
            });
        }

        // Skip validation for safe methods (GET, HEAD, OPTIONS)
        if (SAFE_METHODS.includes(c.req.method)) {
            await next();
            return;
        }

        // Validate CSRF token for state-changing requests
        const headerToken = c.req.header(CSRF_HEADER_NAME);

        if (!headerToken || headerToken !== token) {
            console.warn(
                `[CSRF] Validation failed for ${c.req.method} ${c.req.path}. ` +
                    `Cookie: ${token ? 'present' : 'missing'}, ` +
                    `Header: ${headerToken ? 'present' : 'missing'}, ` +
                    `Match: ${headerToken === token}`
            );

            return c.json(
                {
                    error: 'Forbidden',
                    message: 'CSRF validation failed',
                    code: 'CSRF_VALIDATION_FAILED',
                },
                403
            );
        }

        await next();
        return;
    };
}
