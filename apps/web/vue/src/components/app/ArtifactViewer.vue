<script setup lang="ts">
/**
 * ArtifactViewer - Main artifact viewing component
 *
 * Displays artifacts with:
 * - File tree navigation (left sidebar) via AI Elements FileTree
 * - Content area via AI Elements Artifact (with header, actions)
 * - Code rendering via AI Elements CodeBlock (Shiki highlighting)
 * - Image rendering via native <img>
 * - Loading and error states
 * - Download functionality (single file + ZIP bundle) via ArtifactAction slots
 *
 * @example
 * ```vue
 * <ArtifactViewer :session-id="sessionId" />
 * ```
 */

import type { BundledLanguage } from "shiki";
import { computed, watch } from "vue";
import { DownloadIcon, FileIcon, Loader2Icon } from "lucide-vue-next";
import { toast } from "vue-sonner";
import { useArtifactsStore, type DecryptedArtifact, type FileTreeNode } from "@/stores/artifacts";
import { useArtifactDownload } from "@/composables/useArtifactDownload";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Artifact,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { FileTree } from "@/components/ai-elements/file-tree";
import { CodeBlock } from "@/components/ai-elements/code-block";
import ArtifactTreeNode from "./ArtifactTreeNode.vue";
import ImagePreview from "./ImagePreview.vue";

interface Props {
  /** Filter artifacts by session ID (optional) */
  sessionId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  sessionId: null,
});

const artifactsStore = useArtifactsStore();
const {
  downloadAll: downloadAllArtifacts,
  downloadSingle,
  downloadProgress,
  isDownloading,
} = useArtifactDownload();

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
  return artifact?.fileType === "code" || artifact?.fileType === "data";
});

/** Should show image viewer? */
const isImage = computed(() => {
  return selectedArtifact.value?.fileType === "image";
});

/** Get filename for display */
const displayFilename = computed(() => {
  const artifact = selectedArtifact.value;
  if (!artifact) return "";
  return artifact.filePath || artifact.title || artifact.id;
});

/**
 * Path-to-artifactId lookup built from the file tree.
 * FileTree is path-driven; the store is id-driven, so we map between them.
 */
const pathToArtifactId = computed(() => {
  const map = new Map<string, string>();
  const walk = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      if (!node.isDirectory && node.artifactId) {
        map.set(node.path, node.artifactId);
      }
      if (node.children && node.children.length > 0) {
        walk(node.children);
      }
    }
  };
  walk(fileTree.value);
  return map;
});

/** Reverse lookup: artifactId -> tree path (for syncing selection) */
const artifactIdToPath = computed(() => {
  const map = new Map<string, string>();
  for (const [path, id] of pathToArtifactId.value.entries()) {
    map.set(id, path);
  }
  return map;
});

/** Currently selected path (derived from selected artifact id) */
const selectedPath = computed(() => {
  const id = artifactsStore.selectedArtifactId;
  if (!id) return undefined;
  return artifactIdToPath.value.get(id);
});

/** Default-expanded directory paths so ancestors of the selected file open. */
const defaultExpanded = computed<Set<string>>(() => {
  const expanded = new Set<string>();
  const path = selectedPath.value;
  if (!path) return expanded;
  const parts = path.split("/").filter(Boolean);
  // Build ancestor paths: a, a/b, a/b/c (excluding final leaf)
  let current = "";
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!part) continue;
    current = current ? `${current}/${part}` : part;
    expanded.add(current);
  }
  return expanded;
});

/**
 * Language for the AI Elements CodeBlock.
 *
 * CodeBlock is strictly typed as BundledLanguage; when the artifact has no
 * language or an unknown one, we cast to `text` which the underlying Shiki
 * utils handle as a graceful fallback.
 */
const codeLanguage = computed<BundledLanguage>(() => {
  const lang = selectedArtifact.value?.language;
  return (lang ?? "text") as BundledLanguage;
});

// ─────────────────────────────────────────────────────────────────────────────
// Methods
// ─────────────────────────────────────────────────────────────────────────────

