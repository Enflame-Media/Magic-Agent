/**
 * Secure key storage using IndexedDB
 *
 * IndexedDB provides more secure storage than localStorage:
 * - Not accessible via document.cookie or localStorage APIs
 * - Better isolation from XSS attacks
 * - Supports larger data storage
 * - Asynchronous API prevents blocking
 *
 * Keys are stored as base64-encoded strings for compatibility
 * with the rest of the encryption system.
 */

import { encodeBase64, decodeBase64 } from '../base64';

const DB_NAME = 'happy-encryption';
const DB_VERSION = 1;
const KEYS_STORE = 'keys';

/**
 * Stored keypair format
 */
export interface StoredKeyPair {
  publicKey: string; // base64 encoded
  secretKey: string; // base64 encoded
  createdAt: number;
}

/**
 * Keypair with Uint8Array keys for crypto operations
 */
export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open database: ${String(request.error?.message)}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;

      // Create keys object store if it doesn't exist
      if (!db.objectStoreNames.contains(KEYS_STORE)) {
        db.createObjectStore(KEYS_STORE);
      }
    };
  });
}

/**
 * Secure key storage API using IndexedDB
 */
export const keyStorage = {
  /**
   * Store a keypair in IndexedDB
   *
   * @param keyId - Unique identifier for the keypair (e.g., 'main', 'session-xyz')
   * @param keypair - The keypair to store
   */
  async storeKeyPair(keyId: string, keypair: KeyPair): Promise<void> {
    const db = await openDatabase();

    const stored: StoredKeyPair = {
      publicKey: encodeBase64(keypair.publicKey),
      secretKey: encodeBase64(keypair.secretKey),
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readwrite');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.put(stored, keyId);

      request.onerror = () => {
        reject(new Error(`Failed to store keypair: ${String(request.error?.message)}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  /**
   * Retrieve a keypair from IndexedDB
   *
   * @param keyId - The keypair identifier
   * @returns The keypair or null if not found
   */
  async getKeyPair(keyId: string): Promise<KeyPair | null> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readonly');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.get(keyId);

      request.onerror = () => {
        reject(new Error(`Failed to get keypair: ${String(request.error?.message)}`));
      };

      request.onsuccess = () => {
        const stored = request.result as StoredKeyPair | undefined;

        if (!stored) {
          resolve(null);
          return;
        }

        resolve({
          publicKey: decodeBase64(stored.publicKey),
          secretKey: decodeBase64(stored.secretKey),
        });
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  /**
   * Delete a keypair from IndexedDB
   *
   * @param keyId - The keypair identifier
   */
  async deleteKeyPair(keyId: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readwrite');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.delete(keyId);

      request.onerror = () => {
        reject(new Error(`Failed to delete keypair: ${String(request.error?.message)}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  /**
   * List all stored keypair IDs
   *
   * @returns Array of keypair identifiers
   */
  async listKeyIds(): Promise<string[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readonly');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.getAllKeys();

      request.onerror = () => {
        reject(new Error(`Failed to list keys: ${String(request.error?.message)}`));
      };

      request.onsuccess = () => {
        resolve(request.result as string[]);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  /**
   * Clear all stored keypairs
   *
   * WARNING: This will delete all encryption keys!
   */
  async clearAll(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(KEYS_STORE, 'readwrite');
      const store = transaction.objectStore(KEYS_STORE);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear keys: ${String(request.error?.message)}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  },

  /**
   * Check if IndexedDB is available
   */
  isAvailable(): boolean {
    return typeof indexedDB !== 'undefined';
  },
};
