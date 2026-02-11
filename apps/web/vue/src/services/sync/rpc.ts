import { wsService } from './WebSocketService';
import { secureStorage } from '@/services/storage';
import { decodeBase64, encodeBase64 } from '@/services/base64';
import { EncryptionManager } from '@/services/encryption/encryptionManager';
import { useMachinesStore } from '@/stores/machines';
import { useSessionsStore, type Session } from '@/stores/sessions';
import { AES256Encryption, SecretBoxEncryption, type Encryptor, type Decryptor } from '@/services/encryption/encryptors';

type RpcAck = {
  ok?: boolean;
  result?: string;
  cancelled?: boolean;
  requestId?: string;
};

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
 * Get or create session crypto for RPC encryption
 */
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

export async function machineRPC<R, A>(
  machineId: string,
  method: string,
  params: A,
  options?: { timeout?: number }
): Promise<R> {
  const encryptionManager = await getEncryptionManager();
  if (!encryptionManager) {
    throw new Error('Encryption not initialized');
  }

  const machinesStore = useMachinesStore();
  const machine = machinesStore.getMachine(machineId);
  if (!machine) {
    throw new Error(`Machine not found: ${machineId}`);
  }

  const machineEncryption = await encryptionManager.ensureMachineEncryption(
    machineId,
    machine.dataEncryptionKey
  );

  const encryptedParams = await machineEncryption.encryptRaw(params);

  const result = await wsService.emitWithAck<RpcAck>(
    'rpc-call',
    {
      method: `${machineId}:${method}`,
      params: encryptedParams,
    },
    options?.timeout
  );

  if (result.ok && result.result) {
    const decrypted = await machineEncryption.decryptRaw(result.result);
    if (decrypted === null) {
      throw new Error('Failed to decrypt RPC response');
    }
    return decrypted as R;
  }

  if (result.cancelled) {
    throw new Error('RPC call was cancelled');
  }

  throw new Error('RPC call failed');
}

/**
 * Session-specific RPC call using session encryption
 *
 * Used for session operations like permission handling, abort, etc.
 */
export async function sessionRPC<R, A>(
  sessionId: string,
  method: string,
  params: A,
  options?: { timeout?: number }
): Promise<R> {
  const sessionsStore = useSessionsStore();
  const session = sessionsStore.getSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const crypto = await getSessionCrypto(session);
  if (!crypto) {
    throw new Error('Session encryption not initialized');
  }

  // Encrypt params using session crypto
  const encrypted = await crypto.encrypt([params]);
  const encryptedParams = encrypted[0];
  if (!encryptedParams) {
    throw new Error('Failed to encrypt RPC params');
  }

  const result = await wsService.emitWithAck<RpcAck>(
    'rpc-call',
    {
      method: `${sessionId}:${method}`,
      params: encodeBase64(encryptedParams),
    },
    options?.timeout
  );

  if (result.ok && result.result) {
    const encryptedResult = decodeBase64(result.result);
    const decrypted = await crypto.decrypt([encryptedResult]);
    const payload = decrypted[0];
    if (payload === null || payload === undefined) {
      throw new Error('Failed to decrypt RPC response');
    }
    return payload as R;
  }

  if (result.cancelled) {
    throw new Error('RPC call was cancelled');
  }

  throw new Error('RPC call failed');
}
