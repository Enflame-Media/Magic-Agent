<script setup lang="ts">
/**
 * ModeDistribution Component
 *
 * Doughnut chart showing the distribution of sync modes:
 * - Full sync
 * - Incremental sync
 * - Cached (no-op)
 */
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    type ChartOptions,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

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
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

/**
 * Chart.js options for doughnut chart
 */
const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: {
                usePointStyle: true,
                padding: 20,
                font: {
                    size: 12,
                },
            },
        },
        tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
                label: (context) => {
                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                    const value = context.parsed;
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
                },
            },
        },
    },
}));

const hasData = computed(() =>
    props.data.labels.length > 0 &&
    props.data.datasets.some((ds) => ds.data.some((v) => v > 0))
);

/**
 * Calculate total from chart data
 */
const total = computed(() => {
    if (!props.data.datasets.length) return 0;
    return props.data.datasets[0].data.reduce((a, b) => a + b, 0);
});
</script>

<template>
    <div class="card">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Sync Mode Distribution
        </h2>

        <!-- Loading State -->
        <div v-if="props.loading" class="h-64 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-happy-600" />
        </div>

        <!-- No Data State -->
        <div v-else-if="!hasData" class="h-64 flex items-center justify-center">
            <p class="text-gray-400 dark:text-gray-500">No data available</p>
        </div>

        <!-- Chart with center total -->
        <div v-else class="relative h-64 md:h-72">
            <Doughnut :data="props.data" :options="chartOptions" />
            <!-- Center total display -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div class="text-center -mt-8">
                    <p class="text-2xl font-bold text-gray-900 dark:text-white">
                        {{ total.toLocaleString() }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Total</p>
                </div>
            </div>
        </div>
    </div>
</template>
