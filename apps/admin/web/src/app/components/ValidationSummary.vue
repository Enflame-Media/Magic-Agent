<script setup lang="ts">
/**
 * ValidationSummary Component
 *
 * Displays summary cards with validation failure metrics:
 * - Total failures
 * - Unknown types
 * - Schema errors
 * - Strict failures
 * - Unique users
 *
 * Uses color-coded indicators based on failure severity.
 *
 * @see HAP-582 - Add validation metrics UI section to admin dashboard
 */
import { computed } from 'vue';
import { formatNumber, formatDuration } from '../lib/api';
import type { ValidationSummary } from '../lib/api';

interface Props {
    data: ValidationSummary | null;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

/**
 * Get color class based on failure count
 * Green = 0, Yellow = low (1-10), Red = high (>10)
 */
function getFailureColor(count: number): string {
    if (count === 0) return 'text-green-600 dark:text-green-400';
    if (count <= 10) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

/**
 * Get background indicator color for metric cards
 */
function getIndicatorBg(count: number): string {
    if (count === 0) return 'bg-green-100 dark:bg-green-900/30';
    if (count <= 10) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
}

const totalFailures = computed(() => props.data?.totalFailures ?? 0);
const unknownTypes = computed(() => props.data?.unknownTypes ?? 0);
const schemaFailures = computed(() => props.data?.schemaFailures ?? 0);
const strictFailures = computed(() => props.data?.strictFailures ?? 0);
const uniqueUsers = computed(() => props.data?.uniqueUsers ?? 0);

const formattedTotal = computed(() => formatNumber(totalFailures.value));
const formattedUnknown = computed(() => formatNumber(unknownTypes.value));
const formattedSchema = computed(() => formatNumber(schemaFailures.value));
const formattedStrict = computed(() => formatNumber(strictFailures.value));
const formattedUsers = computed(() => formatNumber(uniqueUsers.value));
const formattedDuration = computed(() =>
    props.data ? formatDuration(props.data.avgSessionDurationMs) : '-'
);

const totalColor = computed(() => getFailureColor(totalFailures.value));
const unknownColor = computed(() => getFailureColor(unknownTypes.value));
const schemaColor = computed(() => getFailureColor(schemaFailures.value));
const strictColor = computed(() => getFailureColor(strictFailures.value));
</script>

<template>
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <!-- Total Failures -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Total Failures
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div
                    v-else
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="getIndicatorBg(totalFailures)"
                >
                    <svg
                        class="w-5 h-5"
                        :class="totalColor"
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
                :class="[props.loading ? 'text-gray-400' : totalColor, { 'animate-pulse': props.loading }]"
            >
                {{ props.loading ? '-' : formattedTotal }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Last 24 hours</p>
        </div>

        <!-- Unknown Types -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Unknown Types
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div
                    v-else
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="getIndicatorBg(unknownTypes)"
                >
                    <svg
                        class="w-5 h-5"
                        :class="unknownColor"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                </div>
            </div>
            <p
                class="mt-2 text-2xl font-bold"
                :class="[props.loading ? 'text-gray-400' : unknownColor, { 'animate-pulse': props.loading }]"
            >
                {{ props.loading ? '-' : formattedUnknown }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Unhandled message types</p>
        </div>

        <!-- Schema Errors -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Schema Errors
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div
                    v-else
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="getIndicatorBg(schemaFailures)"
                >
                    <svg
                        class="w-5 h-5"
                        :class="schemaColor"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                </div>
            </div>
            <p
                class="mt-2 text-2xl font-bold"
                :class="[props.loading ? 'text-gray-400' : schemaColor, { 'animate-pulse': props.loading }]"
            >
                {{ props.loading ? '-' : formattedSchema }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Zod validation failed</p>
        </div>

        <!-- Strict Failures -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Strict Failures
                </h3>
                <div v-if="props.loading" class="animate-pulse w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div
                    v-else
                    class="w-8 h-8 rounded-full flex items-center justify-center"
                    :class="getIndicatorBg(strictFailures)"
                >
                    <svg
                        class="w-5 h-5"
                        :class="strictColor"
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
            </div>
            <p
                class="mt-2 text-2xl font-bold"
                :class="[props.loading ? 'text-gray-400' : strictColor, { 'animate-pulse': props.loading }]"
            >
                {{ props.loading ? '-' : formattedStrict }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Extra fields present</p>
        </div>

        <!-- Unique Users -->
        <div class="card">
            <div class="flex items-center justify-between">
                <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Affected Users
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
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                </svg>
            </div>
            <p
                class="mt-2 text-2xl font-bold text-gray-900 dark:text-white"
                :class="{ 'animate-pulse': props.loading }"
            >
                {{ props.loading ? '-' : formattedUsers }}
            </p>
            <p class="mt-1 text-xs text-gray-400">Unique sessions</p>
        </div>
    </div>
</template>
