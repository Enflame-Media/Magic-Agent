<!--
  HAP-1047: ACP Usage & Context Window Display Widget

  Displays real-time context window usage and optional cost information
  for ACP sessions. Shows a progress bar with color transitions
  (green -> yellow -> red) and formatted token counts.
-->
<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconGauge } from '@tabler/icons-vue';
import { Progress } from '@/components/ui/progress';

const props = defineProps<{
  used: number;
  size: number;
  cost: { amount: number; currency: string } | null;
}>();

const { t } = useI18n();

const percentage = computed(() => {
  return props.size > 0 ? Math.min(props.used / props.size, 1) : 0;
});

const percentDisplay = computed(() => Math.round(percentage.value * 100));

const barColorClass = computed(() => {
  if (percentage.value >= 0.85) return 'text-red-500';
  if (percentage.value >= 0.60) return 'text-amber-500';
  return 'text-green-500';
});

const barBgClass = computed(() => {
  if (percentage.value >= 0.85) return '[&>[data-slot=progress-indicator]]:bg-red-500';
  if (percentage.value >= 0.60) return '[&>[data-slot=progress-indicator]]:bg-amber-500';
  return '[&>[data-slot=progress-indicator]]:bg-green-500';
});

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toLocaleString();
}

function formatCost(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
</script>

<template>
  <div class="rounded-xl bg-muted/50 p-3 my-1">
    <div class="mb-2 flex items-center gap-1.5">
      <IconGauge class="size-3.5 text-muted-foreground" />
      <span class="flex-1 text-[13px] font-semibold text-muted-foreground">
        {{ t('acp.usage.title') }}
      </span>
      <span class="text-[13px] font-bold" :class="barColorClass">
        {{ percentDisplay }}%
      </span>
    </div>
    <Progress
      :model-value="percentDisplay"
      class="mb-2 h-1.5"
      :class="barBgClass"
    />
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted-foreground">
        {{ t('acp.usage.tokens', { used: formatTokens(props.used), total: formatTokens(props.size) }) }}
      </span>
      <span v-if="props.cost" class="text-xs font-semibold text-foreground">
        {{ formatCost(props.cost.amount, props.cost.currency) }}
      </span>
    </div>
  </div>
</template>
