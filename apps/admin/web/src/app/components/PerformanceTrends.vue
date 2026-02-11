<script setup lang="ts">
/**
 * PerformanceTrends Component
 *
 * Bar chart showing sync counts and performance by sync type.
 * Displays data for session, machine, message, artifact, and profile syncs.
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

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderWidth?: number;
}

interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

interface Props {
    data: ChartData;
    title?: string;
    loading?: boolean;
    yAxisLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Performance by Sync Type',
    loading: false,
    yAxisLabel: 'Count',
});

/**
 * Chart.js options for bar chart
 */
const chartOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
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
        },
    },
    scales: {
        x: {
            grid: {
                display: false,
            },
        },
        y: {
            beginAtZero: true,
            title: {
                display: true,
                text: props.yAxisLabel,
            },
            grid: {
                color: 'rgba(0, 0, 0, 0.05)',
            },
        },
    },
}));

const hasData = computed(() =>
    props.data.labels.length > 0 &&
    props.data.datasets.some((ds) => ds.data.some((v) => v > 0))
);
</script>

<template>
    <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {{ props.title }}
        </h2>

        <!-- Loading State -->
        <div v-if="props.loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-happy-600" />
        </div>

        <!-- No Data State -->
        <div v-else-if="!hasData" class="h-64 flex items-center justify-center">
            <p class="text-gray-400 dark:text-gray-500">No data available</p>
        </div>

        <!-- Chart -->
        <div v-else class="h-64 md:h-72">
            <Bar :data="props.data" :options="chartOptions" />
        </div>
    </div>
</template>
