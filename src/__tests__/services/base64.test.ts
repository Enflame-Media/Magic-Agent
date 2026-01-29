/**
 * Unit tests for base64 encoding/decoding utilities
 *
 * Tests both standard base64 and base64url encoding schemes.
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect } from 'vitest';
import { encodeBase64, decodeBase64 } from '@/services/base64';

describe('Base64 Utilities', () => {
  describe('encodeBase64', () => {
    it('should encode bytes to standard base64', () => {
      const input = new TextEncoder().encode('Hello, World!');
      const encoded = encodeBase64(input);

      expect(encoded).toBe('SGVsbG8sIFdvcmxkIQ==');
    });

    it('should encode bytes to base64url', () => {
      const input = new TextEncoder().encode('Hello, World!');
      const encoded = encodeBase64(input, 'base64url');

      expect(encoded).toBe('SGVsbG8sIFdvcmxkIQ');
      // base64url should not contain +, /, or =
      expect(encoded).not.toMatch(/[+/=]/);
    });

    it('should handle empty input', () => {
      const input = new Uint8Array(0);
      const encoded = encodeBase64(input);

      expect(encoded).toBe('');
    });

    it('should encode binary data correctly', () => {
      const input = new Uint8Array([0x00, 0xff, 0x7f, 0x80]);
      const encoded = encodeBase64(input);

      expect(encoded).toBe('AP9/gA==');
    });

    it('should handle special characters requiring URL encoding', () => {
      // Create data that would produce + and / in standard base64
      const input = new Uint8Array([251, 255, 254]); // Produces ++/+
      const urlSafe = encodeBase64(input, 'base64url');

      // URL safe should not contain + or /
      expect(urlSafe).not.toMatch(/[+/]/);
      // URL safe should not have padding
      expect(urlSafe).not.toMatch(/=/);
    });
  });

  describe('decodeBase64', () => {
    it('should decode standard base64 to bytes', () => {
      const encoded = 'SGVsbG8sIFdvcmxkIQ==';
      const decoded = decodeBase64(encoded);

      expect(new TextDecoder().decode(decoded)).toBe('Hello, World!');
    });

    it('should decode base64url to bytes', () => {
      const encoded = 'SGVsbG8sIFdvcmxkIQ';
      const decoded = decodeBase64(encoded, 'base64url');

      expect(new TextDecoder().decode(decoded)).toBe('Hello, World!');
    });

    it('should handle empty string', () => {
      const decoded = decodeBase64('');
      expect(decoded.length).toBe(0);
    });

    it('should decode binary data correctly', () => {
      const encoded = 'AP9/gA==';
      const decoded = decodeBase64(encoded);

      expect(decoded).toEqual(new Uint8Array([0x00, 0xff, 0x7f, 0x80]));
    });

    it('should add padding for base64url without padding', () => {
      // Base64url without padding (original would have 2 padding chars)
      const encoded = 'YQ'; // 'a' without padding
      const decoded = decodeBase64(encoded, 'base64url');

      expect(new TextDecoder().decode(decoded)).toBe('a');
    });

    it('should handle base64url with URL-safe characters', () => {
      // Create base64url with - and _
      const standard = '+/+/'; // Standard base64
      const urlSafe = '-_-_'; // URL-safe equivalent

      const decodedStandard = decodeBase64(standard, 'base64');
      const decodedUrlSafe = decodeBase64(urlSafe, 'base64url');

      expect(decodedUrlSafe).toEqual(decodedStandard);
    });
  });

  describe('Round-trip encoding/decoding', () => {
    it('should round-trip standard base64', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encoded = encodeBase64(original);
      const decoded = decodeBase64(encoded);

      expect(decoded).toEqual(original);
    });

    it('should round-trip base64url', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const encoded = encodeBase64(original, 'base64url');
      const decoded = decodeBase64(encoded, 'base64url');

      expect(decoded).toEqual(original);
    });

    it('should round-trip text data', () => {
      const originalText = 'Hello, World! 🎉';
      const original = new TextEncoder().encode(originalText);
      const encoded = encodeBase64(original);
      const decoded = decodeBase64(encoded);

      expect(new TextDecoder().decode(decoded)).toBe(originalText);
    });

    it('should round-trip large binary data', () => {
      const original = new Uint8Array(1024);
      for (let i = 0; i < original.length; i++) {
        original[i] = i % 256;
      }

      const encoded = encodeBase64(original);
      const decoded = decodeBase64(encoded);

      expect(decoded).toEqual(original);
    });

    it('should round-trip random data', () => {
      const original = new Uint8Array(256);
      crypto.getRandomValues(original);

      const encodedStandard = encodeBase64(original);
      const decodedStandard = decodeBase64(encodedStandard);

      const encodedUrl = encodeBase64(original, 'base64url');
      const decodedUrl = decodeBase64(encodedUrl, 'base64url');

      expect(decodedStandard).toEqual(original);
      expect(decodedUrl).toEqual(original);
    });
  });
});
