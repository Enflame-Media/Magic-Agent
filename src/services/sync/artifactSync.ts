/**
 * Artifact Sync Utilities
 *
 * Provides encryption management and key storage for artifact processing.
 * Used by the sync handlers to decrypt artifact headers and bodies.
 *
 * @see HAP-708 - Integrate Artifacts Store with Sync Service
 */

import { EncryptionManager, ArtifactEncryption } from '@/services/encryption/index';
import { secureStorage } from '@/services/storage';
import { decodeBase64 } from '@/services/base64';

// ─────────────────────────────────────────────────────────────────────────────
// Encryption Manager Singleton
// ─────────────────────────────────────────────────────────────────────────────

let encryptionManagerPromise: Promise<EncryptionManager | null> | null = null;

/**
 * Get or create the encryption manager singleton.
 *
 * The encryption manager is lazily initialized on first access
 * and reused for all subsequent calls.
 */
export async function getEncryptionManager(): Promise<EncryptionManager | null> {
  if (!encryptionManagerPromise) {
    encryptionManagerPromise = (async () => {
      const credentials = await secureStorage.getCredentials();
      if (!credentials?.secret) {
        return null;
      }
      const secretBytes = decodeBase64(credentials.secret);
      return EncryptionManager.create(secretBytes);
    })();
  }
  return encryptionManagerPromise;
}

/**
 * Reset the encryption manager (for logout/cleanup).
 */
export function resetEncryptionManager(): void {
  encryptionManagerPromise = null;
  artifactDataKeys.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Data Keys Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory storage for decrypted artifact data encryption keys.
 *
 * Keys are stored after being decrypted from incoming artifact updates
 * and are needed for subsequent update-artifact events.
 */
const artifactDataKeys = new Map<string, Uint8Array>();

/**
 * Store a decrypted artifact data encryption key.
 *
 * @param artifactId - The artifact ID
 * @param key - The decrypted data encryption key
 */
export function storeArtifactKey(artifactId: string, key: Uint8Array): void {
  artifactDataKeys.set(artifactId, key);
}

/**
 * Get a stored artifact data encryption key.
 *
 * @param artifactId - The artifact ID
 * @returns The decrypted key or undefined if not found
 */
export function getArtifactKey(artifactId: string): Uint8Array | undefined {
  return artifactDataKeys.get(artifactId);
}

/**
 * Remove a stored artifact data encryption key.
 *
 * @param artifactId - The artifact ID
 */
export function removeArtifactKey(artifactId: string): void {
  artifactDataKeys.delete(artifactId);
}

/**
 * Clear all stored artifact data encryption keys.
 */
export function clearArtifactKeys(): void {
  artifactDataKeys.clear();
}

// ─────────────────────────────────────────────────────────────────────────────
// Artifact Encryption Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get or create an artifact encryption instance for a given artifact.
 *
 * For new artifacts, the data encryption key is decrypted from the update
 * and stored for future use. For updates, the stored key is retrieved.
 *
 * @param artifactId - The artifact ID
 * @param dataEncryptionKey - Optional encrypted data key (for new artifacts)
 * @returns ArtifactEncryption instance or null on failure
 */
export async function getArtifactEncryption(
  artifactId: string,
  dataEncryptionKey?: string
): Promise<ArtifactEncryption | null> {
  // Check if we already have the decrypted key
  let decryptedKey = artifactDataKeys.get(artifactId);

  // If not, try to decrypt from the provided key
  if (!decryptedKey && dataEncryptionKey) {
    const encryptionManager = await getEncryptionManager();
    if (!encryptionManager) {
      console.error('[artifact] Encryption manager not available');
      return null;
    }

    decryptedKey = await encryptionManager.decryptEncryptionKey(dataEncryptionKey) ?? undefined;
    if (!decryptedKey) {
      console.error(`[artifact] Failed to decrypt key for artifact ${artifactId}`);
      return null;
    }

    // Store for future use
    artifactDataKeys.set(artifactId, decryptedKey);
  }

  if (!decryptedKey) {
    console.error(`[artifact] No encryption key available for artifact ${artifactId}`);
    return null;
  }

  return new ArtifactEncryption(decryptedKey);
}
