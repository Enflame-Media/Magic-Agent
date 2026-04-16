<script setup lang="ts">
/**
 * AppFileTree - Hierarchical file tree navigation (AI Elements wrapper)
 *
 * Adapts the artifacts store's `FileTreeNode[]` into the AI Elements
 * `<FileTree>` / `<FileTreeFolder>` / `<FileTreeFile>` declarative pattern.
 *
 * Selection is keyed on `artifactId` so that the AI Elements internal
 * `selectedPath` aligns directly with the store's `selectedArtifactId`.
 *
 * @see HAP-1093 - Replace CodeBlock and FileTree with AI Elements equivalents
 */

import { computed } from 'vue';
import type { FileTreeNode } from '@/stores/artifacts';
import { FileTree } from '@/components/ai-elements/file-tree';
import AppFileTreeNode from './AppFileTreeNode.vue';

interface Props {
  /** Root nodes of the file tree */
  tree: FileTreeNode[];
  /** Currently selected artifact ID */
  selectedId?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  selectedId: null,
});

const emit = defineEmits<{
  /** Emitted when a file is selected */
  select: [artifactId: string];
}>();

/**
 * Normalize `selectedId` for the AI Elements FileTree, which expects `undefined`
 * (not `null`) to mean "no selection".
 */
const selectedPath = computed<string | undefined>(() => props.selectedId ?? undefined);

/**
 * Forward selection events: AI Elements emits the file's `path`, but because
 * `AppFileTreeNode` uses `artifactId` as the `path` for leaf files, this value
 * is the artifact ID. Folder `path` values (directory paths) are filtered out
 * upstream — `FileTreeFolder` only triggers selection on its own click, but we
 * only care about file selection, so we require a corresponding artifact to
 * exist. Guard against directory-path emissions by checking the tree.
 */
function handleSelect(path: string) {
  if (isArtifactId(path, props.tree)) {
    emit('select', path);
  }
}

/**
 * Recursively check whether `id` matches a file node's `artifactId` in the tree.
 */
function isArtifactId(id: string, nodes: FileTreeNode[]): boolean {
  for (const node of nodes) {
    if (!node.isDirectory && node.artifactId === id) {
      return true;
    }
    if (node.isDirectory && node.children && isArtifactId(id, node.children)) {
      return true;
    }
  }
  return false;
}
</script>

<template>
  <FileTree
    :selected-path="selectedPath"
    class="border-0 bg-transparent"
    @update:selected-path="handleSelect"
  >
    <AppFileTreeNode
      v-for="node in tree"
      :key="node.path"
      :node="node"
    />
  </FileTree>
</template>
