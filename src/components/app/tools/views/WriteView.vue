<script setup lang="ts">
import { computed } from 'vue';
import { CodeBlock } from '@/components/app';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const fileContent = computed(() => {
  const input = props.tool.input as { content?: string } | null;
  return input?.content ?? JSON.stringify(props.tool.input, null, 2);
});
</script>

<template>
  <ToolSectionView title="Write" full-width>
    <CodeBlock :code="fileContent" language="text" />
  </ToolSectionView>
</template>
