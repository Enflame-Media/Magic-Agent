import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../env';

/**
 * Content Security Policy directives for the admin API
 *
 * Configured for:
 * - API responses (JSON, mostly)
 * - Swagger UI (/api/docs) which needs inline styles and scripts
 * - Cross-origin requests from the dashboard
 */
const CSP_DIRECTIVES = [
    "default-src 'self'",
    // Swagger UI needs unsafe-inline for styles and unsafe-eval for scripts
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    // Allow connections to own domain and dashboard
    "connect-src 'self' https://happy-admin.enflamemedia.com https://happy-admin-dev.enflamemedia.com",
    // Prevent framing
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

/**
 * Security headers middleware for Hono (Cloudflare Workers)
 *
 * Adds standard security headers to all responses to protect against:
 * - XSS attacks (Content-Security-Policy, X-XSS-Protection)
 * - Clickjacking (X-Frame-Options, frame-ancestors in CSP)
 * - MIME sniffing (X-Content-Type-Options)
 * - Referrer leakage (Referrer-Policy)
 * - Insecure connections (Strict-Transport-Security in production)
 * - Unwanted browser features (Permissions-Policy)
 *
 * @see HAP-627 - Security headers implementation
 * @see https://owasp.org/www-project-secure-headers/
 */
export const securityHeadersMiddleware = (): MiddlewareHandler<{
    Bindings: Env;
    Variables: Variables;
}> => {
    return async (c, next) => {
        await next();

        // Prevent MIME type sniffing
        c.header('X-Content-Type-Options', 'nosniff');

        // Prevent clickjacking - DENY means no framing allowed at all
        c.header('X-Frame-Options', 'DENY');

        // Legacy XSS protection for older browsers
        // Modern browsers use CSP, but this helps older ones
        c.header('X-XSS-Protection', '1; mode=block');

        // Control referrer information sent with requests
        // strict-origin-when-cross-origin: Send origin on cross-origin, full URL on same-origin
        c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Restrict browser features/APIs we don't need
        c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

        // Content Security Policy
        c.header('Content-Security-Policy', CSP_DIRECTIVES);

        // HTTP Strict Transport Security (HSTS)
        // Only enable in production to avoid issues during local development
        // max-age=31536000 = 1 year, includeSubDomains protects all subdomains
        const environment = c.env?.ENVIRONMENT ?? 'production';
        if (environment === 'production' || environment === 'staging') {
            c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
    };
};
