<script setup lang="ts">
/**
 * ArtifactViewer - Main artifact viewing component
 *
 * Displays artifacts with:
 * - File tree navigation (left sidebar)
 * - Content viewer (code, image, or raw text)
 * - Loading and error states
 * - Download functionality (single file and ZIP bundle)
 *
 * @example
 * ```vue
 * <ArtifactViewer :session-id="sessionId" />
 * ```
 */

import { computed, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useArtifactsStore, type DecryptedArtifact } from '@/stores/artifacts';
import { useArtifactDownload } from '@/composables/useArtifactDownload';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import FileTree from './FileTree.vue';
import ImagePreview from './ImagePreview.vue';
import CodeBlock from './CodeBlock.vue';

interface Props {
  /** Filter artifacts by session ID (optional) */
  sessionId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  sessionId: null,
});

const artifactsStore = useArtifactsStore();
const { downloadAll: downloadAllArtifacts, downloadSingle, downloadProgress, isDownloading } = useArtifactDownload();

// ─────────────────────────────────────────────────────────────────────────────
// Computed
// ─────────────────────────────────────────────────────────────────────────────

/** Filtered artifacts based on session */
const artifacts = computed(() => {
  if (props.sessionId) {
    return artifactsStore.artifactsForSession(props.sessionId);
  }
  return artifactsStore.artifactsList;
});

/** File tree structure */
const fileTree = computed(() => artifactsStore.fileTree);

/** Currently selected artifact */
const selectedArtifact = computed(() => artifactsStore.selectedArtifact);

/** Is content loading? */
const isLoading = computed(() => {
  const selected = artifactsStore.selectedArtifactId;
  return selected ? artifactsStore.isBodyLoading(selected) : false;
});

/** Should show code viewer? */
const isCode = computed(() => {
  const artifact = selectedArtifact.value;
  return artifact?.fileType === 'code' || artifact?.fileType === 'data';
});

/** Should show image viewer? */
const isImage = computed(() => {
  return selectedArtifact.value?.fileType === 'image';
});

/** Get filename for display */
const displayFilename = computed(() => {
  const artifact = selectedArtifact.value;
  if (!artifact) return '';
  return artifact.filePath || artifact.title || artifact.id;
});

// ─────────────────────────────────────────────────────────────────────────────
// Methods
// ─────────────────────────────────────────────────────────────────────────────

function handleSelect(artifactId: string) {
  artifactsStore.setSelectedArtifact(artifactId);
}

/**
 * Download a single artifact file.
 */
function downloadArtifact(artifact: DecryptedArtifact) {
  if (!artifact.body) return;
  downloadSingle(artifact);
}

/**
 * Download all artifacts as a ZIP file.
 * Shows progress toast for large bundles.
 */
async function downloadAll() {
  if (artifacts.value.length === 0) {
    toast.error('No artifacts to download');
    return;
  }

  const result = await downloadAllArtifacts(artifacts.value, props.sessionId ?? undefined);

  if (result.success) {
    toast.success(`Downloaded ${result.fileCount} file${result.fileCount !== 1 ? 's' : ''} as ZIP`);
  } else {
    toast.error(result.error ?? 'Failed to create ZIP file');
  }
}

// Auto-select first artifact if none selected
watch(
  artifacts,
  (newArtifacts) => {
    if (newArtifacts.length > 0 && !artifactsStore.selectedArtifactId) {
      // Find first file (not directory)
      const firstFile = newArtifacts.find((a) => a.filePath || a.title);
      if (firstFile) {
        artifactsStore.setSelectedArtifact(firstFile.id);
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="flex h-full border rounded-lg overflow-hidden bg-background">
    <!-- Sidebar with file tree -->
    <div class="w-64 border-r flex flex-col">
      <!-- Sidebar header -->
      <div class="flex flex-col border-b bg-muted/30">
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-sm font-medium">Files</span>
          <Button
            v-if="artifacts.length > 0"
            variant="ghost"
            size="sm"
            class="h-7 w-7 p-0"
            :title="isDownloading ? 'Downloading...' : 'Download all as ZIP'"
            :disabled="isDownloading"
            @click="downloadAll"
          >
            <!-- Loading spinner when downloading -->
            <svg
              v-if="isDownloading"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <!-- Download icon when idle -->
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </Button>
        </div>
        <!-- Download progress bar -->
        <div v-if="downloadProgress" class="px-3 pb-2">
          <Progress :model-value="downloadProgress.percent" class="h-1" />
          <p class="text-xs text-muted-foreground mt-1 truncate">
            {{ downloadProgress.status }}
          </p>
        </div>
      </div>

      <!-- File tree -->
      <ScrollArea class="flex-1">
        <div v-if="artifacts.length === 0" class="p-4 text-center text-muted-foreground">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-8 w-8 mx-auto mb-2 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
          </svg>
          <p class="text-sm">No artifacts</p>
        </div>
        <FileTree
          v-else
          :tree="fileTree"
          :selected-id="artifactsStore.selectedArtifactId"
          @select="handleSelect"
        />
      </ScrollArea>
    </div>

    <!-- Content area -->
    <div class="flex-1 flex flex-col">
      <!-- No selection -->
      <div
        v-if="!selectedArtifact"
        class="flex-1 flex flex-col items-center justify-center text-muted-foreground"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-12 w-12 mb-4 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p class="text-sm">Select a file to view</p>
      </div>

      <!-- Loading -->
      <div v-else-if="isLoading" class="flex-1 p-4">
        <Skeleton class="h-4 w-3/4 mb-2" />
        <Skeleton class="h-4 w-1/2 mb-2" />
        <Skeleton class="h-4 w-2/3 mb-2" />
        <Skeleton class="h-4 w-1/3" />
      </div>

      <!-- Content -->
      <template v-else>
        <!-- Header with filename and actions -->
        <div class="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm font-medium truncate">{{ displayFilename }}</span>
            <span
              v-if="selectedArtifact.language"
              class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
            >
              {{ selectedArtifact.language }}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 px-2"
            @click="downloadArtifact(selectedArtifact)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download
          </Button>
        </div>

        <!-- Content viewer -->
        <div class="flex-1 overflow-hidden">
          <!-- Image viewer -->
          <ImagePreview
            v-if="isImage && selectedArtifact.body"
            :src="selectedArtifact.body"
            :alt="displayFilename"
            :filename="displayFilename"
          />

          <!-- Code viewer -->
          <ScrollArea v-else-if="isCode && selectedArtifact.body" class="h-full">
            <div class="p-4">
              <CodeBlock
                :code="selectedArtifact.body"
                :language="selectedArtifact.language ?? undefined"
                :filename="displayFilename"
              />
            </div>
          </ScrollArea>

          <!-- Raw text viewer -->
          <ScrollArea v-else-if="selectedArtifact.body" class="h-full">
            <pre class="p-4 text-sm font-mono whitespace-pre-wrap">{{ selectedArtifact.body }}</pre>
          </ScrollArea>

          <!-- No content -->
          <div v-else class="flex-1 flex items-center justify-center text-muted-foreground">
            <p class="text-sm">No content available</p>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
