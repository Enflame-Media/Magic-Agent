import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AppError, ErrorCodes } from '@/utils/errors';
import { logger } from '@/utils/logger';

const AUTH_KEY = 'auth_credentials';
const ENCRYPTION_KEY = 'auth_enc_key';
const AES_GCM_IV_LENGTH = 12;

// Web Crypto API utilities for secure sessionStorage
// These functions are only used on web platform
//
// SECURITY NOTICE: Web browser storage has inherent limitations compared to native apps.
// On native platforms (iOS/Android), we use hardware-backed secure storage (Keychain/Keystore).
// On web, we use sessionStorage with AES-256-GCM encryption. While this protects against
// casual inspection, it cannot fully protect against active XSS attacks since the encryption
// key must be stored client-side and is accessible to JavaScript.
//
// Mitigations applied:
// 1. sessionStorage instead of localStorage - tokens cleared on browser close
// 2. AES-256-GCM encryption - protects at-rest data from casual inspection
// 3. Strict CSP headers - reduces XSS attack surface
//
// For maximum security of credentials, use the iOS or Android native apps.

let webStorageWarningLogged = false;

/**
 * Logs a one-time security warning when web storage is first accessed.
 * This helps users understand the security limitations of browser storage.
 */
function logWebStorageSecurityWarning(): void {
    if (webStorageWarningLogged) return;
    webStorageWarningLogged = true;

    logger.warn(
        '[Security] Web browser storage is inherently less secure than native apps. ' +
        'For maximum security of your credentials, use the iOS or Android app. ' +
        'Web tokens are stored in sessionStorage and will be cleared when you close the browser.'
    );
}

/**
 * Gets the appropriate web storage for the platform.
 * Uses sessionStorage on web for improved security (tokens cleared on browser close).
 */
function getWebStorage(): Storage {
    return sessionStorage;
}

function isSecureContext(): boolean {
    return typeof window !== 'undefined' && window.isSecureContext;
}

function isValidCredentials(value: unknown): value is AuthCredentials {
    if (typeof value !== 'object' || value === null) return false;
    const obj = value as Record<string, unknown>;
    if (typeof obj.token !== 'string' || typeof obj.secret !== 'string') return false;
    // expiresAt is optional - if present, must be a number
    if (obj.expiresAt !== undefined && typeof obj.expiresAt !== 'number') return false;
    return true;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
    const storage = getWebStorage();
    const stored = storage.getItem(ENCRYPTION_KEY);
    if (stored) {
        const keyData = base64ToArrayBuffer(stored);
        return crypto.subtle.importKey('raw', keyData, 'AES-GCM', true, ['encrypt', 'decrypt']);
    }
    const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
    const exported = await crypto.subtle.exportKey('raw', key);
    storage.setItem(ENCRYPTION_KEY, arrayBufferToBase64(exported));
    return key;
}

async function encryptForWeb(data: string): Promise<string> {
    if (!isSecureContext()) {
        throw new AppError(ErrorCodes.NOT_CONFIGURED, 'Web Crypto API requires a secure context (HTTPS)');
    }
    const key = await getOrCreateEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
    const encoded = new TextEncoder().encode(data);
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );
    // Concatenate IV + ciphertext
    const result = new Uint8Array(iv.length + ciphertext.byteLength);
    result.set(iv);
    result.set(new Uint8Array(ciphertext), iv.length);
    return arrayBufferToBase64(result.buffer);
}

async function decryptForWeb(encrypted: string): Promise<string> {
    const key = await getOrCreateEncryptionKey();
    const data = base64ToArrayBuffer(encrypted);
    const iv = new Uint8Array(data.slice(0, AES_GCM_IV_LENGTH));
    const ciphertext = data.slice(AES_GCM_IV_LENGTH);
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );
    return new TextDecoder().decode(decrypted);
}

// Cache for synchronous access (currently unused - kept for future sync access)
let _credentialsCache: string | null = null;

