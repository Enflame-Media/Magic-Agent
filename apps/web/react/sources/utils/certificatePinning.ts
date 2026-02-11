/**
 * Certificate Pinning Configuration for Happy API Connections
 *
 * HAP-624: Implements SSL/TLS certificate pinning to protect against
 * man-in-the-middle (MITM) attacks. This ensures the app only trusts
 * specific certificate public keys for Happy API servers.
 *
 * Security Benefits:
 * - Protects against compromised CA certificates
 * - Prevents corporate MITM proxy interception
 * - Blocks rogue WiFi AP attacks
 * - Mitigates user-installed certificate risks
 *
 * Certificate Rotation:
 * Always include backup pins to handle certificate rotation without
 * breaking the app. The pins can be updated via OTA (expo-updates)
 * without requiring an App Store release.
 *
 * @see https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getServerUrl } from '@/sync/serverConfig';
import { logger } from '@/utils/logger';

/**
 * Type definition for the ssl-pinning module.
 * We use conditional imports since the module is only available on native platforms.
 */
interface SslPinningModule {
    initializeSslPinning: (config: Record<string, {
        includeSubdomains?: boolean;
        publicKeyHashes: string[];
        expirationDate?: string;
    }>) => Promise<void>;
    disableSslPinning: () => Promise<void>;
    addSslPinningErrorListener: (callback: (error: {
        serverHostname: string;
        message?: string;
    }) => void) => { remove: () => void };
    isSslPinningAvailable: () => boolean;
}

/**
 * Certificate pin configuration for Happy API domains.
 *
 * IMPORTANT: These hashes MUST be updated before certificate rotation!
 *
 * To extract a certificate's public key hash:
 * ```bash
 * echo | openssl s_client -servername <hostname> -connect <hostname>:443 | \
 *   openssl x509 -pubkey -noout | \
 *   openssl pkey -pubin -outform DER | \
 *   openssl dgst -sha256 -binary | \
 *   openssl enc -base64
 * ```
 *
 * Or use https://www.ssllabs.com/ssltest/ to get the SPKI hashes.
 *
 * Pin Structure:
 * - Primary: Current leaf certificate hash
 * - Backup 1: Intermediate CA hash (for rotation resilience)
 * - Backup 2: Root CA hash (for emergency fallback)
 */
export interface CertificatePinConfig {
    /** Base64-encoded SHA-256 hashes of the certificate's Subject Public Key Info (SPKI) */
    publicKeyHashes: string[];
    /** Whether to apply pinning to all subdomains */
    includeSubdomains: boolean;
    /** Optional expiration date in yyyy-MM-dd format after which pinning is disabled */
    expirationDate?: string;
}

/**
 * Known Happy API domains and their certificate pins.
 *
 * HAP-858: Certificate Chain Information (as of January 2026)
 * ============================================================
 * Cloudflare transitioned from DigiCert/Cloudflare Inc ECC CA-3 to Google Trust Services (GTS)
 * certificates in 2024. The old Cloudflare Inc ECC CA-3 expired December 31, 2024.
 *
 * Current certificate chain for happy-api.enflamemedia.com:
 * 1. Leaf certificate (rotated automatically by Cloudflare every ~90 days)
 * 2. Intermediate: GTS CA 1P5 (Google Trust Services) - ECDSA P-256
 * 3. Root: GTS Root R1 (Google Trust Services) - RSA 4096, valid until June 22, 2036
 *
 * Pinning Strategy:
 * - Pin to root CAs (GTS Root R1, GTS Root R4) for maximum stability
 * - Include GlobalSign Root R4 as additional backup (cross-signed with GTS)
 * - Avoid pinning leaf certificates as they rotate frequently
 *
 * NOTE: Update these hashes when Google Trust Services certificates change!
 *
 * To extract certificate hashes for a domain, run:
 *   yarn extract-cert-pins
 *
 * Or manually:
 *   echo | openssl s_client -servername <hostname> -connect <hostname>:443 -showcerts 2>/dev/null | \
 *     openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl enc -base64
 *
 * Or use https://www.ssllabs.com/ssltest/ to get the SPKI hashes.
 *
 * @see https://developers.cloudflare.com/ssl/reference/certificate-authorities/
 * @see https://pki.goog/repository/ - Google Trust Services certificates
 */
