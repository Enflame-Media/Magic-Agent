/**
 * Artifact Cache Service (HAP-874)
 *
 * Provides offline caching for artifacts using IndexedDB via Dexie.js.
 * Enables viewing previously loaded artifacts when disconnected from the server.
 *
 * Features:
 * - IndexedDB storage for persistent caching
 * - LRU (Least Recently Used) eviction policy
 * - Version-based cache invalidation
 * - Configurable size limits
 *
 * @example
 * ```typescript
 * import { artifactCache } from '@/services/artifactCache';
 *
 * // Cache an artifact
 * await artifactCache.cacheArtifact(artifact);
 *
 * // Load cached artifacts
 * const cached = await artifactCache.loadCachedArtifacts();
 *
 * // Check if artifact needs refresh
 * const isStale = await artifactCache.isStale('artifact-123', 2, 1);
 * ```
 *
 * @see HAP-874 - Offline Artifact Caching
 */

import Dexie, { type Table } from 'dexie';
import type { ArtifactHeader, DecryptedArtifact, ArtifactFileType } from '@/stores/artifacts';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cached artifact record stored in IndexedDB.
 *
 * Contains decrypted header data and optionally the body content.
 * The cachedAt timestamp is used for LRU eviction.
 */
export interface CachedArtifact {
  /** Unique artifact ID (primary key) */
  id: string;
  /** Decrypted artifact header */
  header: ArtifactHeader;
  /** Decrypted body content (null if not cached) */
  body: string | null;
  /** Header version for cache invalidation */
  headerVersion: number;
  /** Body version for cache invalidation */
  bodyVersion: number | null;
  /** File type category */
  fileType: ArtifactFileType;
  /** Programming language for syntax highlighting */
  language: string | null;
  /** Sequence number for ordering */
  seq: number;
  /** Creation timestamp from server */
  createdAt: number;
  /** Last update timestamp from server */
  updatedAt: number;
  /** Timestamp when this entry was cached */
  cachedAt: number;
  /** Timestamp when the body was cached (null if body not cached) */
  bodyCachedAt: number | null;
  /** Approximate size in bytes (for cache management) */
  sizeBytes: number;
}

/**
 * Cache statistics for monitoring and UI display.
 */
export interface CacheStats {
  /** Total number of cached artifacts */
  totalArtifacts: number;
  /** Number of artifacts with cached body */
  artifactsWithBody: number;
  /** Total cache size in bytes */
  totalSizeBytes: number;
  /** Maximum allowed cache size in bytes */
  maxSizeBytes: number;
  /** Oldest cached item timestamp */
  oldestCachedAt: number | null;
  /** Newest cached item timestamp */
  newestCachedAt: number | null;
}

/**
 * Cache configuration options.
 */
export interface CacheConfig {
  /** Maximum cache size in bytes (default: 50MB) */
  maxSizeBytes: number;
  /** Maximum number of artifact bodies to cache (default: 100) */
  maxBodiesCount: number;
  /** Whether caching is enabled (default: true) */
  enabled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dexie database schema for artifact cache.
 */
class ArtifactCacheDatabase extends Dexie {
  /** Cached artifacts table */
  artifacts!: Table<CachedArtifact, string>;

  constructor() {
    super('HappyArtifactCache');

    // Schema version 1
    this.version(1).stores({
      // Primary key: id
      // Indexes: cachedAt (for LRU), bodyCachedAt (for body eviction), sessions
      artifacts: 'id, cachedAt, bodyCachedAt, *header.sessions',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Cache Service Implementation
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: CacheConfig = {
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  maxBodiesCount: 100,
  enabled: true,
};

/**
 * Artifact cache service for offline access.
 *
 * Uses IndexedDB via Dexie.js for persistent storage.
 * Implements LRU eviction to manage cache size.
 */
class ArtifactCacheService {
  private db: ArtifactCacheDatabase;
  private config: CacheConfig;
  private initialized = false;

  constructor() {
    this.db = new ArtifactCacheDatabase();
    this.config = { ...DEFAULT_CONFIG };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Initialization
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the cache service.
   * Opens the IndexedDB database and loads configuration.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.db.open();
      this.initialized = true;

      // Load saved config from localStorage
      const savedConfig = localStorage.getItem('artifact_cache_config');
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig) as Partial<CacheConfig>;
          this.config = { ...DEFAULT_CONFIG, ...parsed };
        } catch {
          // Ignore invalid config
        }
      }

      console.debug('[cache] Artifact cache initialized');
    } catch (error) {
      console.error('[cache] Failed to initialize artifact cache:', error);
      // Continue without caching
      this.config.enabled = false;
    }
  }

