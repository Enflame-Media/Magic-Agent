<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/app';
import { getToolViewComponent } from './views/_all';
import { getToolConfig } from './knownTools';
import ToolSectionView from './ToolSectionView.vue';
import ToolError from './ToolError.vue';
import PermissionFooter from './PermissionFooter.vue';
import ToolHeader from './ToolHeader.vue';
import type { NormalizedMessage, ToolCall } from '@/services/messages/types';

interface Props {
  tool: ToolCall;
  messages?: NormalizedMessage[];
}

const props = defineProps<Props>();

const toolConfig = computed(() => getToolConfig(props.tool));

const hasResult = computed(() => props.tool.result !== undefined && props.tool.result !== null);

const SpecificToolView = computed(() => getToolViewComponent(props.tool.name));
const isMinimal = computed(() => Boolean(toolConfig.value?.minimal));

const formattedInput = computed(() => JSON.stringify(props.tool.input, null, 2));
const formattedResult = computed(() => {
  if (typeof props.tool.result === 'string') {
    return props.tool.result;
  }
  return JSON.stringify(props.tool.result, null, 2);
});
</script>

<template>
  <div class="rounded-xl border border-border/60 bg-muted/20">
    <div class="flex items-start justify-between gap-4 px-4 py-3">
      <div class="min-w-0">
        <ToolHeader :tool="tool" />
      </div>
      <Button
        v-if="tool.state === 'running'"
        variant="ghost"
        size="sm"
        class="h-6 px-2 text-xs"
        disabled
      >
        Running...
      </Button>
    </div>

    <div class="space-y-3 px-4 pb-4">
      <template v-if="!isMinimal">
        <component
          :is="SpecificToolView"
          v-if="SpecificToolView"
          :tool="tool"
          :messages="messages"
        />

        <template v-else>
          <ToolSectionView title="Input">
            <CodeBlock :code="formattedInput" language="json" />
          </ToolSectionView>

          <ToolSectionView v-if="hasResult" title="Output">
            <CodeBlock :code="formattedResult" />
          </ToolSectionView>
        </template>
      </template>

      <ToolError
        v-if="tool.state === 'error' && tool.result && !toolConfig?.hideDefaultError"
        :message="formattedResult"
      />

      <PermissionFooter
        v-if="tool.permission"
        :permission="tool.permission"
      />
    </div>
  </div>
</template>
