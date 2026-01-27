<script setup lang="ts">
import { computed } from 'vue';
import MarkdownView from '../../markdown/MarkdownView.vue';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const plan = computed(() => {
  const input = props.tool.input as { plan?: string } | null;
  return input?.plan ?? '';
});
</script>

<template>
  <ToolSectionView title="Plan" full-width>
    <MarkdownView :markdown="plan" />
  </ToolSectionView>
</template>
