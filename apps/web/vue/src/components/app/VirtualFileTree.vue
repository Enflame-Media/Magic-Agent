<script setup lang="ts">
/**
 * VirtualFileTree - High-performance hierarchical file tree with virtual scrolling
 *
 * Optimized for large artifact collections (1000+ artifacts) with:
 * - Virtual scrolling using @tanstack/vue-virtual
 * - Flattened tree structure for efficient rendering
 * - Memoized expansion state
 * - Keyboard navigation support
 *
 * @see HAP-873 - Performance Optimizations for Large Artifact Sets
 *
 * @example
 * ```vue
 * <VirtualFileTree
 *   :tree="fileTree"
 *   :selected-id="selectedArtifactId"
 *   @select="handleSelect"
 * />
 * ```
 */

import { ref, computed, watch } from 'vue';
import { useVirtualizer } from '@tanstack/vue-virtual';
import type { FileTreeNode } from '@/stores/artifacts';

interface Props {
  /** Root nodes of the file tree */
  tree: FileTreeNode[];
  /** Currently selected artifact ID */
  selectedId?: string | null;
  /** Estimated row height in pixels for virtual scrolling */
  estimatedRowHeight?: number;
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
  estimatedRowHeight: 32,
});

const emit = defineEmits<{
  /** Emitted when a file is selected */
  select: [artifactId: string];
}>();

/** Track expanded directories by path */
const expandedPaths = ref<Set<string>>(new Set());

/** Reference to the scroll container */
const scrollContainerRef = ref<HTMLDivElement | null>(null);

/**
 * Flattened node structure for virtual scrolling.
 * Includes depth for indentation calculation.
 */
interface FlattenedNode {
  node: FileTreeNode;
  depth: number;
  isVisible: boolean;
}

/**
 * Flatten the tree for virtual scrolling, respecting expanded state.
 * Uses iterative approach to avoid stack overflow with deep trees.
 */
function flattenTree(
  nodes: FileTreeNode[],
  expanded: Set<string>,
  depth: number = 0
): FlattenedNode[] {
  const result: FlattenedNode[] = [];
  const stack: Array<{ nodes: FileTreeNode[]; depth: number; index: number }> = [
    { nodes, depth, index: 0 },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1]!;

    if (current.index >= current.nodes.length) {
      stack.pop();
      continue;
    }

    const node = current.nodes[current.index]!;
    current.index++;

    result.push({
      node,
      depth: current.depth,
      isVisible: true,
    });

    // If directory is expanded and has children, add to stack
    if (node.isDirectory && node.children && expanded.has(node.path)) {
      stack.push({ nodes: node.children, depth: current.depth + 1, index: 0 });
    }
  }

  return result;
}

/** Flattened nodes computed from tree and expansion state */
const flattenedNodes = computed(() => {
  return flattenTree(props.tree, expandedPaths.value);
});

/** Virtual scrolling configuration */
const virtualizer = useVirtualizer({
  get count() {
    return flattenedNodes.value.length;
  },
  getScrollElement: () => scrollContainerRef.value,
  estimateSize: () => props.estimatedRowHeight,
  overscan: 10, // Render 10 extra items for smooth scrolling
});

/** Virtual items to render */
const virtualItems = computed(() => virtualizer.value.getVirtualItems());

/** Total list height for virtual scrolling spacer */
const totalHeight = computed(() => virtualizer.value.getTotalSize());

