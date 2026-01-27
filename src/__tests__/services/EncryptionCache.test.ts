/**
 * Unit tests for the EncryptionCache LRU cache implementation
 *
 * Tests cache operations for:
 * - Message caching
 * - Session data caching
 * - Machine data caching
 * - LRU eviction behavior
 * - Cache clearing operations
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionCache } from '@/services/encryption/EncryptionCache';

describe('EncryptionCache', () => {
  let cache: EncryptionCache;

  beforeEach(() => {
    cache = new EncryptionCache();
  });

  describe('Message Cache', () => {
    it('should cache and retrieve messages', () => {
      const messageId = 'msg-123';
      const content = 'Hello, World!';

      cache.setCachedMessage(messageId, content);
      const retrieved = cache.getCachedMessage(messageId);

      expect(retrieved).toBe(content);
    });

    it('should return null for non-existent messages', () => {
      const retrieved = cache.getCachedMessage('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should update access time on retrieval', () => {
      const messageId = 'msg-123';
      const content = 'Test';

      cache.setCachedMessage(messageId, content);

      // Access twice with delay
      vi.useFakeTimers();
      cache.getCachedMessage(messageId);
      vi.advanceTimersByTime(1000);
      cache.getCachedMessage(messageId);

      // Message should still be accessible
      expect(cache.getCachedMessage(messageId)).toBe(content);
      vi.useRealTimers();
    });
  });

  describe('Session Data Cache', () => {
    it('should cache and retrieve session data with version', () => {
      const sessionId = 'session-123';
      const version = 1;
      const data = { name: 'Test Session', status: 'active' };

      cache.setCachedSessionData(sessionId, version, data);
      const retrieved = cache.getCachedSessionData(sessionId, version);

      expect(retrieved).toEqual(data);
    });

    it('should return null for wrong version', () => {
      const sessionId = 'session-123';
      const data = { name: 'Test' };

      cache.setCachedSessionData(sessionId, 1, data);
      const retrieved = cache.getCachedSessionData(sessionId, 2);

      expect(retrieved).toBeNull();
    });

    it('should handle multiple versions of same session', () => {
      const sessionId = 'session-123';
      const dataV1 = { name: 'Version 1' };
      const dataV2 = { name: 'Version 2' };

      cache.setCachedSessionData(sessionId, 1, dataV1);
      cache.setCachedSessionData(sessionId, 2, dataV2);

      expect(cache.getCachedSessionData(sessionId, 1)).toEqual(dataV1);
      expect(cache.getCachedSessionData(sessionId, 2)).toEqual(dataV2);
    });

    it('should clear session cache by session ID', () => {
      const sessionId1 = 'session-1';
      const sessionId2 = 'session-2';

      cache.setCachedSessionData(sessionId1, 1, { data: 1 });
      cache.setCachedSessionData(sessionId1, 2, { data: 2 });
      cache.setCachedSessionData(sessionId2, 1, { data: 3 });

      cache.clearSessionCache(sessionId1);

      expect(cache.getCachedSessionData(sessionId1, 1)).toBeNull();
      expect(cache.getCachedSessionData(sessionId1, 2)).toBeNull();
      expect(cache.getCachedSessionData(sessionId2, 1)).toEqual({ data: 3 });
    });
  });

  describe('Machine Data Cache', () => {
    it('should cache and retrieve machine data with version', () => {
      const machineId = 'machine-123';
      const version = 1;
      const data = { hostname: 'test-host', os: 'macOS' };

      cache.setCachedMachineData(machineId, version, data);
      const retrieved = cache.getCachedMachineData(machineId, version);

      expect(retrieved).toEqual(data);
    });

    it('should return null for wrong version', () => {
      const machineId = 'machine-123';

      cache.setCachedMachineData(machineId, 1, { hostname: 'host' });
      const retrieved = cache.getCachedMachineData(machineId, 2);

      expect(retrieved).toBeNull();
    });

    it('should clear machine cache by machine ID', () => {
      const machineId1 = 'machine-1';
      const machineId2 = 'machine-2';

      cache.setCachedMachineData(machineId1, 1, { data: 1 });
      cache.setCachedMachineData(machineId1, 2, { data: 2 });
      cache.setCachedMachineData(machineId2, 1, { data: 3 });

      cache.clearMachineCache(machineId1);

      expect(cache.getCachedMachineData(machineId1, 1)).toBeNull();
      expect(cache.getCachedMachineData(machineId1, 2)).toBeNull();
      expect(cache.getCachedMachineData(machineId2, 1)).toEqual({ data: 3 });
    });
  });

  describe('LRU Eviction', () => {
    it('should evict oldest messages when limit is exceeded', () => {
      const smallCache = new EncryptionCache({ maxMessages: 3 });

      // Add 4 messages
      smallCache.setCachedMessage('msg-1', 'Message 1');
      smallCache.setCachedMessage('msg-2', 'Message 2');
      smallCache.setCachedMessage('msg-3', 'Message 3');
      smallCache.setCachedMessage('msg-4', 'Message 4');

      // First message should be evicted
      expect(smallCache.getCachedMessage('msg-1')).toBeNull();
      expect(smallCache.getCachedMessage('msg-2')).toBe('Message 2');
      expect(smallCache.getCachedMessage('msg-3')).toBe('Message 3');
      expect(smallCache.getCachedMessage('msg-4')).toBe('Message 4');
    });

    it('should evict oldest session data when limit is exceeded', () => {
      const smallCache = new EncryptionCache({ maxSessionData: 2 });

      smallCache.setCachedSessionData('s1', 1, { data: 1 });
      smallCache.setCachedSessionData('s2', 1, { data: 2 });
      smallCache.setCachedSessionData('s3', 1, { data: 3 });

      expect(smallCache.getCachedSessionData('s1', 1)).toBeNull();
      expect(smallCache.getCachedSessionData('s2', 1)).toEqual({ data: 2 });
      expect(smallCache.getCachedSessionData('s3', 1)).toEqual({ data: 3 });
    });

    it('should evict oldest machine data when limit is exceeded', () => {
      const smallCache = new EncryptionCache({ maxMachineData: 2 });

      smallCache.setCachedMachineData('m1', 1, { data: 1 });
      smallCache.setCachedMachineData('m2', 1, { data: 2 });
      smallCache.setCachedMachineData('m3', 1, { data: 3 });

      expect(smallCache.getCachedMachineData('m1', 1)).toBeNull();
      expect(smallCache.getCachedMachineData('m2', 1)).toEqual({ data: 2 });
      expect(smallCache.getCachedMachineData('m3', 1)).toEqual({ data: 3 });
    });

    it('should keep recently accessed items during eviction', () => {
      vi.useFakeTimers();
      const smallCache = new EncryptionCache({ maxMessages: 3 });

      // Add 3 messages
      smallCache.setCachedMessage('msg-1', 'Message 1');
      vi.advanceTimersByTime(100);
      smallCache.setCachedMessage('msg-2', 'Message 2');
      vi.advanceTimersByTime(100);
      smallCache.setCachedMessage('msg-3', 'Message 3');

      // Access msg-1 to update its access time
      vi.advanceTimersByTime(100);
      smallCache.getCachedMessage('msg-1');

      // Add a new message, should evict msg-2 (least recently accessed)
      vi.advanceTimersByTime(100);
      smallCache.setCachedMessage('msg-4', 'Message 4');

      expect(smallCache.getCachedMessage('msg-1')).toBe('Message 1'); // Recently accessed
      expect(smallCache.getCachedMessage('msg-2')).toBeNull(); // Evicted
      expect(smallCache.getCachedMessage('msg-3')).toBe('Message 3');
      expect(smallCache.getCachedMessage('msg-4')).toBe('Message 4');

      vi.useRealTimers();
    });
  });

  describe('Cache Statistics', () => {
    it('should return accurate statistics', () => {
      cache.setCachedMessage('msg-1', 'test');
      cache.setCachedMessage('msg-2', 'test');
      cache.setCachedSessionData('s1', 1, {});
      cache.setCachedMachineData('m1', 1, {});

      const stats = cache.getStats();

      expect(stats.messages).toBe(2);
      expect(stats.sessionData).toBe(1);
      expect(stats.machineData).toBe(1);
      expect(stats.totalEntries).toBe(4);
    });

    it('should update statistics after clearing', () => {
      cache.setCachedMessage('msg-1', 'test');
      cache.setCachedSessionData('s1', 1, {});

      cache.clearAll();

      const stats = cache.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all cache entries', () => {
      cache.setCachedMessage('msg-1', 'test');
      cache.setCachedSessionData('s1', 1, {});
      cache.setCachedMachineData('m1', 1, {});

      cache.clearAll();

      expect(cache.getCachedMessage('msg-1')).toBeNull();
      expect(cache.getCachedSessionData('s1', 1)).toBeNull();
      expect(cache.getCachedMachineData('m1', 1)).toBeNull();
    });
  });

  describe('Custom Configuration', () => {
    it('should respect custom limits', () => {
      const customCache = new EncryptionCache({
        maxMessages: 10,
        maxSessionData: 20,
        maxMachineData: 5,
      });

      // Add 11 messages, should trigger eviction
      for (let i = 0; i < 11; i++) {
        customCache.setCachedMessage(`msg-${i}`, `content-${i}`);
      }

      // First message should be evicted
      expect(customCache.getCachedMessage('msg-0')).toBeNull();
      expect(customCache.getCachedMessage('msg-10')).toBe('content-10');
    });

    it('should use default config when not specified', () => {
      const defaultCache = new EncryptionCache();

      // Add 1001 messages (default is 1000)
      for (let i = 0; i < 1001; i++) {
        defaultCache.setCachedMessage(`msg-${i}`, 'content');
      }

      // First message should be evicted
      expect(defaultCache.getCachedMessage('msg-0')).toBeNull();
      expect(defaultCache.getCachedMessage('msg-1000')).toBe('content');
    });
  });
});
