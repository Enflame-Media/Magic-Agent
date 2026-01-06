/**
 * Fingerprint.js Pro Server API integration
 *
 * This module provides server-side device intelligence using Fingerprint.js Pro
 * for bot detection, device fingerprinting, and fraud prevention.
 *
 * @see https://dev.fingerprint.com/docs/get-server-side-intelligence
 * @see https://github.com/fingerprintjs/fingerprintjs-pro-server-api-node-sdk
 */

import {
    FingerprintJsServerApiClient,
    Region,
    type EventsGetResponse,
    type SearchEventsResponse,
} from '@fingerprintjs/fingerprintjs-pro-server-api';

/**
 * Fingerprint.js client instance
 * Lazily initialized on first use
 */
let client: FingerprintJsServerApiClient | null = null;
let initialized = false;

/**
 * Initialize the Fingerprint.js client with the API key.
 *
 * @param apiKey - The Fingerprint.js Pro Server API key
 * @throws Error if apiKey is empty
 *
 * @example
 * ```typescript
 * // In middleware or route handler
 * if (env.FINGERPRINT_API_KEY) {
 *     initFingerprint(env.FINGERPRINT_API_KEY);
 * }
 * ```
 */
export function initFingerprint(apiKey: string): void {
    if (initialized && client) {
        return;
    }

    if (!apiKey || apiKey.trim() === '') {
        throw new Error(
            'FINGERPRINT_API_KEY is required but not configured. ' +
            'Get your API key from https://dashboard.fingerprint.com and add it to .dev.vars for local development, ' +
            'or use: wrangler secret put FINGERPRINT_API_KEY for production.'
        );
    }

    client = new FingerprintJsServerApiClient({
        apiKey,
        region: Region.Global,
    });

    initialized = true;
}

/**
 * Check if the Fingerprint.js client is initialized.
 *
 * @returns true if the client is ready to use
 */
export function isFingerprintInitialized(): boolean {
    return initialized && client !== null;
}

/**
 * Get the Fingerprint.js client instance.
 *
 * @throws Error if client is not initialized
 * @returns The FingerprintJsServerApiClient instance
 */
export function getFingerprintClient(): FingerprintJsServerApiClient {
    if (!client) {
        throw new Error(
            'Fingerprint.js client not initialized. Call initFingerprint(apiKey) first.'
        );
    }
    return client;
}

/**
 * Search for events by visitor ID.
 *
 * Use this to retrieve device intelligence data for a specific visitor.
 *
 * @param visitorId - The visitor ID from the client-side Fingerprint.js agent
 * @param limit - Maximum number of events to return (default: 10)
 * @returns Events matching the visitor ID
 * @throws Error if client is not initialized or API call fails
 *
 * @example
 * ```typescript
 * const events = await searchEventsByVisitor('abc123', 10);
 * for (const event of events.events ?? []) {
 *     console.log('Event:', event.products);
 * }
 * ```
 */
export async function searchEventsByVisitor(
    visitorId: string,
    limit: number = 10
): Promise<SearchEventsResponse> {
    const fingerprintClient = getFingerprintClient();
    return fingerprintClient.searchEvents({
        visitor_id: visitorId,
        limit,
    });
}

/**
 * Get a specific identification event by request ID.
 *
 * Use this to retrieve full device intelligence for a specific request.
 *
 * @param requestId - The request ID from the client-side identification result
 * @returns The full event data including all products
 * @throws Error if client is not initialized or API call fails
 *
 * @example
 * ```typescript
 * const event = await getEvent('request_abc123');
 * console.log('Visitor ID:', event.products?.identification?.data?.visitorId);
 * console.log('Bot Detection:', event.products?.botd?.data);
 * ```
 */
export async function getEvent(requestId: string): Promise<EventsGetResponse> {
    const fingerprintClient = getFingerprintClient();
    return fingerprintClient.getEvent(requestId);
}

/**
 * Helper to check if a visitor appears to be a bot.
 *
 * @param requestId - The request ID from the client-side identification result
 * @returns Object with bot detection result
 *
 * @example
 * ```typescript
 * const result = await checkForBot('request_abc123');
 * if (result.isBot) {
 *     console.log('Bot detected:', result.botKind);
 * }
 * ```
 */
export async function checkForBot(requestId: string): Promise<{
    isBot: boolean;
    botKind?: string;
    error?: string;
}> {
    try {
        const event = await getEvent(requestId);
        const botd = event.products?.botd?.data;

        if (!botd) {
            return { isBot: false, error: 'Bot detection data not available' };
        }

        return {
            isBot: botd.bot?.result === 'bad',
            botKind: botd.bot?.type,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { isBot: false, error: message };
    }
}

/**
 * Reset the client (useful for testing).
 * @internal
 */
export function resetFingerprintClient(): void {
    client = null;
    initialized = false;
}
