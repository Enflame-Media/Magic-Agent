<script setup lang="ts">
import { computed } from "vue";
import {
  Terminal,
  TerminalActions,
  TerminalContent,
  TerminalCopyButton,
} from "@/components/ai-elements/terminal";
import type { ToolViewProps } from "./types";

const props = defineProps<ToolViewProps>();

const command = computed(() => {
  const input = props.tool.input as { command?: string } | null;
  return input?.command ?? JSON.stringify(props.tool.input, null, 2);
});

const result = computed(() => {
  if (props.tool.result === undefined || props.tool.result === null) {
    return "";
  }
  if (typeof props.tool.result === "string") {
    return props.tool.result;
  }
  return JSON.stringify(props.tool.result, null, 2);
});

const output = computed(() => {
  const prompt = `$ ${command.value}`;
  return result.value ? `${prompt}\n${result.value}` : prompt;
});

const isStreaming = computed(() => props.tool.state === "running");
</script>

<template>
  <Terminal :output="output" :is-streaming="isStreaming">
    <TerminalActions class="justify-end px-2 py-1">
      <TerminalCopyButton />
    </TerminalActions>
    <TerminalContent />
  </Terminal>
</template>
