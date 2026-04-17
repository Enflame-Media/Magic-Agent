<script setup lang="ts">
import type { ToolUIPart } from "ai";
import { computed } from "vue";
import { ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import {
  Confirmation,
  ConfirmationAccepted,
  ConfirmationRejected,
  ConfirmationRequest,
  ConfirmationTitle,
} from "@/components/ai-elements/confirmation";
import type { ToolUIPartApproval } from "@/components/ai-elements/confirmation/context";
import type { NormalizedMessage, ToolCall, ToolPermission } from "@/services/messages/types";
import { getToolViewComponent } from "./views/_all";

interface Props {
  tool: ToolCall;
  messages?: NormalizedMessage[];
}

const props = defineProps<Props>();

const SpecificToolView = computed(() => getToolViewComponent(props.tool.name));

// Whether the tool produced any result payload (string or object).
const hasResult = computed(() => props.tool.result !== undefined && props.tool.result !== null);

// Show an error block when the tool entered the error state and has a result.
const isError = computed(() => props.tool.state === "error" && hasResult.value);

// errorText is a string; serialize non-string results so <ToolOutput> can show them.
const errorText = computed<string | undefined>(() => {
  if (!isError.value) {
    return undefined;
  }
  const result = props.tool.result;
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
});

// The success output is only shown when the tool is NOT in an error state.
const successOutput = computed<unknown>(() => {
  if (isError.value || !hasResult.value) {
    return null;
  }
  return props.tool.result;
});

// Map our ToolCall state (+ optional permission) to the AI Elements tool state
// used by the <Confirmation> family. Mirrors the HAP-1092 adapter logic inline
// to keep this component self-contained.
function mapToolState(state: ToolCall["state"], permission?: ToolPermission): ToolUIPart["state"] {
  if (state === "running") {
    if (permission?.status === "pending") {
      return "approval-requested";
    }
    return "input-available";
  }
  // completed | error — both surface as output-available so the Confirmation
  // accepted/rejected slots render the final decision.
  return "output-available";
}

// Map our ToolPermission to the AI Elements ToolUIPartApproval shape.
function mapToolApproval(permission?: ToolPermission): ToolUIPartApproval {
  if (!permission) {
    return undefined;
  }
  const id = permission.id ?? "";
  switch (permission.status) {
    case "pending":
      return { id };
    case "approved":
      return { id, approved: true, reason: permission.reason };
    case "denied":
      return { id, approved: false, reason: permission.reason };
    case "canceled":
      return { id, approved: false, reason: permission.reason ?? "canceled" };
    default:
      return { id };
  }
}

const toolUiState = computed(() => mapToolState(props.tool.state, props.tool.permission));
const toolApproval = computed(() => mapToolApproval(props.tool.permission));
</script>

<template>
  <div class="space-y-4">
    <component :is="SpecificToolView" v-if="SpecificToolView" :tool="tool" :messages="messages" />

    <ToolInput :input="tool.input" />

    <ToolOutput v-if="hasResult" :output="successOutput" :error-text="errorText" />

    <Confirmation v-if="toolApproval" :approval="toolApproval" :state="toolUiState">
      <ConfirmationRequest>
        <ConfirmationTitle>Permission requested</ConfirmationTitle>
        <p v-if="tool.permission?.reason" class="text-sm text-muted-foreground">
          {{ tool.permission.reason }}
        </p>
      </ConfirmationRequest>
      <ConfirmationAccepted>
        <ConfirmationTitle>Permission approved</ConfirmationTitle>
        <p v-if="tool.permission?.reason" class="text-sm text-muted-foreground">
          {{ tool.permission.reason }}
        </p>
      </ConfirmationAccepted>
      <ConfirmationRejected>
        <ConfirmationTitle>Permission denied</ConfirmationTitle>
        <p v-if="tool.permission?.reason" class="text-sm text-muted-foreground">
          {{ tool.permission.reason }}
        </p>
      </ConfirmationRejected>
    </Confirmation>
  </div>
</template>
