<script setup lang="ts">
/**
 * ToolResult - Display for Claude tool call results
 *
 * Renders tool invocation results with:
 * - Tool name and status indicator
 * - Collapsible content (default collapsed for large outputs)
 * - Different styles for success/error states
 *
 * Used within MessageView to display tool results from Claude sessions.
 */

import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';

interface Props {
  /** Name of the tool that was called */
  toolName: string;
  /** Result content (may be JSON or plain text) */
  result: string;
  /** Whether the tool execution was successful */
  success?: boolean;
  /** Whether to auto-collapse long results */
  autoCollapse?: boolean;
  /** Threshold for auto-collapse (characters) */
  collapseThreshold?: number;
}

const props = withDefaults(defineProps<Props>(), {
  success: true,
  autoCollapse: true,
  collapseThreshold: 500,
});

// Auto-collapse if result exceeds threshold
const isExpanded = ref(!props.autoCollapse || props.result.length < props.collapseThreshold);

const statusIcon = computed(() => (props.success ? '✓' : '✗'));
const statusColor = computed(() =>
  props.success ? 'text-green-500' : 'text-red-500'
);

const borderColor = computed(() =>
  props.success ? 'border-green-500/30' : 'border-red-500/30'
);

const displayResult = computed(() => {
  // Try to pretty-print JSON
  try {
    const parsed = JSON.parse(props.result);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return props.result;
  }
});

const truncatedResult = computed(() => {
  if (isExpanded.value) return displayResult.value;
  return displayResult.value.slice(0, props.collapseThreshold) + '...';
});

function toggleExpand() {
  isExpanded.value = !isExpanded.value;
}
</script>

<template>
  <div :class="['rounded-lg border-l-4 bg-muted/30 overflow-hidden', borderColor]">
    <!-- Header -->
    <div class="flex items-center justify-between px-3 py-2 bg-muted/20">
      <div class="flex items-center gap-2">
        <span :class="['text-sm font-medium', statusColor]">
          {{ statusIcon }}
        </span>
        <span class="text-sm font-medium text-foreground">
          {{ toolName }}
        </span>
        <span class="text-xs text-muted-foreground">
          tool result
        </span>
      </div>
      <Button
        v-if="result.length > collapseThreshold"
        variant="ghost"
        size="sm"
        class="h-6 px-2 text-xs"
        @click="toggleExpand"
      >
        {{ isExpanded ? 'Collapse' : 'Expand' }}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          :class="['h-3.5 w-3.5 ml-1 transition-transform', isExpanded && 'rotate-180']"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
    </div>

    <!-- Result content -->
    <div class="overflow-x-auto">
      <pre class="p-3 text-xs leading-relaxed font-mono text-muted-foreground whitespace-pre-wrap break-words">{{ truncatedResult }}</pre>
    </div>
  </div>
</template>
