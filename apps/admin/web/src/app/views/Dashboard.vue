<script setup lang="ts">
/**
 * Dashboard View
 *
 * Main dashboard displaying sync metrics from Analytics Engine.
 * Uses composables for data fetching and chart transformations.
 * Features responsive design for desktop, tablet, and mobile.
 */
import { onMounted, computed, toRef, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAnalytics } from '../composables/useAnalytics';
import { useMetrics } from '../composables/useMetrics';
import { useTranslation } from '@/composables/useTranslation';
import DateRangeSelector from '../components/DateRangeSelector.vue';
import PlatformSelector from '../components/PlatformSelector.vue';
import type { Platform } from '../components/PlatformSelector.vue';
import MetricsSummary from '../components/MetricsSummary.vue';
import SyncMetricsChart from '../components/SyncMetricsChart.vue';
import ModeDistribution from '../components/ModeDistribution.vue';
import PerformanceTrends from '../components/PerformanceTrends.vue';
import BundleSizeChart from '../components/BundleSizeChart.vue';
import BundleSizeLatest from '../components/BundleSizeLatest.vue';
import ValidationSummary from '../components/ValidationSummary.vue';
import ValidationTrendsChart from '../components/ValidationTrendsChart.vue';
import UnknownTypeBreakdown from '../components/UnknownTypeBreakdown.vue';
import WebSocketSummary from '../components/WebSocketSummary.vue';
import LanguageSelector from '../components/app/LanguageSelector.vue';
import MockDataBanner from '../components/MockDataBanner.vue';
import { formatDuration, formatPercent, API_BASE_URL, apiRequest } from '../lib/api';
import { useBundleSize, useBundleSizeCharts } from '../composables/useBundleSize';
import { useValidation, useValidationCharts } from '../composables/useValidation';
import { useWebSocketMetrics, useWebSocketCharts } from '../composables/useWebSocketMetrics';

const router = useRouter();
const { t } = useTranslation();

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

// Initialize bundle size composable (HAP-564)
const {
    state: bundleState,
    fetchBundleData,
} = useBundleSize();

// Platform filter state (HAP-571)
const selectedPlatform = ref<Platform>('all');

// Chart data with platform filtering support (HAP-571)
const { bundleSizeChartData } = useBundleSizeCharts(
    toRef(() => {
        if (selectedPlatform.value === 'all') {
            return bundleState.value.trends;
        }
        return bundleState.value.trends.filter(t => t.platform === selectedPlatform.value);
    })
);

// Initialize validation metrics composable (HAP-582)
const {
    state: validationState,
    fetchValidationData,
} = useValidation();

// Chart data for validation trends (HAP-582)
const { validationTimeseriesChartData } = useValidationCharts(
    toRef(() => validationState.value.timeseries)
);

// Initialize WebSocket metrics composable (HAP-896)
const {
    state: wsState,
    fetchWebSocketData,
} = useWebSocketMetrics();

// Chart data for WebSocket metrics (HAP-896)
const { connectionTimeChartData, broadcastLatencyChartData, errorBreakdownChartData } = useWebSocketCharts(
    toRef(() => wsState.value.connections),
    toRef(() => wsState.value.broadcasts)
);

/**
 * Handle platform filter change (HAP-571)
 */
async function handlePlatformChange(platform: Platform) {
    selectedPlatform.value = platform;
    // Refetch data - for 'all' we pass undefined to get all platforms
    await fetchBundleData(30, platform === 'all' ? undefined : platform);
}

/**
 * Refresh all dashboard data (HAP-582, HAP-896)
 * Called by manual Refresh button and auto-refresh cycle
 */
async function refreshAllData() {
    await Promise.all([
        fetchAll(),
        fetchBundleData(),
        fetchValidationData(),
        fetchWebSocketData(),
    ]);
}

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
 * HAP-616: Use apiRequest for CSRF protection
 */
async function handleLogout() {
    try {
        await apiRequest(`${API_BASE_URL}/api/auth/sign-out`, {
            method: 'POST',
        });
        await router.push('/login');
    } catch (err) {
        console.error('Logout error:', err);
    }
}

// Fetch data on mount and start auto-refresh
onMounted(() => {
    fetchAll();
    fetchBundleData();
    fetchValidationData();
    fetchWebSocketData();
    startAutoRefresh();
});

// Auto-refresh bundle, validation, and WebSocket data when analytics auto-refreshes (HAP-582, HAP-896)
// Watch for lastUpdated changes triggered by the analytics auto-refresh interval
let isInitialLoad = true;
watch(
    () => state.value.lastUpdated,
    () => {
        // Skip the initial load since we already fetch in onMounted
        if (isInitialLoad) {
            isInitialLoad = false;
            return;
        }
        // When analytics auto-refreshes, also refresh bundle, validation, and WebSocket data
        if (autoRefreshEnabled.value) {
            fetchBundleData();
            fetchValidationData();
            fetchWebSocketData();
        }
    }
);
</script>