  /**
   * Update cache configuration.
   *
   * @param config - Partial configuration to merge
   */
  setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
    localStorage.setItem('artifact_cache_config', JSON.stringify(this.config));
  }

  /**
   * Get current cache configuration.
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Caching Operations
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Cache a decrypted artifact.
   *
   * @param artifact - The decrypted artifact to cache
   * @param includeBody - Whether to cache the body content (default: true if available)
   */
  async cacheArtifact(
    artifact: DecryptedArtifact,
    includeBody = true
  ): Promise<void> {
    if (!this.config.enabled || !artifact.isDecrypted) return;
    await this.initialize();

    const now = Date.now();
    const body = includeBody && artifact.isBodyLoaded ? artifact.body : null;

    // Estimate size
    const headerSize = JSON.stringify({
      title: artifact.title,
      mimeType: artifact.mimeType,
      filePath: artifact.filePath,
      language: artifact.language,
      sessions: artifact.sessions,
    }).length;
    const bodySize = body?.length ?? 0;
    const sizeBytes = headerSize + bodySize;

    const cached: CachedArtifact = {
      id: artifact.id,
      header: {
        title: artifact.title,
        mimeType: artifact.mimeType ?? undefined,
        filePath: artifact.filePath ?? undefined,
        language: artifact.language ?? undefined,
        sessions: artifact.sessions,
      },
      body,
      headerVersion: artifact.headerVersion,
      bodyVersion: artifact.bodyVersion,
      fileType: artifact.fileType,
      language: artifact.language,
      seq: artifact.seq,
      createdAt: artifact.createdAt,
      updatedAt: artifact.updatedAt,
      cachedAt: now,
      bodyCachedAt: body ? now : null,
      sizeBytes,
    };

    try {
      await this.db.artifacts.put(cached);

      // Run cache eviction if needed
      await this.runEviction();

      console.debug(`[cache] Cached artifact ${artifact.id}`);
    } catch (error) {
      console.error(`[cache] Failed to cache artifact ${artifact.id}:`, error);
    }
  }

  /**
   * Cache multiple artifacts in a batch.
   *
   * @param artifacts - Array of artifacts to cache
   * @param includeBodies - Whether to cache body content
   */
  async cacheArtifacts(
    artifacts: DecryptedArtifact[],
    includeBodies = true
  ): Promise<void> {
    if (!this.config.enabled) return;
    await this.initialize();

    const now = Date.now();
    const cachedItems: CachedArtifact[] = artifacts
      .filter((a) => a.isDecrypted)
      .map((artifact) => {
        const body = includeBodies && artifact.isBodyLoaded ? artifact.body : null;
        const headerSize = JSON.stringify({
          title: artifact.title,
          mimeType: artifact.mimeType,
          filePath: artifact.filePath,
          language: artifact.language,
          sessions: artifact.sessions,
        }).length;
        const bodySize = body?.length ?? 0;

        return {
          id: artifact.id,
          header: {
            title: artifact.title,
            mimeType: artifact.mimeType ?? undefined,
            filePath: artifact.filePath ?? undefined,
            language: artifact.language ?? undefined,
            sessions: artifact.sessions,
          },
          body,
          headerVersion: artifact.headerVersion,
          bodyVersion: artifact.bodyVersion,
          fileType: artifact.fileType,
          language: artifact.language,
          seq: artifact.seq,
          createdAt: artifact.createdAt,
          updatedAt: artifact.updatedAt,
          cachedAt: now,
          bodyCachedAt: body ? now : null,
          sizeBytes: headerSize + bodySize,
        };
      });

    if (cachedItems.length === 0) return;

    try {
      await this.db.artifacts.bulkPut(cachedItems);
      await this.runEviction();
      console.debug(`[cache] Cached ${cachedItems.length} artifacts`);
    } catch (error) {
      console.error('[cache] Failed to batch cache artifacts:', error);
    }
  }

