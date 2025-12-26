<script setup lang="ts">
/**
 * Dashboard View
 *
 * Main dashboard displaying sync metrics from Analytics Engine.
 * Uses composables for data fetching and chart transformations.
 * Features responsive design for desktop, tablet, and mobile.
 */
import { onMounted, computed, toRef } from 'vue';
import { useRouter } from 'vue-router';
import { useAnalytics } from '../composables/useAnalytics';
import { useMetrics } from '../composables/useMetrics';
import DateRangeSelector from '../components/DateRangeSelector.vue';
import MetricsSummary from '../components/MetricsSummary.vue';
import SyncMetricsChart from '../components/SyncMetricsChart.vue';
import ModeDistribution from '../components/ModeDistribution.vue';
import PerformanceTrends from '../components/PerformanceTrends.vue';
import { formatDuration, formatPercent } from '../lib/api';

const router = useRouter();

// Initialize analytics composable
const {
    loading,
    error,
    timeRange,
    autoRefreshEnabled,
    state,
    avgSuccessRate,
    avgDuration,
    fetchAll,
    setTimeRange,
    toggleAutoRefresh,
    startAutoRefresh,
} = useAnalytics();

// Initialize metrics composable with reactive state refs
const {
    timeseriesChartData,
    durationChartData,
    modeDistributionChartData,
    performanceByTypeChartData,
} = useMetrics(
    toRef(() => state.value.timeseries),
    toRef(() => state.value.summary),
    toRef(() => state.value.modeDistribution)
);

// Computed values for MetricsSummary
const totalSyncs = computed(() => state.value.modeDistribution?.total ?? 0);
const cacheHitRate = computed(() => state.value.cacheHits?.hitRate ?? null);

/**
 * Handle time range change
 */
async function handleTimeRangeChange(range: typeof timeRange.value) {
    await setTimeRange(range);
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        await fetch('/api/auth/sign-out', {
            method: 'POST',
            credentials: 'include',
        });
        await router.push('/login');
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// Fetch data on mount and start auto-refresh
onMounted(() => {
    fetchAll();
    startAutoRefresh();
});
</script>

<template>
    <div class="min-h-screen">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                        Happy Admin Dashboard
                    </h1>
                    <div class="flex flex-wrap items-center gap-3">
                        <!-- Time Range Selector -->
                        <DateRangeSelector
                            v-model="timeRange"
                            :disabled="loading"
                            @update:model-value="handleTimeRangeChange"
                        />

                        <!-- Auto-refresh toggle -->
                        <button
                            class="text-sm px-3 py-1.5 rounded-lg transition-colors"
                            :class="
                                autoRefreshEnabled
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            "
                            @click="toggleAutoRefresh()"
                        >
                            {{ autoRefreshEnabled ? 'Auto ✓' : 'Auto ✗' }}
                        </button>

                        <!-- Last updated -->
                        <span
                            v-if="state.lastUpdated"
                            class="hidden sm:inline text-sm text-gray-500 dark:text-gray-400"
                        >
                            Updated: {{ state.lastUpdated }}
                        </span>

                        <!-- Refresh button -->
                        <button
                            class="btn-secondary text-sm"
                            :disabled="loading"
                            @click="fetchAll"
                        >
                            <span v-if="loading" class="inline-flex items-center gap-1">
                                <span class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                Loading...
                            </span>
                            <span v-else>Refresh</span>
                        </button>

                        <!-- Sign Out -->
                        <button class="btn-secondary text-sm" @click="handleLogout">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            <!-- Error State -->
            <div v-if="error" class="card text-center py-12 mb-6">
                <svg
                    class="w-12 h-12 text-red-400 mx-auto mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                </svg>
                <p class="text-red-600 dark:text-red-400 mb-4">{{ error }}</p>
                <button class="btn-primary" @click="fetchAll">
                    Try Again
                </button>
            </div>

            <!-- Dashboard Content -->
            <div v-else class="space-y-6 md:space-y-8">
                <!-- Summary Cards -->
                <MetricsSummary
                    :total-syncs="totalSyncs"
                    :avg-duration="avgDuration"
                    :cache-hit-rate="cacheHitRate"
                    :success-rate="avgSuccessRate"
                    :loading="loading && !state.summary.length"
                />

                <!-- Charts Row 1: Line Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SyncMetricsChart
                        :data="timeseriesChartData"
                        title="Sync Activity Over Time"
                        y-axis-label="Sync Count"
                        :loading="loading && !state.timeseries.length"
                    />
                    <SyncMetricsChart
                        :data="durationChartData"
                        title="Average Duration Over Time"
                        y-axis-label="Duration (ms)"
                        :loading="loading && !state.timeseries.length"
                    />
                </div>

                <!-- Charts Row 2: Doughnut and Bar -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ModeDistribution
                        :data="modeDistributionChartData"
                        :loading="loading && !state.modeDistribution"
                    />
                    <PerformanceTrends
                        :data="performanceByTypeChartData"
                        title="Sync Count by Type"
                        y-axis-label="Count"
                        :loading="loading && !state.summary.length"
                    />
                </div>

                <!-- Detailed Metrics Table -->
                <div class="card overflow-hidden">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-6 pt-6">
                        Metrics by Type &amp; Mode
                    </h2>

                    <!-- Loading State for table -->
                    <div
                        v-if="loading && !state.summary.length"
                        class="flex items-center justify-center py-12"
                    >
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-happy-600" />
                    </div>

                    <!-- Empty State -->
                    <div
                        v-else-if="!state.summary.length"
                        class="flex items-center justify-center py-12"
                    >
                        <p class="text-gray-400 dark:text-gray-500">No metrics data available</p>
                    </div>

                    <!-- Table -->
                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        Type
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        Mode
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        Count
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        Avg Duration
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        P95 Duration
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        Success Rate
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                <tr
                                    v-for="metric in state.summary"
                                    :key="`${metric.syncType}-${metric.syncMode}`"
                                    class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {{ metric.syncType }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                                        <span
                                            class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                            :class="{
                                                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400':
                                                    metric.syncMode === 'full',
                                                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':
                                                    metric.syncMode === 'incremental',
                                                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400':
                                                    metric.syncMode === 'cached',
                                            }"
                                        >
                                            {{ metric.syncMode }}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                        {{ metric.count.toLocaleString() }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                        {{ formatDuration(metric.avgDurationMs) }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                                        {{ formatDuration(metric.p95DurationMs) }}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                                        <span
                                            :class="
                                                metric.successRate >= 0.95
                                                    ? 'text-green-600 dark:text-green-400'
                                                    : metric.successRate >= 0.9
                                                      ? 'text-yellow-600 dark:text-yellow-400'
                                                      : 'text-red-600 dark:text-red-400'
                                            "
                                        >
                                            {{ formatPercent(metric.successRate) }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>
