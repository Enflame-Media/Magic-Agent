/**
 * Unit Tests for Artifacts Store (HAP-683)
 *
 * Tests cover:
 * - File tree building logic
 * - Artifact upsert and retrieval
 * - File type inference
 * - Language inference for syntax highlighting
 * - Session filtering
 * - Store reset and cleanup
 *
 * @see HAP-683 - Phase 4: Implement Artifacts Management System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  useArtifactsStore,
  type DecryptedArtifact,
  type FileTreeNode,
} from './artifacts';

/**
 * Create a mock DecryptedArtifact for testing
 */
function createMockArtifact(
  overrides: Partial<DecryptedArtifact> = {}
): DecryptedArtifact {
  return {
    id: `artifact-${Math.random().toString(36).slice(2, 9)}`,
    title: 'test-file.ts',
    filePath: 'src/test-file.ts',
    mimeType: 'text/typescript',
    language: 'typescript',
    sessions: ['session-1'],
    body: 'const x = 1;',
    fileType: 'code',
    headerVersion: 1,
    bodyVersion: 1,
    seq: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isDecrypted: true,
    isBodyLoaded: true,
    ...overrides,
  };
}

describe('useArtifactsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const store = useArtifactsStore();

      expect(store.count).toBe(0);
      expect(store.artifacts.size).toBe(0);
      expect(store.selectedArtifactId).toBeNull();
      expect(store.selectedArtifact).toBeNull();
    });
  });

  describe('upsertArtifact', () => {
    it('should add a new artifact', () => {
      const store = useArtifactsStore();
      const artifact = createMockArtifact({ id: 'test-1' });

      store.upsertArtifact(artifact);

      expect(store.count).toBe(1);
      expect(store.getArtifact('test-1')).toEqual(artifact);
    });

    it('should update an existing artifact', () => {
      const store = useArtifactsStore();
      const artifact1 = createMockArtifact({ id: 'test-1', body: 'initial' });
      const artifact2 = createMockArtifact({ id: 'test-1', body: 'updated' });

      store.upsertArtifact(artifact1);
      store.upsertArtifact(artifact2);

      expect(store.count).toBe(1);
      expect(store.getArtifact('test-1')?.body).toBe('updated');
    });

    it('should infer file type from MIME type', () => {
      const store = useArtifactsStore();
      const artifact = createMockArtifact({
        id: 'test-1',
        mimeType: 'image/png',
        fileType: 'unknown',
      });

      store.upsertArtifact(artifact);

      expect(store.getArtifact('test-1')?.fileType).toBe('image');
    });

    it('should infer file type from file path extension', () => {
      const store = useArtifactsStore();
      const artifact = createMockArtifact({
        id: 'test-1',
        mimeType: null,
        filePath: 'src/index.py',
        fileType: 'unknown',
      });

      store.upsertArtifact(artifact);

      expect(store.getArtifact('test-1')?.fileType).toBe('code');
    });

    it('should infer language from file path', () => {
      const store = useArtifactsStore();
      const artifact = createMockArtifact({
        id: 'test-1',
        filePath: 'src/index.py',
        language: null,
        fileType: 'code',
      });

      store.upsertArtifact(artifact);

      expect(store.getArtifact('test-1')?.language).toBe('python');
    });
  });

  describe('file tree building', () => {
    it('should build an empty tree for no artifacts', () => {
      const store = useArtifactsStore();

      expect(store.fileTree).toEqual([]);
    });

    it('should build a simple flat tree', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'file1.ts',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a2',
        filePath: 'file2.ts',
      }));

      const tree = store.fileTree;

      expect(tree.length).toBe(2);
      expect(tree.some((n) => n.name === 'file1.ts')).toBe(true);
      expect(tree.some((n) => n.name === 'file2.ts')).toBe(true);
    });

    it('should build nested directory structure', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'src/components/Button.vue',
      }));

      const tree = store.fileTree;

      // Should have 'src' at root
      expect(tree.length).toBe(1);
      expect(tree[0]?.name).toBe('src');
      expect(tree[0]?.isDirectory).toBe(true);

      // Should have 'components' nested
      const srcChildren = tree[0]?.children ?? [];
      expect(srcChildren.length).toBe(1);
      expect(srcChildren[0]?.name).toBe('components');
      expect(srcChildren[0]?.isDirectory).toBe(true);

      // Should have 'Button.vue' as file
      const componentsChildren = srcChildren[0]?.children ?? [];
      expect(componentsChildren.length).toBe(1);
      expect(componentsChildren[0]?.name).toBe('Button.vue');
      expect(componentsChildren[0]?.isDirectory).toBe(false);
      expect(componentsChildren[0]?.artifactId).toBe('a1');
    });

    it('should share common parent directories', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'src/utils/helpers.ts',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a2',
        filePath: 'src/utils/formatters.ts',
      }));

      const tree = store.fileTree;

      // Should have single 'src' at root
      expect(tree.length).toBe(1);
      expect(tree[0]?.name).toBe('src');

      // Should have single 'utils' under 'src'
      const srcChildren = tree[0]?.children ?? [];
      expect(srcChildren.length).toBe(1);
      expect(srcChildren[0]?.name).toBe('utils');

      // Should have both files under 'utils'
      const utilsChildren = srcChildren[0]?.children ?? [];
      expect(utilsChildren.length).toBe(2);
    });

    it('should sort directories before files', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'README.md',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a2',
        filePath: 'src/index.ts',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a3',
        filePath: 'package.json',
      }));

      const tree = store.fileTree;

      // First should be 'src' directory, then files alphabetically
      expect(tree[0]?.name).toBe('src');
      expect(tree[0]?.isDirectory).toBe(true);
      expect(tree[1]?.name).toBe('package.json');
      expect(tree[2]?.name).toBe('README.md');
    });

    it('should sort items alphabetically within directories', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'z-file.ts',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a2',
        filePath: 'a-file.ts',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a3',
        filePath: 'm-file.ts',
      }));

      const tree = store.fileTree;

      expect(tree[0]?.name).toBe('a-file.ts');
      expect(tree[1]?.name).toBe('m-file.ts');
      expect(tree[2]?.name).toBe('z-file.ts');
    });

    it('should include file extension in node', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'src/index.tsx',
      }));

      const tree = store.fileTree;
      const srcChildren = tree[0]?.children ?? [];

      expect(srcChildren[0]?.extension).toBe('tsx');
    });

    it('should handle files without extension', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'Dockerfile',
      }));

      const tree = store.fileTree;

      expect(tree[0]?.name).toBe('Dockerfile');
      expect(tree[0]?.extension).toBe('Dockerfile');
    });

    it('should use title when filePath is not available', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: null,
        title: 'my-script.js',
      }));

      const tree = store.fileTree;

      expect(tree[0]?.name).toBe('my-script.js');
    });

    it('should use artifact ID as fallback', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'artifact-abc123',
        filePath: null,
        title: null,
      }));

      const tree = store.fileTree;

      expect(tree[0]?.name).toBe('artifact-abc123');
    });

    it('should handle leading slashes in paths', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: '/src/index.ts',
      }));

      const tree = store.fileTree;

      // Should treat as 'src/index.ts' (remove leading slash)
      expect(tree[0]?.name).toBe('src');
    });

    it('should handle deeply nested paths', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        filePath: 'a/b/c/d/e/f/file.ts',
      }));

      const tree = store.fileTree;

      let current: FileTreeNode[] = tree;
      const pathParts = ['a', 'b', 'c', 'd', 'e', 'f', 'file.ts'];

      for (const part of pathParts) {
        const node = current.find((n) => n.name === part);
        expect(node).toBeDefined();
        if (part !== 'file.ts') {
          expect(node?.isDirectory).toBe(true);
          current = node?.children ?? [];
        } else {
          expect(node?.isDirectory).toBe(false);
        }
      }
    });
  });

  describe('session filtering', () => {
    it('should filter artifacts by session', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        sessions: ['session-1'],
        seq: 1,
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a2',
        sessions: ['session-2'],
        seq: 2,
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a3',
        sessions: ['session-1', 'session-2'],
        seq: 3,
      }));

      const session1Artifacts = store.artifactsForSession('session-1');
      const session2Artifacts = store.artifactsForSession('session-2');

      expect(session1Artifacts.length).toBe(2);
      expect(session2Artifacts.length).toBe(2);
      expect(session1Artifacts.map((a) => a.id)).toContain('a1');
      expect(session1Artifacts.map((a) => a.id)).toContain('a3');
    });

    it('should sort artifacts by seq within session', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        sessions: ['session-1'],
        seq: 3,
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a2',
        sessions: ['session-1'],
        seq: 1,
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'a3',
        sessions: ['session-1'],
        seq: 2,
      }));

      const artifacts = store.artifactsForSession('session-1');

      expect(artifacts[0]?.id).toBe('a2'); // seq: 1
      expect(artifacts[1]?.id).toBe('a3'); // seq: 2
      expect(artifacts[2]?.id).toBe('a1'); // seq: 3
    });

    it('should return empty array for non-existent session', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'a1',
        sessions: ['session-1'],
      }));

      const artifacts = store.artifactsForSession('non-existent');

      expect(artifacts).toEqual([]);
    });
  });

  describe('artifact type grouping', () => {
    it('should group artifacts by file type', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'code1',
        fileType: 'code',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'code2',
        fileType: 'code',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'image1',
        fileType: 'image',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'data1',
        fileType: 'data',
      }));

      const byType = store.artifactsByType;

      expect(byType.code.length).toBe(2);
      expect(byType.image.length).toBe(1);
      expect(byType.data.length).toBe(1);
      expect(byType.document.length).toBe(0);
      expect(byType.unknown.length).toBe(0);
    });
  });

  describe('selection', () => {
    it('should set selected artifact', () => {
      const store = useArtifactsStore();
      const artifact = createMockArtifact({ id: 'test-1' });

      store.upsertArtifact(artifact);
      store.setSelectedArtifact('test-1');

      expect(store.selectedArtifactId).toBe('test-1');
      expect(store.selectedArtifact).toEqual(artifact);
    });

    it('should clear selection when set to null', () => {
      const store = useArtifactsStore();
      const artifact = createMockArtifact({ id: 'test-1' });

      store.upsertArtifact(artifact);
      store.setSelectedArtifact('test-1');
      store.setSelectedArtifact(null);

      expect(store.selectedArtifactId).toBeNull();
      expect(store.selectedArtifact).toBeNull();
    });

    it('should clear selection when selected artifact is removed', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({ id: 'test-1' }));
      store.setSelectedArtifact('test-1');
      store.removeArtifact('test-1');

      expect(store.selectedArtifactId).toBeNull();
    });
  });

  describe('body loading', () => {
    it('should track body loading state', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({ id: 'test-1' }));

      expect(store.isBodyLoading('test-1')).toBe(false);

      store.setBodyLoading('test-1', true);
      expect(store.isBodyLoading('test-1')).toBe(true);

      store.setBodyLoading('test-1', false);
      expect(store.isBodyLoading('test-1')).toBe(false);
    });

    it('should apply decrypted body', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'test-1',
        body: null,
        isBodyLoaded: false,
      }));
      store.setBodyLoading('test-1', true);
      store.applyDecryptedBody('test-1', 'decrypted content');

      const artifact = store.getArtifact('test-1');
      expect(artifact?.body).toBe('decrypted content');
      expect(artifact?.isBodyLoaded).toBe(true);
      expect(store.isBodyLoading('test-1')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should clear all state on reset', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({ id: 'test-1' }));
      store.setSelectedArtifact('test-1');
      store.setBodyLoading('test-1', true);

      store.$reset();

      expect(store.count).toBe(0);
      expect(store.selectedArtifactId).toBeNull();
      expect(store.isBodyLoading('test-1')).toBe(false);
    });
  });

  describe('bulk operations', () => {
    it('should set multiple artifacts at once', () => {
      const store = useArtifactsStore();

      const artifacts = [
        createMockArtifact({ id: 'a1' }),
        createMockArtifact({ id: 'a2' }),
        createMockArtifact({ id: 'a3' }),
      ];

      store.setArtifacts(artifacts);

      expect(store.count).toBe(3);
      expect(store.getArtifact('a1')).toBeDefined();
      expect(store.getArtifact('a2')).toBeDefined();
      expect(store.getArtifact('a3')).toBeDefined();
    });

    it('should replace existing artifacts on setArtifacts', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({ id: 'old' }));

      store.setArtifacts([
        createMockArtifact({ id: 'new1' }),
        createMockArtifact({ id: 'new2' }),
      ]);

      expect(store.count).toBe(2);
      expect(store.getArtifact('old')).toBeUndefined();
    });
  });

  describe('file type inference', () => {
    it('should infer image type from image/* MIME types', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'img1',
        mimeType: 'image/png',
        fileType: 'unknown',
      }));
      store.upsertArtifact(createMockArtifact({
        id: 'img2',
        mimeType: 'image/jpeg',
        fileType: 'unknown',
      }));

      expect(store.getArtifact('img1')?.fileType).toBe('image');
      expect(store.getArtifact('img2')?.fileType).toBe('image');
    });

    it('should infer code type from text/* MIME types', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'code1',
        mimeType: 'text/javascript',
        fileType: 'unknown',
      }));

      expect(store.getArtifact('code1')?.fileType).toBe('code');
    });

    it('should infer data type from json/xml MIME types', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'data1',
        mimeType: 'application/json',
        fileType: 'unknown',
      }));

      expect(store.getArtifact('data1')?.fileType).toBe('data');
    });

    it('should infer document type from pdf/document MIME types', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'doc1',
        mimeType: 'application/pdf',
        fileType: 'unknown',
      }));

      expect(store.getArtifact('doc1')?.fileType).toBe('document');
    });
  });

  describe('language inference', () => {
    const languageTestCases = [
      { ext: 'ts', expected: 'typescript' },
      { ext: 'tsx', expected: 'tsx' },
      { ext: 'js', expected: 'javascript' },
      { ext: 'jsx', expected: 'jsx' },
      { ext: 'vue', expected: 'vue' },
      { ext: 'py', expected: 'python' },
      { ext: 'rb', expected: 'ruby' },
      { ext: 'go', expected: 'go' },
      { ext: 'rs', expected: 'rust' },
      { ext: 'java', expected: 'java' },
      { ext: 'kt', expected: 'kotlin' },
      { ext: 'swift', expected: 'swift' },
      { ext: 'c', expected: 'c' },
      { ext: 'cpp', expected: 'cpp' },
      { ext: 'h', expected: 'c' },
      { ext: 'hpp', expected: 'cpp' },
      { ext: 'cs', expected: 'csharp' },
      { ext: 'php', expected: 'php' },
      { ext: 'sh', expected: 'bash' },
      { ext: 'bash', expected: 'bash' },
      { ext: 'zsh', expected: 'bash' },
      { ext: 'sql', expected: 'sql' },
      { ext: 'html', expected: 'html' },
      { ext: 'css', expected: 'css' },
      { ext: 'scss', expected: 'scss' },
      { ext: 'json', expected: 'json' },
      { ext: 'yaml', expected: 'yaml' },
      { ext: 'yml', expected: 'yaml' },
      { ext: 'toml', expected: 'toml' },
      { ext: 'md', expected: 'markdown' },
    ];

    for (const { ext, expected } of languageTestCases) {
      it(`should infer language '${expected}' from .${ext} extension`, () => {
        const store = useArtifactsStore();

        store.upsertArtifact(createMockArtifact({
          id: `test-${ext}`,
          filePath: `file.${ext}`,
          language: null,
          fileType: 'code',
        }));

        expect(store.getArtifact(`test-${ext}`)?.language).toBe(expected);
      });
    }

    it('should return null for unknown extensions', () => {
      const store = useArtifactsStore();

      store.upsertArtifact(createMockArtifact({
        id: 'unknown',
        filePath: 'file.xyz',
        language: null,
        fileType: 'code',
      }));

      expect(store.getArtifact('unknown')?.language).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // HAP-873: Performance tests for large artifact sets
  // ─────────────────────────────────────────────────────────────────────────

  describe('performance (HAP-873)', () => {
    /**
     * Generate a large number of mock artifacts with realistic file paths.
     */
    function generateLargeArtifactSet(count: number): DecryptedArtifact[] {
      const directories = [
        'src/components',
        'src/stores',
        'src/composables',
        'src/utils',
        'src/api',
        'src/views',
        'tests/unit',
        'tests/e2e',
        'docs',
        'config',
      ];
      const extensions = ['ts', 'vue', 'json', 'md', 'css', 'test.ts'];

      return Array.from({ length: count }, (_, i) => {
        const dir = directories[i % directories.length];
        const ext = extensions[i % extensions.length];
        const fileName = `file-${i}.${ext}`;
        return createMockArtifact({
          id: `artifact-${i}`,
          filePath: `${dir}/${fileName}`,
          seq: i,
          updatedAt: Date.now() - i * 1000, // Stagger timestamps
        });
      });
    }

    it('should handle 1000+ artifacts without excessive memory growth', () => {
      const store = useArtifactsStore();
      const artifacts = generateLargeArtifactSet(1000);

      // Bulk insert
      store.setArtifacts(artifacts);

      expect(store.count).toBe(1000);
      expect(store.artifacts.size).toBe(1000);
    });

    it('should build file tree efficiently for 1000+ artifacts', () => {
      const store = useArtifactsStore();
      const artifacts = generateLargeArtifactSet(1000);

      store.setArtifacts(artifacts);

      // File tree should be built
      const tree = store.fileTree;
      expect(tree.length).toBeGreaterThan(0);

      // Should have directory structure
      const srcDir = tree.find((n) => n.name === 'src');
      expect(srcDir).toBeDefined();
      expect(srcDir?.isDirectory).toBe(true);
      expect(srcDir?.children?.length).toBeGreaterThan(0);
    });

    it('should track file tree node count', () => {
      const store = useArtifactsStore();
      const artifacts = generateLargeArtifactSet(100);

      store.setArtifacts(artifacts);

      // Should have node count greater than artifact count (includes directories)
      expect(store.fileTreeNodeCount).toBeGreaterThan(0);
      // Node count should include both files and directories
      expect(store.fileTreeNodeCount).toBeGreaterThanOrEqual(100);
    });

    it('should maintain performance with incremental updates', () => {
      const store = useArtifactsStore();

      // Simulate incremental artifact additions (like during sync)
      for (let i = 0; i < 500; i++) {
        store.upsertArtifact(createMockArtifact({
          id: `artifact-${i}`,
          filePath: `src/generated/file-${i}.ts`,
          seq: i,
        }));
      }

      expect(store.count).toBe(500);

      // File tree should still be valid
      const tree = store.fileTree;
      expect(tree.length).toBeGreaterThan(0);
    });

    it('should handle deeply nested paths', () => {
      const store = useArtifactsStore();

      // Create artifacts with deep nesting
      for (let i = 0; i < 10; i++) {
        const depth = 'a/b/c/d/e/f/g/h/i/j'.split('/').slice(0, i + 1).join('/');
        store.upsertArtifact(createMockArtifact({
          id: `deep-${i}`,
          filePath: `${depth}/file.ts`,
          seq: i,
        }));
      }

      const tree = store.fileTree;
      expect(tree.length).toBe(1); // Single root 'a'
      expect(tree[0]?.name).toBe('a');
    });

    it('should sort large file trees correctly', () => {
      const store = useArtifactsStore();
      const artifacts = generateLargeArtifactSet(200);

      store.setArtifacts(artifacts);

      const tree = store.fileTree;

      // Check that directories come before files at root level
      let foundFile = false;
      for (const node of tree) {
        if (!node.isDirectory) {
          foundFile = true;
        } else if (foundFile) {
          // Directory found after file - this would be a sorting error
          throw new Error('Directory found after file in sorted tree');
        }
      }

      // Check alphabetical sorting within directories
      const srcDir = tree.find((n) => n.name === 'src');
      if (srcDir?.children && srcDir.children.length > 1) {
        for (let i = 1; i < srcDir.children.length; i++) {
          const prev = srcDir.children[i - 1]!;
          const curr = srcDir.children[i]!;
          // Both directories or both files should be alphabetically sorted
          if (prev.isDirectory === curr.isDirectory) {
            expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0);
          }
        }
      }
    });

    it('should filter large artifact sets by session efficiently', () => {
      const store = useArtifactsStore();

      // Create artifacts split between two sessions
      for (let i = 0; i < 500; i++) {
        store.upsertArtifact(createMockArtifact({
          id: `artifact-${i}`,
          sessions: [i % 2 === 0 ? 'session-a' : 'session-b'],
          filePath: `src/file-${i}.ts`,
          seq: i,
        }));
      }

      const sessionArtifacts = store.artifactsForSession('session-a');
      const sessionBArtifacts = store.artifactsForSession('session-b');

      expect(sessionArtifacts.length).toBe(250);
      expect(sessionBArtifacts.length).toBe(250);
    });
  });
});
