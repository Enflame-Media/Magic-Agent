<script setup lang="ts">
/**
 * BundleSizeLatest Component
 *
 * Displays the most recent bundle size for each platform.
 * Shows total size, JS size, and assets size with commit info.
 *
 * @see HAP-564 - Add Cloudflare Analytics Engine integration for bundle size metrics
 */
import { computed } from 'vue';
import { formatBytes } from '../lib/api';
import type { BundleSizeLatest } from '../lib/api';

interface Props {
    data: BundleSizeLatest[];
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

const hasData = computed(() => props.data.length > 0);

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
}

/**
 * Get platform icon and color
 */
function getPlatformStyle(platform: string): { icon: string; bgClass: string; textClass: string } {
    switch (platform) {
        case 'web':
            return {
                icon: '🌐',
                bgClass: 'bg-blue-100 dark:bg-blue-900/30',
                textClass: 'text-blue-800 dark:text-blue-400',
            };
        case 'ios':
            return {
                icon: '🍎',
                bgClass: 'bg-gray-100 dark:bg-gray-800',
                textClass: 'text-gray-800 dark:text-gray-300',
            };
        case 'android':
            return {
                icon: '🤖',
                bgClass: 'bg-green-100 dark:bg-green-900/30',
                textClass: 'text-green-800 dark:text-green-400',
            };
        default:
            return {
                icon: '📦',
                bgClass: 'bg-gray-100 dark:bg-gray-700',
                textClass: 'text-gray-800 dark:text-gray-300',
            };
    }
}
</script>

<template>
    <div class="card">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Latest Bundle Sizes
            </h2>
        </div>

        <!-- Loading State -->
        <div v-if="props.loading" class="space-y-4">
            <div v-for="i in 2" :key="i" class="animate-pulse">
                <div class="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
        </div>

        <!-- No Data State -->
        <div v-else-if="!hasData" class="py-8 text-center">
            <svg
                class="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
            </svg>
            <p class="text-gray-400 dark:text-gray-500">No recent builds</p>
        </div>

        <!-- Latest Sizes -->
        <div v-else class="space-y-4">
            <div
                v-for="bundle in props.data"
                :key="bundle.platform"
                class="p-4 rounded-lg border border-gray-200 dark:border-gray-700"
            >
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <span
                            class="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
                            :class="[getPlatformStyle(bundle.platform).bgClass, getPlatformStyle(bundle.platform).textClass]"
                        >
                            <span class="mr-1">{{ getPlatformStyle(bundle.platform).icon }}</span>
                            {{ bundle.platform }}
                        </span>
                    </div>
                    <div class="text-right">
                        <p class="text-2xl font-bold text-gray-900 dark:text-white">
                            {{ formatBytes(bundle.totalSize) }}
                        </p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            JS Bundle
                        </p>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ formatBytes(bundle.jsSize) }}
                        </p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Assets
                        </p>
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                            {{ formatBytes(bundle.assetsSize) }}
                        </p>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                        <code class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                            {{ bundle.commitHash }}
                        </code>
                        on {{ bundle.branch }}
                    </span>
                    <span>{{ formatRelativeTime(bundle.timestamp) }}</span>
                </div>
            </div>
        </div>
    </div>
</template>
