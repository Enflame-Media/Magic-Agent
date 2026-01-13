import { Fastify } from "../types";

/**
 * Content Security Policy directives for the API server
 *
 * Configured for:
 * - API responses (JSON endpoints)
 * - WebSocket connections (Socket.io)
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
 * Enables security headers for all HTTP responses.
 *
 * Adds standard security headers to protect against:
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
export function enableSecurityHeaders(app: Fastify) {
    app.addHook('onSend', async (_request, reply) => {
        // Prevent MIME type sniffing
        reply.header('X-Content-Type-Options', 'nosniff');

        // Prevent clickjacking - DENY means no framing allowed at all
        reply.header('X-Frame-Options', 'DENY');

        // Legacy XSS protection for older browsers
        // Modern browsers use CSP, but this helps older ones
        reply.header('X-XSS-Protection', '1; mode=block');

        // Control referrer information sent with requests
        // strict-origin-when-cross-origin: Send origin on cross-origin, full URL on same-origin
        reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Restrict browser features/APIs we don't need
        reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

        // Content Security Policy
        reply.header('Content-Security-Policy', CSP_DIRECTIVES);

        // HTTP Strict Transport Security (HSTS)
        // Only enable in production to avoid issues during local development
        // max-age=31536000 = 1 year, includeSubDomains protects all subdomains
        const isProduction = process.env.NODE_ENV === 'production';
        if (isProduction) {
            reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }
    });
}
