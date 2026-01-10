import type { MiddlewareHandler } from 'hono';
import type { Env } from '@/config/env';

/**
 * Content Security Policy directives for the API server
 *
 * Configured for:
 * - API responses (JSON endpoints)
 * - OpenAPI documentation (/openapi.json)
 * - WebSocket connections
 * - Cross-origin requests from mobile apps and CLI
 */
const CSP_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    // Allow connections to own domain, Anthropic API, and WebSocket upgrades
    "connect-src 'self' https://*.enflamemedia.com https://api.anthropic.com wss://*.enflamemedia.com",
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
