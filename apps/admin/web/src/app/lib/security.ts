/**
 * Security Utilities for Happy Admin Dashboard
 *
 * Provides security-focused helper functions for common operations
 * that could be vulnerable to attacks if not handled carefully.
 *
 * @module lib/security
 */

/**
 * Known internal routes in the admin dashboard
 *
 * This whitelist ensures redirects only go to known, valid pages.
 * Add new routes here as the app grows.
 */
const ALLOWED_REDIRECT_PATHS = ['/', '/login', '/metrics', '/analytics', '/settings', '/users'];

/**
 * Validate a redirect path to prevent open redirect vulnerabilities
 *
 * SECURITY FIX (HAP-625): This function prevents CWE-601 (Open Redirect)
 * attacks by validating that redirect targets are internal paths only.
 *
 * Validation rules:
 * 1. Must be a non-empty string
 * 2. Must not contain protocol (no "://")
 * 3. Must not be protocol-relative (no "//")
 * 4. Must start with "/" (relative path)
 * 5. Must not contain dangerous schemes (javascript:, data:, vbscript:)
 * 6. Base path must be in the whitelist or a subpath of a whitelisted route
 *
 * @param path - The redirect path to validate (from query parameter)
 * @returns true if the path is safe to use, false otherwise
 *
 * @example
 * ```typescript
 * // Safe paths
 * isValidRedirect('/');           // true
 * isValidRedirect('/metrics');    // true
 * isValidRedirect('/metrics?tab=sync'); // true
 *
 * // Unsafe paths (blocked)
 * isValidRedirect('https://evil.com');  // false
 * isValidRedirect('//evil.com');        // false
 * isValidRedirect('javascript:alert(1)'); // false
 * isValidRedirect(undefined);           // false
 * ```
 */
export function isValidRedirect(path: string | undefined | null): boolean {
    // Must be a non-empty string
    if (!path || typeof path !== 'string' || path.trim() === '') {
        return false;
    }

    // Block protocol-based URLs (absolute URLs to external sites)
    if (path.includes('://')) {
        console.warn(`[Security] Blocked external redirect attempt: ${path}`);
        return false;
    }

    // Block protocol-relative URLs (//evil.com)
    if (path.startsWith('//')) {
        console.warn(`[Security] Blocked protocol-relative redirect attempt: ${path}`);
        return false;
    }

    // Must start with / (relative path)
    if (!path.startsWith('/')) {
        console.warn(`[Security] Blocked non-relative redirect attempt: ${path}`);
        return false;
    }

    // Block dangerous schemes that could be in relative-looking URLs
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:'];
    const lowerPath = path.toLowerCase();
    if (dangerousSchemes.some((scheme) => lowerPath.includes(scheme))) {
        console.warn(`[Security] Blocked dangerous scheme in redirect: ${path}`);
        return false;
    }

    // Extract base path (before query string or hash)
    // Split always returns at least one element, so [0] is safe
    const pathWithoutQuery = path.split('?')[0] ?? path;
    const basePath = pathWithoutQuery.split('#')[0] ?? pathWithoutQuery;

    // Validate against whitelist
    const isAllowed = ALLOWED_REDIRECT_PATHS.some(
        (allowed) => basePath === allowed || basePath.startsWith(allowed + '/')
    );

    if (!isAllowed) {
        console.warn(`[Security] Blocked redirect to unknown path: ${path}`);
        return false;
    }

    return true;
}

/**
 * Get a safe redirect path, falling back to default if invalid
 *
 * Convenience wrapper around isValidRedirect() that always returns
 * a safe path string.
 *
 * @param path - The redirect path to validate
 * @param defaultPath - Fallback path if validation fails (default: '/')
 * @returns The original path if valid, otherwise the default path
 *
 * @example
 * ```typescript
 * getSafeRedirect('/metrics');        // '/metrics'
 * getSafeRedirect('https://evil.com'); // '/'
 * getSafeRedirect(undefined);          // '/'
 * getSafeRedirect('/unknown', '/dashboard'); // '/dashboard'
 * ```
 */
export function getSafeRedirect(path: string | undefined | null, defaultPath: string = '/'): string {
    return isValidRedirect(path) ? path! : defaultPath;
}
