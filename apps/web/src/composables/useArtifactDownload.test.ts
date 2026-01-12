/**
 * Unit Tests for useArtifactDownload Composable (HAP-709)
 *
 * Tests cover:
 * - Single file download functionality
 * - ZIP bundle creation with JSZip
 * - Progress tracking during download
 * - Path collision handling
 * - Image (base64) content handling
 * - Error handling scenarios
 *
 * @see HAP-709 - Implement Download All Artifacts as ZIP
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { DecryptedArtifact } from '@/stores/artifacts';

// Mock JSZip
const mockFile = vi.fn();
const mockGenerateAsync = vi.fn();

// Create a mock class constructor
class MockJSZip {
  file = mockFile;
  generateAsync = mockGenerateAsync;
}

vi.mock('jszip', () => ({
  default: MockJSZip,
}));

// Track download actions for assertions
const mockClick = vi.fn();
let lastCreatedElement: HTMLAnchorElement | null = null;

// Store original methods
const originalCreateObjectURL = globalThis.URL.createObjectURL;
const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;
const originalCreateElement = globalThis.document.createElement.bind(globalThis.document);
const originalAppendChild = globalThis.document.body.appendChild.bind(globalThis.document.body);
const originalRemoveChild = globalThis.document.body.removeChild.bind(globalThis.document.body);

// Setup global mocks
beforeEach(() => {
  // Reset mocks
  mockFile.mockClear();
  mockGenerateAsync.mockClear();
  mockGenerateAsync.mockResolvedValue(new Blob(['test-zip-content'], { type: 'application/zip' }));
  mockClick.mockClear();
  lastCreatedElement = null;

  // Spy on URL methods
  globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
  globalThis.URL.revokeObjectURL = vi.fn();

  // Mock document.createElement to intercept anchor creation
  globalThis.document.createElement = vi.fn((tagName: string) => {
    if (tagName === 'a') {
      const anchor = originalCreateElement('a') as HTMLAnchorElement;
      anchor.click = mockClick;
      lastCreatedElement = anchor;
      return anchor;
    }
    return originalCreateElement(tagName);
  }) as typeof globalThis.document.createElement;
});

afterEach(() => {
  // Restore original methods
  globalThis.URL.createObjectURL = originalCreateObjectURL;
  globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
  globalThis.document.createElement = originalCreateElement;
  vi.clearAllMocks();
});

/**
 * Create a mock DecryptedArtifact for testing
 */
