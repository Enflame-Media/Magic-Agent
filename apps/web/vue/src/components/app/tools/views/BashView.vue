<script setup lang="ts">
import { computed } from 'vue';
import { CommandView } from '@/components/app';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const command = computed(() => {
  const input = props.tool.input as { command?: string } | null;
  return input?.command ?? JSON.stringify(props.tool.input, null, 2);
});
</script>

<template>
  <ToolSectionView title="Command">
    <CommandView :command="command" />
  </ToolSectionView>
</template>
