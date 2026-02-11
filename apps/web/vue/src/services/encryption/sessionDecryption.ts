import { decodeBase64, encodeBase64 } from '@/services/base64';
import { secureStorage } from '@/services/storage';
import { encryptionCache } from '@/services/encryption/EncryptionCache';
import { EncryptionManager } from '@/services/encryption/encryptionManager';
import { AES256Encryption, SecretBoxEncryption, type Decryptor, type Encryptor } from '@/services/encryption/encryptors';
import type { Message } from '@/stores/messages';
import type { Session } from '@/stores/sessions';

let encryptionManagerPromise: Promise<EncryptionManager | null> | null = null;
let masterSecretPromise: Promise<Uint8Array | null> | null = null;

const sessionCryptos = new Map<string, Promise<(Encryptor & Decryptor) | null>>();

async function getMasterSecret(): Promise<Uint8Array | null> {
  if (!masterSecretPromise) {
    masterSecretPromise = (async () => {
      const credentials = await secureStorage.getCredentials();
      if (!credentials?.secret) {
        return null;
      }
      return decodeBase64(credentials.secret);
    })();
  }
  return masterSecretPromise;
}

async function getEncryptionManager(): Promise<EncryptionManager | null> {
  if (!encryptionManagerPromise) {
    encryptionManagerPromise = (async () => {
      const masterSecret = await getMasterSecret();
      if (!masterSecret) {
        return null;
      }
      return EncryptionManager.create(masterSecret);
    })();
  }
  return encryptionManagerPromise;
}

async function getSessionCrypto(session: Session): Promise<(Encryptor & Decryptor) | null> {
  const key = `${session.id}:${session.dataEncryptionKey ?? 'legacy'}`;
  let existing = sessionCryptos.get(key);
  if (!existing) {
    existing = (async () => {
      const masterSecret = await getMasterSecret();
      if (!masterSecret) {
        return null;
      }

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
    sessionCryptos.set(key, existing);
  }

  return existing;
}

export async function decryptSessionMetadata<T>(
  session: Session
): Promise<T | null> {
  if (!session.metadata) {
    return null;
  }

  const cached = encryptionCache.getCachedSessionData(session.id, session.metadataVersion);
  if (cached) {
    return cached as T;
  }

  const decryptor = await getSessionCrypto(session);
  if (!decryptor) {
    return null;
  }

  try {
    const encryptedData = decodeBase64(session.metadata);
    const decrypted = await decryptor.decrypt([encryptedData]);
    const payload = decrypted[0];
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    encryptionCache.setCachedSessionData(session.id, session.metadataVersion, payload);
    return payload as T;
  } catch {
    return null;
  }
}

export async function decryptMessageContent(
  message: Message,
  session: Session
): Promise<string | null> {
  const cached = encryptionCache.getCachedMessage(message.id);
  if (cached !== null) {
    return cached;
  }

  if (message.content.t !== 'encrypted') {
    return null;
  }

  const decryptor = await getSessionCrypto(session);
  if (!decryptor) {
    return null;
  }

  try {
    const encryptedData = decodeBase64(message.content.c);
    const decrypted = await decryptor.decrypt([encryptedData]);
    const payload = decrypted[0];
    if (payload === null || payload === undefined) {
      return null;
    }

    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    encryptionCache.setCachedMessage(message.id, content);
    return content;
  } catch {
    return null;
  }
}

export async function encryptSessionMessage(
  session: Session,
  payload: unknown
): Promise<string | null> {
  try {
    const crypto = await getSessionCrypto(session);
    if (!crypto) {
      return null;
    }
    const encrypted = await crypto.encrypt([payload]);
    const output = encrypted[0];
    if (!output) {
      return null;
    }
    return encodeBase64(output);
  } catch {
    return null;
  }
}

/**
 * Pending permission request from agent state
 */
export interface AgentStateRequest {
  tool: string;
  arguments: unknown;
  createdAt?: number;
}

/**
 * Agent state structure (decrypted)
 */
export interface AgentState {
  controlledByUser?: boolean;
  requests?: Record<string, AgentStateRequest>;
  completedRequests?: Record<string, AgentStateRequest & {
    permissions?: {
      date?: number;
      result?: 'approved' | 'denied' | 'canceled';
      mode?: string;
      reason?: string;
      allowedTools?: string[];
      decision?: 'approved' | 'approved_for_session' | 'denied' | 'abort';
    };
  }>;
}

/**
 * Decrypt and parse session agent state
 */
export async function decryptAgentState(
  session: Session
): Promise<AgentState | null> {
  if (!session.agentState) {
    return null;
  }

  const decryptor = await getSessionCrypto(session);
  if (!decryptor) {
    return null;
  }

  try {
    const encryptedData = decodeBase64(session.agentState);
    const decrypted = await decryptor.decrypt([encryptedData]);
    const payload = decrypted[0];
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    return payload as AgentState;
  } catch {
    return null;
  }
}
