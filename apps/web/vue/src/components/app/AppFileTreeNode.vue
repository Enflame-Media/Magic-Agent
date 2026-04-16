<script setup lang="ts">
/**
 * AppFileTreeNode - Recursive file tree node (AI Elements wrapper)
 *
 * Renders a single `FileTreeNode` from the artifacts store using the
 * AI Elements `<FileTreeFolder>` / `<FileTreeFile>` primitives. Calls itself
 * recursively for nested directories to handle arbitrary depth.
 *
 * @see HAP-1093 - Replace CodeBlock and FileTree with AI Elements equivalents
 */

import type { FileTreeNode } from '@/stores/artifacts';
import {
  FileTreeFile,
  FileTreeFolder,
} from '@/components/ai-elements/file-tree';

interface Props {
  node: FileTreeNode;
}

defineProps<Props>();
</script>

<template>
  <!-- Directory: render folder + recurse into children -->
  <FileTreeFolder
    v-if="node.isDirectory"
    :path="node.path"
    :name="node.name"
  >
    <template v-if="node.children">
      <AppFileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
      />
    </template>
  </FileTreeFolder>

  <!-- File: leaf node, selection keyed on artifactId (falls back to path) -->
  <FileTreeFile
    v-else
    :path="node.artifactId ?? node.path"
    :name="node.name"
  />
</template>
