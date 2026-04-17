<script setup lang="ts">
/**
 * ArtifactTreeNode - Recursive file tree node renderer
 *
 * The AI Elements FileTree is slot-driven, so consumers must render each
 * file/folder explicitly. This component handles recursion over the
 * artifacts store's FileTreeNode data.
 *
 * Used internally by ArtifactViewer.
 */

import type { FileTreeNode } from "@/stores/artifacts";
import { FileTreeFile, FileTreeFolder } from "@/components/ai-elements/file-tree";

interface Props {
  node: FileTreeNode;
}

defineProps<Props>();
</script>

<template>
  <FileTreeFolder v-if="node.isDirectory" :path="node.path" :name="node.name">
    <ArtifactTreeNode v-for="child in node.children ?? []" :key="child.path" :node="child" />
  </FileTreeFolder>
  <FileTreeFile v-else :path="node.path" :name="node.name" />
</template>
