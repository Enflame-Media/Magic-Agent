<script setup lang="ts">
/**
 * Usage Settings - Plan limits and usage summary.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { usePlanLimits } from '@/composables/usePlanLimits';
import { usePerformanceMonitor } from '@/composables/usePerformanceMonitor';

const router = useRouter();
const { limit, used, resetAt, refreshLimits } = usePlanLimits();
const { apiLatencyMs, lastCheckedAt, refreshMetrics } = usePerformanceMonitor();

const percentUsed = computed(() => Math.min(100, Math.round((used.value / limit.value) * 100)));

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <header class="flex items-center gap-4 mb-6">
      <Button variant="ghost" size="icon" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>
      <h1 class="text-2xl font-semibold">Usage</h1>
    </header>

    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plan limits</CardTitle>
          <CardDescription>Track your monthly usage and reset date.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-sm">
              <span class="text-muted-foreground">Usage</span>
              <span class="font-medium">{{ used.toLocaleString() }} / {{ limit.toLocaleString() }} tokens</span>
            </div>
            <Progress :model-value="percentUsed" />
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Resets</span>
            <span class="font-medium">{{ resetAt }}</span>
          </div>
          <Button variant="outline" @click="refreshLimits">Refresh usage</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>Recent API latency and health signal.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Average latency</span>
            <span class="font-medium">{{ apiLatencyMs }} ms</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Last check</span>
            <span class="font-medium">{{ lastCheckedAt }}</span>
          </div>
          <Button variant="outline" @click="refreshMetrics">Refresh metrics</Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
