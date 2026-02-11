import { randomBytes } from 'crypto';

/**
 * Correlation ID header name used in HTTP requests.
 * Common convention is X-Correlation-ID or X-Request-ID.
 */
export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Generates a unique correlation ID for request tracing.
 * Format: happy-<timestamp-base36>-<random-hex>
 *
 * @example
 * generateCorrelationId() // "happy-m5x2k8z-a1b2c3d4"
 */
export function generateCorrelationId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `happy-${timestamp}-${random}`;
}

/**
 * Validates that a string looks like a valid correlation ID.
 * Accepts our format or common UUID/trace ID formats from other services.
 */
export function isValidCorrelationId(id: string): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }
    // Accept our format: happy-<base36>-<hex>
    if (/^happy-[a-z0-9]+-[a-f0-9]+$/i.test(id)) {
        return true;
    }
    // Accept UUIDs
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        return true;
    }
    // Accept generic alphanumeric IDs (8-64 chars)
    if (/^[a-z0-9_-]{8,64}$/i.test(id)) {
        return true;
    }
    return false;
}
