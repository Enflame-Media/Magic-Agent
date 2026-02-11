/**
 * Artifact Download Composable
 *
 * Provides functionality for downloading artifacts individually or as a ZIP bundle.
 * Supports progress tracking for large downloads and proper folder structure in ZIPs.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useArtifactDownload } from '@/composables/useArtifactDownload';
 *
 * const { downloadAll, downloadProgress, isDownloading } = useArtifactDownload();
 *
 * async function handleDownloadAll(artifacts) {
 *   await downloadAll(artifacts, 'my-session');
 * }
 * </script>
 * ```
 */

import { ref, type Ref } from 'vue';
import JSZip from 'jszip';
import type { DecryptedArtifact } from '@/stores/artifacts';

/** Progress state for download operations */
export interface DownloadProgress {
  /** Current progress percentage (0-100) */
  percent: number;
  /** Current operation description */
  status: string;
  /** Number of files processed */
  filesProcessed: number;
  /** Total number of files */
  totalFiles: number;
}

/** Result of a download operation */
export interface DownloadResult {
  /** Whether the download succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Number of files included */
  fileCount?: number;
}

/**
 * Generates a safe filename from artifact data.
 * Handles path collisions by appending index if needed.
 *
 * @param artifact - The artifact to get filename for
 * @param existingPaths - Set of already used paths
 * @returns Safe filename for the artifact
 */
function getSafeFilename(artifact: DecryptedArtifact, existingPaths: Set<string>): string {
  // Get base path from artifact
  let basePath = artifact.filePath || artifact.title || `artifact-${artifact.id}`;

  // Remove leading slashes
  basePath = basePath.replace(/^\/+/, '');

  // Handle path collisions
  let finalPath = basePath;
  let counter = 1;
  while (existingPaths.has(finalPath)) {
    const ext = basePath.includes('.') ? basePath.slice(basePath.lastIndexOf('.')) : '';
    const nameWithoutExt = ext ? basePath.slice(0, -ext.length) : basePath;
    finalPath = `${nameWithoutExt}-${counter}${ext}`;
    counter++;
  }

  existingPaths.add(finalPath);
  return finalPath;
}

/**
 * Triggers a browser download for a blob.
 *
 * @param blob - The blob to download
 * @param filename - The filename to use
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = globalThis.URL.createObjectURL(blob);
  const a = globalThis.document.createElement('a');
  a.href = url;
  a.download = filename;
  globalThis.document.body.appendChild(a);
  a.click();
  globalThis.document.body.removeChild(a);
  globalThis.URL.revokeObjectURL(url);
}

/**
 * Composable for artifact download functionality.
 *
 * Features:
 * - Download all artifacts as a ZIP file
 * - Progress tracking for large bundles
 * - Proper folder structure preservation
 * - Handles path collisions gracefully
 * - Supports both text and binary content
 */
export function useArtifactDownload(): {
  downloadAll: (artifacts: DecryptedArtifact[], sessionName?: string) => Promise<DownloadResult>;
  downloadSingle: (artifact: DecryptedArtifact) => void;
  downloadProgress: Ref<DownloadProgress | null>;
  isDownloading: Ref<boolean>;
} {
  const downloadProgress = ref<DownloadProgress | null>(null);
  const isDownloading = ref(false);

  /**
   * Download a single artifact.
   *
   * @param artifact - The artifact to download
   */
  function downloadSingle(artifact: DecryptedArtifact): void {
    if (!artifact.body) return;

    const filename = artifact.filePath || artifact.title || `artifact-${artifact.id}`;
    const mimeType = artifact.mimeType || 'text/plain';

    // Handle image data (base64)
    if (artifact.fileType === 'image' && artifact.body.startsWith('data:')) {
      // Extract base64 data from data URL
      const [header, base64Data] = artifact.body.split(',');
      const detectedMime = header?.match(/data:([^;]+)/)?.[1] || mimeType;
      const binaryString = atob(base64Data || '');
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: detectedMime });
      triggerDownload(blob, filename);
    } else {
      // Text content
      const blob = new Blob([artifact.body], { type: mimeType });
      triggerDownload(blob, filename);
    }
  }

  /**
   * Download all artifacts as a ZIP file.
   *
   * @param artifacts - Array of artifacts to bundle
   * @param sessionName - Optional session name for the ZIP filename
   * @returns Promise resolving to download result
   */
  async function downloadAll(
    artifacts: DecryptedArtifact[],
    sessionName?: string
  ): Promise<DownloadResult> {
    // Filter artifacts that have content
    const artifactsWithContent = artifacts.filter((a) => a.body);

    if (artifactsWithContent.length === 0) {
      return {
        success: false,
        error: 'No artifacts with content to download',
      };
    }

    isDownloading.value = true;
    downloadProgress.value = {
      percent: 0,
      status: 'Preparing files...',
      filesProcessed: 0,
      totalFiles: artifactsWithContent.length,
    };

    try {
      const zip = new JSZip();
      const existingPaths = new Set<string>();

      // Add files to ZIP
      for (let i = 0; i < artifactsWithContent.length; i++) {
        const artifact = artifactsWithContent[i];
        if (!artifact) continue;

        const filename = getSafeFilename(artifact, existingPaths);

        // Update progress
        downloadProgress.value = {
          percent: Math.round((i / artifactsWithContent.length) * 50),
          status: `Adding ${filename}...`,
          filesProcessed: i,
          totalFiles: artifactsWithContent.length,
        };

        // Handle different content types
        if (artifact.fileType === 'image' && artifact.body?.startsWith('data:')) {
          // Image as base64 - decode to binary
          const [, base64Data] = artifact.body.split(',');
          if (base64Data) {
            zip.file(filename, base64Data, { base64: true });
          }
        } else if (artifact.body) {
          // Text content
          zip.file(filename, artifact.body);
        }
      }

      // Generate ZIP with progress
      downloadProgress.value = {
        percent: 50,
        status: 'Generating ZIP file...',
        filesProcessed: artifactsWithContent.length,
        totalFiles: artifactsWithContent.length,
      };

      const blob = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          // Update progress during ZIP generation
          downloadProgress.value = {
            percent: 50 + Math.round(metadata.percent / 2),
            status: `Compressing... ${Math.round(metadata.percent)}%`,
            filesProcessed: artifactsWithContent.length,
            totalFiles: artifactsWithContent.length,
          };
        }
      );

      // Generate filename
      const timestamp = new Date().toISOString().slice(0, 10);
      const zipFilename = sessionName
        ? `${sessionName}-artifacts-${timestamp}.zip`
        : `artifacts-${timestamp}.zip`;

      // Trigger download
      downloadProgress.value = {
        percent: 100,
        status: 'Download starting...',
        filesProcessed: artifactsWithContent.length,
        totalFiles: artifactsWithContent.length,
      };

      triggerDownload(blob, zipFilename);

      return {
        success: true,
        fileCount: artifactsWithContent.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // Clear progress after a short delay to show completion
      setTimeout(() => {
        isDownloading.value = false;
        downloadProgress.value = null;
      }, 1000);
    }
  }

  return {
    /** Download all artifacts as a ZIP file */
    downloadAll,
    /** Download a single artifact */
    downloadSingle,
    /** Current download progress (null when not downloading) */
    downloadProgress,
    /** Whether a download is in progress */
    isDownloading,
  };
}
