<script setup lang="ts">
/**
 * BundleSizeChart Component
 *
 * Area chart displaying bundle size trends over time.
 * Shows JS bundle, assets, and total size.
 *
 * @see HAP-564 - Add Cloudflare Analytics Engine integration for bundle size metrics
 */
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ChartOptions,
} from 'chart.js';
import { formatBytes } from '../lib/api';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean | string;
    tension?: number;
}

interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

interface Props {
    data: ChartData;
    title?: string;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Bundle Size Trends',
    loading: false,
});

/**
 * Chart.js options with responsive design and byte formatting
 */
const chartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    plugins: {
        legend: {
            display: true,
            position: 'top',
            labels: {
                usePointStyle: true,
                padding: 16,
            },
        },
        title: {
            display: false,
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
                label: function (context) {
                    const label = context.dataset.label || '';
                    const value = context.parsed.y;
                    return `${label}: ${formatBytes(value)}`;
                },
            },
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
            ticks: {
                maxRotation: 45,
                minRotation: 0,
            },
        },
        y: {
            beginAtZero: false,
            title: {
                display: true,
                text: 'Size',
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
                callback: function (value) {
                    return formatBytes(Number(value));
                },
            },
        },
    },
}));

const hasData = computed(() => props.data.labels.length > 0);
</script>

<template>
    <div class="card">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ props.title }}
            </h2>
        </div>

        <!-- Loading State -->
        <div v-if="props.loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-happy-600" />
        </div>

        <!-- No Data State -->
        <div v-else-if="!hasData" class="h-64 flex items-center justify-center">
            <div class="text-center">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                </svg>
                <p class="text-gray-400 dark:text-gray-500">No bundle data available</p>
                <p class="text-sm text-gray-400 dark:text-gray-600 mt-1">
                    Data will appear after CI builds report metrics
                </p>
            </div>
        </div>

        <!-- Chart -->
        <div v-else class="h-64 md:h-80">
            <Line :data="props.data" :options="chartOptions" />
        </div>
    </div>
</template>
