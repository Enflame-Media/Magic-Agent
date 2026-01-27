<script setup lang="ts">
import { computed } from 'vue';
import { CommandView } from '@/components/app';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const command = computed(() => {
  const input = props.tool.input as { command?: string; parsed_cmd?: Array<{ cmd?: string }> } | null;
  if (input?.parsed_cmd && input.parsed_cmd.length > 0) {
    const parsed = input.parsed_cmd[0];
    if (parsed?.cmd) {
      return parsed.cmd;
    }
  }
  return input?.command ?? JSON.stringify(props.tool.input, null, 2);
});
</script>

<template>
  <ToolSectionView title="Command">
    <CommandView :command="command" />
  </ToolSectionView>
</template>
