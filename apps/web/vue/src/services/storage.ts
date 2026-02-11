/**
 * Secure credential storage for web platform
 *
 * Uses sessionStorage with AES-256-GCM encryption for at-rest protection.
 * Tokens are cleared when the browser is closed.
 *
 * SECURITY NOTICE: Web browser storage has inherent limitations compared to native apps.
 * While this protects against casual inspection, it cannot fully protect against
 * active XSS attacks since the encryption key must be stored client-side.
 *
 * Mitigations:
 * 1. sessionStorage instead of localStorage - tokens cleared on browser close
 * 2. AES-256-GCM encryption - protects at-rest data
 * 3. Strict CSP headers recommended - reduces XSS attack surface
 */

const AUTH_KEY = 'happy_auth_credentials';
const ENCRYPTION_KEY = 'happy_auth_enc_key';
const AES_GCM_IV_LENGTH = 12;

let securityWarningLogged = false;

/**
 * Auth credentials stored in the browser
 */
export interface StoredCredentials {
  token: string;
  secret: string;
  expiresAt?: number;
}

/**
 * Log a one-time security warning
 */
function logSecurityWarning(): void {
  if (securityWarningLogged) return;
  securityWarningLogged = true;

  console.warn(
    '[Security] Web browser storage is inherently less secure than native apps. ' +
      'Tokens are stored in sessionStorage and will be cleared when you close the browser.'
  );
}

/**
 * Check if we're in a secure context (HTTPS)
 */
function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Get or create the AES encryption key
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(ENCRYPTION_KEY);

  if (stored) {
    const keyData = base64ToArrayBuffer(stored);
    return crypto.subtle.importKey('raw', keyData, 'AES-GCM', true, ['encrypt', 'decrypt']);
  }

  // Generate new key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  // Export and store
  const exported = await crypto.subtle.exportKey('raw', key);
  sessionStorage.setItem(ENCRYPTION_KEY, arrayBufferToBase64(exported));

  return key;
}

/**
 * Encrypt data for storage
 */
async function encryptForStorage(data: string): Promise<string> {
  if (!isSecureContext()) {
    throw new Error('Web Crypto API requires a secure context (HTTPS)');
  }

  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const encoded = new TextEncoder().encode(data);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

  // Concatenate IV + ciphertext
  const result = new Uint8Array(iv.length + ciphertext.byteLength);
  result.set(iv);
  result.set(new Uint8Array(ciphertext), iv.length);

  return arrayBufferToBase64(result.buffer);
}

/**
 * Decrypt data from storage
 */
async function decryptFromStorage(encrypted: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const data = base64ToArrayBuffer(encrypted);
  const iv = new Uint8Array(data.slice(0, AES_GCM_IV_LENGTH));
  const ciphertext = data.slice(AES_GCM_IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return new TextDecoder().decode(decrypted);
}

/**
 * Validate credentials object shape
 */
function isValidCredentials(value: unknown): value is StoredCredentials {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.token !== 'string' || typeof obj.secret !== 'string') return false;
  if (obj.expiresAt !== undefined && typeof obj.expiresAt !== 'number') return false;
  return true;
}

/**
 * Secure credential storage API
 */
export const secureStorage = {
  /**
   * Get stored credentials
   */
  async getCredentials(): Promise<StoredCredentials | null> {
    logSecurityWarning();

    // Try migration from localStorage (old storage)
    const oldStored = localStorage.getItem(AUTH_KEY);
    if (oldStored) {
      console.info('[Storage] Migrating credentials from localStorage to sessionStorage');
      sessionStorage.setItem(AUTH_KEY, oldStored);

      const oldKey = localStorage.getItem(ENCRYPTION_KEY);
      if (oldKey) {
        sessionStorage.setItem(ENCRYPTION_KEY, oldKey);
        localStorage.removeItem(ENCRYPTION_KEY);
      }
      localStorage.removeItem(AUTH_KEY);
    }

    const stored = sessionStorage.getItem(AUTH_KEY);
    if (!stored) return null;

    try {
      // Try to decrypt (encrypted format)
      const decrypted = await decryptFromStorage(stored);
      const parsed: unknown = JSON.parse(decrypted);

      if (!isValidCredentials(parsed)) {
        console.error('[Storage] Invalid credentials format');
        return null;
      }

      return parsed;
    } catch {
      // Try parsing as plaintext JSON (old format migration)
      try {
        const parsed: unknown = JSON.parse(stored);

        if (!isValidCredentials(parsed)) {
          sessionStorage.removeItem(AUTH_KEY);
          sessionStorage.removeItem(ENCRYPTION_KEY);
          return null;
        }

        // Re-encrypt and save in new format
        const encrypted = await encryptForStorage(JSON.stringify(parsed));
        sessionStorage.setItem(AUTH_KEY, encrypted);
        return parsed;
      } catch {
        // Corrupted data, clear it
        sessionStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(ENCRYPTION_KEY);
        return null;
      }
    }
  },

  /**
   * Store credentials
   */
  async setCredentials(credentials: StoredCredentials): Promise<boolean> {
    logSecurityWarning();

    try {
      const json = JSON.stringify(credentials);
      const encrypted = await encryptForStorage(json);
      sessionStorage.setItem(AUTH_KEY, encrypted);
      return true;
    } catch (error) {
      console.error('[Storage] Failed to encrypt credentials:', error);
      return false;
    }
  },

  /**
   * Remove all credentials
   */
  removeCredentials(): void {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(ENCRYPTION_KEY);
    // Also clean up any legacy localStorage entries
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ENCRYPTION_KEY);
  },
};