const HAPPY_API_PINS: Record<string, CertificatePinConfig> = {
    // Production API (happy-api.enflamemedia.com)
    // Cloudflare SSL certificates - using Google Trust Services (GTS) CA pins
    // GTS root certificates are stable and valid until 2036
    'happy-api.enflamemedia.com': {
        includeSubdomains: false,
        publicKeyHashes: [
            // GTS Root R1 (Google Trust Services root CA)
            // RSA 4096, valid until June 22, 2036
            // SHA-256 Fingerprint: D947432ABDE7B7FA90FC2E6B59101B1280E0E1C7E4E40FA3C6887FFF57A7F4CF
            // SPKI pin extracted from https://pki.goog/repo/certs/gtsr1.pem
            'hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=',
            // GTS Root R4 (Google Trust Services root CA - ECC)
            // ECC P-384, valid until June 22, 2036
            // Used for ECDSA certificates
            // SPKI pin extracted from https://pki.goog/repo/certs/gtsr4.pem
            'uyJLOJQLNtPvt+gLa9F/6xaRCKrIHZWGxJpR18qYNGE=',
            // GlobalSign Root R4 (cross-signed backup)
            // ECC P-256, valid until January 19, 2038
            // Cross-signed with GTS for older device compatibility
            'CLOmM1/OXvSPjw5UOYbAf9GKOxImEp9hhku9W90fHMk=',
        ],
        // Set expiration to allow graceful degradation if pins become stale
        // GTS Root R1 valid until 2036, so this is conservative
        expirationDate: '2027-12-31',
    },
    // Development API (happy-api-dev.enflamemedia.com)
    // Using same GTS CA pins since both are behind Cloudflare
    'happy-api-dev.enflamemedia.com': {
        includeSubdomains: false,
        publicKeyHashes: [
            // GTS Root R1 (Google Trust Services root CA)
            'hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=',
            // GTS Root R4 (Google Trust Services root CA - ECC)
            'uyJLOJQLNtPvt+gLa9F/6xaRCKrIHZWGxJpR18qYNGE=',
            // GlobalSign Root R4 (cross-signed backup)
            'CLOmM1/OXvSPjw5UOYbAf9GKOxImEp9hhku9W90fHMk=',
        ],
        expirationDate: '2027-12-31',
    },
};

/**
 * Domains that should bypass certificate pinning.
 * Used for local development and testing.
 */
const PINNING_BYPASS_HOSTS = [
    'localhost',
    '127.0.0.1',
    '10.0.2.2', // Android emulator localhost
    '192.168.', // Local network (prefix match)
];

/**
 * Check if a hostname should bypass pinning (for local development).
 */
function shouldBypassPinning(hostname: string): boolean {
    return PINNING_BYPASS_HOSTS.some(bypass => hostname.startsWith(bypass));
}

/**
 * Extract hostname from a URL.
 */
function extractHostname(url: string): string | null {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        return null;
    }
}

/**
 * State tracking for certificate pinning initialization.
 */
let isPinningInitialized = false;
let pinningErrorListener: { remove: () => void } | null = null;

/**
 * Track consecutive failures per domain for alerting thresholds.
 * HAP-860: Used to detect persistent issues vs transient failures.
 */
const consecutiveFailures: Map<string, number> = new Map();

/**
 * Get app version for analytics tracking.
 */
function getAppVersion(): string {
    return Constants.expoConfig?.version ?? 'unknown';
}

/**
 * Get OS version for analytics tracking.
 */
function getOsVersion(): string {
    const version = Platform.Version;
    if (typeof version === 'string') {
        return version;
    }
    if (typeof version === 'number') {
        return String(version);
    }
    return 'unknown';
}

/**
 * Check if pin expiration is approaching and emit warning.
 * HAP-860: Proactive alerting for pin expiration.
 */
