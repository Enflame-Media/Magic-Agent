/**
 * Artifacts Store
 *
 * Manages artifact collection with optimized Map-based storage.
 * Artifacts represent files and outputs generated during Claude Code sessions.
 *
 * Features:
 * - Offline caching via IndexedDB (HAP-874)
 * - Version-based cache invalidation
 * - LRU eviction policy for cache management
 *
 * @example
 * ```typescript
 * const artifacts = useArtifactsStore();
 * artifacts.upsertArtifact(newArtifact);
 * const selected = artifacts.selectedArtifact;
 * ```
 *
 * @see HAP-874 - Offline Artifact Caching
 */

import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef } from 'vue';
import type { ApiNewArtifact } from '@happy/protocol';
import { artifactCache, type CacheStats, type CacheConfig } from '@/services/artifactCache';

/**
 * Artifact file types for display and syntax highlighting
 */
export type ArtifactFileType =
  | 'code'
  | 'image'
  | 'document'
  | 'data'
  | 'unknown';

/**
 * File tree node for hierarchical display
 */
export interface FileTreeNode {
  /** Node name (file or folder name) */
  name: string;
  /** Full path from root */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** Children nodes (for directories) */
  children?: FileTreeNode[];
  /** Associated artifact ID (for files) */
  artifactId?: string;
  /** File extension (for files) */
  extension?: string;
}

/**
 * Decrypted artifact header structure
 *
 * The header is stored encrypted; this is the decrypted form.
 */
export interface ArtifactHeader {
  /** Display title/filename */
  title: string | null;
  /** MIME type if known */
  mimeType?: string;
  /** File path within session context */
  filePath?: string;
  /** Language for syntax highlighting */
  language?: string;
  /** Associated session IDs */
  sessions?: string[];
}

/**
 * Decrypted artifact for UI
 *
 * Combines encrypted API data with decrypted content for display.
 */
export interface DecryptedArtifact {
  /** Unique artifact ID */
  id: string;
  /** Decrypted title/filename */
  title: string | null;
  /** File path (from header or derived) */
  filePath: string | null;
  /** MIME type */
  mimeType: string | null;
  /** Programming language */
  language: string | null;
  /** Associated session IDs */
  sessions: string[];
  /** Decrypted body content (lazy loaded) */
  body: string | null;
  /** File type category */
  fileType: ArtifactFileType;
  /** Header version for optimistic concurrency */
  headerVersion: number;
  /** Body version */
  bodyVersion: number | null;
  /** Sequence number for ordering */
  seq: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
  /** Whether content was successfully decrypted */
  isDecrypted: boolean;
  /** Whether body content is loaded */
  isBodyLoaded: boolean;
}

/**
 * Infer file type from MIME type or extension
 */
function inferFileType(
  mimeType: string | null,
  filePath: string | null
): ArtifactFileType {
  if (mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/')) return 'code';
    if (mimeType.includes('json') || mimeType.includes('xml')) return 'data';
    if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  }

  if (filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (!ext) return 'unknown';

    // Code files
    const codeExts = [
      'ts', 'tsx', 'js', 'jsx', 'vue', 'py', 'rb', 'go', 'rs', 'java',
      'kt', 'swift', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'sh', 'bash',
      'zsh', 'fish', 'ps1', 'sql', 'html', 'css', 'scss', 'less', 'sass',
    ];
    if (codeExts.includes(ext)) return 'code';

    // Image files
    const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp'];
    if (imageExts.includes(ext)) return 'image';

    // Data files
    const dataExts = ['json', 'xml', 'yaml', 'yml', 'toml', 'csv', 'tsv'];
    if (dataExts.includes(ext)) return 'data';

    // Document files
    const docExts = ['md', 'txt', 'pdf', 'doc', 'docx', 'rtf'];
    if (docExts.includes(ext)) return 'document';
  }

  return 'unknown';
}

/**
 * Infer language for syntax highlighting from file path
 */
function inferLanguage(filePath: string | null): string | null {
  if (!filePath) return null;

  const ext = filePath.split('.').pop()?.toLowerCase();
  if (!ext) return null;

  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'tsx',
    js: 'javascript',
    jsx: 'jsx',
    vue: 'vue',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'fish',
    ps1: 'powershell',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    sass: 'sass',
    json: 'json',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    txt: 'plaintext',
  };

  return langMap[ext] ?? null;
}

/**
 * Convert API update to DecryptedArtifact interface
 *
 * Note: This creates a placeholder - actual decryption happens
 * in the sync service using the encryption key.
 */
