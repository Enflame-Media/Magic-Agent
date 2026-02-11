<script setup lang="ts">
/**
 * WebSocketSummary Component
 *
 * Displays summary cards with WebSocket performance metrics:
 * - Total connections
 * - Total broadcasts
 * - Total errors
 * - Avg connection time
 * - Avg broadcast latency
 * - Connection breakdown by type
 *
 * Uses color-coded indicators based on health status.
 *
 * @see HAP-896 - Add WebSocket performance metrics to admin dashboard
 */
import { computed } from 'vue';
import { formatNumber, formatDuration } from '../lib/api';
import type { WebSocketSummary } from '../lib/api';
import { useTranslation } from '../composables/useTranslation';

interface Props {
    data: WebSocketSummary | null;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

const { t } = useTranslation();

/**
 * Get color class based on error count
 * Green = 0, Yellow = low (1-50), Red = high (>50)
 */
function getErrorColor(count: number): string {
    if (count === 0) return 'text-green-600 dark:text-green-400';
    if (count <= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * Get background indicator color for error cards
 */
function getErrorIndicatorBg(count: number): string {
    if (count === 0) return 'bg-green-100 dark:bg-green-900/30';
    if (count <= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
}

/**
 * Get color class based on latency (ms)
 * Green = fast (<50ms), Yellow = moderate (50-200ms), Red = slow (>200ms)
 */
function getLatencyColor(ms: number): string {
    if (ms < 50) return 'text-green-600 dark:text-green-400';
    if (ms <= 200) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

const totalConnections = computed(() => props.data?.totalConnections ?? 0);
const totalBroadcasts = computed(() => props.data?.totalBroadcasts ?? 0);
const totalErrors = computed(() => props.data?.totalErrors ?? 0);
const avgConnectionTimeMs = computed(() => props.data?.avgConnectionTimeMs ?? 0);
const avgBroadcastLatencyMs = computed(() => props.data?.avgBroadcastLatencyMs ?? 0);

const formattedConnections = computed(() => formatNumber(totalConnections.value));
const formattedBroadcasts = computed(() => formatNumber(totalBroadcasts.value));
const formattedErrors = computed(() => formatNumber(totalErrors.value));
const formattedConnectionTime = computed(() => `${avgConnectionTimeMs.value.toFixed(1)}ms`);
const formattedBroadcastLatency = computed(() => `${avgBroadcastLatencyMs.value.toFixed(1)}ms`);
const formattedSessionDuration = computed(() =>
    props.data ? formatDuration(props.data.avgSessionDurationMs) : '-'
);

const errorColor = computed(() => getErrorColor(totalErrors.value));
const connectionTimeColor = computed(() => getLatencyColor(avgConnectionTimeMs.value));
const broadcastLatencyColor = computed(() => getLatencyColor(avgBroadcastLatencyMs.value * 10)); // Scale for comparison

// Client type breakdown
const userScoped = computed(() => props.data?.byClientType.userScoped ?? 0);
const sessionScoped = computed(() => props.data?.byClientType.sessionScoped ?? 0);
const machineScoped = computed(() => props.data?.byClientType.machineScoped ?? 0);
</script>

<template>
    <div class="space-y-4">
        <!-- Primary metrics -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <!-- Total Connections -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {{ t('metrics.websocket.connections') }}
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                    </svg>
                </div>
                <p
                    class="mt-2 text-2xl font-bold text-gray-900 dark:text-white"
                    :class="{ 'animate-pulse': props.loading }"
                >
                    {{ props.loading ? '-' : formattedConnections }}
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ t('metrics.timeRange.last24h') }}</p>
            </div>

            <!-- Total Broadcasts -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {{ t('metrics.websocket.broadcasts') }}
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
                            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                        />
                    </svg>
                </div>
                <p
                    class="mt-2 text-2xl font-bold text-gray-900 dark:text-white"
                    :class="{ 'animate-pulse': props.loading }"
                >
                    {{ props.loading ? '-' : formattedBroadcasts }}
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ t('metrics.websocket.messagesSent') }}</p>
            </div>