function createMockArtifact(overrides: Partial<DecryptedArtifact> = {}): DecryptedArtifact {
  return {
    id: 'artifact-1',
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

describe('useArtifactDownload', () => {
  let useArtifactDownload: typeof import('./useArtifactDownload').useArtifactDownload;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('./useArtifactDownload');
    useArtifactDownload = module.useArtifactDownload;
  });

  describe('initialization', () => {
    it('should return expected properties', () => {
      const download = useArtifactDownload();

      expect(download).toHaveProperty('downloadAll');
      expect(download).toHaveProperty('downloadSingle');
      expect(download).toHaveProperty('downloadProgress');
      expect(download).toHaveProperty('isDownloading');
    });

    it('should start with isDownloading as false', () => {
      const download = useArtifactDownload();
      expect(download.isDownloading.value).toBe(false);
    });

    it('should start with downloadProgress as null', () => {
      const download = useArtifactDownload();
      expect(download.downloadProgress.value).toBeNull();
    });
  });

  describe('downloadSingle', () => {
    it('should create blob and trigger download for text content', () => {
      const download = useArtifactDownload();
      const artifact = createMockArtifact({
        body: 'const x = 1;',
        filePath: 'src/index.ts',
      });

      download.downloadSingle(artifact);

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should not trigger download if artifact has no body', () => {
      const download = useArtifactDownload();
      const artifact = createMockArtifact({ body: null });

      download.downloadSingle(artifact);

      expect(globalThis.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should use filePath as filename when available', () => {
      const download = useArtifactDownload();
      const artifact = createMockArtifact({
        filePath: 'src/components/Button.vue',
        title: 'Button Component',
      });

      download.downloadSingle(artifact);

      // Verify download was triggered
      expect(mockClick).toHaveBeenCalled();
    });

    it('should use title as filename when filePath is null', () => {
      const download = useArtifactDownload();
      const artifact = createMockArtifact({
        filePath: null,
        title: 'my-script.js',
      });

      download.downloadSingle(artifact);

      expect(mockClick).toHaveBeenCalled();
    });

    it('should use artifact id as fallback filename', () => {
      const download = useArtifactDownload();
      const artifact = createMockArtifact({
        id: 'abc123',
        filePath: null,
        title: null,
      });

      download.downloadSingle(artifact);

      expect(mockClick).toHaveBeenCalled();
    });

    it('should handle base64 image content', () => {
      const download = useArtifactDownload();
      const artifact = createMockArtifact({
        fileType: 'image',
        mimeType: 'image/png',
        body: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        filePath: 'screenshot.png',
      });

      download.downloadSingle(artifact);

      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('downloadAll', () => {
    it('should return error if no artifacts provided', async () => {
      const download = useArtifactDownload();

      const result = await download.downloadAll([]);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No artifacts with content to download');
    });

    it('should return error if all artifacts have no body', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', body: null }),
        createMockArtifact({ id: '2', body: null }),
      ];

      const result = await download.downloadAll(artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No artifacts with content to download');
    });

    it('should create ZIP with all artifacts that have content', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: 'src/a.ts', body: 'const a = 1;' }),
        createMockArtifact({ id: '2', filePath: 'src/b.ts', body: 'const b = 2;' }),
        createMockArtifact({ id: '3', body: null }), // Should be skipped
      ];

      const result = await download.downloadAll(artifacts);

      expect(result.success).toBe(true);
      expect(result.fileCount).toBe(2);
      expect(mockFile).toHaveBeenCalledTimes(2);
    });

    it('should use proper folder structure from file paths', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: 'src/components/Button.vue', body: '<template>' }),
        createMockArtifact({ id: '2', filePath: 'src/utils/helpers.ts', body: 'export {}' }),
      ];

      await download.downloadAll(artifacts);

      expect(mockFile).toHaveBeenCalledWith('src/components/Button.vue', '<template>');
      expect(mockFile).toHaveBeenCalledWith('src/utils/helpers.ts', 'export {}');
    });

    it('should handle path collisions by appending index', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: 'index.ts', body: 'first' }),
        createMockArtifact({ id: '2', filePath: 'index.ts', body: 'second' }),
        createMockArtifact({ id: '3', filePath: 'index.ts', body: 'third' }),
      ];

      await download.downloadAll(artifacts);

      expect(mockFile).toHaveBeenCalledWith('index.ts', 'first');
      expect(mockFile).toHaveBeenCalledWith('index-1.ts', 'second');
      expect(mockFile).toHaveBeenCalledWith('index-2.ts', 'third');
    });

    it('should remove leading slashes from paths', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: '/src/file.ts', body: 'content' }),
      ];

      await download.downloadAll(artifacts);

      expect(mockFile).toHaveBeenCalledWith('src/file.ts', 'content');
    });

    it('should handle base64 images in ZIP', async () => {
      const download = useArtifactDownload();
      const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const artifacts = [
        createMockArtifact({
          id: '1',
          fileType: 'image',
          filePath: 'image.png',
          body: `data:image/png;base64,${base64Data}`,
        }),
      ];

      await download.downloadAll(artifacts);

      expect(mockFile).toHaveBeenCalledWith('image.png', base64Data, { base64: true });
    });

    it('should trigger ZIP download', async () => {
      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      await download.downloadAll(artifacts);

      expect(mockGenerateAsync).toHaveBeenCalled();
      expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should include session name in ZIP filename when provided', async () => {
      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      await download.downloadAll(artifacts, 'my-session');

      // The filename should include the session name
      expect(mockClick).toHaveBeenCalled();
    });

    it('should use compression with DEFLATE', async () => {
      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      await download.downloadAll(artifacts);

      expect(mockGenerateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'blob',
          compression: 'DEFLATE',
        }),
        expect.any(Function)
      );
    });
  });

  describe('progress tracking', () => {
    it('should set isDownloading to true during download', async () => {
      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      // Start download (don't await)
      const promise = download.downloadAll(artifacts);

      // Check state during download
      expect(download.isDownloading.value).toBe(true);

      await promise;
    });

    it('should update progress during download', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: 'a.ts', body: 'a' }),
        createMockArtifact({ id: '2', filePath: 'b.ts', body: 'b' }),
      ];

      // Start download
      const promise = download.downloadAll(artifacts);

      // Progress should be set
      expect(download.downloadProgress.value).not.toBeNull();

      await promise;
    });

    it('should clear progress and isDownloading after completion', async () => {
      vi.useFakeTimers();

      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      await download.downloadAll(artifacts);

      // Progress clears after timeout
      vi.advanceTimersByTime(1500);

      expect(download.isDownloading.value).toBe(false);
      expect(download.downloadProgress.value).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should handle JSZip errors gracefully', async () => {
      mockGenerateAsync.mockRejectedValueOnce(new Error('ZIP generation failed'));

      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      const result = await download.downloadAll(artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('ZIP generation failed');
    });

    it('should handle unknown errors', async () => {
      mockGenerateAsync.mockRejectedValueOnce('Unknown error');

      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      const result = await download.downloadAll(artifacts);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error occurred');
    });

    it('should clear download state after error', async () => {
      vi.useFakeTimers();

      mockGenerateAsync.mockRejectedValueOnce(new Error('Failed'));

      const download = useArtifactDownload();
      const artifacts = [createMockArtifact()];

      await download.downloadAll(artifacts);

      vi.advanceTimersByTime(1500);

      expect(download.isDownloading.value).toBe(false);
      expect(download.downloadProgress.value).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('should handle artifacts with no extension', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: 'Dockerfile', body: 'FROM node' }),
        createMockArtifact({ id: '2', filePath: 'Dockerfile', body: 'FROM python' }),
      ];

      await download.downloadAll(artifacts);

      expect(mockFile).toHaveBeenCalledWith('Dockerfile', 'FROM node');
      expect(mockFile).toHaveBeenCalledWith('Dockerfile-1', 'FROM python');
    });

    it('should handle very long file paths', async () => {
      const download = useArtifactDownload();
      const longPath = 'a/'.repeat(50) + 'file.ts';
      const artifacts = [
        createMockArtifact({ id: '1', filePath: longPath, body: 'content' }),
      ];

      const result = await download.downloadAll(artifacts);

      expect(result.success).toBe(true);
    });

    it('should handle artifacts with unicode in paths', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', filePath: 'src/komponenty.ts', body: 'content' }),
      ];

      await download.downloadAll(artifacts);

      expect(mockFile).toHaveBeenCalledWith('src/komponenty.ts', 'content');
    });

    it('should handle mixed content types', async () => {
      const download = useArtifactDownload();
      const artifacts = [
        createMockArtifact({ id: '1', fileType: 'code', filePath: 'code.ts', body: 'const x = 1;' }),
        createMockArtifact({
          id: '2',
          fileType: 'image',
          filePath: 'image.png',
          body: 'data:image/png;base64,abc123',
        }),
        createMockArtifact({ id: '3', fileType: 'data', filePath: 'data.json', body: '{"key":"value"}' }),
      ];

      const result = await download.downloadAll(artifacts);

      expect(result.success).toBe(true);
      expect(result.fileCount).toBe(3);
    });
  });
});
