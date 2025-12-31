/**
 * Encryption service for Happy web authentication
 *
 * Uses TweetNaCl for box encryption (X25519-XSalsa20-Poly1305)
 * and Web Crypto API for secure storage encryption (AES-256-GCM).
 *
 * The authentication flow uses NaCl box encryption:
 * 1. CLI generates ephemeral keypair
 * 2. Web app generates its own keypair
 * 3. Server encrypts response with web app's public key
 * 4. Web app decrypts to get shared secret
 */

import nacl from 'tweetnacl';

/**
 * Key pair for box encryption
 */
export interface BoxKeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Generate a random box keypair for authentication
 */
export function generateBoxKeyPair(): BoxKeyPair {
  const keypair = nacl.box.keyPair();
  return {
    publicKey: keypair.publicKey,
    secretKey: keypair.secretKey,
  };
}

/**
 * Decrypt data encrypted with box encryption
 *
 * Expected format: ephemeral public key (32 bytes) + nonce (24 bytes) + ciphertext
 *
 * @param encryptedBundle - The encrypted data bundle
 * @param recipientSecretKey - The recipient's secret key
 * @returns Decrypted data or null if decryption fails
 */
export function decryptBox(
  encryptedBundle: Uint8Array,
  recipientSecretKey: Uint8Array
): Uint8Array | null {
  const PUBLICKEY_BYTES = nacl.box.publicKeyLength; // 32
  const NONCE_BYTES = nacl.box.nonceLength; // 24

  if (encryptedBundle.length < PUBLICKEY_BYTES + NONCE_BYTES + 1) {
    console.error('[Encryption] Bundle too short to contain valid encrypted data');
    return null;
  }

  // Extract components from bundle
  const ephemeralPublicKey = encryptedBundle.slice(0, PUBLICKEY_BYTES);
  const nonce = encryptedBundle.slice(PUBLICKEY_BYTES, PUBLICKEY_BYTES + NONCE_BYTES);
  const ciphertext = encryptedBundle.slice(PUBLICKEY_BYTES + NONCE_BYTES);

  try {
    const decrypted = nacl.box.open(ciphertext, nonce, ephemeralPublicKey, recipientSecretKey);
    return decrypted ?? null;
  } catch (error) {
    console.error('[Encryption] Decryption failed:', error);
    return null;
  }
}

/**
 * Generate a signing keypair from a seed
 * Used for challenge-response authentication
 */
export function generateSigningKeyPair(seed: Uint8Array): {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
} {
  return nacl.sign.keyPair.fromSeed(seed);
}

/**
 * Create a detached signature
 */
export function signDetached(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, secretKey);
}

/**
 * Generate random bytes for challenges
 */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}