<template>
    <div class="min-h-screen">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                        {{ t('dashboard.header') }}
                    </h1>
                    <div class="flex flex-wrap items-center gap-3">
                        <!-- Language Selector (HAP-697) -->
                        <LanguageSelector :show-label="false" />

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
                            {{ autoRefreshEnabled ? t('dashboard.autoOn') : t('dashboard.autoOff') }}
                        </button>

                        <!-- Last updated -->
                        <span
                            v-if="state.lastUpdated"
                            class="hidden sm:inline text-sm text-gray-500 dark:text-gray-400"
                        >
                            {{ t('dashboard.updated') }} {{ state.lastUpdated }}
                        </span>

                        <!-- Refresh button -->
                        <button
                            class="btn-secondary text-sm"
                            :disabled="loading"
                            @click="refreshAllData"
                        >
                            <span v-if="loading" class="inline-flex items-center gap-1">
                                <span class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                {{ t('common.loading') }}
                            </span>
                            <span v-else>{{ t('common.refresh') }}</span>
                        </button>

                        <!-- User Management (HAP-639) -->
                        <router-link
                            to="/admin/users"
                            class="btn-secondary text-sm inline-flex items-center gap-1"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                            {{ t('navigation.users') }}
                        </router-link>

                        <!-- Sign Out -->
                        <button class="btn-secondary text-sm" @click="handleLogout">
                            {{ t('auth.signOut') }}
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
                    {{ t('dashboard.tryAgain') }}
                </button>
            </div>

            <!-- Dashboard Content -->
            <div v-else class="space-y-6 md:space-y-8">
                <!-- HAP-638: Mock Data Warning Banner -->
                <MockDataBanner
                    :is-mock-data="state.isMockData"
                    :mock-sources="state.mockDataSources"
                />

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
                        :title="t('dashboard.syncActivity')"
                        y-axis-label="Sync Count"
                        :loading="loading && !state.timeseries.length"
                    />
                    <SyncMetricsChart
                        :data="durationChartData"
                        :title="t('dashboard.avgDuration')"
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

                <!-- Bundle Size Section (HAP-564, HAP-571) -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6 md:pt-8">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                            {{ t('dashboard.bundleSizeMetrics') }}
                        </h2>
                        <PlatformSelector
                            v-model="selectedPlatform"
                            :disabled="bundleState.loading"
                            @update:model-value="handlePlatformChange"
                        />
                    </div>
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div class="lg:col-span-2">
                            <BundleSizeChart
                                :data="bundleSizeChartData"
                                :title="t('dashboard.bundleTrends')"
                                :loading="bundleState.loading && !bundleState.trends.length"
                            />
                        </div>
                        <div>
                            <BundleSizeLatest
                                :data="bundleState.latest"
                                :previous-day="bundleState.previousDay"
                                :loading="bundleState.loading && !bundleState.latest.length"
                            />
                        </div>
                    </div>
                </div>

                <!-- Validation Metrics Section (HAP-582) -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6 md:pt-8">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        {{ t('dashboard.validationMetrics') }}
                    </h2>

                    <!-- Validation Summary Cards -->
                    <ValidationSummary
                        :data="validationState.summary"
                        :loading="validationState.loading && !validationState.summary"
                    />

                    <!-- Validation Charts Row -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                        <div class="lg:col-span-2">
                            <ValidationTrendsChart
                                :data="validationTimeseriesChartData"
                                :title="t('dashboard.validationTrends')"
                                :loading="validationState.loading && !validationState.timeseries.length"
                            />
                        </div>
                        <div>
                            <UnknownTypeBreakdown
                                :data="validationState.unknownTypes"
                                :loading="validationState.loading && !validationState.unknownTypes.length"
                            />
                        </div>
                    </div>
                </div>

                <!-- WebSocket Performance Metrics Section (HAP-896) -->
                <div class="border-t border-gray-200 dark:border-gray-700 pt-6 md:pt-8">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        {{ t('metrics.websocket.title') }}
                    </h2>

                    <!-- WebSocket Summary Cards -->
                    <WebSocketSummary
                        :data="wsState.summary"
                        :loading="wsState.loading && !wsState.summary"
                    />

                    <!-- WebSocket Charts Row -->
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                        <SyncMetricsChart
                            :data="connectionTimeChartData"
                            :title="t('metrics.websocket.connectionTimeChart')"
                            y-axis-label="Time (ms)"
                            :loading="wsState.loading && !wsState.connections.length"
                        />
                        <SyncMetricsChart
                            :data="broadcastLatencyChartData"
                            :title="t('metrics.websocket.broadcastLatencyChart')"
                            y-axis-label="Latency (ms)"
                            :loading="wsState.loading && !wsState.broadcasts.length"
                        />
                    </div>
                </div>

                <!-- Detailed Metrics Table -->
                <div class="card overflow-hidden">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 px-6 pt-6">
                        {{ t('dashboard.metricsByType') }}
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
                        <p class="text-gray-400 dark:text-gray-500">{{ t('dashboard.noMetrics') }}</p>
                    </div>

                    <!-- Table -->
                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800/50">
                                <tr>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('dashboard.tableHeaders.type') }}
                                    </th>
                                    <th
                                        class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('dashboard.tableHeaders.mode') }}
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('dashboard.tableHeaders.count') }}
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('dashboard.tableHeaders.avgDuration') }}
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('dashboard.tableHeaders.p95Duration') }}
                                    </th>
                                    <th
                                        class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                    >
                                        {{ t('dashboard.tableHeaders.successRate') }}
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
