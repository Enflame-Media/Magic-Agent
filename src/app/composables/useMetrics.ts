/**
 * useMetrics Composable
 *
 * Provides computed chart data transformations for visualization.
 * Works with raw API data to produce Chart.js-ready datasets.
 */
import { computed, type Ref } from 'vue';
import type { MetricsSummary, TimeseriesPoint, ModeDistribution } from '../lib/api';

/**
 * Chart.js dataset interface
 */
interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string;
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
}

/**
 * Chart.js data structure
 */
interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

/**
 * Color palette for charts (accessible contrast)
 */
const COLORS = {
    // Primary chart colors
    primary: 'rgba(2, 132, 199, 1)', // happy-600
    primaryLight: 'rgba(2, 132, 199, 0.2)',
    secondary: 'rgba(14, 165, 233, 1)', // happy-500
    secondaryLight: 'rgba(14, 165, 233, 0.2)',

    // Sync mode colors
    full: 'rgba(59, 130, 246, 0.8)', // blue-500
    incremental: 'rgba(34, 197, 94, 0.8)', // green-500
    cached: 'rgba(168, 85, 247, 0.8)', // purple-500

    // Sync type colors (for bar charts)
    session: 'rgba(59, 130, 246, 0.8)', // blue
    machine: 'rgba(34, 197, 94, 0.8)', // green
    message: 'rgba(249, 115, 22, 0.8)', // orange
    artifact: 'rgba(168, 85, 247, 0.8)', // purple
    profile: 'rgba(236, 72, 153, 0.8)', // pink
};

/**
 * Composable for transforming metrics into chart-ready data
 */
export function useMetrics(
    timeseriesData: Ref<TimeseriesPoint[]>,
    summaryData: Ref<MetricsSummary[]>,
    distributionData: Ref<ModeDistribution | null>
) {
    /**
     * Timeseries line chart data
     * Shows sync count over time
     */
    const timeseriesChartData = computed<ChartData>(() => {
        const data = timeseriesData.value;

        if (data.length === 0) {
            return { labels: [], datasets: [] };
        }

        return {
            labels: data.map((point) => {
                const date = new Date(point.timestamp);
                // Format based on data density
                return data.length > 48
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
                {
                    label: 'Sync Count',
                    data: data.map((point) => point.count),
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.primaryLight,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                },
            ],
        };
    });

    /**
     * Duration line chart data
     * Shows average duration over time
     */
    const durationChartData = computed<ChartData>(() => {
        const data = timeseriesData.value;

        if (data.length === 0) {
            return { labels: [], datasets: [] };
        }

        return {
            labels: data.map((point) => {
                const date = new Date(point.timestamp);
                return data.length > 48
                    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
                {
                    label: 'Avg Duration (ms)',
                    data: data.map((point) => point.avgDurationMs),
                    borderColor: COLORS.secondary,
                    backgroundColor: COLORS.secondaryLight,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                },
            ],
        };
    });

    /**
     * Mode distribution doughnut chart data
     */
    const modeDistributionChartData = computed<ChartData>(() => {
        const dist = distributionData.value;

        if (!dist) {
            return { labels: [], datasets: [] };
        }

        return {
            labels: ['Full Sync', 'Incremental', 'Cached'],
            datasets: [
                {
                    label: 'Sync Mode',
                    data: [dist.full, dist.incremental, dist.cached],
                    backgroundColor: [COLORS.full, COLORS.incremental, COLORS.cached],
                    borderWidth: 0,
                },
            ],
        };
    });

    /**
     * Performance by sync type bar chart data
     */
    const performanceByTypeChartData = computed<ChartData>(() => {
        const data = summaryData.value;

        if (data.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Group by sync type
        const byType = new Map<string, { count: number; avgDuration: number }>();
        for (const item of data) {
            const existing = byType.get(item.syncType);
            if (existing) {
                const totalCount = existing.count + item.count;
                existing.avgDuration =
                    (existing.avgDuration * existing.count + item.avgDurationMs * item.count) / totalCount;
                existing.count = totalCount;
            } else {
                byType.set(item.syncType, {
                    count: item.count,
                    avgDuration: item.avgDurationMs,
                });
            }
        }

        const types = Array.from(byType.keys());
        const colorMap: Record<string, string> = {
            session: COLORS.session,
            machine: COLORS.machine,
            message: COLORS.message,
            artifact: COLORS.artifact,
            profile: COLORS.profile,
        };

        return {
            labels: types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
            datasets: [
                {
                    label: 'Sync Count',
                    data: types.map((t) => byType.get(t)?.count ?? 0),
                    backgroundColor: types.map((t) => colorMap[t] ?? COLORS.primary),
                    borderWidth: 0,
                },
            ],
        };
    });

    /**
     * Success rate by type bar chart data
     */
    const successRateByTypeChartData = computed<ChartData>(() => {
        const data = summaryData.value;

        if (data.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Group by sync type, weighted average success rate
        const byType = new Map<string, { totalWeight: number; weightedSuccess: number }>();
        for (const item of data) {
            const existing = byType.get(item.syncType);
            if (existing) {
                existing.weightedSuccess += item.successRate * item.count;
                existing.totalWeight += item.count;
            } else {
                byType.set(item.syncType, {
                    totalWeight: item.count,
                    weightedSuccess: item.successRate * item.count,
                });
            }
        }

        const types = Array.from(byType.keys());

        return {
            labels: types.map((t) => t.charAt(0).toUpperCase() + t.slice(1)),
            datasets: [
                {
                    label: 'Success Rate (%)',
                    data: types.map((t) => {
                        const entry = byType.get(t);
                        return entry ? (entry.weightedSuccess / entry.totalWeight) * 100 : 0;
                    }),
                    backgroundColor: types.map((t) => {
                        const entry = byType.get(t);
                        const rate = entry ? entry.weightedSuccess / entry.totalWeight : 0;
                        // Color based on success rate
                        if (rate >= 0.95) return 'rgba(34, 197, 94, 0.8)'; // green
                        if (rate >= 0.9) return 'rgba(234, 179, 8, 0.8)'; // yellow
                        return 'rgba(239, 68, 68, 0.8)'; // red
                    }),
                    borderWidth: 0,
                },
            ],
        };
    });

    return {
        // Chart data
        timeseriesChartData,
        durationChartData,
        modeDistributionChartData,
        performanceByTypeChartData,
        successRateByTypeChartData,

        // Colors (for custom styling)
        COLORS,
    };
}
