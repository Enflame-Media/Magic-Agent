import { describe, it, expect, beforeEach } from 'vitest';
import {
  encryptLegacy,
  decryptLegacy,
  encryptWithDataKey,
  decryptWithDataKey,
  libsodiumEncryptForPublicKey,
  getRandomBytes,
  _resetNonceCounter,
  _getNonceCounter,
} from './encryption';
import tweetnacl from 'tweetnacl';

describe('encryption', () => {
  beforeEach(() => {
    // Reset counter before each test for predictable behavior
    _resetNonceCounter();
  });

  describe('nonce counter', () => {
    it('should increment the nonce counter with each encryption (legacy)', () => {
      const secret = getRandomBytes(32);
      const data = { test: 'data' };

      expect(_getNonceCounter()).toBe(0n);

      encryptLegacy(data, secret);
      expect(_getNonceCounter()).toBe(1n);

      encryptLegacy(data, secret);
      expect(_getNonceCounter()).toBe(2n);

      encryptLegacy(data, secret);
      expect(_getNonceCounter()).toBe(3n);
    });

    it('should increment the nonce counter with each encryption (dataKey)', () => {
      const dataKey = getRandomBytes(32);
      const data = { test: 'data' };

      _resetNonceCounter();
      expect(_getNonceCounter()).toBe(0n);

      encryptWithDataKey(data, dataKey);
      expect(_getNonceCounter()).toBe(1n);

      encryptWithDataKey(data, dataKey);
      expect(_getNonceCounter()).toBe(2n);
    });

    it('should increment the nonce counter with each encryption (libsodium public key)', () => {
      const keyPair = tweetnacl.box.keyPair();
      const data = new Uint8Array([1, 2, 3, 4]);

      _resetNonceCounter();
      expect(_getNonceCounter()).toBe(0n);

      libsodiumEncryptForPublicKey(data, keyPair.publicKey);
      expect(_getNonceCounter()).toBe(1n);

      libsodiumEncryptForPublicKey(data, keyPair.publicKey);
      expect(_getNonceCounter()).toBe(2n);
    });
  });

  describe('nonce uniqueness under load', () => {
    it('should generate unique nonces for rapid sequential encryptions (legacy)', () => {
      const secret = getRandomBytes(32);
      const data = { test: 'data' };
      const nonceSet = new Set<string>();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const encrypted = encryptLegacy(data, secret);
        // Extract nonce (first 24 bytes)
        const nonce = encrypted.slice(0, tweetnacl.secretbox.nonceLength);
        const nonceHex = Buffer.from(nonce).toString('hex');
        nonceSet.add(nonceHex);
      }

      // All nonces should be unique
      expect(nonceSet.size).toBe(iterations);
    });

    it('should generate unique nonces for rapid sequential encryptions (dataKey)', () => {
      const dataKey = getRandomBytes(32);
      const data = { test: 'data' };
      const nonceSet = new Set<string>();
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        const encrypted = encryptWithDataKey(data, dataKey);
        // Extract nonce (bytes 1-13, version byte is at 0)
        const nonce = encrypted.slice(1, 13);
        const nonceHex = Buffer.from(nonce).toString('hex');
        nonceSet.add(nonceHex);
      }

      // All nonces should be unique
      expect(nonceSet.size).toBe(iterations);
    });

    it('should have counter component embedded in nonce', () => {
      const secret = getRandomBytes(32);
      const data = { test: 'data' };

      _resetNonceCounter();

      // Encrypt multiple times and check the counter portion of the nonces
      const nonces: Uint8Array[] = [];
      for (let i = 0; i < 100; i++) {
        const encrypted = encryptLegacy(data, secret);
        nonces.push(encrypted.slice(0, tweetnacl.secretbox.nonceLength));
      }

      // Extract counter portion (last 8 bytes of each 24-byte nonce)
      const counters: bigint[] = nonces.map((nonce) => {
        const counterBytes = nonce.slice(16, 24);
        const view = new DataView(counterBytes.buffer, counterBytes.byteOffset, 8);
        return view.getBigUint64(0, false);
      });

      // Counters should be sequential 0, 1, 2, ...
      for (let i = 0; i < counters.length; i++) {
        expect(counters[i]).toBe(BigInt(i));
      }
    });
  });

  describe('backward compatibility', () => {
    it('should encrypt and decrypt successfully with legacy format', () => {
      const secret = getRandomBytes(32);
      const data = { message: 'Hello, World!', number: 42, nested: { foo: 'bar' } };

      const encrypted = encryptLegacy(data, secret);
      const decrypted = decryptLegacy(encrypted, secret);

      expect(decrypted).toEqual(data);
    });

    it('should encrypt and decrypt successfully with dataKey format', () => {
      const dataKey = getRandomBytes(32);
      const data = { message: 'Hello, World!', number: 42, nested: { foo: 'bar' } };

      const encrypted = encryptWithDataKey(data, dataKey);
      const decrypted = decryptWithDataKey(encrypted, dataKey);

      expect(decrypted).toEqual(data);
    });

    it('should handle multiple encrypt/decrypt cycles', () => {
      const secret = getRandomBytes(32);
      const originalData = { test: 'multiple cycles' };

      for (let i = 0; i < 100; i++) {
        const encrypted = encryptLegacy(originalData, secret);
        const decrypted = decryptLegacy(encrypted, secret);
        expect(decrypted).toEqual(originalData);
      }
    });

    it('should return null for tampered data', () => {
      const secret = getRandomBytes(32);
      const data = { message: 'secret' };

      const encrypted = encryptLegacy(data, secret);
      // Tamper with the encrypted data
      encrypted[encrypted.length - 1] ^= 0xff;

      const decrypted = decryptLegacy(encrypted, secret);
      expect(decrypted).toBeNull();
    });

    it('should return null for wrong key', () => {
      const secret1 = getRandomBytes(32);
      const secret2 = getRandomBytes(32);
      const data = { message: 'secret' };

      const encrypted = encryptLegacy(data, secret1);
      const decrypted = decryptLegacy(encrypted, secret2);

      expect(decrypted).toBeNull();
    });
  });

  describe('hybrid nonce structure', () => {
    it('should have correct nonce length for legacy encryption (24 bytes)', () => {
      const secret = getRandomBytes(32);
      const data = { test: 'data' };

      const encrypted = encryptLegacy(data, secret);
      // Total length = nonce (24) + ciphertext (variable)
      expect(encrypted.length).toBeGreaterThan(24);
    });

    it('should have correct structure for dataKey encryption', () => {
      const dataKey = getRandomBytes(32);
      const data = { test: 'data' };

      const encrypted = encryptWithDataKey(data, dataKey);
      // Structure: version(1) + nonce(12) + ciphertext + authTag(16)
      expect(encrypted[0]).toBe(0); // Version byte
      expect(encrypted.length).toBeGreaterThan(1 + 12 + 16); // Minimum size
    });

    it('should have random prefix for cross-process uniqueness', () => {
      const secret = getRandomBytes(32);
      const data = { test: 'data' };

      // Generate two nonces (need to reset counter in between to isolate random portion test)
      _resetNonceCounter();
      const encrypted1 = encryptLegacy(data, secret);
      const nonce1 = encrypted1.slice(0, tweetnacl.secretbox.nonceLength);

      _resetNonceCounter();
      const encrypted2 = encryptLegacy(data, secret);
      const nonce2 = encrypted2.slice(0, tweetnacl.secretbox.nonceLength);

      // The random prefix (first 16 bytes) should be different
      const randomPrefix1 = Buffer.from(nonce1.slice(0, 16)).toString('hex');
      const randomPrefix2 = Buffer.from(nonce2.slice(0, 16)).toString('hex');
      expect(randomPrefix1).not.toBe(randomPrefix2);

      // But the counter portion (last 8 bytes) should be the same (both 0)
      const counterPart1 = Buffer.from(nonce1.slice(16, 24)).toString('hex');
      const counterPart2 = Buffer.from(nonce2.slice(16, 24)).toString('hex');
      expect(counterPart1).toBe(counterPart2);
    });
  });
});