function fromApiUpdate(update: ApiNewArtifact): DecryptedArtifact {
  return {
    id: update.artifactId,
    title: null, // Set after decryption
    filePath: null,
    mimeType: null,
    language: null,
    sessions: [],
    body: null,
    fileType: 'unknown',
    headerVersion: update.headerVersion,
    bodyVersion: update.bodyVersion ?? null,
    seq: update.seq,
    createdAt: update.createdAt,
    updatedAt: update.updatedAt,
    isDecrypted: false,
    isBodyLoaded: false,
  };
}

export const useArtifactsStore = defineStore('artifacts', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Artifact collection indexed by ID
   * Using shallowRef for better performance with Map mutations
   */
  const artifacts = shallowRef<Map<string, DecryptedArtifact>>(new Map());

  /** Currently selected artifact ID */
  const selectedArtifactId = ref<string | null>(null);

  /** Loading state for body content */
  const loadingBodyIds = ref<Set<string>>(new Set());

  /** Whether cache is initialized (HAP-874) */
  const cacheInitialized = ref(false);

  /** Whether artifacts are loaded from cache (offline mode indicator) */
  const isOfflineMode = ref(false);

  /** Cache statistics for UI display */
  const cacheStats = ref<CacheStats | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Getters (Computed)
  // ─────────────────────────────────────────────────────────────────────────

  /** Currently selected artifact */
  const selectedArtifact = computed(() =>
    selectedArtifactId.value
      ? artifacts.value.get(selectedArtifactId.value) ?? null
      : null
  );

  /** Total number of artifacts */
  const count = computed(() => artifacts.value.size);

  /** Artifacts sorted by updatedAt (most recent first) */
  const artifactsList = computed(() =>
    Array.from(artifacts.value.values()).sort((a, b) => b.updatedAt - a.updatedAt)
  );

  /** Artifacts grouped by file type */
  const artifactsByType = computed(() => {
    const grouped: Record<ArtifactFileType, DecryptedArtifact[]> = {
      code: [],
      image: [],
      document: [],
      data: [],
      unknown: [],
    };

    for (const artifact of artifacts.value.values()) {
      grouped[artifact.fileType].push(artifact);
    }

    return grouped;
  });

  /** Artifacts for a specific session */
  function artifactsForSession(sessionId: string): DecryptedArtifact[] {
    return Array.from(artifacts.value.values())
      .filter((a) => a.sessions.includes(sessionId))
      .sort((a, b) => a.seq - b.seq);
  }

  /**
   * Build file tree from artifacts
   *
   * Optimized for large artifact collections (HAP-873):
   * - Single-pass tree construction
   * - Efficient path parsing with string slicing
   * - In-place sorting to avoid extra allocations
   * - Iterative sorting to prevent stack overflow
   */
  const fileTree = computed((): FileTreeNode[] => {
    const artifactValues = artifacts.value;
    if (artifactValues.size === 0) return [];

    // Pre-allocate pathMap with estimated size
    const pathMap = new Map<string, FileTreeNode>();
    const root: FileTreeNode[] = [];

    // Build tree in a single pass
    for (const artifact of artifactValues.values()) {
      const path = artifact.filePath || artifact.title || artifact.id;
      const parts = path.split('/').filter(Boolean);

      if (parts.length === 0) continue;

      let currentPath = '';
      let currentLevel = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;

        const isLast = i === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        let node = pathMap.get(currentPath);

        if (!node) {
          node = {
            name: part,
            path: currentPath,
            isDirectory: !isLast,
            children: isLast ? undefined : [],
            artifactId: isLast ? artifact.id : undefined,
            extension: isLast ? part.split('.').pop() ?? undefined : undefined,
          };
          pathMap.set(currentPath, node);
          currentLevel.push(node);
        }

        if (!isLast && node?.children) {
          currentLevel = node.children;
        }
      }
    }

    // Iterative sorting to avoid stack overflow with deep trees
    const sortNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      // Use a stack for iterative traversal
      const stack: FileTreeNode[][] = [nodes];

      while (stack.length > 0) {
        const current = stack.pop()!;

        // Sort in-place
        current.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });

        // Add children to stack
        for (const node of current) {
          if (node.children && node.children.length > 0) {
            stack.push(node.children);
          }
        }
      }

      return nodes;
    };

    return sortNodes(root);
  });

  /**
   * File tree node count (for performance monitoring)
   */
  const fileTreeNodeCount = computed((): number => {
    let count = 0;
    const countNodes = (nodes: FileTreeNode[]) => {
      count += nodes.length;
      for (const node of nodes) {
        if (node.children) {
          countNodes(node.children);
        }
      }
    };
    countNodes(fileTree.value);
    return count;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get an artifact by ID
   */
  function getArtifact(id: string): DecryptedArtifact | undefined {
    return artifacts.value.get(id);
  }

  /**
   * Insert or update an artifact
   */
  function upsertArtifact(artifact: DecryptedArtifact) {
    // Infer file type and language if not set
    if (artifact.fileType === 'unknown') {
      artifact.fileType = inferFileType(artifact.mimeType, artifact.filePath);
    }
    if (!artifact.language && artifact.fileType === 'code') {
      artifact.language = inferLanguage(artifact.filePath);
    }

    artifacts.value.set(artifact.id, artifact);
    triggerRef(artifacts);
  }

  /**
   * Insert or update from API update event (before decryption)
   */
  function upsertFromApi(update: ApiNewArtifact) {
    const artifact = fromApiUpdate(update);
    upsertArtifact(artifact);
  }

  /**
   * Update artifact with decrypted header
   */
  function applyDecryptedHeader(id: string, header: ArtifactHeader) {
    const existing = artifacts.value.get(id);
    if (existing) {
      const updated: DecryptedArtifact = {
        ...existing,
        title: header.title,
        filePath: header.filePath ?? null,
        mimeType: header.mimeType ?? null,
        language: header.language ?? inferLanguage(header.filePath ?? null),
        sessions: header.sessions ?? [],
        fileType: inferFileType(header.mimeType ?? null, header.filePath ?? null),
        isDecrypted: true,
      };
      artifacts.value.set(id, updated);
      triggerRef(artifacts);
    }
  }

  /**
   * Update artifact with decrypted body content
   */
  function applyDecryptedBody(id: string, body: string | null) {
    const existing = artifacts.value.get(id);
    if (existing) {
      artifacts.value.set(id, {
        ...existing,
        body,
        isBodyLoaded: true,
      });
      loadingBodyIds.value.delete(id);
      triggerRef(artifacts);
    }
  }

  /**
   * Mark artifact body as loading
   */
  function setBodyLoading(id: string, loading: boolean) {
    if (loading) {
      loadingBodyIds.value.add(id);
    } else {
      loadingBodyIds.value.delete(id);
    }
  }

  /**
   * Check if body is currently loading
   */
  function isBodyLoading(id: string): boolean {
    return loadingBodyIds.value.has(id);
  }

  /**
   * Update partial artifact data
   */
  function updateArtifact(
    id: string,
    updates: Partial<Omit<DecryptedArtifact, 'id'>>
  ) {
    const existing = artifacts.value.get(id);
    if (existing) {
      artifacts.value.set(id, { ...existing, ...updates });
      triggerRef(artifacts);
    }
  }

  /**
   * Remove an artifact by ID
   */
  function removeArtifact(id: string) {
    const deleted = artifacts.value.delete(id);
    if (deleted) {
      triggerRef(artifacts);
      // Clear selection if it was the deleted artifact
      if (selectedArtifactId.value === id) {
        selectedArtifactId.value = null;
      }
    }
  }

  /**
   * Set the selected artifact
   */
  function setSelectedArtifact(id: string | null) {
    selectedArtifactId.value = id;
  }

  /**
   * Bulk update artifacts (for initial sync)
   */
  function setArtifacts(newArtifacts: DecryptedArtifact[]) {
    const map = new Map<string, DecryptedArtifact>();
    for (const artifact of newArtifacts) {
      map.set(artifact.id, artifact);
    }
    artifacts.value = map;
    triggerRef(artifacts);
  }

  /**
   * Clear all artifacts
   */
  function clearArtifacts() {
    artifacts.value = new Map();
    selectedArtifactId.value = null;
    loadingBodyIds.value = new Set();
    triggerRef(artifacts);
  }

  /**
   * Reset store to initial state
   */
  function $reset() {
    clearArtifacts();
    isOfflineMode.value = false;
    cacheStats.value = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Operations (HAP-874)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the artifact cache.
   * Should be called when the app starts.
   */
  async function initializeCache(): Promise<void> {
    if (cacheInitialized.value) return;

    try {
      await artifactCache.initialize();
      cacheInitialized.value = true;
      await refreshCacheStats();
      console.debug('[artifacts] Cache initialized');
    } catch (error) {
      console.error('[artifacts] Failed to initialize cache:', error);
    }
  }

  /**
   * Load cached artifacts for offline viewing.
   * Sets isOfflineMode to true when loading from cache.
   */
  async function loadFromCache(): Promise<void> {
    if (!cacheInitialized.value) {
      await initializeCache();
    }

    try {
      const cachedArtifacts = await artifactCache.loadCachedArtifacts();
      if (cachedArtifacts.length > 0) {
        setArtifacts(cachedArtifacts);
        isOfflineMode.value = true;
        console.debug(`[artifacts] Loaded ${cachedArtifacts.length} artifacts from cache`);
      }
    } catch (error) {
      console.error('[artifacts] Failed to load from cache:', error);
    }
  }

  /**
   * Load cached artifacts for a specific session.
   *
   * @param sessionId - Session ID to load artifacts for
   */
  async function loadCachedForSession(sessionId: string): Promise<void> {
    if (!cacheInitialized.value) {
      await initializeCache();
    }

    try {
      const cachedArtifacts = await artifactCache.getCachedForSession(sessionId);
      if (cachedArtifacts.length > 0) {
        for (const artifact of cachedArtifacts) {
          artifacts.value.set(artifact.id, artifact);
        }
        triggerRef(artifacts);
        isOfflineMode.value = true;
        console.debug(`[artifacts] Loaded ${cachedArtifacts.length} cached artifacts for session ${sessionId}`);
      }
    } catch (error) {
      console.error(`[artifacts] Failed to load cached artifacts for session ${sessionId}:`, error);
    }
  }

  /**
   * Cache an artifact after decryption.
   * Called automatically when artifacts are decrypted.
   *
   * @param artifact - Artifact to cache
   */
  async function cacheArtifact(artifact: DecryptedArtifact): Promise<void> {
    if (!cacheInitialized.value) {
      await initializeCache();
    }

    try {
      await artifactCache.cacheArtifact(artifact);
    } catch (error) {
      console.error(`[artifacts] Failed to cache artifact ${artifact.id}:`, error);
    }
  }

  /**
   * Cache artifact body content.
   * Called when body is loaded on-demand.
   *
   * @param id - Artifact ID
   * @param body - Body content to cache
   */
  async function cacheBody(id: string, body: string | null): Promise<void> {
    if (!cacheInitialized.value) return;

    try {
      await artifactCache.cacheBody(id, body);
    } catch (error) {
      console.error(`[artifacts] Failed to cache body for ${id}:`, error);
    }
  }

  /**
   * Check if a cached artifact is stale.
   *
   * @param id - Artifact ID
   * @param headerVersion - Current header version from server
   * @param bodyVersion - Current body version from server
   * @returns True if cache needs refresh
   */
  async function isCacheStale(
    id: string,
    headerVersion: number,
    bodyVersion: number | null
  ): Promise<boolean> {
    if (!cacheInitialized.value) return true;
    return artifactCache.isStale(id, headerVersion, bodyVersion);
  }

  /**
   * Remove a cached artifact.
   *
   * @param id - Artifact ID
   */
  async function removeCached(id: string): Promise<void> {
    if (!cacheInitialized.value) return;

    try {
      await artifactCache.removeCached(id);
    } catch (error) {
      console.error(`[artifacts] Failed to remove cached artifact ${id}:`, error);
    }
  }

  /**
   * Clear the entire artifact cache.
   */
  async function clearCache(): Promise<void> {
    try {
      await artifactCache.clearCache();
      await refreshCacheStats();
      console.debug('[artifacts] Cache cleared');
    } catch (error) {
      console.error('[artifacts] Failed to clear cache:', error);
    }
  }

  /**
   * Refresh cache statistics.
   */
  async function refreshCacheStats(): Promise<void> {
    try {
      cacheStats.value = await artifactCache.getStats();
    } catch (error) {
      console.error('[artifacts] Failed to get cache stats:', error);
    }
  }

  /**
   * Get current cache configuration.
   */
  function getCacheConfig(): CacheConfig {
    return artifactCache.getConfig();
  }

  /**
   * Update cache configuration.
   *
   * @param config - Partial configuration to update
   */
  function setCacheConfig(config: Partial<CacheConfig>): void {
    artifactCache.setConfig(config);
  }

  /**
   * Clear offline mode flag.
   * Called when live data is received from server.
   */
  function clearOfflineMode(): void {
    isOfflineMode.value = false;
  }

  return {
    // State
    artifacts,
    selectedArtifactId,
    loadingBodyIds,
    cacheInitialized,
    isOfflineMode,
    cacheStats,
    // Getters
    selectedArtifact,
    count,
    artifactsList,
    artifactsByType,
    fileTree,
    fileTreeNodeCount,
    // Actions
    getArtifact,
    upsertArtifact,
    upsertFromApi,
    applyDecryptedHeader,
    applyDecryptedBody,
    setBodyLoading,
    isBodyLoading,
    updateArtifact,
    removeArtifact,
    setSelectedArtifact,
    setArtifacts,
    clearArtifacts,
    artifactsForSession,
    $reset,
    // Cache Actions (HAP-874)
    initializeCache,
    loadFromCache,
    loadCachedForSession,
    cacheArtifact,
    cacheBody,
    isCacheStale,
    removeCached,
    clearCache,
    refreshCacheStats,
    getCacheConfig,
    setCacheConfig,
    clearOfflineMode,
  };
});
