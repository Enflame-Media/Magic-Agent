import type { MiddlewareHandler } from 'hono';
import type { Env, Variables } from '../env';

/**
 * Content Security Policy directives for the admin dashboard SPA
 *
 * Configured for:
 * - Vue.js SPA with dynamic script loading
 * - Swagger UI for API documentation
 * - Cross-origin API requests to happy-admin-api
 * - Vite development (eval for HMR in development)
 */
const getCSPDirectives = (isDevelopment: boolean): string => {
    const directives = [
        "default-src 'self'",
        // Vue.js and Swagger UI need eval and inline scripts
        // In production, ideally use nonces/hashes, but for now allow unsafe-eval
        isDevelopment
            ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
            : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        // Allow connections to the API and admin domains
        "connect-src 'self' https://happy-admin-api.enflamemedia.com https://happy-admin-api-dev.enflamemedia.com",
        // Prevent framing
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ];

    return directives.join('; ');
};

/**
 * Security headers middleware for the admin dashboard SPA
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

        const isDevelopment = c.env?.ENVIRONMENT === 'development';

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
        c.header('Content-Security-Policy', getCSPDirectives(isDevelopment));

        // HTTP Strict Transport Security (HSTS)
        // Only enable in production to avoid issues during local development
        // max-age=31536000 = 1 year, includeSubDomains protects all subdomains
        const environment = c.env?.ENVIRONMENT ?? 'production';
        if (environment === 'production' || environment === 'staging') {
            c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
    };
};
