<script setup lang="ts">
import { computed } from 'vue';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const tasks = computed(() => {
  if (!props.messages) {
    return [];
  }
  return props.messages
    .filter((message) => message.kind === 'tool-call')
    .map((message) => message.tool.name);
});
</script>

<template>
  <ToolSectionView title="Tasks">
    <ul class="space-y-1 text-sm text-foreground">
      <li v-for="(task, index) in tasks" :key="index" class="flex gap-2">
        <span class="text-muted-foreground">•</span>
        <span>{{ task }}</span>
      </li>
      <li v-if="tasks.length === 0" class="text-muted-foreground text-sm">
        No tasks captured yet.
      </li>
    </ul>
  </ToolSectionView>
</template>
