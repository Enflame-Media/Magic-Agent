/**
 * Unit tests for the encryption service
 *
 * Tests TweetNaCl box encryption functionality for:
 * - Key pair generation
 * - Box encryption and decryption
 * - String encryption helpers
 * - Error handling for invalid inputs
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect } from 'vitest';
import {
  generateBoxKeyPair,
  encryptBox,
  decryptBox,
  encryptBoxString,
  decryptBoxString,
  signDetached,
  generateSigningKeyPair,
  randomBytes,
} from '@/services/encryption';
import nacl from 'tweetnacl';

describe('Encryption Service', () => {
  describe('generateBoxKeyPair', () => {
    it('should generate a valid keypair', () => {
      const keypair = generateBoxKeyPair();

      expect(keypair).toBeDefined();
      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keypair.publicKey.length).toBe(nacl.box.publicKeyLength);
      expect(keypair.secretKey.length).toBe(nacl.box.secretKeyLength);
    });

    it('should generate unique keypairs each time', () => {
      const keypair1 = generateBoxKeyPair();
      const keypair2 = generateBoxKeyPair();

      // Public keys should be different
      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
      expect(keypair1.secretKey).not.toEqual(keypair2.secretKey);
    });
  });

  describe('encryptBox and decryptBox', () => {
    it('should encrypt and decrypt data correctly', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const message = new TextEncoder().encode('Hello, World!');

      // Encrypt with recipient's public key
      const encrypted = encryptBox(message, recipientKeyPair.publicKey);

      expect(encrypted).toBeInstanceOf(Uint8Array);
      // Should be longer than input (includes ephemeral key + nonce + ciphertext)
      expect(encrypted.length).toBeGreaterThan(message.length);

      // Decrypt with recipient's secret key
      const decrypted = decryptBox(encrypted, recipientKeyPair.secretKey);

      expect(decrypted).toBeInstanceOf(Uint8Array);
      expect(decrypted).toEqual(message);
    });

    it('should fail to decrypt with wrong key', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const wrongKeyPair = generateBoxKeyPair();
      const message = new TextEncoder().encode('Secret message');

      const encrypted = encryptBox(message, recipientKeyPair.publicKey);
      const decrypted = decryptBox(encrypted, wrongKeyPair.secretKey);

      expect(decrypted).toBeNull();
    });

    it('should return null for corrupted ciphertext', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const message = new TextEncoder().encode('Test message');

      const encrypted = encryptBox(message, recipientKeyPair.publicKey);

      // Corrupt the ciphertext (index is guaranteed to exist since encrypted has data)
      encrypted[encrypted.length - 1]! ^= 0xff;

      const decrypted = decryptBox(encrypted, recipientKeyPair.secretKey);
      expect(decrypted).toBeNull();
    });

    it('should return null for bundle that is too short', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const shortBundle = new Uint8Array(10); // Too short to contain valid data

      const decrypted = decryptBox(shortBundle, recipientKeyPair.secretKey);
      expect(decrypted).toBeNull();
    });

    it('should handle empty data', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const emptyMessage = new Uint8Array(0);

      const encrypted = encryptBox(emptyMessage, recipientKeyPair.publicKey);
      const decrypted = decryptBox(encrypted, recipientKeyPair.secretKey);

      expect(decrypted).toBeInstanceOf(Uint8Array);
      expect(decrypted?.length).toBe(0);
    });

    it('should handle large data', { timeout: 30000 }, () => {
      const recipientKeyPair = generateBoxKeyPair();
      // 100 KB of random data (reduced for test performance)
      const largeData = new Uint8Array(100 * 1024);
      for (let i = 0; i < largeData.length; i++) {
        largeData[i] = Math.floor(Math.random() * 256);
      }

      const encrypted = encryptBox(largeData, recipientKeyPair.publicKey);
      const decrypted = decryptBox(encrypted, recipientKeyPair.secretKey);

      expect(decrypted).toEqual(largeData);
    });
  });

  describe('encryptBoxString and decryptBoxString', () => {
    it('should encrypt and decrypt strings correctly', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const message = 'Hello, World! 👋';

      const encrypted = encryptBoxString(message, recipientKeyPair.publicKey);
      expect(encrypted).toBeInstanceOf(Uint8Array);

      const decrypted = decryptBoxString(encrypted, recipientKeyPair.secretKey);
      expect(decrypted).toBe(message);
    });

    it('should handle empty string', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const message = '';

      const encrypted = encryptBoxString(message, recipientKeyPair.publicKey);
      const decrypted = decryptBoxString(encrypted, recipientKeyPair.secretKey);

      expect(decrypted).toBe(message);
    });

    it('should handle Unicode characters', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const message = '日本語テスト 🎉 Emoji test! Привет мир';

      const encrypted = encryptBoxString(message, recipientKeyPair.publicKey);
      const decrypted = decryptBoxString(encrypted, recipientKeyPair.secretKey);

      expect(decrypted).toBe(message);
    });

    it('should return null for decryption failure', () => {
      const recipientKeyPair = generateBoxKeyPair();
      const wrongKeyPair = generateBoxKeyPair();
      const message = 'Secret';

      const encrypted = encryptBoxString(message, recipientKeyPair.publicKey);
      const decrypted = decryptBoxString(encrypted, wrongKeyPair.secretKey);

      expect(decrypted).toBeNull();
    });
  });

  describe('generateSigningKeyPair', () => {
    it('should generate signing keypair from seed', () => {
      const seed = randomBytes(32);
      const keypair = generateSigningKeyPair(seed);

      expect(keypair.publicKey).toBeInstanceOf(Uint8Array);
      expect(keypair.secretKey).toBeInstanceOf(Uint8Array);
      expect(keypair.publicKey.length).toBe(nacl.sign.publicKeyLength);
      expect(keypair.secretKey.length).toBe(nacl.sign.secretKeyLength);
    });

    it('should generate deterministic keypairs from same seed', () => {
      const seed = randomBytes(32);
      const keypair1 = generateSigningKeyPair(seed);
      const keypair2 = generateSigningKeyPair(seed);

      expect(keypair1.publicKey).toEqual(keypair2.publicKey);
      expect(keypair1.secretKey).toEqual(keypair2.secretKey);
    });

    it('should generate different keypairs from different seeds', () => {
      const seed1 = randomBytes(32);
      const seed2 = randomBytes(32);
      const keypair1 = generateSigningKeyPair(seed1);
      const keypair2 = generateSigningKeyPair(seed2);

      expect(keypair1.publicKey).not.toEqual(keypair2.publicKey);
    });
  });

  describe('signDetached', () => {
    it('should create a valid detached signature', () => {
      const seed = randomBytes(32);
      const keypair = generateSigningKeyPair(seed);
      const message = new TextEncoder().encode('Test message');

      const signature = signDetached(message, keypair.secretKey);

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(nacl.sign.signatureLength);

      // Verify the signature
      const isValid = nacl.sign.detached.verify(message, signature, keypair.publicKey);
      expect(isValid).toBe(true);
    });

    it('should fail verification with wrong key', () => {
      const keypair1 = generateSigningKeyPair(randomBytes(32));
      const keypair2 = generateSigningKeyPair(randomBytes(32));
      const message = new TextEncoder().encode('Test message');

      const signature = signDetached(message, keypair1.secretKey);

      // Verify with wrong public key
      const isValid = nacl.sign.detached.verify(message, signature, keypair2.publicKey);
      expect(isValid).toBe(false);
    });

    it('should fail verification for tampered message', () => {
      const keypair = generateSigningKeyPair(randomBytes(32));
      const message = new TextEncoder().encode('Original message');

      const signature = signDetached(message, keypair.secretKey);

      // Tamper with the message
      const tamperedMessage = new TextEncoder().encode('Tampered message');

      const isValid = nacl.sign.detached.verify(tamperedMessage, signature, keypair.publicKey);
      expect(isValid).toBe(false);
    });
  });

  describe('randomBytes', () => {
    it('should generate random bytes of specified length', () => {
      const length = 32;
      const bytes = randomBytes(length);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBe(length);
    });

    it('should generate different bytes each time', () => {
      const bytes1 = randomBytes(32);
      const bytes2 = randomBytes(32);

      // Very unlikely to be equal (2^256 chance)
      expect(bytes1).not.toEqual(bytes2);
    });

    it('should handle zero length', () => {
      const bytes = randomBytes(0);
      expect(bytes.length).toBe(0);
    });

    it('should handle large lengths', () => {
      const bytes = randomBytes(1024);
      expect(bytes.length).toBe(1024);
    });
  });
});