/** Toggle directory expansion */
function toggleExpand(path: string, event?: Event) {
  event?.stopPropagation();
  const newExpanded = new Set(expandedPaths.value);
  if (newExpanded.has(path)) {
    newExpanded.delete(path);
  } else {
    newExpanded.add(path);
  }
  expandedPaths.value = newExpanded;
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

/** Expand all directories (useful for initial reveal) */
function expandAll() {
  const allPaths = new Set<string>();
  const collectPaths = (nodes: FileTreeNode[]) => {
    for (const node of nodes) {
      if (node.isDirectory) {
        allPaths.add(node.path);
        if (node.children) {
          collectPaths(node.children);
        }
      }
    }
  };
  collectPaths(props.tree);
  expandedPaths.value = allPaths;
}

/** Collapse all directories */
function collapseAll() {
  expandedPaths.value = new Set();
}

/** Scroll to and select a specific artifact */
function scrollToArtifact(artifactId: string) {
  const index = flattenedNodes.value.findIndex(
    (item) => item.node.artifactId === artifactId
  );
  if (index !== -1) {
    virtualizer.value.scrollToIndex(index, { align: 'center' });
  }
}

/** Auto-expand parent directories when selection changes */
watch(
  () => props.selectedId,
  (newId) => {
    if (!newId) return;

    // Find the artifact in the flattened list
    const index = flattenedNodes.value.findIndex(
      (item) => item.node.artifactId === newId
    );

    // If not found, we need to expand parent directories
    if (index === -1) {
      // Find the artifact path in the full tree
      const findPath = (
        nodes: FileTreeNode[],
        targetId: string,
        currentPath: string[] = []
      ): string[] | null => {
        for (const node of nodes) {
          if (node.artifactId === targetId) {
            return currentPath;
          }
          if (node.isDirectory && node.children) {
            const result = findPath(node.children, targetId, [
              ...currentPath,
              node.path,
            ]);
            if (result) return result;
          }
        }
        return null;
      };

      const pathToExpand = findPath(props.tree, newId);
      if (pathToExpand) {
        const newExpanded = new Set(expandedPaths.value);
        for (const path of pathToExpand) {
          newExpanded.add(path);
        }
        expandedPaths.value = newExpanded;
      }
    }
  },
  { immediate: true }
);

// Expose methods for parent components
defineExpose({
  expandAll,
  collapseAll,
  scrollToArtifact,
});
</script>

<template>
  <div
    ref="scrollContainerRef"
    class="virtual-file-tree h-full overflow-auto"
    role="tree"
  >
    <!-- Virtual scroll container -->
    <div
      :style="{
        height: `${totalHeight}px`,
        width: '100%',
        position: 'relative',
      }"
    >
      <!-- Virtual items -->
      <div
        v-for="virtualItem in virtualItems"
        :key="flattenedNodes[virtualItem.index]?.node.path ?? virtualItem.index"
        :style="{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        }"
        role="treeitem"
        :aria-expanded="
          flattenedNodes[virtualItem.index]?.node.isDirectory
            ? isExpanded(flattenedNodes[virtualItem.index]!.node.path)
            : undefined
        "
      >
        <button
          type="button"
          class="file-tree-node w-full flex items-center gap-2 py-1.5 px-2 text-sm text-left rounded-md hover:bg-muted/50 transition-colors"
          :class="{
            'bg-primary/10 text-primary':
              selectedId === flattenedNodes[virtualItem.index]?.node.artifactId,
          }"
          :style="{
            paddingLeft: `${(flattenedNodes[virtualItem.index]?.depth ?? 0) * 16 + 8}px`,
          }"
          @click="handleNodeClick(flattenedNodes[virtualItem.index]!.node)"
        >
          <!-- Expand/Collapse indicator for directories -->
          <span
            v-if="flattenedNodes[virtualItem.index]?.node.isDirectory"
            class="w-4 h-4 flex items-center justify-center text-muted-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-3 w-3 transition-transform duration-150"
              :class="{
                'rotate-90': isExpanded(
                  flattenedNodes[virtualItem.index]!.node.path
                ),
              }"
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
              v-if="flattenedNodes[virtualItem.index]?.node.isDirectory"
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                v-if="
                  isExpanded(flattenedNodes[virtualItem.index]!.node.path)
                "
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
                'text-blue-500': ['typescript', 'javascript'].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
                'text-green-500': ['vue', 'python', 'go'].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
                'text-yellow-500': ['json', 'yaml'].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
                'text-pink-500': ['html', 'css', 'sass'].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
                'text-orange-500': ['image', 'svg'].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
                'text-purple-500': ['react'].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
                'text-muted-foreground': ![
                  'typescript',
                  'javascript',
                  'vue',
                  'python',
                  'go',
                  'json',
                  'yaml',
                  'html',
                  'css',
                  'sass',
                  'image',
                  'svg',
                  'react',
                ].includes(
                  getFileIcon(flattenedNodes[virtualItem.index]?.node.extension)
                ),
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
          <span class="flex-1 truncate">{{
            flattenedNodes[virtualItem.index]?.node.name
          }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-tree-node:focus {
  outline: none;
  box-shadow: inset 0 0 0 2px hsl(var(--ring));
}

.virtual-file-tree {
  contain: strict;
}
</style>
