<script setup lang="ts">
/**
 * FileTree - Hierarchical file tree navigation
 *
 * Displays artifacts in a tree structure with:
 * - Expandable directories
 * - File icons based on type
 * - Selection highlighting
 * - Keyboard navigation support
 *
 * @example
 * ```vue
 * <FileTree
 *   :tree="fileTree"
 *   :selected-id="selectedArtifactId"
 *   @select="handleSelect"
 * />
 * ```
 */

import { ref, computed } from 'vue';
import type { FileTreeNode } from '@/stores/artifacts';

interface Props {
  /** Root nodes of the file tree */
  tree: FileTreeNode[];
  /** Currently selected artifact ID */
  selectedId?: string | null;
  /** Indentation level (internal use) */
  level?: number;
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
  level: 0,
});

const emit = defineEmits<{
  /** Emitted when a file is selected */
  select: [artifactId: string];
}>();

/** Track expanded directories */
const expandedPaths = ref<Set<string>>(new Set());

/** Toggle directory expansion */
function toggleExpand(path: string) {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path);
  } else {
    expandedPaths.value.add(path);
  }
}

/** Check if a directory is expanded */
function isExpanded(path: string): boolean {
  return expandedPaths.value.has(path);
}

/** Handle node click */
function handleNodeClick(node: FileTreeNode) {
  if (node.isDirectory) {
    toggleExpand(node.path);
  } else if (node.artifactId) {
    emit('select', node.artifactId);
  }
}

/** Get icon for file based on extension */
function getFileIcon(extension?: string): string {
  if (!extension) return 'file';

  const iconMap: Record<string, string> = {
    // Code files
    ts: 'typescript',
    tsx: 'react',
    js: 'javascript',
    jsx: 'react',
    vue: 'vue',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    swift: 'swift',
    kt: 'kotlin',
    // Web files
    html: 'html',
    css: 'css',
    scss: 'sass',
    // Data files
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    // Image files
    png: 'image',
    jpg: 'image',
    jpeg: 'image',
    gif: 'image',
    svg: 'svg',
    webp: 'image',
    // Document files
    md: 'markdown',
    txt: 'text',
    pdf: 'pdf',
  };

  return iconMap[extension.toLowerCase()] ?? 'file';
}

/** Computed indentation style */
const paddingLeft = computed(() => `${props.level * 16 + 8}px`);
</script>

<template>
  <div class="file-tree" role="tree">
    <div
      v-for="node in tree"
      :key="node.path"
      role="treeitem"
      :aria-expanded="node.isDirectory ? isExpanded(node.path) : undefined"
    >
      <!-- Node Row -->
      <button
        type="button"
        class="file-tree-node w-full flex items-center gap-2 py-1.5 px-2 text-sm text-left rounded-md hover:bg-muted/50 transition-colors"
        :class="{
          'bg-primary/10 text-primary': selectedId === node.artifactId,
        }"
        :style="{ paddingLeft }"
        @click="handleNodeClick(node)"
      >
        <!-- Expand/Collapse indicator for directories -->
        <span
          v-if="node.isDirectory"
          class="w-4 h-4 flex items-center justify-center text-muted-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3 w-3 transition-transform duration-150"
            :class="{ 'rotate-90': isExpanded(node.path) }"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </span>
        <span v-else class="w-4" />

        <!-- Icon -->
        <span class="w-4 h-4 flex items-center justify-center">
          <!-- Folder icon -->
          <svg
            v-if="node.isDirectory"
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4 text-amber-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              v-if="isExpanded(node.path)"
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <!-- File icon -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="h-4 w-4"
            :class="{
              'text-blue-500': ['typescript', 'javascript'].includes(getFileIcon(node.extension)),
              'text-green-500': ['vue', 'python', 'go'].includes(getFileIcon(node.extension)),
              'text-yellow-500': ['json', 'yaml'].includes(getFileIcon(node.extension)),
              'text-pink-500': ['html', 'css', 'sass'].includes(getFileIcon(node.extension)),
              'text-orange-500': ['image', 'svg'].includes(getFileIcon(node.extension)),
              'text-purple-500': ['react'].includes(getFileIcon(node.extension)),
              'text-muted-foreground': !['typescript', 'javascript', 'vue', 'python', 'go', 'json', 'yaml', 'html', 'css', 'sass', 'image', 'svg', 'react'].includes(getFileIcon(node.extension)),
            }"
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
        </span>

        <!-- Name -->
        <span class="flex-1 truncate">{{ node.name }}</span>
      </button>

      <!-- Children (recursive) -->
      <div
        v-if="node.isDirectory && node.children && isExpanded(node.path)"
        role="group"
      >
        <FileTree
          :tree="node.children"
          :selected-id="selectedId"
          :level="level + 1"
          @select="$emit('select', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-tree-node:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px hsl(var(--ring));
}
</style>