function handleSelectPath(path: string) {
  const id = pathToArtifactId.value.get(path);
  if (id) {
    artifactsStore.setSelectedArtifact(id);
  }
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
    toast.error("No artifacts to download");
    return;
  }

  const result = await downloadAllArtifacts(artifacts.value, props.sessionId ?? undefined);

  if (result.success) {
    toast.success(`Downloaded ${result.fileCount} file${result.fileCount !== 1 ? "s" : ""} as ZIP`);
  } else {
    toast.error(result.error ?? "Failed to create ZIP file");
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
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full overflow-hidden rounded-lg border bg-background">
    <!-- Sidebar with file tree -->
    <div class="flex w-64 flex-col border-r">
      <!-- Sidebar header -->
      <div class="flex flex-col border-b bg-muted/30">
        <div class="flex items-center justify-between px-3 py-2">
          <span class="text-sm font-medium">Files</span>
          <button
            v-if="artifacts.length > 0"
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            :title="isDownloading ? 'Downloading...' : 'Download all as ZIP'"
            :disabled="isDownloading"
            @click="downloadAll"
          >
            <Loader2Icon v-if="isDownloading" class="h-4 w-4 animate-spin" />
            <DownloadIcon v-else class="h-4 w-4" />
            <span class="sr-only">
              {{ isDownloading ? "Downloading" : "Download all as ZIP" }}
            </span>
          </button>
        </div>
        <!-- Download progress bar -->
        <div v-if="downloadProgress" class="px-3 pb-2">
          <Progress :model-value="downloadProgress.percent" class="h-1" />
          <p class="mt-1 truncate text-xs text-muted-foreground">
            {{ downloadProgress.status }}
          </p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="artifacts.length === 0" class="flex-1 p-4 text-center text-muted-foreground">
        <FileIcon class="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p class="text-sm">No artifacts</p>
      </div>

      <!-- File tree (AI Elements) -->
      <ScrollArea v-else class="flex-1">
        <FileTree
          class="border-0 bg-transparent"
          :selected-path="selectedPath"
          :default-expanded="defaultExpanded"
          @update:selected-path="handleSelectPath"
        >
          <ArtifactTreeNode v-for="node in fileTree" :key="node.path" :node="node" />
        </FileTree>
      </ScrollArea>
    </div>

    <!-- Content area -->
    <div class="flex flex-1 flex-col">
      <!-- No selection -->
      <div
        v-if="!selectedArtifact"
        class="flex flex-1 flex-col items-center justify-center text-muted-foreground"
      >
        <FileIcon class="mb-4 h-12 w-12 opacity-50" />
        <p class="text-sm">Select a file to view</p>
      </div>

      <!-- Loading -->
      <div v-else-if="isLoading" class="flex-1 p-4">
        <Skeleton class="mb-2 h-4 w-3/4" />
        <Skeleton class="mb-2 h-4 w-1/2" />
        <Skeleton class="mb-2 h-4 w-2/3" />
        <Skeleton class="h-4 w-1/3" />
      </div>

      <!-- Artifact (AI Elements) -->
      <Artifact v-else class="h-full rounded-none border-0 shadow-none">
        <ArtifactHeader>
          <div class="flex min-w-0 flex-1 flex-col">
            <ArtifactTitle class="truncate">
              {{ displayFilename }}
            </ArtifactTitle>
            <ArtifactDescription v-if="selectedArtifact.language">
              {{ selectedArtifact.language }}
            </ArtifactDescription>
          </div>
          <ArtifactActions>
            <ArtifactAction
              :icon="DownloadIcon"
              tooltip="Download"
              label="Download"
              :disabled="!selectedArtifact.body"
              @click="downloadArtifact(selectedArtifact)"
            />
          </ArtifactActions>
        </ArtifactHeader>

        <ArtifactContent class="p-0">
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
                :language="codeLanguage"
                class="border-0 shadow-none"
              />
            </div>
          </ScrollArea>

          <!-- Raw text viewer -->
          <ScrollArea v-else-if="selectedArtifact.body" class="h-full">
            <pre class="whitespace-pre-wrap p-4 font-mono text-sm">{{ selectedArtifact.body }}</pre>
          </ScrollArea>

          <!-- No content -->
          <div v-else class="flex h-full items-center justify-center text-muted-foreground">
            <p class="text-sm">No content available</p>
          </div>
        </ArtifactContent>
      </Artifact>
    </div>
  </div>
</template>
