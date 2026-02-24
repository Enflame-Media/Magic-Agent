<!--
  HAP-1047: ACP Session View Component

  Container component that composes all ACP display components into
  a cohesive session display. Integrates with the Pinia ACP store
  via the useAcpSession composable.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useAcpSession } from '@/composables/useAcpSession';
import AcpStreamingText from './AcpStreamingText.vue';
import AcpThoughtView from './AcpThoughtView.vue';
import AcpPlanView from './AcpPlanView.vue';
import AcpToolCallView from './AcpToolCallView.vue';
import AcpModeIndicator from './AcpModeIndicator.vue';
import AcpUsageWidget from './AcpUsageWidget.vue';
import AcpCommandPalette from './AcpCommandPalette.vue';
import AcpConfigPanel from './AcpConfigPanel.vue';
import type { AcpAvailableCommand } from '@magic-agent/protocol';

const props = defineProps<{
  sessionId: string;
}>();

const emit = defineEmits<{
  invokeCommand: [command: AcpAvailableCommand];
  configChange: [configId: string, value: string];
}>();

const {
  hasSession,
  agentMessage,
  agentThought,
  toolCalls,
  plan,
  availableCommands,
  currentModeId,
  configOptions,
  usage,
} = useAcpSession(() => props.sessionId);

const toolCallList = computed(() => Object.values(toolCalls.value));
</script>

<template>
  <div v-if="hasSession" class="flex flex-col gap-1">
    <!-- Header: mode indicator + usage -->
    <div
      v-if="currentModeId || usage"
      class="flex flex-wrap items-center justify-between gap-2"
    >
      <AcpModeIndicator v-if="currentModeId" :mode-id="currentModeId" />
      <div class="flex-1" />
      <div v-if="usage" class="w-full sm:w-auto sm:min-w-[240px]">
        <AcpUsageWidget
          :used="usage.used"
          :size="usage.size"
          :cost="usage.cost"
        />
      </div>
    </div>

    <!-- Agent thought -->
    <AcpThoughtView :thought="agentThought" />

    <!-- Execution plan -->
    <AcpPlanView :entries="plan" />

    <!-- Agent message -->
    <AcpStreamingText :text="agentMessage" />

    <!-- Tool calls -->
    <AcpToolCallView
      v-for="tc in toolCallList"
      :key="tc.toolCallId"
      :tool-call="tc"
    />

    <!-- Config panel -->
    <AcpConfigPanel
      v-if="configOptions.length > 0"
      :config-options="configOptions"
      @config-change="(id, val) => emit('configChange', id, val)"
    />

    <!-- Command palette (hidden dialog, triggered by Cmd+K) -->
    <AcpCommandPalette
      :commands="availableCommands"
      @invoke="(cmd) => emit('invokeCommand', cmd)"
    />
  </div>
</template>
