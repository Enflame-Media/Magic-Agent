<script setup lang="ts">
/**
 * SyncMetricsChart Component
 *
 * Line chart displaying sync volume and duration over time.
 * Uses Chart.js via vue-chartjs for visualization.
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
    fill?: boolean;
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
    yAxisLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Sync Activity Over Time',
    loading: false,
    yAxisLabel: 'Count',
});

/**
 * Chart.js options with responsive design
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
            <p class="text-gray-400 dark:text-gray-500">No data available</p>
        </div>

        <!-- Chart -->
        <div v-else class="h-64 md:h-80">
            <Line :data="props.data" :options="chartOptions" />
        </div>
    </div>
</template>
