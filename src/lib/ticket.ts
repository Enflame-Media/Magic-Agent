/**
 * WebSocket Connection Ticket Utility
 *
 * Provides short-lived, signed tickets for WebSocket connection authentication.
 * This implements the ticket flow for HAP-375, allowing browser/React Native
 * clients to authenticate without putting tokens in WebSocket URLs.
 *
 * Flow:
 * 1. Client calls POST /v1/websocket/ticket with auth token in header
 * 2. Server validates token, creates signed ticket with userId
 * 3. Client connects to /v1/updates?ticket=xxx
 * 4. Server validates ticket, routes to user's DO
 *
 * Ticket format: base64url(payload).base64url(signature)
 * Payload: { userId, exp, nonce }
 *
 * @module lib/ticket
 * @see HAP-375 - WebSocket Connection Ticket Authentication
 */

/**
 * Ticket payload structure
 */
interface TicketPayload {
    /** User ID from the validated auth token */
    userId: string;
    /** Expiration timestamp in milliseconds */
    exp: number;
    /** Random nonce for uniqueness */
    nonce: string;
}

/**
 * Verified ticket result
 */
export interface VerifiedTicket {
    userId: string;
}

/** Default ticket TTL: 30 seconds */
const DEFAULT_TICKET_TTL_MS = 30_000;

/** Maximum allowed clock skew: 5 seconds */
const MAX_CLOCK_SKEW_MS = 5_000;

/**
 * Base64url encode a Uint8Array
 * Uses URL-safe alphabet without padding (RFC 4648 Section 5)
 */
function base64urlEncode(data: Uint8Array): string {
    const base64 = btoa(String.fromCharCode(...data));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64url decode a string to Uint8Array
 */
function base64urlDecode(str: string): Uint8Array {
    // Add padding if necessary
    const padded = str + '==='.slice(0, (4 - (str.length % 4)) % 4);
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Import secret as HMAC key for signing/verification
 */
async function importHmacKey(secret: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    return crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );
}

/**
 * Create a signed WebSocket connection ticket
 *
 * Generates a short-lived, HMAC-signed ticket that contains the userId.
 * The ticket can be used once to establish a WebSocket connection.
 *
 * @param userId - The authenticated user's ID
 * @param secret - The HANDY_MASTER_SECRET for signing
 * @param ttlMs - Ticket validity period in milliseconds (default: 30s)
 * @returns Signed ticket string in format: base64url(payload).base64url(signature)
 *
 * @example
 * ```typescript
 * const ticket = await createTicket('user_abc123', env.HANDY_MASTER_SECRET);
 * // Returns: "eyJ1c2VySWQiOiJ1c2VyX2FiYzEyMyIsImV4cCI6MTcwMjMxMjM0NTY3OCwibm9uY2UiOiJhYmMxMjMifQ.HMAC_SIGNATURE"
 * ```
 */
export async function createTicket(
    userId: string,
    secret: string,
    ttlMs: number = DEFAULT_TICKET_TTL_MS
): Promise<string> {
    const payload: TicketPayload = {
        userId,
        exp: Date.now() + ttlMs,
        nonce: crypto.randomUUID(),
    };

    const encoder = new TextEncoder();
    const payloadStr = JSON.stringify(payload);
    const payloadBytes = encoder.encode(payloadStr);
    const payloadB64 = base64urlEncode(payloadBytes);

    // Sign the payload
    const key = await importHmacKey(secret);
    const signature = await crypto.subtle.sign('HMAC', key, payloadBytes);
    const signatureB64 = base64urlEncode(new Uint8Array(signature));

    return `${payloadB64}.${signatureB64}`;
}

/**
 * Verify a WebSocket connection ticket
 *
 * Validates the ticket signature and expiration, returning the userId if valid.
 * Includes a small clock skew tolerance for distributed systems.
 *
 * @param ticket - The ticket string to verify
 * @param secret - The HANDY_MASTER_SECRET for verification
 * @returns VerifiedTicket with userId if valid, null if invalid or expired
 *
 * @example
 * ```typescript
 * const result = await verifyTicket(ticket, env.HANDY_MASTER_SECRET);
 * if (result) {
 *     console.log('Valid ticket for user:', result.userId);
 * } else {
 *     console.log('Invalid or expired ticket');
 * }
 * ```
 */
export async function verifyTicket(
    ticket: string,
    secret: string
): Promise<VerifiedTicket | null> {
    try {
        // Split ticket into payload and signature
        const parts = ticket.split('.');
        if (parts.length !== 2) {
            return null;
        }

        const [payloadB64, signatureB64] = parts;
        if (!payloadB64 || !signatureB64) {
            return null;
        }

        // Decode payload
        const payloadBytes = base64urlDecode(payloadB64);
        const payloadStr = new TextDecoder().decode(payloadBytes);
        const payload: TicketPayload = JSON.parse(payloadStr);

        // Verify required fields
        if (!payload.userId || !payload.exp || !payload.nonce) {
            return null;
        }

        // Check expiration with clock skew tolerance
        const now = Date.now();
        if (now > payload.exp + MAX_CLOCK_SKEW_MS) {
            return null;
        }

        // Verify signature
        const key = await importHmacKey(secret);
        const signature = base64urlDecode(signatureB64);
        const valid = await crypto.subtle.verify('HMAC', key, signature, payloadBytes);

        if (!valid) {
            return null;
        }

        return { userId: payload.userId };
    } catch {
        // Any parsing or crypto error means invalid ticket
        return null;
    }
}

/**
 * Check if a ticket is expired without full verification
 *
 * Useful for quick checks before attempting full verification.
 * Note: This does NOT verify the signature.
 *
 * @param ticket - The ticket string to check
 * @returns true if the ticket appears expired, false otherwise
 */
export function isTicketExpired(ticket: string): boolean {
    try {
        const parts = ticket.split('.');
        if (parts.length !== 2 || !parts[0]) {
            return true;
        }

        const payloadBytes = base64urlDecode(parts[0]);
        const payloadStr = new TextDecoder().decode(payloadBytes);
        const payload: TicketPayload = JSON.parse(payloadStr);

        return Date.now() > payload.exp + MAX_CLOCK_SKEW_MS;
    } catch {
        return true;
    }
}
