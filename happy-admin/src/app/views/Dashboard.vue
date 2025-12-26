<script setup lang="ts">
/**
 * Dashboard View
 *
 * Main dashboard displaying sync metrics from Analytics Engine.
 * Shows summary stats, charts, and distribution data.
 */
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

interface MetricsSummary {
    syncType: string;
    syncMode: string;
    count: number;
    avgDurationMs: number;
    p95DurationMs: number;
    successRate: number;
}

interface ModeDistribution {
    full: number;
    incremental: number;
    cached: number;
    total: number;
}

interface CacheHitRate {
    hits: number;
    misses: number;
    hitRate: number;
}

const loading = ref(true);
const error = ref('');
const summary = ref<MetricsSummary[]>([]);
const distribution = ref<ModeDistribution | null>(null);
const cacheStats = ref<CacheHitRate | null>(null);
const lastUpdated = ref('');

/**
 * Fetch all metrics data from API
 */
async function fetchMetrics() {
    loading.value = true;
    error.value = '';

    try {
        const [summaryRes, distributionRes, cacheRes] = await Promise.all([
            fetch('/api/metrics/summary', { credentials: 'include' }),
            fetch('/api/metrics/mode-distribution', { credentials: 'include' }),
            fetch('/api/metrics/cache-hits', { credentials: 'include' }),
        ]);

        if (!summaryRes.ok || !distributionRes.ok || !cacheRes.ok) {
            throw new Error('Failed to fetch metrics');
        }

        const summaryData = await summaryRes.json();
        const distributionData = await distributionRes.json();
        const cacheData = await cacheRes.json();

        summary.value = summaryData.data;
        distribution.value = distributionData.data;
        cacheStats.value = cacheData.data;
        lastUpdated.value = new Date().toLocaleTimeString();
    } catch (err) {
        error.value = 'Failed to load metrics. Please try again.';
        console.error('Metrics fetch error:', err);
    } finally {
        loading.value = false;
    }
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

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

onMounted(() => {
    fetchMetrics();
    // Auto-refresh every 5 minutes
    setInterval(fetchMetrics, 5 * 60 * 1000);
});
</script>

<template>
    <div class="min-h-screen">
        <!-- Header -->
        <header class="bg-white dark:bg-gray-800 shadow-sm">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-xl font-bold text-gray-900 dark:text-white">
                        Happy Admin Dashboard
                    </h1>
                    <div class="flex items-center gap-4">
                        <span v-if="lastUpdated" class="text-sm text-gray-500">
                            Last updated: {{ lastUpdated }}
                        </span>
                        <button
                            @click="fetchMetrics"
                            class="btn-secondary text-sm"
                            :disabled="loading"
                        >
                            Refresh
                        </button>
                        <button @click="handleLogout" class="btn-secondary text-sm">
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Loading State -->
            <div v-if="loading && !summary.length" class="text-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-happy-600 mx-auto"></div>
                <p class="mt-4 text-gray-600 dark:text-gray-400">Loading metrics...</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="card text-center py-12">
                <p class="text-red-600">{{ error }}</p>
                <button @click="fetchMetrics" class="btn-primary mt-4">
                    Try Again
                </button>
            </div>

            <!-- Dashboard Content -->
            <div v-else class="space-y-8">
                <!-- Stats Overview -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <!-- Total Syncs -->
                    <div class="card">
                        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Total Syncs (24h)
                        </h3>
                        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                            {{ distribution?.total.toLocaleString() ?? '—' }}
                        </p>
                    </div>

                    <!-- Cache Hit Rate -->
                    <div class="card">
                        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Cache Hit Rate
                        </h3>
                        <p class="mt-2 text-3xl font-bold text-happy-600">
                            {{ cacheStats ? formatPercent(cacheStats.hitRate) : '—' }}
                        </p>
                    </div>

                    <!-- Success Rate -->
                    <div class="card">
                        <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Avg Success Rate
                        </h3>
                        <p class="mt-2 text-3xl font-bold text-green-600">
                            {{
                                summary.length
                                    ? formatPercent(
                                          summary.reduce((acc, s) => acc + s.successRate, 0) /
                                              summary.length
                                      )
                                    : '—'
                            }}
                        </p>
                    </div>
                </div>

                <!-- Mode Distribution -->
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Sync Mode Distribution
                    </h2>
                    <div v-if="distribution" class="grid grid-cols-3 gap-4">
                        <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p class="text-2xl font-bold text-blue-600">
                                {{ distribution.full.toLocaleString() }}
                            </p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Full Sync</p>
                        </div>
                        <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p class="text-2xl font-bold text-green-600">
                                {{ distribution.incremental.toLocaleString() }}
                            </p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Incremental</p>
                        </div>
                        <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p class="text-2xl font-bold text-purple-600">
                                {{ distribution.cached.toLocaleString() }}
                            </p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">Cached</p>
                        </div>
                    </div>
                </div>

                <!-- Detailed Metrics Table -->
                <div class="card">
                    <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Metrics by Type &amp; Mode
                    </h2>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead>
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Mode
                                    </th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Count
                                    </th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Avg Duration
                                    </th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        P95 Duration
                                    </th>
                                    <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Success Rate
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr v-for="metric in summary" :key="`${metric.syncType}-${metric.syncMode}`">
                                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                        {{ metric.syncType }}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                        {{ metric.syncMode }}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                                        {{ metric.count.toLocaleString() }}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                        {{ formatDuration(metric.avgDurationMs) }}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                                        {{ formatDuration(metric.p95DurationMs) }}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-right">
                                        <span
                                            :class="
                                                metric.successRate >= 0.95
                                                    ? 'text-green-600'
                                                    : metric.successRate >= 0.9
                                                    ? 'text-yellow-600'
                                                    : 'text-red-600'
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
