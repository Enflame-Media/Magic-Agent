/**
 * LRU cache for decrypted data to avoid expensive re-decryption
 *
 * This cache stores decrypted session and machine data with automatic
 * eviction of least-recently-used entries when capacity is reached.
 *
 * Cache keys use a composite format: `{id}:{version}` for versioned data
 * or just `{id}` for immutable data like messages.
 */

interface CacheEntry<T> {
  data: T;
  accessTime: number;
}

/**
 * Configuration for cache sizes
 */
interface CacheConfig {
  maxMessages: number;
  maxSessionData: number;
  maxMachineData: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxMessages: 1000,
  maxSessionData: 500,
  maxMachineData: 200,
};

/**
 * In-memory LRU cache for decrypted data
 *
 * Provides fast access to previously decrypted data, avoiding
 * the CPU cost of repeated decryption operations.
 */
export class EncryptionCache {
  private messageCache = new Map<string, CacheEntry<string>>();
  private sessionDataCache = new Map<string, CacheEntry<unknown>>();
  private machineDataCache = new Map<string, CacheEntry<unknown>>();
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get cached decrypted message
   * @param messageId - Unique message identifier
   */
  getCachedMessage(messageId: string): string | null {
    const entry = this.messageCache.get(messageId);
    if (entry) {
      entry.accessTime = Date.now();
      return entry.data;
    }
    return null;
  }

  /**
   * Cache a decrypted message
   * @param messageId - Unique message identifier
   * @param decryptedContent - The decrypted message content
   */
  setCachedMessage(messageId: string, decryptedContent: string): void {
    this.messageCache.set(messageId, {
      data: decryptedContent,
      accessTime: Date.now(),
    });
    this.evictOldest(this.messageCache, this.config.maxMessages);
  }

  /**
   * Get cached session data
   * @param sessionId - Session identifier
   * @param version - Data version number
   */
  getCachedSessionData(sessionId: string, version: number): unknown {
    const key = `${sessionId}:${String(version)}`;
    const entry = this.sessionDataCache.get(key);
    if (entry) {
      entry.accessTime = Date.now();
      return entry.data;
    }
    return null;
  }

  /**
   * Cache session data
   * @param sessionId - Session identifier
   * @param version - Data version number
   * @param data - The decrypted data
   */
  setCachedSessionData(sessionId: string, version: number, data: unknown): void {
    const key = `${sessionId}:${String(version)}`;
    this.sessionDataCache.set(key, {
      data,
      accessTime: Date.now(),
    });
    this.evictOldest(this.sessionDataCache, this.config.maxSessionData);
  }

  /**
   * Get cached machine data
   * @param machineId - Machine identifier
   * @param version - Data version number
   */
  getCachedMachineData(machineId: string, version: number): unknown {
    const key = `${machineId}:${String(version)}`;
    const entry = this.machineDataCache.get(key);
    if (entry) {
      entry.accessTime = Date.now();
      return entry.data;
    }
    return null;
  }

  /**
   * Cache machine data
   * @param machineId - Machine identifier
   * @param version - Data version number
   * @param data - The decrypted data
   */
  setCachedMachineData(machineId: string, version: number, data: unknown): void {
    const key = `${machineId}:${String(version)}`;
    this.machineDataCache.set(key, {
      data,
      accessTime: Date.now(),
    });
    this.evictOldest(this.machineDataCache, this.config.maxMachineData);
  }

  /**
   * Clear all cache entries for a specific session
   */
  clearSessionCache(sessionId: string): void {
    const prefix = `${sessionId}:`;
    for (const key of this.sessionDataCache.keys()) {
      if (key.startsWith(prefix)) {
        this.sessionDataCache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries for a specific machine
   */
  clearMachineCache(machineId: string): void {
    const prefix = `${machineId}:`;
    for (const key of this.machineDataCache.keys()) {
      if (key.startsWith(prefix)) {
        this.machineDataCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data
   */
  clearAll(): void {
    this.messageCache.clear();
    this.sessionDataCache.clear();
    this.machineDataCache.clear();
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    messages: number;
    sessionData: number;
    machineData: number;
    totalEntries: number;
  } {
    return {
      messages: this.messageCache.size,
      sessionData: this.sessionDataCache.size,
      machineData: this.machineDataCache.size,
      totalEntries:
        this.messageCache.size + this.sessionDataCache.size + this.machineDataCache.size,
    };
  }

  /**
   * Evict oldest entries when cache exceeds limit (LRU eviction)
   */
  private evictOldest<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
    if (cache.size <= maxSize) {
      return;
    }

    // Calculate how many to evict
    const toEvict = cache.size - maxSize;

    // Sort entries by access time (oldest first)
    const entries = Array.from(cache.entries()).sort(
      (a, b) => a[1].accessTime - b[1].accessTime
    );

    // Delete oldest entries
    for (let i = 0; i < toEvict; i++) {
      const entry = entries[i];
      if (entry) {
        cache.delete(entry[0]);
      }
    }
  }
}

/**
 * Singleton cache instance for the application
 */
export const encryptionCache = new EncryptionCache();
