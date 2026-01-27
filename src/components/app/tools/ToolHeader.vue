<script setup lang="ts">
import { computed } from 'vue';
import type { ToolCall } from '@/services/messages/types';
import { getToolConfig } from './knownTools';
import ToolStatusIndicator from './ToolStatusIndicator.vue';
import { useElapsedTime } from './useElapsedTime';

interface Props {
  tool: ToolCall;
}

const props = defineProps<Props>();

const config = getToolConfig(props.tool);
const title = typeof config?.title === 'function'
  ? config.title(props.tool)
  : config?.title ?? props.tool.name;
const subtitle = config?.subtitle?.(props.tool) ?? props.tool.description ?? null;
const elapsed = useElapsedTime(props.tool.createdAt);
const showElapsed = computed(() => props.tool.state === 'running');
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="min-w-0">
      <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span class="truncate">{{ title }}</span>
        <ToolStatusIndicator :tool="tool" />
        <span v-if="showElapsed" class="text-[11px] text-muted-foreground">
          {{ elapsed }}
        </span>
      </div>
      <div v-if="subtitle" class="text-xs text-muted-foreground truncate">
        {{ subtitle }}
      </div>
    </div>
  </div>
</template>
