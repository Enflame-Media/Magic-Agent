import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import tweetnacl from 'tweetnacl';
import { AppError, ErrorCodes } from '@/utils/errors';

/**
 * Module-level counter for hybrid nonce generation.
 * Combined with random bytes to eliminate any theoretical nonce collision risk.
 */
let nonceCounter = 0n;
const MAX_UINT64 = (2n ** 64n) - 1n;

/**
 * Encode a Uint8Array to base64 string
 * @param buffer - The buffer to encode
 * @param variant - The encoding variant ('base64' or 'base64url')
 */
export function encodeBase64(buffer: Uint8Array, variant: 'base64' | 'base64url' = 'base64'): string {
  if (variant === 'base64url') {
    return encodeBase64Url(buffer);
  }
  return Buffer.from(buffer).toString('base64')
}

/**
 * Encode a Uint8Array to base64url string (URL-safe base64)
 * Base64URL uses '-' instead of '+', '_' instead of '/', and removes padding
 */
export function encodeBase64Url(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

/**
 * Decode a base64 string to a Uint8Array
 * @param base64 - The base64 string to decode
 * @param variant - The encoding variant ('base64' or 'base64url')
 * @returns The decoded Uint8Array
 */
export function decodeBase64(base64: string, variant: 'base64' | 'base64url' = 'base64'): Uint8Array {
  if (variant === 'base64url') {
    // Convert base64url to base64
    const base64Standard = base64
      .replaceAll('-', '+')
      .replaceAll('_', '/')
      + '='.repeat((4 - base64.length % 4) % 4);
    return new Uint8Array(Buffer.from(base64Standard, 'base64'));
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}



/**
 * Generate secure random bytes
 */
export function getRandomBytes(size: number): Uint8Array {
  return new Uint8Array(randomBytes(size))
}

/**
 * Generate a hybrid nonce combining random bytes with a monotonic counter.
 * This eliminates theoretical collision risk in high-throughput scenarios
 * while maintaining cryptographic randomness.
 *
 * Structure: [random bytes][8-byte counter (big-endian)]
 * - 24-byte nonce (NaCl): 16 random + 8 counter
 * - 12-byte nonce (AES-GCM): 4 random + 8 counter
 *
 * @param totalLength - Total nonce length in bytes
 * @returns Hybrid nonce as Uint8Array
 */
function generateHybridNonce(totalLength: number): Uint8Array {
  const counterBytes = 8;
  const randomLength = totalLength - counterBytes;

  if (randomLength < 0) {
    throw new AppError(ErrorCodes.NONCE_TOO_SHORT, `Nonce length ${totalLength} is too short for hybrid nonce (minimum 8 bytes)`);
  }

  const nonce = new Uint8Array(totalLength);

  // Random prefix for cross-process/cross-machine uniqueness
  if (randomLength > 0) {
    const randomPart = getRandomBytes(randomLength);
    nonce.set(randomPart, 0);
  }

  // Counter suffix for within-process uniqueness (big-endian)
  const counterView = new DataView(nonce.buffer, randomLength, counterBytes);
  counterView.setBigUint64(0, nonceCounter, false);

  // Increment counter, but never allow wrapping
  if (nonceCounter >= MAX_UINT64) {
    // This should be practically impossible (2^64 encryptions)
    // but handle it securely: never
    throw new AppError(ErrorCodes.ENCRYPTION_ERROR, "Nonce counter exhausted: cryptographic safety requires key rotation or process termination.");
  } else {
    nonceCounter++;
  }

  return nonce;
}

/**
 * Reset the nonce counter. Primarily for testing purposes.
 * @internal
 */
export function _resetNonceCounter(): void {
  nonceCounter = 0n;
}

/**
 * Get the current nonce counter value. For testing purposes.
 * @internal
 */
export function _getNonceCounter(): bigint {
  return nonceCounter;
}

export function libsodiumEncryptForPublicKey(data: Uint8Array, recipientPublicKey: Uint8Array): Uint8Array {
  // Generate ephemeral keypair for this encryption
  const ephemeralKeyPair = tweetnacl.box.keyPair();

  // Generate hybrid nonce (24 bytes for box encryption: 16 random + 8 counter)
  const nonce = generateHybridNonce(tweetnacl.box.nonceLength);
  
  // Encrypt the data using box (authenticated encryption)
  const encrypted = tweetnacl.box(data, nonce, recipientPublicKey, ephemeralKeyPair.secretKey);
  
  // Bundle format: ephemeral public key (32 bytes) + nonce (24 bytes) + encrypted data
  const result = new Uint8Array(ephemeralKeyPair.publicKey.length + nonce.length + encrypted.length);
  result.set(ephemeralKeyPair.publicKey, 0);
  result.set(nonce, ephemeralKeyPair.publicKey.length);
  result.set(encrypted, ephemeralKeyPair.publicKey.length + nonce.length);
  
  return result;
}

/**
 * JSON-serializable value type for encryption functions.
 * Represents any value that can be safely passed to JSON.stringify().
 * Uses a more permissive definition to allow complex object structures.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Type for data that can be encrypted/decrypted.
 * More permissive than strict JSON to allow complex TypeScript types.
 */
export type JsonSerializable = JsonValue | Record<string, unknown> | unknown[];

/**
 * Encrypt data using the secret key
 * @param data - The data to encrypt (must be JSON-serializable)
 * @param secret - The secret key to use for encryption
 * @returns The encrypted data
 */
export function encryptLegacy(data: JsonSerializable, secret: Uint8Array): Uint8Array {
  // Generate hybrid nonce (24 bytes for secretbox: 16 random + 8 counter)
  const nonce = generateHybridNonce(tweetnacl.secretbox.nonceLength);
  const encrypted = tweetnacl.secretbox(new TextEncoder().encode(JSON.stringify(data)), nonce, secret);
  const result = new Uint8Array(nonce.length + encrypted.length);
  result.set(nonce);
  result.set(encrypted, nonce.length);
  return result;
}

/**
 * Decrypt data using the secret key
 * @param data - The data to decrypt
 * @param secret - The secret key to use for decryption
 * @returns The decrypted data, or null if decryption fails
 * @template T - The expected type of the decrypted data (defaults to unknown)
 */
export function decryptLegacy<T = unknown>(data: Uint8Array, secret: Uint8Array): T | null {
  const nonce = data.slice(0, tweetnacl.secretbox.nonceLength);
  const encrypted = data.slice(tweetnacl.secretbox.nonceLength);
  const decrypted = tweetnacl.secretbox.open(encrypted, nonce, secret);
  if (!decrypted) {
    // Decryption failed - returning null is sufficient for error handling
    // Callers should handle the null case appropriately
    return null;
  }
  return JSON.parse(new TextDecoder().decode(decrypted));
}

/**
 * Encrypt data using AES-256-GCM with the data encryption key
 * @param data - The data to encrypt (must be JSON-serializable)
 * @param dataKey - The 32-byte AES-256 key
 * @returns The encrypted data bundle (nonce + ciphertext + auth tag)
 * @throws Error if dataKey is not exactly 32 bytes
 */
export function encryptWithDataKey(data: JsonSerializable, dataKey: Uint8Array): Uint8Array {
  if (dataKey.length !== 32) {
    throw new AppError(ErrorCodes.ENCRYPTION_ERROR, `Invalid encryption key length: expected 32 bytes, got ${dataKey.length} bytes`);
  }

  // Generate hybrid nonce (12 bytes for AES-GCM: 4 random + 8 counter)
  const nonce = generateHybridNonce(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, nonce);

  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Bundle: version(1) + nonce (12) + ciphertext + auth tag (16)
  const bundle = new Uint8Array(12 + encrypted.length + 16 + 1);
  bundle.set([0], 0);
  bundle.set(nonce, 1);
  bundle.set(new Uint8Array(encrypted), 13);
  bundle.set(new Uint8Array(authTag), 13 + encrypted.length);

  return bundle;
}

/**
 * Decrypt data using AES-256-GCM with the data encryption key
 * @param bundle - The encrypted data bundle
 * @param dataKey - The 32-byte AES-256 key
 * @returns The decrypted data, or null if decryption fails
 * @throws Error if dataKey is not exactly 32 bytes
 * @template T - The expected type of the decrypted data (defaults to unknown)
 */
export function decryptWithDataKey<T = unknown>(bundle: Uint8Array, dataKey: Uint8Array): T | null {
  if (dataKey.length !== 32) {
    throw new AppError(ErrorCodes.ENCRYPTION_ERROR, `Invalid decryption key length: expected 32 bytes, got ${dataKey.length} bytes`);
  }

  if (bundle.length < 1) {
    return null;
  }

  const formatVersion = bundle[0];

  // Handle legacy format (version 0x00)
  if (formatVersion === 0) {
    if (bundle.length < 12 + 16 + 1) { // Minimum: version + nonce + auth tag
      return null;
    }

    const nonce = bundle.slice(1, 13);
    const authTag = bundle.slice(bundle.length - 16);
    const ciphertext = bundle.slice(13, bundle.length - 16);

    try {
      const decipher = createDecipheriv('aes-256-gcm', dataKey, nonce);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      // Decryption failed
      return null;
    }
  }

  // Handle versioned format (version 0x01)
  // Note: For direct calls to decryptWithDataKey with versioned bundles,
  // the caller must provide the correct key for the embedded version.
  // Use KeyVersionManager.decrypt() for automatic key version handling.
  if (formatVersion === 1) {
    if (bundle.length < 31) { // Minimum: 1 + 2 + 12 + 0 + 16
      return null;
    }

    const nonce = bundle.slice(3, 15);
    const authTag = bundle.slice(bundle.length - 16);
    const ciphertext = bundle.slice(15, bundle.length - 16);

    try {
      const decipher = createDecipheriv('aes-256-gcm', dataKey, nonce);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch {
      // Decryption failed
      return null;
    }
  }

  // Unknown format version
  return null;
}

export function encrypt(key: Uint8Array, variant: 'legacy' | 'dataKey', data: JsonSerializable): Uint8Array {
  if (variant === 'legacy') {
    return encryptLegacy(data, key);
  } else {
    return encryptWithDataKey(data, key);
  }
}

export function decrypt<T = unknown>(key: Uint8Array, variant: 'legacy' | 'dataKey', data: Uint8Array): T | null {
  if (variant === 'legacy') {
    return decryptLegacy(data, key);
  } else {
    return decryptWithDataKey(data, key);
  }
}


// ============================================================================
// KEY VERSIONING AND ROTATION SUPPORT
// ============================================================================

/**
 * Bundle format version constants.
 * - VERSION_0: Original format without key versioning (legacy compatibility)
 * - VERSION_1: New format with embedded key version for rotation support
 */
const BUNDLE_VERSION_LEGACY = 0x00;
const BUNDLE_VERSION_KEYED = 0x01;

/**
 * Represents a single key version with metadata.
 */
export interface KeyVersion {
  /** The version number (1-based, incrementing) */
  version: number;
  /** The 32-byte encryption key */
  key: Uint8Array;
  /** When this key version was created */
  createdAt: Date;
  /** Optional expiration time after which this key should not be used for encryption */
  expiresAt?: Date;
}

/**
 * Configuration options for automatic key rotation.
 */
export interface KeyRotationConfig {
  /** 
   * Interval in milliseconds for automatic key rotation.
   * If set, keys will be automatically rotated after this interval.
   * @example 86400000 // 24 hours
   */
  autoRotateInterval?: number;
  /** 
   * Maximum age in milliseconds before a key is considered expired.
   * Expired keys can still decrypt but won't be used for new encryptions.
   * @example 604800000 // 7 days
   */
  maxKeyAge?: number;
  /**
   * Number of old key versions to retain for decryption.
   * Older versions beyond this limit will be removed.
   * @default 10
   */
  retainOldKeys?: number;
}

/**
 * Manages encryption key versions for secure key rotation.
 * 
 * This class enables key rotation without breaking existing encrypted data:
 * - New encryptions use the current (latest) key version
 * - Decryptions automatically use the correct key based on the version in the bundle
 * - Old keys are retained to decrypt historical data
 * 
 * Bundle format for versioned encryption (VERSION_1):
 * - Byte 0: 0x01 (format version)
 * - Bytes 1-2: Key version (uint16 big-endian)
 * - Bytes 3-14: Nonce (12 bytes for AES-GCM)
 * - Bytes 15 to N-16: Ciphertext
 * - Last 16 bytes: Auth tag
 * 
 * @example
 * ```typescript
 * const manager = new KeyVersionManager(initialKey);
 * 
 * // Encrypt with current key
 * const encrypted = manager.encrypt({ message: 'hello' });
 * 
 * // Rotate to a new key
 * const newVersion = manager.rotateKey(newKey);
 * 
 * // Old data can still be decrypted
 * const decrypted = manager.decrypt(encrypted); // Works!
 * ```
 */
export class KeyVersionManager {
  private keys: Map<number, KeyVersion> = new Map();
  private currentVersion: number = 0;
  private config: KeyRotationConfig;
  private autoRotateTimer?: ReturnType<typeof setInterval>;

  /**
   * Creates a new KeyVersionManager with an initial key.
   * 
   * @param initialKey - The initial 32-byte encryption key (becomes version 1)
   * @param config - Optional rotation configuration
   * @throws Error if initialKey is not exactly 32 bytes
   */
  constructor(initialKey: Uint8Array, config: KeyRotationConfig = {}) {
    if (initialKey.length !== 32) {
      throw new AppError(ErrorCodes.ENCRYPTION_ERROR, `Invalid initial key length: expected 32 bytes, got ${initialKey.length} bytes`);
    }

    this.config = {
      retainOldKeys: config.retainOldKeys ?? 10,
      ...config
    };

    // Add the initial key as version 1
    this.addKey(initialKey);

    // Set up auto-rotation if configured
    if (this.config.autoRotateInterval && this.config.autoRotateInterval > 0) {
      this.startAutoRotation();
    }
  }

  /**
   * Adds a new key version.
   * @internal
   */
  private addKey(key: Uint8Array): number {
    this.currentVersion++;
    const keyVersion: KeyVersion = {
      version: this.currentVersion,
      key: new Uint8Array(key), // Copy to prevent external mutation
      createdAt: new Date(),
      expiresAt: this.config.maxKeyAge 
        ? new Date(Date.now() + this.config.maxKeyAge)
        : undefined
    };
    this.keys.set(this.currentVersion, keyVersion);
    this.pruneOldKeys();
    return this.currentVersion;
  }

  /**
   * Removes old keys beyond the retention limit.
   * @internal
   */
  private pruneOldKeys(): void {
    const retainCount = this.config.retainOldKeys ?? 10;
    const versions = Array.from(this.keys.keys()).sort((a, b) => a - b);
    
    while (versions.length > retainCount) {
      const oldestVersion = versions.shift()!;
      this.keys.delete(oldestVersion);
    }
  }

  /**
   * Starts automatic key rotation timer.
   * @internal
   */
  private startAutoRotation(): void {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
    }

    this.autoRotateTimer = setInterval(() => {
      const newKey = getRandomBytes(32);
      this.rotateKey(newKey);
    }, this.config.autoRotateInterval!);

    // Don't prevent process exit
    if (this.autoRotateTimer.unref) {
      this.autoRotateTimer.unref();
    }
  }

  /**
   * Stops automatic key rotation.
   */
  stopAutoRotation(): void {
    if (this.autoRotateTimer) {
      clearInterval(this.autoRotateTimer);
      this.autoRotateTimer = undefined;
    }
  }

  /**
   * Gets the current (latest) key version number.
   * @returns The current key version number
   */
  getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Gets the current (latest) encryption key.
   * @returns The current 32-byte encryption key
   */
  getCurrentKey(): Uint8Array {
    return new Uint8Array(this.keys.get(this.currentVersion)!.key);
  }

  /**
   * Gets a specific key version.
   * @param version - The key version to retrieve
   * @returns The key for that version, or undefined if not found
   */
  getKey(version: number): Uint8Array | undefined {
    const keyVersion = this.keys.get(version);
    return keyVersion ? new Uint8Array(keyVersion.key) : undefined;
  }

  /**
   * Gets all available key versions.
   * @returns Array of available key version numbers
   */
  getAvailableVersions(): number[] {
    return Array.from(this.keys.keys()).sort((a, b) => a - b);
  }

  /**
   * Checks if a key version is expired.
   * @param version - The key version to check
   * @returns True if expired, false otherwise
   */
  isKeyExpired(version: number): boolean {
    const keyVersion = this.keys.get(version);
    if (!keyVersion || !keyVersion.expiresAt) {
      return false;
    }
    return new Date() > keyVersion.expiresAt;
  }

  /**
   * Rotates to a new encryption key.
   * 
   * After rotation:
   * - New encryptions will use the new key
   * - Old keys are retained for decrypting existing data
   * - Keys beyond the retention limit are removed
   * 
   * @param newKey - The new 32-byte encryption key
   * @returns The new key version number
   * @throws Error if newKey is not exactly 32 bytes
   */
  rotateKey(newKey: Uint8Array): number {
    if (newKey.length !== 32) {
      throw new AppError(ErrorCodes.ENCRYPTION_ERROR, `Invalid key length: expected 32 bytes, got ${newKey.length} bytes`);
    }
    return this.addKey(newKey);
  }

  /**
   * Encrypts data using the current key version.
   *
   * The encrypted bundle includes the key version, allowing future decryption
   * even after key rotation.
   *
   * @param data - The data to encrypt (must be JSON-serializable)
   * @returns Encrypted bundle with embedded key version
   */
  encrypt(data: JsonSerializable): Uint8Array {
    return encryptWithKeyVersion(data, this.getCurrentKey(), this.currentVersion);
  }

  /**
   * Decrypts data using the appropriate key version.
   *
   * Automatically determines the correct key from the bundle's embedded version.
   * Supports both versioned (0x01) and legacy (0x00) bundle formats.
   *
   * @param bundle - The encrypted bundle
   * @param legacyKey - Optional key to use for legacy (0x00) bundles
   * @returns Decrypted data, or null if decryption fails
   * @template T - The expected type of the decrypted data (defaults to unknown)
   */
  decrypt<T = unknown>(bundle: Uint8Array, legacyKey?: Uint8Array): T | null {
    if (bundle.length < 1) {
      return null;
    }

    const formatVersion = bundle[0];

    if (formatVersion === BUNDLE_VERSION_LEGACY) {
      // Legacy format - use provided legacy key or fall back to version 1
      const key = legacyKey ?? this.getKey(1);
      if (!key) {
        return null;
      }
      return decryptWithDataKey(bundle, key);
    }

    if (formatVersion === BUNDLE_VERSION_KEYED) {
      // Versioned format - extract key version from bundle
      if (bundle.length < 3) {
        return null;
      }
      const keyVersion = (bundle[1] << 8) | bundle[2];
      const key = this.getKey(keyVersion);
      if (!key) {
        return null; // Key version not found
      }
      return decryptVersionedBundle(bundle, key);
    }

    // Unknown format version
    return null;
  }

  /**
   * Gets metadata about a specific key version.
   * @param version - The key version to get info for
   * @returns Key version info or undefined if not found
   */
  getKeyInfo(version: number): Omit<KeyVersion, 'key'> | undefined {
    const keyVersion = this.keys.get(version);
    if (!keyVersion) {
      return undefined;
    }
    return {
      version: keyVersion.version,
      createdAt: keyVersion.createdAt,
      expiresAt: keyVersion.expiresAt
    };
  }

  /**
   * Serializes the key manager state for persistence.
   * WARNING: This exports sensitive key material. Handle with care.
   * @returns Serialized state containing all keys
   */
  exportState(): { keys: Array<{ version: number; key: string; createdAt: string; expiresAt?: string }>; currentVersion: number } {
    const keys: Array<{ version: number; key: string; createdAt: string; expiresAt?: string }> = [];
    for (const [version, keyVersion] of this.keys) {
      keys.push({
        version,
        key: encodeBase64(keyVersion.key),
        createdAt: keyVersion.createdAt.toISOString(),
        expiresAt: keyVersion.expiresAt?.toISOString()
      });
    }
    return { keys, currentVersion: this.currentVersion };
  }

  /**
   * Creates a KeyVersionManager from exported state.
   * @param state - Previously exported state
   * @param config - Optional rotation configuration
   * @returns Restored KeyVersionManager
   */
  static fromExportedState(
    state: { keys: Array<{ version: number; key: string; createdAt: string; expiresAt?: string }>; currentVersion: number },
    config: KeyRotationConfig = {}
  ): KeyVersionManager {
    if (state.keys.length === 0) {
      throw new AppError(ErrorCodes.ENCRYPTION_ERROR, 'Cannot restore KeyVersionManager: no keys in state');
    }

    // Sort keys by version to find the first one
    const sortedKeys = [...state.keys].sort((a, b) => a.version - b.version);
    const firstKey = decodeBase64(sortedKeys[0].key);
    
    // Create manager with the first key
    const manager = new KeyVersionManager(firstKey, config);
    
    // Clear the auto-created version 1 and restore from state
    manager.keys.clear();
    manager.currentVersion = 0;

    // Restore all keys
    for (const keyData of state.keys) {
      const keyVersion: KeyVersion = {
        version: keyData.version,
        key: decodeBase64(keyData.key),
        createdAt: new Date(keyData.createdAt),
        expiresAt: keyData.expiresAt ? new Date(keyData.expiresAt) : undefined
      };
      manager.keys.set(keyData.version, keyVersion);
      if (keyData.version > manager.currentVersion) {
        manager.currentVersion = keyData.version;
      }
    }

    return manager;
  }
}

/**
 * Encrypts data with a specific key version embedded in the bundle.
 *
 * @param data - The data to encrypt (must be JSON-serializable)
 * @param dataKey - The 32-byte encryption key
 * @param keyVersion - The key version number (1-65535)
 * @returns Encrypted bundle with embedded key version
 * @throws Error if dataKey is not 32 bytes or keyVersion is out of range
 */
export function encryptWithKeyVersion(data: JsonSerializable, dataKey: Uint8Array, keyVersion: number): Uint8Array {
  if (dataKey.length !== 32) {
    throw new AppError(ErrorCodes.ENCRYPTION_ERROR, `Invalid encryption key length: expected 32 bytes, got ${dataKey.length} bytes`);
  }
  if (keyVersion < 1 || keyVersion > 65535) {
    throw new AppError(ErrorCodes.INVALID_INPUT, `Invalid key version: must be between 1 and 65535, got ${keyVersion}`);
  }

  // Generate hybrid nonce (12 bytes for AES-GCM: 4 random + 8 counter)
  const nonce = generateHybridNonce(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, nonce);

  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = Buffer.concat([
    cipher.update(plaintext),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  // Bundle: version(1=0x01) + keyVersion(2) + nonce(12) + ciphertext + authTag(16)
  const bundle = new Uint8Array(1 + 2 + 12 + encrypted.length + 16);
  bundle[0] = BUNDLE_VERSION_KEYED;
  bundle[1] = (keyVersion >> 8) & 0xff; // High byte
  bundle[2] = keyVersion & 0xff;        // Low byte
  bundle.set(nonce, 3);
  bundle.set(new Uint8Array(encrypted), 15);
  bundle.set(new Uint8Array(authTag), 15 + encrypted.length);

  return bundle;
}

/**
 * Decrypts a versioned bundle (format version 0x01).
 *
 * @param bundle - The encrypted bundle
 * @param dataKey - The 32-byte encryption key for this version
 * @returns Decrypted data, or null if decryption fails
 * @template T - The expected type of the decrypted data (defaults to unknown)
 * @internal
 */
function decryptVersionedBundle<T = unknown>(bundle: Uint8Array, dataKey: Uint8Array): T | null {
  if (dataKey.length !== 32) {
    throw new AppError(ErrorCodes.ENCRYPTION_ERROR, `Invalid decryption key length: expected 32 bytes, got ${dataKey.length} bytes`);
  }

  // Bundle: version(1) + keyVersion(2) + nonce(12) + ciphertext + authTag(16)
  // Minimum length: 1 + 2 + 12 + 0 + 16 = 31 bytes
  if (bundle.length < 31) {
    return null;
  }

  if (bundle[0] !== BUNDLE_VERSION_KEYED) {
    return null;
  }

  const nonce = bundle.slice(3, 15);
  const authTag = bundle.slice(bundle.length - 16);
  const ciphertext = bundle.slice(15, bundle.length - 16);

  try {
    const decipher = createDecipheriv('aes-256-gcm', dataKey, nonce);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    // Decryption failed
    return null;
  }
}

/**
 * Extracts the key version from an encrypted bundle without decrypting.
 * 
 * @param bundle - The encrypted bundle
 * @returns Object with format version and key version (if applicable), or null if invalid
 */
export function getEncryptedBundleInfo(bundle: Uint8Array): { formatVersion: number; keyVersion?: number } | null {
  if (bundle.length < 1) {
    return null;
  }

  const formatVersion = bundle[0];

  if (formatVersion === BUNDLE_VERSION_LEGACY) {
    return { formatVersion };
  }

  if (formatVersion === BUNDLE_VERSION_KEYED) {
    if (bundle.length < 3) {
      return null;
    }
    const keyVersion = (bundle[1] << 8) | bundle[2];
    return { formatVersion, keyVersion };
  }

  return null;
}

/**
 * Generate authentication challenge response
 */
export function authChallenge(secret: Uint8Array): {
  challenge: Uint8Array
  publicKey: Uint8Array
  signature: Uint8Array
} {
  const keypair = tweetnacl.sign.keyPair.fromSeed(secret);
  const challenge = getRandomBytes(32);
  const signature = tweetnacl.sign.detached(challenge, keypair.secretKey);

  return {
    challenge,
    publicKey: keypair.publicKey,
    signature
  };
}