<script setup lang="ts">
import { computed } from 'vue';
import { CodeBlock } from '@/components/app';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const patch = computed(() => {
  const input = props.tool.input as { patch?: string } | null;
  return input?.patch ?? JSON.stringify(props.tool.input, null, 2);
});
</script>

<template>
  <ToolSectionView title="Patch" full-width>
    <CodeBlock :code="patch" language="diff" />
  </ToolSectionView>
</template>
