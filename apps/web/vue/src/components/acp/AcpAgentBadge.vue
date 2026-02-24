<!--
  HAP-1048: ACP Agent Badge Component

  Compact indicator showing the currently active agent name and icon.
  Designed for session headers to show at-a-glance which agent is running.
-->
<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import type { AcpRegisteredAgent } from '@/stores/acpTypes';

defineProps<{
  /** The currently active agent, or null if none */
  agent: AcpRegisteredAgent | null;
  /** Whether an agent switch is in progress */
  switching?: boolean;
}>();
</script>

<template>
  <Badge
    v-if="agent"
    variant="secondary"
    class="gap-1.5 text-xs font-semibold max-w-[140px]"
  >
    <svg class="h-3 w-3 shrink-0 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"/>
    </svg>
    <span class="truncate">{{ agent.name }}</span>
    <svg
      v-if="switching"
      class="h-2.5 w-2.5 animate-spin text-muted-foreground shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  </Badge>
</template>