export interface AuthCredentials {
    token: string;
    secret: string;
    /** Unix timestamp (ms) when the token expires. If not set, token is treated as never expiring (legacy). */
    expiresAt?: number;
}

export const TokenStorage = {
    async getCredentials(): Promise<AuthCredentials | null> {
        if (Platform.OS === 'web') {
            logWebStorageSecurityWarning();
            const storage = getWebStorage();

            // Migration: check if there are credentials in localStorage (old storage)
            // and migrate them to sessionStorage (new storage)
            const oldStored = localStorage.getItem(AUTH_KEY);
            if (oldStored) {
                logger.info('[TokenStorage] Migrating credentials from localStorage to sessionStorage');
                storage.setItem(AUTH_KEY, oldStored);
                // Also migrate the encryption key if present
                const oldKey = localStorage.getItem(ENCRYPTION_KEY);
                if (oldKey) {
                    storage.setItem(ENCRYPTION_KEY, oldKey);
                    localStorage.removeItem(ENCRYPTION_KEY);
                }
                localStorage.removeItem(AUTH_KEY);
            }

            const stored = storage.getItem(AUTH_KEY);
            if (!stored) return null;
            try {
                // Try to decrypt (new encrypted format)
                const decrypted = await decryptForWeb(stored);
                const parsed: unknown = JSON.parse(decrypted);
                if (!isValidCredentials(parsed)) {
                    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid credentials format');
                }
                return parsed;
            } catch {
                // Migration: try parsing as plaintext JSON (old format)
                try {
                    const parsed: unknown = JSON.parse(stored);
                    if (!isValidCredentials(parsed)) {
                        throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Invalid credentials format');
                    }
                    // Re-encrypt and save in new format
                    const encrypted = await encryptForWeb(JSON.stringify(parsed));
                    storage.setItem(AUTH_KEY, encrypted);
                    return parsed;
                } catch {
                    // Corrupted data, clear it
                    storage.removeItem(AUTH_KEY);
                    storage.removeItem(ENCRYPTION_KEY);
                    return null;
                }
            }
        }
        try {
            const stored = await SecureStore.getItemAsync(AUTH_KEY);
            if (!stored) return null;
            _credentialsCache = stored; // Update cache
            return JSON.parse(stored) as AuthCredentials;
        } catch (error) {
            logger.error('[TokenStorage] Failed to retrieve credentials:', error);
            return null;
        }
    },

    async setCredentials(credentials: AuthCredentials): Promise<boolean> {
        if (Platform.OS === 'web') {
            logWebStorageSecurityWarning();
            try {
                const storage = getWebStorage();
                const json = JSON.stringify(credentials);
                const encrypted = await encryptForWeb(json);
                storage.setItem(AUTH_KEY, encrypted);
                return true;
            } catch (error) {
                logger.error('[TokenStorage] Failed to encrypt credentials:', error);
                return false;
            }
        }
        try {
            const json = JSON.stringify(credentials);
            await SecureStore.setItemAsync(AUTH_KEY, json);
            _credentialsCache = json; // Update cache
            return true;
        } catch (error) {
            logger.error('[TokenStorage] Failed to store credentials:', error);
            return false;
        }
    },

    async removeCredentials(): Promise<boolean> {
        if (Platform.OS === 'web') {
            const storage = getWebStorage();
            storage.removeItem(AUTH_KEY);
            storage.removeItem(ENCRYPTION_KEY);
            // Also clean up any legacy localStorage entries
            localStorage.removeItem(AUTH_KEY);
            localStorage.removeItem(ENCRYPTION_KEY);
            return true;
        }
        try {
            await SecureStore.deleteItemAsync(AUTH_KEY);
            _credentialsCache = null; // Clear cache
            return true;
        } catch (error) {
            logger.error('[TokenStorage] Failed to remove credentials:', error);
            return false;
        }
    },
};