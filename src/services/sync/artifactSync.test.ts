/**
 * Unit tests for artifact sync utilities
 *
 * Tests key management functions and encryption manager singleton.
 *
 * @see HAP-863 - Add unit tests for artifact sync encryption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  storeArtifactKey,
  getArtifactKey,
  removeArtifactKey,
  clearArtifactKeys,
  resetEncryptionManager,
} from './artifactSync';

// Mock the dependencies
vi.mock('@/services/storage', () => ({
  secureStorage: {
    getCredentials: vi.fn(),
  },
}));

vi.mock('@/services/base64', () => ({
  decodeBase64: vi.fn((str: string) => {
    // Simple mock implementation
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }),
}));

describe('Artifact Key Management', () => {
  beforeEach(() => {
    // Clear all keys before each test
    clearArtifactKeys();
  });

  afterEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  describe('storeArtifactKey', () => {
    it('should store a key for an artifact ID', () => {
      const artifactId = 'artifact-123';
      const key = new Uint8Array([1, 2, 3, 4, 5]);

      storeArtifactKey(artifactId, key);

      const retrieved = getArtifactKey(artifactId);
      expect(retrieved).toEqual(key);
    });

    it('should overwrite existing key for same artifact ID', () => {
      const artifactId = 'artifact-123';
      const key1 = new Uint8Array([1, 2, 3]);
      const key2 = new Uint8Array([4, 5, 6]);

      storeArtifactKey(artifactId, key1);
      storeArtifactKey(artifactId, key2);

      const retrieved = getArtifactKey(artifactId);
      expect(retrieved).toEqual(key2);
    });

    it('should store multiple keys for different artifacts', () => {
      const key1 = new Uint8Array([1, 1, 1]);
      const key2 = new Uint8Array([2, 2, 2]);
      const key3 = new Uint8Array([3, 3, 3]);

      storeArtifactKey('artifact-1', key1);
      storeArtifactKey('artifact-2', key2);
      storeArtifactKey('artifact-3', key3);

      expect(getArtifactKey('artifact-1')).toEqual(key1);
      expect(getArtifactKey('artifact-2')).toEqual(key2);
      expect(getArtifactKey('artifact-3')).toEqual(key3);
    });

    it('should handle empty key', () => {
      const artifactId = 'artifact-empty';
      const key = new Uint8Array(0);

      storeArtifactKey(artifactId, key);

      const retrieved = getArtifactKey(artifactId);
      expect(retrieved).toEqual(key);
      expect(retrieved?.length).toBe(0);
    });

    it('should handle 32-byte encryption key (AES-256)', () => {
      const artifactId = 'artifact-aes';
      const key = new Uint8Array(32);
      crypto.getRandomValues(key);

      storeArtifactKey(artifactId, key);

      const retrieved = getArtifactKey(artifactId);
      expect(retrieved).toEqual(key);
      expect(retrieved?.length).toBe(32);
    });
  });

  describe('getArtifactKey', () => {
    it('should return undefined for non-existent artifact ID', () => {
      const result = getArtifactKey('non-existent-id');
      expect(result).toBeUndefined();
    });

    it('should return the stored key for existing artifact ID', () => {
      const artifactId = 'artifact-get-test';
      const key = new Uint8Array([10, 20, 30, 40]);

      storeArtifactKey(artifactId, key);

      const result = getArtifactKey(artifactId);
      expect(result).toEqual(key);
    });

    it('should return undefined after key is removed', () => {
      const artifactId = 'artifact-remove-test';
      const key = new Uint8Array([1, 2, 3]);

      storeArtifactKey(artifactId, key);
      removeArtifactKey(artifactId);

      const result = getArtifactKey(artifactId);
      expect(result).toBeUndefined();
    });

    it('should return exact same Uint8Array reference', () => {
      const artifactId = 'artifact-ref';
      const key = new Uint8Array([1, 2, 3]);

      storeArtifactKey(artifactId, key);

      const result = getArtifactKey(artifactId);
      // The Map stores the reference, so it should be the same object
      expect(result).toBe(key);
    });
  });

  describe('removeArtifactKey', () => {
    it('should remove existing key', () => {
      const artifactId = 'artifact-to-remove';
      const key = new Uint8Array([1, 2, 3]);

      storeArtifactKey(artifactId, key);
      expect(getArtifactKey(artifactId)).toBeDefined();

      removeArtifactKey(artifactId);
      expect(getArtifactKey(artifactId)).toBeUndefined();
    });

    it('should not throw for non-existent artifact ID', () => {
      expect(() => removeArtifactKey('non-existent')).not.toThrow();
    });

    it('should only remove the specified key', () => {
      const key1 = new Uint8Array([1, 1, 1]);
      const key2 = new Uint8Array([2, 2, 2]);

      storeArtifactKey('artifact-1', key1);
      storeArtifactKey('artifact-2', key2);

      removeArtifactKey('artifact-1');

      expect(getArtifactKey('artifact-1')).toBeUndefined();
      expect(getArtifactKey('artifact-2')).toEqual(key2);
    });

    it('should allow re-adding key after removal', () => {
      const artifactId = 'artifact-readd';
      const key1 = new Uint8Array([1, 2, 3]);
      const key2 = new Uint8Array([4, 5, 6]);

      storeArtifactKey(artifactId, key1);
      removeArtifactKey(artifactId);
      storeArtifactKey(artifactId, key2);

      expect(getArtifactKey(artifactId)).toEqual(key2);
    });
  });

  describe('clearArtifactKeys', () => {
    it('should clear all stored keys', () => {
      storeArtifactKey('artifact-1', new Uint8Array([1]));
      storeArtifactKey('artifact-2', new Uint8Array([2]));
      storeArtifactKey('artifact-3', new Uint8Array([3]));

      clearArtifactKeys();

      expect(getArtifactKey('artifact-1')).toBeUndefined();
      expect(getArtifactKey('artifact-2')).toBeUndefined();
      expect(getArtifactKey('artifact-3')).toBeUndefined();
    });

    it('should not throw when no keys are stored', () => {
      expect(() => clearArtifactKeys()).not.toThrow();
    });

    it('should allow adding keys after clear', () => {
      storeArtifactKey('artifact-1', new Uint8Array([1]));
      clearArtifactKeys();

      const newKey = new Uint8Array([9, 9, 9]);
      storeArtifactKey('artifact-new', newKey);

      expect(getArtifactKey('artifact-new')).toEqual(newKey);
    });
  });

  describe('resetEncryptionManager', () => {
    it('should clear artifact keys when called', () => {
      // Store some keys
      storeArtifactKey('artifact-1', new Uint8Array([1, 2, 3]));
      storeArtifactKey('artifact-2', new Uint8Array([4, 5, 6]));

      // Reset should clear them
      resetEncryptionManager();

      expect(getArtifactKey('artifact-1')).toBeUndefined();
      expect(getArtifactKey('artifact-2')).toBeUndefined();
    });

    it('should not throw when called multiple times', () => {
      expect(() => {
        resetEncryptionManager();
        resetEncryptionManager();
        resetEncryptionManager();
      }).not.toThrow();
    });
  });
});

describe('Artifact ID edge cases', () => {
  beforeEach(() => {
    clearArtifactKeys();
  });

  it('should handle UUID-format artifact IDs', () => {
    const artifactId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);

    storeArtifactKey(artifactId, key);
    expect(getArtifactKey(artifactId)).toEqual(key);
  });

  it('should handle empty string artifact ID', () => {
    const key = new Uint8Array([1, 2, 3]);

    storeArtifactKey('', key);
    expect(getArtifactKey('')).toEqual(key);
  });

  it('should handle very long artifact IDs', () => {
    const longId = 'a'.repeat(1000);
    const key = new Uint8Array([1, 2, 3]);

    storeArtifactKey(longId, key);
    expect(getArtifactKey(longId)).toEqual(key);
  });

  it('should handle artifact IDs with special characters', () => {
    const specialId = 'artifact-with-special_chars.and/slashes:colons';
    const key = new Uint8Array([1, 2, 3]);

    storeArtifactKey(specialId, key);
    expect(getArtifactKey(specialId)).toEqual(key);
  });

  it('should distinguish between similar artifact IDs', () => {
    const key1 = new Uint8Array([1]);
    const key2 = new Uint8Array([2]);

    storeArtifactKey('artifact-1', key1);
    storeArtifactKey('artifact-1 ', key2); // With trailing space

    expect(getArtifactKey('artifact-1')).toEqual(key1);
    expect(getArtifactKey('artifact-1 ')).toEqual(key2);
  });
});