function checkPinExpiration(hostname: string, expirationDate?: string): void {
    if (!expirationDate) return;

    try {
        const expiration = new Date(expirationDate);
        const now = new Date();
        const daysUntilExpiration = Math.floor(
            (expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Warn if expiration is within 30 days
        if (daysUntilExpiration <= 30 && daysUntilExpiration > 0) {
            logger.warn(`[CertPinning] Pins for ${hostname} expire in ${daysUntilExpiration} days`);
            // TODO HAP-860: Add trackCertPinningExpirationWarning(hostname, daysUntilExpiration);
        } else if (daysUntilExpiration <= 0) {
            logger.error(`[CertPinning] Pins for ${hostname} have EXPIRED! Pinning may be disabled.`);
            // TODO HAP-860: Add trackCertPinningExpirationWarning(hostname, daysUntilExpiration);
        }
    } catch {
        logger.warn(`[CertPinning] Failed to parse expiration date: ${expirationDate}`);
    }
}

/**
 * Initialize SSL certificate pinning for Happy API connections.
 *
 * This should be called early in the app lifecycle, before any API requests.
 * The function is idempotent - subsequent calls will be no-ops.
 *
 * @returns Promise that resolves when pinning is initialized, or rejects on error
 *
 * @example
 * ```typescript
 * // In app initialization
 * await initializeCertificatePinning();
 * // All subsequent fetch() calls to pinned domains will be protected
 * ```
 */
export async function initializeCertificatePinning(): Promise<void> {
    // Only initialize on native platforms (iOS/Android)
    if (Platform.OS === 'web') {
        logger.debug('[CertPinning] Skipping - not supported on web platform');
        // TODO HAP-860: Add trackCertPinningBypassed({ hostname: 'unknown', reason: 'unsupported_platform' });
        return;
    }

    // Check if already initialized
    if (isPinningInitialized) {
        logger.debug('[CertPinning] Already initialized, skipping');
        return;
    }

    // Check if we're using a custom/local server that should bypass pinning
    const serverUrl = getServerUrl();
    const hostname = extractHostname(serverUrl);

    if (hostname && shouldBypassPinning(hostname)) {
        logger.debug(`[CertPinning] Bypassing for local development: ${hostname}`);
        // TODO HAP-860: Add trackCertPinningBypassed({ hostname, reason: 'local_development' });
        isPinningInitialized = true;
        return;
    }

    // Check for development/debug mode
    if (process.env.EXPO_PUBLIC_DEBUG === '1' || __DEV__) {
        logger.debug('[CertPinning] Development mode detected - pinning enabled but with extended logging');
    }

    try {
        // Dynamically import the SSL pinning module
        // This allows the app to work even if the module is not installed
        // We use dynamic require to avoid TypeScript module resolution issues
        // since the module may not be installed in all environments
        let sslPinning: SslPinningModule;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            sslPinning = require('react-native-ssl-public-key-pinning') as SslPinningModule;
        } catch {
            logger.warn('[CertPinning] SSL pinning module not available - skipping initialization');
            logger.debug('[CertPinning] Install with: npx expo install react-native-ssl-public-key-pinning');
            // TODO HAP-860: Add trackCertPinningBypassed({ hostname: hostname || 'unknown', reason: 'module_unavailable' });
            isPinningInitialized = true;
            return;
        }

        // Check if the native module is available
        if (!sslPinning.isSslPinningAvailable()) {
            logger.warn('[CertPinning] Native SSL pinning module not available');
            // TODO HAP-860: Add trackCertPinningBypassed({ hostname: hostname || 'unknown', reason: 'module_unavailable' });
            isPinningInitialized = true;
            return;
        }

        // Build the pin configuration for the current server
        const pinConfig: Record<string, { includeSubdomains?: boolean; publicKeyHashes: string[] }> = {};

        // Add pins for the configured server
        if (hostname && HAPPY_API_PINS[hostname]) {
            const domainPins = HAPPY_API_PINS[hostname];
            pinConfig[hostname] = {
                includeSubdomains: domainPins.includeSubdomains,
                publicKeyHashes: domainPins.publicKeyHashes,
            };
            logger.debug(`[CertPinning] Configuring pins for: ${hostname}`);

            // HAP-860: Check for pin expiration
            checkPinExpiration(hostname, domainPins.expirationDate);
        } else {
            // If we don't have pins for this hostname, skip initialization
            // This handles custom server configurations
            logger.warn(`[CertPinning] No pins configured for hostname: ${hostname}`);
            // TODO HAP-860: Add trackCertPinningBypassed({ hostname: hostname || 'unknown', reason: 'no_pins_configured' });
            isPinningInitialized = true;
            return;
        }

        // HAP-860: Set up error listener for pin validation failures with analytics
        pinningErrorListener = sslPinning.addSslPinningErrorListener((error) => {
            // Increment consecutive failure count for this domain
            const currentCount = consecutiveFailures.get(error.serverHostname) || 0;
            const newCount = currentCount + 1;
            consecutiveFailures.set(error.serverHostname, newCount);

            logger.error(`[CertPinning] Pin validation failed for ${error.serverHostname}: ${error.message}`);
            logger.error(`[CertPinning] Consecutive failures: ${newCount}`);

            // TODO HAP-860: Add trackCertPinningFailure tracking here

            // HAP-860: Alert if we exceed threshold (10 consecutive failures)
            if (newCount >= 10) {
                logger.error(`[CertPinning] ALERT: ${error.serverHostname} has ${newCount} consecutive pin failures!`);
            }
        });

        // Initialize the pinning configuration
        await sslPinning.initializeSslPinning(pinConfig);

        isPinningInitialized = true;
        logger.debug('[CertPinning] Successfully initialized');

        // TODO HAP-860: Add trackCertPinningInitialized tracking here
    } catch (error) {
        // Log the error but don't throw - we don't want to break the app
        // if pinning fails to initialize
        logger.error('[CertPinning] Failed to initialize:', error);
        isPinningInitialized = true; // Mark as initialized to prevent retry loops
    }
}

/**
 * Disable SSL certificate pinning.
 *
 * Use this for debugging or when connecting to development servers
 * with self-signed certificates.
 *
 * WARNING: This reduces security! Only use in development.
 */
export async function disableCertificatePinning(): Promise<void> {
    if (Platform.OS === 'web') {
        return;
    }

    if (!isPinningInitialized) {
        return;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const sslPinning = require('react-native-ssl-public-key-pinning') as SslPinningModule;

        if (pinningErrorListener) {
            pinningErrorListener.remove();
            pinningErrorListener = null;
        }

        await sslPinning.disableSslPinning();
        isPinningInitialized = false;
        logger.debug('[CertPinning] Disabled');
    } catch (error) {
        logger.error('[CertPinning] Failed to disable:', error);
    }
}

/**
 * Check if certificate pinning is currently active.
 */
export function isCertificatePinningActive(): boolean {
    return isPinningInitialized && Platform.OS !== 'web';
}

/**
 * Get the configured pins for a hostname.
 * Useful for debugging and testing.
 */
export function getPinsForHost(hostname: string): CertificatePinConfig | null {
    return HAPPY_API_PINS[hostname] || null;
}

/**
 * Update certificate pins at runtime.
 *
 * This can be used with OTA updates to refresh pins without
 * requiring an app store release.
 *
 * @param hostname - The hostname to update pins for
 * @param pins - The new pin configuration
 */
export async function updatePinsForHost(
    hostname: string,
    pins: CertificatePinConfig
): Promise<void> {
    HAPPY_API_PINS[hostname] = pins;

    // If pinning is already initialized, reinitialize with new pins
    if (isPinningInitialized && Platform.OS !== 'web') {
        isPinningInitialized = false;
        await initializeCertificatePinning();
    }
}

/**
 * Reset consecutive failure count for a hostname.
 *
 * HAP-860: Call this when a successful request is made to reset
 * the failure tracking. This helps distinguish between transient
 * issues and persistent problems.
 *
 * @param hostname - The hostname to reset failures for
 */
export function resetConsecutiveFailures(hostname: string): void {
    consecutiveFailures.set(hostname, 0);
}

/**
 * Get the current consecutive failure count for a hostname.
 *
 * HAP-860: Useful for monitoring and debugging.
 *
 * @param hostname - The hostname to check
 * @returns The number of consecutive failures, or 0 if none
 */
export function getConsecutiveFailures(hostname: string): number {
    return consecutiveFailures.get(hostname) || 0;
}

/**
 * Get certificate pinning monitoring metrics.
 *
 * HAP-860: Returns current state for dashboard/debugging.
 *
 * @returns Object containing pinning status and metrics
 */
export function getCertPinningMetrics(): {
    isActive: boolean;
    configuredDomains: string[];
    consecutiveFailures: Record<string, number>;
    platform: string;
} {
    const failures: Record<string, number> = {};
    consecutiveFailures.forEach((count, hostname) => {
        failures[hostname] = count;
    });

    return {
        isActive: isPinningInitialized && Platform.OS !== 'web',
        configuredDomains: Object.keys(HAPPY_API_PINS),
        consecutiveFailures: failures,
        platform: Platform.OS,
    };
}
