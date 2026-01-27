<script setup lang="ts">
import { computed } from 'vue';
import { CodeBlock } from '@/components/app';
import ToolSectionView from './ToolSectionView.vue';
import ToolError from './ToolError.vue';
import PermissionFooter from './PermissionFooter.vue';
import type { ToolCall, NormalizedMessage } from '@/services/messages/types';
import { getToolViewComponent } from './views/_all';

interface Props {
  tool: ToolCall;
  messages?: NormalizedMessage[];
}

const props = defineProps<Props>();

const formattedInput = computed(() => JSON.stringify(props.tool.input, null, 2));
const formattedResult = computed(() => {
  if (typeof props.tool.result === 'string') {
    return props.tool.result;
  }
  return JSON.stringify(props.tool.result, null, 2);
});

const SpecificToolView = computed(() => getToolViewComponent(props.tool.name));
</script>

<template>
  <div class="space-y-4">
    <component
      :is="SpecificToolView"
      v-if="SpecificToolView"
      :tool="tool"
      :messages="messages"
    />

    <ToolSectionView title="Input">
      <CodeBlock :code="formattedInput" language="json" />
    </ToolSectionView>

    <ToolSectionView v-if="tool.result !== undefined && tool.result !== null" title="Output">
      <CodeBlock :code="formattedResult" />
    </ToolSectionView>

    <ToolError v-if="tool.state === 'error' && tool.result" :message="formattedResult" />
    <PermissionFooter v-if="tool.permission" :permission="tool.permission" />
  </div>
</template>