            <!-- Total Errors -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {{ t('metrics.websocket.errors') }}
                    </h3>
                    <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <div
                        v-else
                        class="w-8 h-8 rounded-full flex items-center justify-center"
                        :class="getErrorIndicatorBg(totalErrors)"
                    >
                        <svg
                            class="w-5 h-5"
                            :class="errorColor"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                </div>
                <p
                    class="mt-2 text-2xl font-bold"
                    :class="[props.loading ? 'text-gray-400' : errorColor, { 'animate-pulse': props.loading }]"
                >
                    {{ props.loading ? '-' : formattedErrors }}
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ t('metrics.websocket.disconnectErrors') }}</p>
            </div>

            <!-- Avg Connection Time -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {{ t('metrics.websocket.avgConnectionTime') }}
                    </h3>
                    <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <svg
                        v-else
                        class="w-8 h-8"
                        :class="connectionTimeColor"
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
                    class="mt-2 text-2xl font-bold"
                    :class="[props.loading ? 'text-gray-400' : connectionTimeColor, { 'animate-pulse': props.loading }]"
                >
                    {{ props.loading ? '-' : formattedConnectionTime }}
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ t('metrics.websocket.establishTime') }}</p>
            </div>

            <!-- Avg Broadcast Latency -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {{ t('metrics.websocket.avgLatency') }}
                    </h3>
                    <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <svg
                        v-else
                        class="w-8 h-8"
                        :class="broadcastLatencyColor"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                        />
                    </svg>
                </div>
                <p
                    class="mt-2 text-2xl font-bold"
                    :class="[props.loading ? 'text-gray-400' : broadcastLatencyColor, { 'animate-pulse': props.loading }]"
                >
                    {{ props.loading ? '-' : formattedBroadcastLatency }}
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ t('metrics.websocket.broadcastDelivery') }}</p>
            </div>

            <!-- Avg Session Duration -->
            <div class="card">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {{ t('metrics.websocket.avgSessionDuration') }}
                    </h3>
                    <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                    <svg
                        v-else
                        class="w-8 h-8 text-indigo-500"
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
                    class="mt-2 text-2xl font-bold text-gray-900 dark:text-white"
                    :class="{ 'animate-pulse': props.loading }"
                >
                    {{ props.loading ? '-' : formattedSessionDuration }}
                </p>
                <p class="mt-1 text-xs text-gray-400">{{ t('metrics.websocket.connectionDuration') }}</p>
            </div>
        </div>

        <!-- Client type breakdown -->
        <div class="card">
            <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                {{ t('metrics.websocket.connectionsByType') }}
            </h3>
            <div class="grid grid-cols-3 gap-4">
                <div class="text-center">
                    <p
                        class="text-2xl font-bold text-blue-600 dark:text-blue-400"
                        :class="{ 'animate-pulse': props.loading }"
                    >
                        {{ props.loading ? '-' : formatNumber(userScoped) }}
                    </p>
                    <p class="text-xs text-gray-400">{{ t('metrics.websocket.userScoped') }}</p>
                </div>
                <div class="text-center">
                    <p
                        class="text-2xl font-bold text-green-600 dark:text-green-400"
                        :class="{ 'animate-pulse': props.loading }"
                    >
                        {{ props.loading ? '-' : formatNumber(sessionScoped) }}
                    </p>
                    <p class="text-xs text-gray-400">{{ t('metrics.websocket.sessionScoped') }}</p>
                </div>
                <div class="text-center">
                    <p
                        class="text-2xl font-bold text-purple-600 dark:text-purple-400"
                        :class="{ 'animate-pulse': props.loading }"
                    >
                        {{ props.loading ? '-' : formatNumber(machineScoped) }}
                    </p>
                    <p class="text-xs text-gray-400">{{ t('metrics.websocket.machineScoped') }}</p>
                </div>
            </div>
        </div>
    </div>
</template>
