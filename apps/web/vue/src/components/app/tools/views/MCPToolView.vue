<script setup lang="ts">
import { computed } from 'vue';
import { CodeBlock } from '@/components/app';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const formattedInput = computed(() => JSON.stringify(props.tool.input, null, 2));
const formattedResult = computed(() => {
  if (props.tool.result === undefined || props.tool.result === null) {
    return '';
  }
  if (typeof props.tool.result === 'string') {
    return props.tool.result;
  }
  return JSON.stringify(props.tool.result, null, 2);
});
</script>

<template>
  <div class="space-y-3">
    <ToolSectionView title="Input">
      <CodeBlock :code="formattedInput" language="json" />
    </ToolSectionView>
    <ToolSectionView v-if="formattedResult" title="Output">
      <CodeBlock :code="formattedResult" />
    </ToolSectionView>
  </div>
</template>
