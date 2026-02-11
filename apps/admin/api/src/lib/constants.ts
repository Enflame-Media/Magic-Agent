/**
 * Time Constants
 *
 * Named constants for time durations used across the admin API.
 * Eliminates magic numbers and improves code readability.
 *
 * @remarks
 * - SECONDS: For configuration that expects seconds (session expiry, cookies)
 * - MILLISECONDS: For JavaScript timers (setTimeout, setInterval)
 *
 * @example
 * ```typescript
 * import { SECONDS, SESSION_CONFIG } from './lib/constants';
 *
 * // Session configuration
 * session: { expiresIn: SESSION_CONFIG.SESSION_EXPIRY }
 *
 * // Custom calculation
 * const twoHours = 2 * SECONDS.HOUR;
 * ```
 */

/**
 * Time duration constants in seconds
 */
export const SECONDS = {
    MINUTE: 60,
    HOUR: 3600,
    DAY: 86400,
    WEEK: 604800,
} as const;

/**
 * Time duration constants in milliseconds
 * Useful for JavaScript timers (setTimeout, setInterval)
 */
export const MILLISECONDS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
} as const;

/**
 * Session and authentication configuration
 */
export const SESSION_CONFIG = {
    /** Session expiry duration (7 days) */
    SESSION_EXPIRY: SECONDS.WEEK,
    /** Session update age - refresh session every 24 hours of activity */
    SESSION_UPDATE_AGE: SECONDS.DAY,
    /** Cookie cache duration for session validation (5 minutes) */
    COOKIE_CACHE_MAX_AGE: 5 * SECONDS.MINUTE,
} as const;

/**
 * CORS configuration
 */
export const CORS_CONFIG = {
    /** Preflight request cache duration (24 hours) */
    PREFLIGHT_MAX_AGE: SECONDS.DAY,
} as const;

/**
 * Audit Log Retention Policy Configuration (HAP-865)
 *
 * Defines the retention period for admin audit logs stored in D1.
 * After this period, logs are automatically deleted by the scheduled cleanup job.
 *
 * @remarks
 * - 90 days is a standard compliance period, balancing:
 *   - Sufficient time for incident response and investigations
 *   - Storage cost management for D1
 *   - Performance optimization for queries
 *
 * - Cloudflare Cron Trigger runs daily at 03:00 UTC to clean expired logs
 * - Records older than RETENTION_DAYS are permanently deleted (no archive)
 *
 * @see HAP-804 for audit log implementation
 */
export const AUDIT_LOG_RETENTION = {
    /** Retention period in days (90 days = ~3 months) */
    RETENTION_DAYS: 90,
    /** Retention period in milliseconds for timestamp comparison */
    RETENTION_MS: 90 * MILLISECONDS.DAY,
} as const;

/**
 * Origin configuration for CORS and trusted origins
 *
 * @remarks
 * Production origins should always be included.
 * Development origins are conditionally included based on environment.
 */
export const ORIGINS = {
    /** Production dashboard domains */
    PRODUCTION: [
        'https://happy-admin.enflamemedia.com',
        'https://happy-admin-dev.enflamemedia.com',
    ],
    /** Local development domains */
    DEVELOPMENT: [
        'http://localhost:5173',
        'http://localhost:8787',
    ],
} as const;

/**
 * Get allowed origins based on environment
 *
 * @param environment - Current environment ('production' | 'development' | 'staging')
 * @returns Array of allowed origin URLs
 *
 * @remarks
 * - Production: Only production origins
 * - Development/Staging: Both production and development origins
 */
export function getAllowedOrigins(environment?: string): string[] {
    if (environment === 'production') {
        return [...ORIGINS.PRODUCTION];
    }
    // Development, staging, and undefined (local dev) include all origins
    return [...ORIGINS.PRODUCTION, ...ORIGINS.DEVELOPMENT];
}