  /**
   * Update only the body content for a cached artifact.
   *
   * @param id - Artifact ID
   * @param body - Body content to cache
   */
  async cacheBody(id: string, body: string | null): Promise<void> {
    if (!this.config.enabled) return;
    await this.initialize();

    try {
      const existing = await this.db.artifacts.get(id);
      if (existing) {
        const now = Date.now();
        const bodySize = body?.length ?? 0;
        const headerSize = existing.sizeBytes - (existing.body?.length ?? 0);

        await this.db.artifacts.update(id, {
          body,
          bodyCachedAt: body ? now : null,
          sizeBytes: headerSize + bodySize,
        });

        await this.runEviction();
        console.debug(`[cache] Cached body for artifact ${id}`);
      }
    } catch (error) {
      console.error(`[cache] Failed to cache body for ${id}:`, error);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Retrieval Operations
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Load all cached artifacts.
   *
   * @returns Array of cached artifacts converted to DecryptedArtifact format
   */
  async loadCachedArtifacts(): Promise<DecryptedArtifact[]> {
    if (!this.config.enabled) return [];
    await this.initialize();

    try {
      const cached = await this.db.artifacts.toArray();

      return cached.map((c) => this.toDecryptedArtifact(c));
    } catch (error) {
      console.error('[cache] Failed to load cached artifacts:', error);
      return [];
    }
  }

  /**
   * Get a single cached artifact by ID.
   *
   * @param id - Artifact ID
   * @returns Cached artifact or null if not found
   */
  async getCachedArtifact(id: string): Promise<DecryptedArtifact | null> {
    if (!this.config.enabled) return null;
    await this.initialize();

    try {
      const cached = await this.db.artifacts.get(id);
      if (cached) {
        // Update access time for LRU
        await this.db.artifacts.update(id, { cachedAt: Date.now() });
        return this.toDecryptedArtifact(cached);
      }
      return null;
    } catch (error) {
      console.error(`[cache] Failed to get cached artifact ${id}:`, error);
      return null;
    }
  }

  /**
   * Get cached artifacts for a specific session.
   *
   * @param sessionId - Session ID
   * @returns Array of cached artifacts for the session
   */
  async getCachedForSession(sessionId: string): Promise<DecryptedArtifact[]> {
    if (!this.config.enabled) return [];
    await this.initialize();

    try {
      // Filter by session in the header.sessions array
      const all = await this.db.artifacts.toArray();
      const filtered = all.filter((c) =>
        c.header.sessions?.includes(sessionId)
      );

      return filtered.map((c) => this.toDecryptedArtifact(c));
    } catch (error) {
      console.error(`[cache] Failed to get cached artifacts for session ${sessionId}:`, error);
      return [];
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cache Invalidation
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Check if a cached artifact is stale (needs refresh).
   *
   * @param id - Artifact ID
   * @param headerVersion - Current header version from server
   * @param bodyVersion - Current body version from server (if applicable)
   * @returns True if cached version is older than server version
   */
  async isStale(
    id: string,
    headerVersion: number,
    bodyVersion: number | null
  ): Promise<boolean> {
    if (!this.config.enabled) return true;
    await this.initialize();

    try {
      const cached = await this.db.artifacts.get(id);
      if (!cached) return true;

      // Check header version
      if (cached.headerVersion < headerVersion) {
        return true;
      }

      // Check body version if applicable
      if (bodyVersion !== null && cached.bodyVersion !== null) {
        if (cached.bodyVersion < bodyVersion) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error(`[cache] Failed to check staleness for ${id}:`, error);
      return true;
    }
  }

  /**
   * Remove a cached artifact.
   *
   * @param id - Artifact ID
   */
  async removeCached(id: string): Promise<void> {
    if (!this.config.enabled) return;
    await this.initialize();

    try {
      await this.db.artifacts.delete(id);
      console.debug(`[cache] Removed cached artifact ${id}`);
    } catch (error) {
      console.error(`[cache] Failed to remove cached artifact ${id}:`, error);
    }
  }

  /**
   * Clear all cached artifacts.
   */
  async clearCache(): Promise<void> {
    await this.initialize();

    try {
      await this.db.artifacts.clear();
      console.debug('[cache] Cleared all cached artifacts');
    } catch (error) {
      console.error('[cache] Failed to clear cache:', error);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Cache Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Get cache statistics.
   */
  async getStats(): Promise<CacheStats> {
    await this.initialize();

    try {
      const all = await this.db.artifacts.toArray();

      const totalArtifacts = all.length;
      const artifactsWithBody = all.filter((a) => a.body !== null).length;
      const totalSizeBytes = all.reduce((sum, a) => sum + a.sizeBytes, 0);

      const timestamps = all.map((a) => a.cachedAt);
      const oldestCachedAt = timestamps.length > 0 ? Math.min(...timestamps) : null;
      const newestCachedAt = timestamps.length > 0 ? Math.max(...timestamps) : null;

      return {
        totalArtifacts,
        artifactsWithBody,
        totalSizeBytes,
        maxSizeBytes: this.config.maxSizeBytes,
        oldestCachedAt,
        newestCachedAt,
      };
    } catch (error) {
      console.error('[cache] Failed to get cache stats:', error);
      return {
        totalArtifacts: 0,
        artifactsWithBody: 0,
        totalSizeBytes: 0,
        maxSizeBytes: this.config.maxSizeBytes,
        oldestCachedAt: null,
        newestCachedAt: null,
      };
    }
  }

  /**
   * Run LRU eviction to keep cache within size limits.
   *
   * Eviction strategy:
   * 1. Evict body content from least recently used artifacts first
   * 2. If still over limit, remove entire artifact entries
   */
  private async runEviction(): Promise<void> {
    const stats = await this.getStats();

    // Check if eviction is needed
    if (
      stats.totalSizeBytes <= this.config.maxSizeBytes &&
      stats.artifactsWithBody <= this.config.maxBodiesCount
    ) {
      return;
    }

    console.debug('[cache] Running cache eviction...');

    try {
      // First, evict bodies from least recently used artifacts
      if (stats.artifactsWithBody > this.config.maxBodiesCount) {
        const artifactsWithBody = await this.db.artifacts
          .filter((a) => a.body !== null)
          .sortBy('bodyCachedAt');

        const toEvictCount = stats.artifactsWithBody - this.config.maxBodiesCount;
        const toEvict = artifactsWithBody.slice(0, toEvictCount);

        for (const artifact of toEvict) {
          await this.db.artifacts.update(artifact.id, {
            body: null,
            bodyCachedAt: null,
            sizeBytes: artifact.sizeBytes - (artifact.body?.length ?? 0),
          });
        }

        console.debug(`[cache] Evicted ${toEvict.length} artifact bodies`);
      }

      // Check if still over size limit
      const newStats = await this.getStats();
      if (newStats.totalSizeBytes > this.config.maxSizeBytes) {
        // Sort by cachedAt (LRU) and delete oldest
        const allSorted = await this.db.artifacts.orderBy('cachedAt').toArray();
        let currentSize = newStats.totalSizeBytes;

        for (const artifact of allSorted) {
          if (currentSize <= this.config.maxSizeBytes) break;

          await this.db.artifacts.delete(artifact.id);
          currentSize -= artifact.sizeBytes;
          console.debug(`[cache] Evicted artifact ${artifact.id}`);
        }
      }
    } catch (error) {
      console.error('[cache] Failed to run eviction:', error);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Private Helpers
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Convert CachedArtifact to DecryptedArtifact format.
   */
  private toDecryptedArtifact(cached: CachedArtifact): DecryptedArtifact {
    return {
      id: cached.id,
      title: cached.header.title ?? null,
      filePath: cached.header.filePath ?? null,
      mimeType: cached.header.mimeType ?? null,
      language: cached.language,
      sessions: cached.header.sessions ?? [],
      body: cached.body,
      fileType: cached.fileType,
      headerVersion: cached.headerVersion,
      bodyVersion: cached.bodyVersion,
      seq: cached.seq,
      createdAt: cached.createdAt,
      updatedAt: cached.updatedAt,
      isDecrypted: true,
      isBodyLoaded: cached.body !== null,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Singleton
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Singleton artifact cache service instance.
 */
export const artifactCache = new ArtifactCacheService();
