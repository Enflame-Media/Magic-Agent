<script setup lang="ts">
import { computed } from 'vue';
import { CodeBlock } from '@/components/app';
import ToolSectionView from '../ToolSectionView.vue';
import type { ToolViewProps } from './types';

const props = defineProps<ToolViewProps>();

const inputPayload = computed(() => JSON.stringify(props.tool.input, null, 2));
</script>

<template>
  <ToolSectionView title="Edits" full-width>
    <CodeBlock :code="inputPayload" language="json" />
  </ToolSectionView>
</template>
