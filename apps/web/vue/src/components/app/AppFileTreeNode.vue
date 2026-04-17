<script setup lang="ts">
/**
 * AppFileTreeNode - Recursive file tree node (AI Elements wrapper)
 *
 * Renders a single `FileTreeNode` from the artifacts store using the
 * AI Elements `<FileTreeFolder>` / `<FileTreeFile>` primitives. Calls itself
 * recursively for nested directories to handle arbitrary depth.
 *
 * The `keyBy` prop controls how leaf files derive their selection key:
 * - `"artifactId"`: uses `node.artifactId ?? node.path` so selection aligns
 *   with the artifacts store's `selectedArtifactId` directly.
 * - `"path"`: uses `node.path` so selection is keyed on the tree path
 *   (consumer maps path ↔ artifactId externally).
 *
 * @see HAP-1093 - Replace CodeBlock and FileTree with AI Elements equivalents
 * @see HAP-1098 - Replace ArtifactViewer with AI Elements equivalents
 */

import type { FileTreeNode } from "@/stores/artifacts";
import { FileTreeFile, FileTreeFolder } from "@/components/ai-elements/file-tree";

interface Props {
  node: FileTreeNode;
  keyBy: "path" | "artifactId";
}

const props = defineProps<Props>();
</script>

<template>
  <!-- Directory: render folder + recurse into children -->
  <FileTreeFolder v-if="node.isDirectory" :path="node.path" :name="node.name">
    <template v-if="node.children">
      <AppFileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :key-by="props.keyBy"
      />
    </template>
  </FileTreeFolder>

  <!-- File: leaf node, selection key controlled by `keyBy` -->
  <FileTreeFile
    v-else
    :path="props.keyBy === 'artifactId' ? (node.artifactId ?? node.path) : node.path"
    :name="node.name"
  />
</template>
