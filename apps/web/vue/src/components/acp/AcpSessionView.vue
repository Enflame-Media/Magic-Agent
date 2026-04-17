<!--
  HAP-1047: ACP Session View Component

  Container component that composes all ACP display components into
  a cohesive session display. Integrates with the Pinia ACP store
  via the useAcpSession composable.

  HAP-1099: Migrated from the legacy AcpThoughtView/AcpPlanView/
  AcpToolCallView/AcpStreamingText components to AI Elements
  (ChainOfThought, Plan, Tool, MessageResponse) so ACP sessions
  share the same design system as the rest of the app.
-->
<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAcpSession } from "@/composables/useAcpSession";
import AcpModeIndicator from "./AcpModeIndicator.vue";
import AcpUsageWidget from "./AcpUsageWidget.vue";
import AcpCommandPalette from "./AcpCommandPalette.vue";
import AcpConfigPanel from "./AcpConfigPanel.vue";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
} from "@/components/ai-elements/chain-of-thought";
import { MessageResponse } from "@/components/ai-elements/message";
import {
  Plan,
  PlanContent,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from "@/components/ai-elements/plan";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";
import type {
  AcpAvailableCommand,
  AcpPlanEntryStatus,
  AcpToolCall,
  AcpToolCallStatus,
} from "@magic-agent/protocol";
import { IconCircle, IconCircleCheck, IconCircleFilled } from "@tabler/icons-vue";

const props = defineProps<{
  sessionId: string;
}>();

const emit = defineEmits<{
  invokeCommand: [command: AcpAvailableCommand];
  configChange: [configId: string, value: string];
}>();

const { t } = useI18n();

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

/**
 * Map ACP tool call status to the ToolUIPart state enum expected by
 * AI Elements Tool/ToolHeader. Unknown/undefined statuses fall back to
 * 'input-streaming' (pending).
 */
function mapToolState(status: AcpToolCallStatus | undefined): ToolUIPart["state"] {
  switch (status) {
    case "completed":
      return "output-available";
    case "failed":
      return "output-error";
    case "in_progress":
      return "input-available";
    case "pending":
    default:
      return "input-streaming";
  }
}

function toolLocation(tc: AcpToolCall): string | null {
  const loc = tc.locations?.[0];
  if (!loc) return null;
  return loc.line != null ? `${loc.path}:${loc.line}` : loc.path;
}

function planStatusClass(status: AcpPlanEntryStatus): string {
  switch (status) {
    case "completed":
      return "text-green-500";
    case "in_progress":
      return "text-primary";
    case "pending":
    default:
      return "text-muted-foreground";
  }
}
</script>

<template>
  <div v-if="hasSession" class="flex flex-col gap-1">
    <!-- Header: mode indicator + usage -->
    <div v-if="currentModeId || usage" class="flex flex-wrap items-center justify-between gap-2">
      <AcpModeIndicator v-if="currentModeId" :mode-id="currentModeId" />
      <div class="flex-1" />
      <div v-if="usage" class="w-full sm:w-auto sm:min-w-[240px]">
        <AcpUsageWidget :used="usage.used" :size="usage.size" :cost="usage.cost" />
      </div>
    </div>

    <!-- Agent thought (collapsible chain of thought) -->
    <ChainOfThought v-if="agentThought" class="my-1">
      <ChainOfThoughtHeader>
        {{ t("acp.thought.title") }}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        <p class="text-[13px] leading-[18px] text-muted-foreground whitespace-pre-wrap">
          {{ agentThought }}
        </p>
      </ChainOfThoughtContent>
    </ChainOfThought>

    <!-- Execution plan -->
    <Plan v-if="plan.length > 0" class="my-1">
      <PlanHeader>
        <PlanTitle>{{ t("acp.plan") }}</PlanTitle>
        <PlanTrigger />
      </PlanHeader>
      <PlanContent>
        <div class="flex flex-col gap-1">
          <div v-for="(entry, index) in plan" :key="index" class="flex items-start gap-2 py-1">
            <IconCircleCheck
              v-if="entry.status === 'completed'"
              class="mt-0.5 size-4 shrink-0"
              :class="planStatusClass(entry.status)"
            />
            <IconCircleFilled
              v-else-if="entry.status === 'in_progress'"
              class="mt-0.5 size-4 shrink-0"
              :class="planStatusClass(entry.status)"
            />
            <IconCircle
              v-else
              class="mt-0.5 size-4 shrink-0"
              :class="planStatusClass(entry.status)"
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
      </PlanContent>
    </Plan>

    <!-- Agent message -->
    <div v-if="agentMessage" class="my-1">
      <MessageResponse :content="agentMessage" />
    </div>

    <!-- Tool calls -->
    <Tool v-for="tc in toolCallList" :key="tc.toolCallId" class="my-1">
      <ToolHeader
        type="dynamic-tool"
        :tool-name="tc.kind ?? 'tool'"
        :state="mapToolState(tc.status)"
        :title="tc.title"
      />
      <ToolContent>
        <p
          v-if="toolLocation(tc)"
          class="px-3 pb-3 truncate font-mono text-xs text-muted-foreground"
        >
          {{ toolLocation(tc) }}
        </p>
      </ToolContent>
    </Tool>

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
