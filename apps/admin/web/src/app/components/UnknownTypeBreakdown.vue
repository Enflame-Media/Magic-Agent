<script setup lang="ts">
/**
 * UnknownTypeBreakdown Component
 *
 * Displays a horizontal bar chart and table showing top unknown message types.
 * Shows type name, count, and percentage for each type.
 *
 * @see HAP-582 - Add validation metrics UI section to admin dashboard
 */
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    type ChartOptions,
} from 'chart.js';
import type { UnknownTypeBreakdown } from '../lib/api';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
    data: UnknownTypeBreakdown[];
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

/**
 * Transform data for Chart.js horizontal bar chart
 */
const chartData = computed(() => {
    if (!props.data || props.data.length === 0) {
        return { labels: [], datasets: [] };
    }

    return {
        labels: props.data.map((t) => t.typeName),
        datasets: [
            {
                label: 'Occurrences',
                data: props.data.map((t) => t.count),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(20, 184, 166, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(168, 162, 158, 0.8)',
                ],
                borderWidth: 0,
                borderRadius: 4,
            },
        ],
    };
});

/**
 * Chart.js options for horizontal bar chart
 */
const chartOptions = computed<ChartOptions<'bar'>>(() => ({
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
                label: (context) => {
                    const dataIndex = context.dataIndex;
                    const item = props.data[dataIndex];
                    return item ? `Count: ${item.count} (${item.percentage}%)` : '';
                },
            },
        },
    },
    scales: {
        x: {
            beginAtZero: true,
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
            },
        },
        y: {
            grid: {
                display: false,
            },
            ticks: {
                font: {
                    family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    size: 11,
                },
            },
        },
    },
}));

const hasData = computed(() => props.data && props.data.length > 0);
const totalCount = computed(() => props.data.reduce((sum, t) => sum + t.count, 0));
</script>

<template>
    <div class="card">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                Unknown Message Types
            </h2>
            <span v-if="hasData && !props.loading" class="text-sm text-gray-500 dark:text-gray-400">
                {{ totalCount.toLocaleString() }} total
            </span>
        </div>

        <!-- Loading State -->
        <div v-if="props.loading" class="space-y-4">
            <div class="h-48 flex items-center justify-center">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-happy-600" />
            </div>
        </div>

        <!-- No Data State -->
        <div v-else-if="!hasData" class="h-48 flex flex-col items-center justify-center">
            <svg
                class="w-12 h-12 text-green-400 mb-2"
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
            <p class="text-gray-500 dark:text-gray-400 text-sm">No unknown types detected</p>
            <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">All message types are handled</p>
        </div>

        <!-- Chart and Table -->
        <div v-else class="space-y-4">
            <!-- Horizontal Bar Chart -->
            <div class="h-48">
                <Bar :data="chartData" :options="chartOptions" />
            </div>

            <!-- Details Table -->
            <div class="overflow-x-auto border-t border-gray-200 dark:border-gray-700 pt-4">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead>
                        <tr>
                            <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Type Name
                            </th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Count
                            </th>
                            <th class="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                %
                            </th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr
                            v-for="(item, index) in props.data"
                            :key="item.typeName"
                            class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <td class="px-3 py-2 whitespace-nowrap">
                                <code class="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                    {{ item.typeName }}
                                </code>
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-600 dark:text-gray-400">
                                {{ item.count.toLocaleString() }}
                            </td>
                            <td class="px-3 py-2 whitespace-nowrap text-right text-sm">
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                    :class="index === 0
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                        : index === 1
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'"
                                >
                                    {{ item.percentage.toFixed(1) }}%
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
