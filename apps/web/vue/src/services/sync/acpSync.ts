/**
 * ACP Session Update Sync
 *
 * Handles decryption and validation of ACP session updates
 * received via the WebSocket relay. The server treats these as
 * opaque encrypted blobs (zero-knowledge relay).
 *
 * @see HAP-1046 - Build Vue ACP foundation
 */

import { AcpSessionUpdateSchema } from '@magic-agent/protocol';
import { useSessionsStore } from '@/stores/sessions';
import { useAcpStore } from '@/stores/acp';
import { decodeBase64 } from '@/services/base64';
import { secureStorage } from '@/services/storage';
import { EncryptionManager } from '@/services/encryption/encryptionManager';
import { AES256Encryption, SecretBoxEncryption, type Decryptor } from '@/services/encryption/encryptors';

// Cache encryption managers and session decryptors
let encryptionManagerPromise: Promise<EncryptionManager | null> | null = null;
const sessionDecryptors = new Map<string, Promise<Decryptor | null>>();

async function getEncryptionManager(): Promise<EncryptionManager | null> {
  if (!encryptionManagerPromise) {
    encryptionManagerPromise = (async () => {
      const credentials = await secureStorage.getCredentials();
      if (!credentials?.secret) {
        return null;
      }
      const masterSecret = decodeBase64(credentials.secret);
      return EncryptionManager.create(masterSecret);
    })();
  }
  return encryptionManagerPromise;
}

async function getSessionDecryptor(sessionId: string): Promise<Decryptor | null> {
  const sessionsStore = useSessionsStore();
  const session = sessionsStore.getSession(sessionId);
  if (!session) {
    return null;
  }

  const cacheKey = `${session.id}:${session.dataEncryptionKey ?? 'legacy'}`;
  let existing = sessionDecryptors.get(cacheKey);
  if (!existing) {
    existing = (async () => {
      const credentials = await secureStorage.getCredentials();
      if (!credentials?.secret) {
        return null;
      }
      const masterSecret = decodeBase64(credentials.secret);

      if (session.dataEncryptionKey) {
        const encryptionManager = await getEncryptionManager();
        if (!encryptionManager) {
          return null;
        }
        const decryptedKey = await encryptionManager.decryptEncryptionKey(session.dataEncryptionKey);
        if (!decryptedKey) {
          return null;
        }
        return new AES256Encryption(decryptedKey);
      }

      return new SecretBoxEncryption(masterSecret);
    })();
    sessionDecryptors.set(cacheKey, existing);
  }

  return existing;
}

/**
 * Decrypt an encrypted ACP session update string.
 * Returns the parsed object or null on failure.
 */
export async function decryptAcpSessionUpdate(
  sessionId: string,
  encryptedUpdate: string,
): Promise<unknown | null> {
  const decryptor = await getSessionDecryptor(sessionId);
  if (!decryptor) {
    return null;
  }

  try {
    const encryptedData = decodeBase64(encryptedUpdate);
    const decrypted = await decryptor.decrypt([encryptedData]);
    return decrypted[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Process an encrypted ACP session update: decrypt, validate, and apply to store.
 */
export async function handleAcpSessionUpdate(
  sessionId: string,
  encryptedUpdate: string,
): Promise<void> {
  try {
    const decrypted = await decryptAcpSessionUpdate(sessionId, encryptedUpdate);
    if (!decrypted) {
      console.debug(`[acp] Failed to decrypt ACP update for session ${sessionId}`);
      return;
    }

    const parsed = AcpSessionUpdateSchema.safeParse(decrypted);
    if (!parsed.success) {
      console.debug(`[acp] Invalid ACP session update for ${sessionId}:`, parsed.error);
      return;
    }

    const acpStore = useAcpStore();
    acpStore.applyAcpUpdate(sessionId, parsed.data);
  } catch (error) {
    console.debug(`[acp] Error processing ACP update for ${sessionId}:`, error);
  }
}

/**
 * Clear cached session decryptors (e.g., on logout).
 */
export function clearAcpSyncCache(): void {
  sessionDecryptors.clear();
  encryptionManagerPromise = null;
}
