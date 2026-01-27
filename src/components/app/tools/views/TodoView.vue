<script setup lang="ts">
import { computed } from 'vue';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const todos = computed(() => {
  const input = props.tool.input as { todos?: Array<{ text?: string }> } | null;
  if (input?.todos && Array.isArray(input.todos)) {
    return input.todos.map((item) => item.text ?? '').filter(Boolean);
  }
  return [];
});
</script>

<template>
  <ToolSectionView title="Todos">
    <ul class="space-y-1 text-sm text-foreground">
      <li v-for="(todo, index) in todos" :key="index" class="flex gap-2">
        <span class="text-muted-foreground">•</span>
        <span>{{ todo }}</span>
      </li>
      <li v-if="todos.length === 0" class="text-muted-foreground text-sm">
        No todos returned.
      </li>
    </ul>
  </ToolSectionView>
</template>
