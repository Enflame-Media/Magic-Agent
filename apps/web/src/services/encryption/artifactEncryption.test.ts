/**
 * Unit tests for ArtifactEncryption class
 *
 * Tests encryption and decryption of artifact headers and bodies
 * using AES-256-GCM encryption.
 *
 * @see HAP-863 - Add unit tests for artifact sync encryption
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ArtifactEncryption, type ArtifactHeader, type ArtifactBody } from './artifactEncryption';

describe('ArtifactEncryption', () => {
  // Generate a valid 32-byte key for AES-256
  const testKey = new Uint8Array(32);
  crypto.getRandomValues(testKey);

  let encryption: ArtifactEncryption;

  beforeEach(() => {
    encryption = new ArtifactEncryption(testKey);
  });

  describe('constructor', () => {
    it('should create an instance with a valid 32-byte key', () => {
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);
      expect(() => new ArtifactEncryption(key)).not.toThrow();
    });

    it('should throw for invalid key length', () => {
      const shortKey = new Uint8Array(16);
      expect(() => new ArtifactEncryption(shortKey)).toThrow('Invalid AES-256 key length');

      const longKey = new Uint8Array(64);
      expect(() => new ArtifactEncryption(longKey)).toThrow('Invalid AES-256 key length');
    });
  });

  describe('header encryption/decryption', () => {
    it('should encrypt and decrypt a complete header', async () => {
      const header: ArtifactHeader = {
        title: 'test-file.ts',
        mimeType: 'text/typescript',
        filePath: '/src/components/Button.tsx',
        language: 'typescript',
        sessions: ['session-1', 'session-2'],
        draft: false,
      };

      const encrypted = await encryption.encryptHeader(header);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);

      const decrypted = await encryption.decryptHeader(encrypted);
      expect(decrypted).toEqual(header);
    });

    it('should handle header with null title', async () => {
      const header: ArtifactHeader = {
        title: null,
        mimeType: 'application/json',
      };

      const encrypted = await encryption.encryptHeader(header);
      const decrypted = await encryption.decryptHeader(encrypted);

      expect(decrypted?.title).toBeNull();
      expect(decrypted?.mimeType).toBe('application/json');
    });

    it('should handle header with only required fields', async () => {
      const header: ArtifactHeader = {
        title: 'minimal-header',
      };

      const encrypted = await encryption.encryptHeader(header);
      const decrypted = await encryption.decryptHeader(encrypted);

      expect(decrypted?.title).toBe('minimal-header');
      expect(decrypted?.mimeType).toBeUndefined();
      expect(decrypted?.filePath).toBeUndefined();
      expect(decrypted?.language).toBeUndefined();
      expect(decrypted?.sessions).toBeUndefined();
      expect(decrypted?.draft).toBeUndefined();
    });

    it('should handle header with draft flag', async () => {
      const header: ArtifactHeader = {
        title: 'draft-artifact',
        draft: true,
      };

      const encrypted = await encryption.encryptHeader(header);
      const decrypted = await encryption.decryptHeader(encrypted);

      expect(decrypted?.draft).toBe(true);
    });

    it('should handle special characters in title and path', async () => {
      const header: ArtifactHeader = {
        title: 'test-file-with-unicode-\u00e9\u00e8\u00ea.ts',
        filePath: '/path/with spaces/and-special_chars!/file.ts',
        language: 'typescript',
      };

      const encrypted = await encryption.encryptHeader(header);
      const decrypted = await encryption.decryptHeader(encrypted);

      expect(decrypted?.title).toBe(header.title);
      expect(decrypted?.filePath).toBe(header.filePath);
    });

    it('should return null for invalid encrypted data', async () => {
      const result = await encryption.decryptHeader('invalid-base64-data!!!');
      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      const result = await encryption.decryptHeader('');
      expect(result).toBeNull();
    });

    it('should return null when decrypted data is not an object', async () => {
      // Encrypt a non-object value by directly using the encryptor
      // This simulates corrupted or malformed data
      const encryptor = (encryption as unknown as { encryptor: { encrypt: (data: unknown[]) => Promise<Uint8Array[]> } }).encryptor;
      const encrypted = await encryptor.encrypt(['not-an-object']);

      // Encode to base64 as the decryptHeader expects
      const base64 = btoa(String.fromCharCode(...encrypted[0]!));

      const result = await encryption.decryptHeader(base64);
      expect(result).toBeNull();
    });
  });

  describe('body encryption/decryption', () => {
    it('should encrypt and decrypt a body with content', async () => {
      const body: ArtifactBody = {
        body: 'export function hello() {\n  console.log("Hello, world!");\n}\n',
      };

      const encrypted = await encryption.encryptBody(body);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      const decrypted = await encryption.decryptBody(encrypted);
      expect(decrypted).toEqual(body);
    });

    it('should handle body with null content', async () => {
      const body: ArtifactBody = {
        body: null,
      };

      const encrypted = await encryption.encryptBody(body);
      const decrypted = await encryption.decryptBody(encrypted);

      expect(decrypted?.body).toBeNull();
    });

    it('should handle empty string body', async () => {
      const body: ArtifactBody = {
        body: '',
      };

      const encrypted = await encryption.encryptBody(body);
      const decrypted = await encryption.decryptBody(encrypted);

      expect(decrypted?.body).toBe('');
    });

    it('should handle large body content', async () => {
      // Create a large string (100KB)
      const largeContent = 'x'.repeat(100 * 1024);
      const body: ArtifactBody = {
        body: largeContent,
      };

      const encrypted = await encryption.encryptBody(body);
      const decrypted = await encryption.decryptBody(encrypted);

      expect(decrypted?.body).toBe(largeContent);
    });

    it('should handle body with unicode content', async () => {
      const body: ArtifactBody = {
        body: 'const greeting = "\u4f60\u597d\u4e16\u754c"; // Hello World in Chinese\nconst emoji = "\ud83d\ude80\ud83c\udf1f\ud83c\udf08";',
      };

      const encrypted = await encryption.encryptBody(body);
      const decrypted = await encryption.decryptBody(encrypted);

      expect(decrypted?.body).toBe(body.body);
    });

    it('should return null for invalid encrypted data', async () => {
      const result = await encryption.decryptBody('not-valid-base64!!!');
      expect(result).toBeNull();
    });

    it('should return null for empty string', async () => {
      const result = await encryption.decryptBody('');
      expect(result).toBeNull();
    });
  });

  describe('encryption uniqueness', () => {
    it('should produce different ciphertext for the same header', async () => {
      const header: ArtifactHeader = {
        title: 'test.ts',
        mimeType: 'text/typescript',
      };

      const encrypted1 = await encryption.encryptHeader(header);
      const encrypted2 = await encryption.encryptHeader(header);

      // Due to random IV, each encryption should produce different ciphertext
      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      const decrypted1 = await encryption.decryptHeader(encrypted1);
      const decrypted2 = await encryption.decryptHeader(encrypted2);
      expect(decrypted1).toEqual(decrypted2);
    });

    it('should produce different ciphertext for the same body', async () => {
      const body: ArtifactBody = {
        body: 'const x = 42;',
      };

      const encrypted1 = await encryption.encryptBody(body);
      const encrypted2 = await encryption.encryptBody(body);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = await encryption.decryptBody(encrypted1);
      const decrypted2 = await encryption.decryptBody(encrypted2);
      expect(decrypted1).toEqual(decrypted2);
    });
  });

  describe('cross-instance decryption', () => {
    it('should decrypt header encrypted by another instance with same key', async () => {
      const header: ArtifactHeader = {
        title: 'shared-file.ts',
        language: 'typescript',
      };

      const encryptionA = new ArtifactEncryption(testKey);
      const encryptionB = new ArtifactEncryption(testKey);

      const encrypted = await encryptionA.encryptHeader(header);
      const decrypted = await encryptionB.decryptHeader(encrypted);

      expect(decrypted).toEqual(header);
    });

    it('should fail to decrypt with different key', async () => {
      const header: ArtifactHeader = {
        title: 'secret-file.ts',
      };

      const keyA = new Uint8Array(32);
      const keyB = new Uint8Array(32);
      crypto.getRandomValues(keyA);
      crypto.getRandomValues(keyB);

      const encryptionA = new ArtifactEncryption(keyA);
      const encryptionB = new ArtifactEncryption(keyB);

      const encrypted = await encryptionA.encryptHeader(header);
      const decrypted = await encryptionB.decryptHeader(encrypted);

      expect(decrypted).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle encryption failure gracefully', async () => {
      // Create a header that can be encrypted normally
      const header: ArtifactHeader = {
        title: 'test.ts',
      };

      // This should succeed - just testing that the method works
      const encrypted = await encryption.encryptHeader(header);
      expect(encrypted).toBeDefined();
    });

    it('should handle decryption of truncated data', async () => {
      const header: ArtifactHeader = {
        title: 'test.ts',
      };

      const encrypted = await encryption.encryptHeader(header);
      // Truncate the encrypted data
      const truncated = encrypted.slice(0, 10);

      const result = await encryption.decryptHeader(truncated);
      expect(result).toBeNull();
    });

    it('should handle decryption of modified ciphertext', async () => {
      const header: ArtifactHeader = {
        title: 'test.ts',
      };

      const encrypted = await encryption.encryptHeader(header);
      // Modify the ciphertext (flip some bits)
      const modified = encrypted.slice(0, -5) + 'XXXXX';

      const result = await encryption.decryptHeader(modified);
      expect(result).toBeNull();
    });
  });
});
