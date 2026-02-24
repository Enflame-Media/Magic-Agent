<!--
  HAP-1047: ACP Tool Call Display Component

  Renders a single ACP tool call with status indicator, title,
  and optional file location. Supports all tool call statuses
  (pending, in_progress, completed, failed) and tool kinds.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IconFileText,
  IconPencil,
  IconTrash,
  IconArrowsMove,
  IconSearch,
  IconTerminal,
  IconBulb,
  IconCloudDownload,
  IconSwitch2,
  IconTool,
} from '@tabler/icons-vue';
import type { AcpToolCall, AcpToolCallStatus } from '@magic-agent/protocol';

const props = defineProps<{
  toolCall: AcpToolCall;
}>();

const { t } = useI18n();

const kindIconMap: Record<string, ReturnType<typeof IconFileText>> = {
  read: IconFileText,
  edit: IconPencil,
  delete: IconTrash,
  move: IconArrowsMove,
  search: IconSearch,
  execute: IconTerminal,
  think: IconBulb,
  fetch: IconCloudDownload,
  switch_mode: IconSwitch2,
};

const kindIcon = computed(() => {
  return kindIconMap[props.toolCall.kind ?? ''] ?? IconTool;
});

function statusColor(status: AcpToolCallStatus | undefined): string {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'in_progress':
      return 'text-primary';
    case 'pending':
    default:
      return 'text-muted-foreground';
  }
}

function statusLabel(status: AcpToolCallStatus | undefined): string {
  switch (status) {
    case 'completed':
      return t('acp.toolCall.completed');
    case 'failed':
      return t('acp.toolCall.failed');
    case 'in_progress':
      return t('acp.toolCall.inProgress');
    case 'pending':
    default:
      return t('acp.toolCall.pending');
  }
}

const location = computed(() => props.toolCall.locations?.[0] ?? null);
</script>

<template>
  <div class="flex items-start gap-2.5 rounded-[10px] bg-muted/50 p-2.5 my-0.5">
    <div class="flex size-7 shrink-0 items-center justify-center rounded-md bg-background">
      <component :is="kindIcon" class="size-4 text-muted-foreground" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <span class="truncate text-sm font-medium text-foreground">
          {{ props.toolCall.title }}
        </span>
        <span class="shrink-0 text-xs font-medium" :class="statusColor(props.toolCall.status)">
          {{ statusLabel(props.toolCall.status) }}
        </span>
      </div>
      <p v-if="location" class="mt-0.5 truncate font-mono text-xs text-muted-foreground">
        {{ location.path }}{{ location.line != null ? `:${location.line}` : '' }}
      </p>
    </div>
  </div>
</template>
