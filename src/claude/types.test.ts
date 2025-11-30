/**
 * Unit tests for parseJsonWithContext utility
 *
 * Tests JSON parsing with enhanced error context, including:
 * - Valid JSON parsing with generic types
 * - JsonParseError properties (inputPreview, inputLength, originalError)
 * - Input truncation behavior
 * - Logger integration
 * - Error cause chain preservation
 */

import { describe, it, expect, vi } from 'vitest';
import { parseJsonWithContext, JsonParseError } from './types';

describe('parseJsonWithContext', () => {
  describe('valid JSON parsing', () => {
    it('should parse valid JSON object', () => {
      const result = parseJsonWithContext('{"key":"value"}');
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse valid JSON array', () => {
      const result = parseJsonWithContext('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should parse valid JSON primitives', () => {
      expect(parseJsonWithContext('"hello"')).toBe('hello');
      expect(parseJsonWithContext('123')).toBe(123);
      expect(parseJsonWithContext('true')).toBe(true);
      expect(parseJsonWithContext('null')).toBe(null);
    });

    it('should parse nested JSON structures', () => {
      const input = '{"user":{"name":"Alice","roles":["admin","user"]}}';
      const result = parseJsonWithContext(input);
      expect(result).toEqual({
        user: { name: 'Alice', roles: ['admin', 'user'] }
      });
    });

    it('should work with generic type parameter', () => {
      interface User {
        name: string;
        age: number;
      }
      const result = parseJsonWithContext<User>('{"name":"Bob","age":30}');
      expect(result.name).toBe('Bob');
      expect(result.age).toBe(30);
    });
  });

  describe('invalid JSON error handling', () => {
    it('should throw JsonParseError for invalid JSON', () => {
      expect(() => parseJsonWithContext('invalid')).toThrow(JsonParseError);
    });

    it('should throw JsonParseError for malformed objects', () => {
      expect(() => parseJsonWithContext('{"invalid": }')).toThrow(JsonParseError);
    });

    it('should throw JsonParseError for incomplete JSON', () => {
      expect(() => parseJsonWithContext('{"key":')).toThrow(JsonParseError);
    });

    it('should throw JsonParseError for trailing content', () => {
      expect(() => parseJsonWithContext('{"key":"value"}extra')).toThrow(JsonParseError);
    });

    it('should include inputPreview in error', () => {
      const input = '{"invalid": }';
      try {
        parseJsonWithContext(input);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).inputPreview).toBe(input);
      }
    });

    it('should include correct inputLength in error', () => {
      const input = 'this is not valid json';
      try {
        parseJsonWithContext(input);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).inputLength).toBe(input.length);
      }
    });

    it('should preserve originalError as SyntaxError', () => {
      try {
        parseJsonWithContext('{"invalid": }');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).originalError).toBeInstanceOf(SyntaxError);
      }
    });
  });

  describe('input truncation', () => {
    it('should truncate long inputs to default previewLength (200)', () => {
      const longInput = 'x'.repeat(500);
      try {
        parseJsonWithContext(longInput);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        // Preview should be 200 chars + '...' = 203 chars max
        expect(error.inputPreview.length).toBeLessThanOrEqual(203);
        expect(error.inputPreview.endsWith('...')).toBe(true);
      }
    });

    it('should include correct inputLength for truncated inputs', () => {
      const longInput = 'y'.repeat(500);
      try {
        parseJsonWithContext(longInput);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).inputLength).toBe(500);
      }
    });

    it('should not truncate inputs shorter than previewLength', () => {
      const shortInput = 'invalid json';
      try {
        parseJsonWithContext(shortInput);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).inputPreview).toBe(shortInput);
        expect((e as JsonParseError).inputPreview.endsWith('...')).toBe(false);
      }
    });

    it('should use custom previewLength option', () => {
      const longInput = 'z'.repeat(100);
      try {
        parseJsonWithContext(longInput, { previewLength: 50 });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        // Preview should be 50 chars + '...' = 53 chars max
        expect(error.inputPreview.length).toBeLessThanOrEqual(53);
        expect(error.inputPreview.endsWith('...')).toBe(true);
        expect(error.inputLength).toBe(100);
      }
    });

    it('should handle inputs exactly at previewLength boundary', () => {
      const exactInput = 'a'.repeat(200);
      try {
        parseJsonWithContext(exactInput);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        // Input is exactly 200, so should NOT be truncated
        expect(error.inputPreview).toBe(exactInput);
        expect(error.inputPreview.endsWith('...')).toBe(false);
      }
    });

    it('should handle inputs one character over previewLength boundary', () => {
      const overInput = 'b'.repeat(201);
      try {
        parseJsonWithContext(overInput);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        // Input is 201 chars, so should be truncated to 200 + '...'
        expect(error.inputPreview.length).toBe(203);
        expect(error.inputPreview.endsWith('...')).toBe(true);
      }
    });
  });

  describe('logger integration', () => {
    it('should call logger.debug when logger is provided', () => {
      const mockLogger = { debug: vi.fn() };
      try {
        parseJsonWithContext('invalid', { logger: mockLogger });
      } catch {
        // Expected to throw
      }
      expect(mockLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('should include "Failed to parse" in log message', () => {
      const mockLogger = { debug: vi.fn() };
      try {
        parseJsonWithContext('invalid', { logger: mockLogger });
      } catch {
        // Expected to throw
      }
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse'),
        expect.any(Object)
      );
    });

    it('should include context label in log message', () => {
      const mockLogger = { debug: vi.fn() };
      try {
        parseJsonWithContext('invalid', { logger: mockLogger, context: 'session message' });
      } catch {
        // Expected to throw
      }
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('session message'),
        expect.any(Object)
      );
    });

    it('should include error details in log metadata', () => {
      const mockLogger = { debug: vi.fn() };
      const input = 'malformed input';
      try {
        parseJsonWithContext(input, { logger: mockLogger });
      } catch {
        // Expected to throw
      }
      const logMetadata = mockLogger.debug.mock.calls[0][1] as Record<string, unknown>;
      expect(logMetadata).toHaveProperty('error');
      expect(logMetadata).toHaveProperty('inputPreview', input);
      expect(logMetadata).toHaveProperty('inputLength', input.length);
    });

    it('should not log when logger is not provided', () => {
      // This test ensures no error is thrown when logger is omitted
      // (no way to directly test "no logging occurred" without mocking global console)
      expect(() => {
        try {
          parseJsonWithContext('invalid');
        } catch {
          // Expected
        }
      }).not.toThrow();
    });

    it('should not call logger on successful parse', () => {
      const mockLogger = { debug: vi.fn() };
      parseJsonWithContext('{"valid":"json"}', { logger: mockLogger });
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
  });

  describe('error cause chain', () => {
    it('should set error.cause to original error', () => {
      try {
        parseJsonWithContext('{"invalid": }');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        expect(error.cause).toBe(error.originalError);
      }
    });

    it('should preserve stack trace from original error', () => {
      try {
        parseJsonWithContext('not json');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        expect(error.originalError.stack).toBeDefined();
        expect(error.originalError.stack).toContain('SyntaxError');
      }
    });

    it('should have its own stack trace', () => {
      try {
        parseJsonWithContext('not json');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        const error = e as JsonParseError;
        expect(error.stack).toBeDefined();
        expect(error.stack).toContain('JsonParseError');
      }
    });
  });

  describe('custom context in error message', () => {
    it('should use default context "JSON" when not specified', () => {
      try {
        parseJsonWithContext('invalid');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).message).toContain('JSON');
      }
    });

    it('should use custom context in error message', () => {
      try {
        parseJsonWithContext('invalid', { context: 'session message' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).message).toContain('session message');
      }
    });

    it('should include "Invalid" prefix in error message', () => {
      try {
        parseJsonWithContext('invalid', { context: 'API response' });
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).message).toMatch(/^Invalid API response:/);
      }
    });
  });

  describe('JsonParseError class', () => {
    it('should have name "JsonParseError"', () => {
      try {
        parseJsonWithContext('invalid');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(JsonParseError);
        expect((e as JsonParseError).name).toBe('JsonParseError');
      }
    });

    it('should be an instance of Error', () => {
      try {
        parseJsonWithContext('invalid');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  });
});
