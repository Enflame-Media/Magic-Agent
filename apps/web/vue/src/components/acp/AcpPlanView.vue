<!--
  HAP-1047: ACP Plan Display Component

  Renders the current execution plan from ACP session updates.
  Each plan entry shows its status (pending/in_progress/completed)
  with appropriate visual indicators.
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import {
  IconList,
  IconCircleCheck,
  IconCircleFilled,
  IconCircle,
} from '@tabler/icons-vue';
import type { AcpPlanEntry, AcpPlanEntryStatus } from '@magic-agent/protocol';

const props = defineProps<{
  entries: AcpPlanEntry[];
}>();

const { t } = useI18n();

function statusIconClass(status: AcpPlanEntryStatus): string {
  switch (status) {
    case 'completed':
      return 'text-green-500';
    case 'in_progress':
      return 'text-primary';
    case 'pending':
    default:
      return 'text-muted-foreground';
  }
}
</script>

<template>
  <div v-if="props.entries.length > 0" class="rounded-xl bg-muted/50 p-3 my-1">
    <div class="mb-2 flex items-center gap-1.5">
      <IconList class="size-4 text-muted-foreground" />
      <span class="text-[13px] font-semibold text-muted-foreground">
        {{ t('acp.plan') }}
      </span>
    </div>
    <div
      v-for="(entry, index) in props.entries"
      :key="index"
      class="flex items-start gap-2 py-1"
    >
      <IconCircleCheck
        v-if="entry.status === 'completed'"
        class="mt-0.5 size-4 shrink-0"
        :class="statusIconClass(entry.status)"
      />
      <IconCircleFilled
        v-else-if="entry.status === 'in_progress'"
        class="mt-0.5 size-4 shrink-0"
        :class="statusIconClass(entry.status)"
      />
      <IconCircle
        v-else
        class="mt-0.5 size-4 shrink-0"
        :class="statusIconClass(entry.status)"
      />
      <span
        class="flex-1 text-sm leading-5"
        :class="{
          'text-muted-foreground line-through': entry.status === 'completed',
          'text-foreground': entry.status !== 'completed',
        }"
      >
        {{ entry.content }}
      </span>
    </div>
  </div>
</template>
