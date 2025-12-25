/**
 * Correlation ID utility for distributed tracing.
 *
 * Generates and manages a per-session correlation ID that is included in:
 * - All HTTP request headers (X-Correlation-ID)
 * - WebSocket authentication handshakes
 * - Error messages for debugging support
 *
 * This enables end-to-end request tracing across CLI → Server → Workers,
 * making it easier to correlate logs and debug issues.
 *
 * @module utils/correlationId
 * @see HAP-509 - CLI correlation ID implementation
 * @see HAP-480 - Server correlation ID support
 */

import { randomUUID } from 'node:crypto';

/**
 * Session-scoped correlation ID.
 *
 * Generated once at module load time and reused for all requests
 * during this CLI process lifetime. This groups all operations from
 * a single CLI invocation, making server-side log analysis easier.
 *
 * Format: UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
 */
let correlationId: string = randomUUID();

/**
 * Get the current session's correlation ID.
 *
 * @returns The correlation ID for this CLI session
 *
 * @example
 * ```typescript
 * import { getCorrelationId } from '@/utils/correlationId';
 *
 * // Include in HTTP headers
 * const headers = {
 *   'X-Correlation-ID': getCorrelationId(),
 *   'Authorization': `Bearer ${token}`
 * };
 *
 * // Include in error messages
 * console.error(`Error (ref: ${getCorrelationId()}): ${message}`);
 * ```
 */
export function getCorrelationId(): string {
    return correlationId;
}

/**
 * Reset the correlation ID to a new value.
 *
 * Primarily used for testing. In production, the correlation ID
 * persists for the entire CLI session.
 *
 * @returns The new correlation ID
 */
export function resetCorrelationId(): string {
    correlationId = randomUUID();
    return correlationId;
}
