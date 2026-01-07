<script setup lang="ts">
import { CheckCircle2, XCircle } from 'lucide-vue-next';
import Spinner from '@/components/ui/spinner/Spinner.vue';
import type { ToolCall } from '@/services/messages/types';

interface Props {
  tool: ToolCall;
}

const props = defineProps<Props>();
</script>

<template>
  <span class="flex size-5 items-center justify-center">
    <Spinner v-if="props.tool.state === 'running'" class="size-4 text-sky-400" />
    <CheckCircle2 v-else-if="props.tool.state === 'completed'" class="size-4 text-emerald-400" />
    <XCircle v-else-if="props.tool.state === 'error'" class="size-4 text-red-400" />
  </span>
</template>
