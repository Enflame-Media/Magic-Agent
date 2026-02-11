<script setup lang="ts">
/**
 * MetricsSummary Component
 *
 * Displays summary cards with key metrics:
 * - Total syncs
 * - Average duration
 * - Cache hit rate
 * - Success rate
 */
import { computed } from 'vue';
import { formatDuration, formatPercent, formatNumber } from '../lib/api';

interface Props {
    totalSyncs: number;
    avgDuration: number;
    cacheHitRate: number | null;
    successRate: number;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

/**
 * Get color class based on rate value
 */
function getRateColor(rate: number): string {
    if (rate >= 0.95) return 'text-green-600';
    if (rate >= 0.9) return 'text-yellow-600';
    return 'text-red-600';
}

const formattedTotalSyncs = computed(() => formatNumber(props.totalSyncs));
const formattedAvgDuration = computed(() => formatDuration(props.avgDuration));
const formattedCacheHitRate = computed(() =>
    props.cacheHitRate !== null ? formatPercent(props.cacheHitRate) : '-'
);
const formattedSuccessRate = computed(() => formatPercent(props.successRate));

const cacheRateColor = computed(() =>
    props.cacheHitRate !== null ? getRateColor(props.cacheHitRate) : 'text-gray-400'
);
const successRateColor = computed(() => getRateColor(props.successRate));
</script>

<template>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <!-- Total Syncs -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Syncs
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <svg
                    v-else
                    class="w-8 h-8 text-happy-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                </svg>
            </div>
            <p
                class="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
                :class="{ 'animate-pulse': props.loading }"
            >
                {{ props.loading ? '-' : formattedTotalSyncs }}
            </p>
            <p class="mt-1 text-xs text-gray-400">In selected time range</p>
        </div>

        <!-- Average Duration -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Avg Duration
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <svg
                    v-else
                    class="w-8 h-8 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>
            <p
                class="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
                :class="{ 'animate-pulse': props.loading }"
            >
                {{ props.loading ? '-' : formattedAvgDuration }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Per sync operation</p>
        </div>

        <!-- Cache Hit Rate -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Cache Hit Rate
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <svg
                    v-else
                    class="w-8 h-8 text-purple-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                </svg>
            </div>
            <p
                class="mt-2 text-3xl font-bold"
                :class="[props.loading ? 'text-gray-400' : cacheRateColor, { 'animate-pulse': props.loading }]"
            >
                {{ props.loading ? '-' : formattedCacheHitRate }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Profile lookups</p>
        </div>

        <!-- Success Rate -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Success Rate
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <svg
                    v-else
                    class="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
            </div>
            <p
                class="mt-2 text-3xl font-bold"
                :class="[props.loading ? 'text-gray-400' : successRateColor, { 'animate-pulse': props.loading }]"
            >
                {{ props.loading ? '-' : formattedSuccessRate }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Across all sync types</p>
        </div>
    </div>
</template>
