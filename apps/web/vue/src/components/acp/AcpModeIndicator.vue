<!--
  HAP-1047: ACP Mode Indicator Component

  Displays the current ACP session mode as a compact badge.
  Shows mode ID (e.g., "code", "ask", "architect") with a visual icon.
-->
<script setup lang="ts">
import {
  IconCode,
  IconMessageCircle,
  IconBuildingArch,
  IconList,
  IconCircleFilled,
} from '@tabler/icons-vue';
import { computed } from 'vue';

const props = defineProps<{
  modeId: string;
}>();

const modeIconMap: Record<string, ReturnType<typeof IconCode>> = {
  code: IconCode,
  ask: IconMessageCircle,
  architect: IconBuildingArch,
  plan: IconList,
};

const icon = computed(() => modeIconMap[props.modeId] ?? IconCircleFilled);
</script>

<template>
  <div class="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1">
    <component :is="icon" class="size-3 text-primary" />
    <span class="text-xs font-semibold capitalize text-primary">
      {{ props.modeId }}
    </span>
  </div>
</template>
