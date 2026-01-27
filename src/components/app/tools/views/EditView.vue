<script setup lang="ts">
import ToolSectionView from '../ToolSectionView.vue';
import ToolDiffView from '../ToolDiffView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();
</script>

<template>
  <ToolSectionView title="Edit" full-width>
    <ToolDiffView :input="props.tool.input" />
  </ToolSectionView>
</template>
