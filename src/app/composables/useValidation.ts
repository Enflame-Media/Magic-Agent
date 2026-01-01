/**
 * useValidation Composable
 *
 * Provides validation metrics data fetching and chart data transformation.
 * Used by the dashboard to display validation failure trends and breakdowns.
 *
 * @see HAP-582 - Add validation metrics UI section to admin dashboard
 */
import { ref, computed, type Ref } from 'vue';
import {
    fetchValidationSummary,
    fetchValidationUnknownTypes,
    fetchValidationTimeseries,
    type ValidationSummary,
    type UnknownTypeBreakdown,
    type ValidationTimeseriesPoint,
} from '../lib/api';

interface ValidationState {
    summary: ValidationSummary | null;
    unknownTypes: UnknownTypeBreakdown[];
    timeseries: ValidationTimeseriesPoint[];
    loading: boolean;
    error: string | null;
}

/**
 * Composable for validation metrics
 */
export function useValidation() {
    const state = ref<ValidationState>({
        summary: null,
        unknownTypes: [],
        timeseries: [],
        loading: false,
        error: null,
    });

    /**
     * Fetch all validation data in parallel
     * @param hours - Number of hours to look back (default: 24)
     */
    async function fetchValidationData(hours: number = 24) {
        state.value.loading = true;
        state.value.error = null;

        try {
            const [summaryRes, unknownTypesRes, timeseriesRes] = await Promise.all([
                fetchValidationSummary(),
                fetchValidationUnknownTypes(hours, 10),
                fetchValidationTimeseries(hours, hours > 48 ? 'day' : 'hour'),
            ]);

            state.value.summary = summaryRes.data;
            state.value.unknownTypes = unknownTypesRes.data;
            state.value.timeseries = timeseriesRes.data;
        } catch (err) {
            state.value.error = err instanceof Error ? err.message : 'Failed to fetch validation data';
            console.error('[useValidation] Error:', err);
        } finally {
            state.value.loading = false;
        }
    }

    return {
        state,
        fetchValidationData,
    };
}

/**
 * Transform validation timeseries data for Chart.js line chart
 */
export function useValidationCharts(timeseriesRef: Ref<ValidationTimeseriesPoint[]>) {
    const validationTimeseriesChartData = computed(() => {
        const timeseries = timeseriesRef.value;
        if (!timeseries || timeseries.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Determine if data spans multiple days (non-null assertion is safe after length check)
        const firstPoint = timeseries[0]!;
        const lastPoint = timeseries[timeseries.length - 1]!;
        const firstDate = new Date(firstPoint.timestamp);
        const lastDate = new Date(lastPoint.timestamp);
        const spanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

        // Format timestamps as labels (HH:MM or MM/DD depending on range)
        const labels = timeseries.map((point) => {
            const date = new Date(point.timestamp);
            // If data spans multiple days, show MM/DD, otherwise show HH:MM
            if (spanDays > 1) {
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Total Failures',
                    data: timeseries.map((p) => p.totalFailures),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'Unknown Types',
                    data: timeseries.map((p) => p.unknownTypes),
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
                {
                    label: 'Schema Errors',
                    data: timeseries.map((p) => p.schemaFailures),
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
                {
                    label: 'Strict Failures',
                    data: timeseries.map((p) => p.strictFailures),
                    borderColor: 'rgb(139, 92, 246)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
            ],
        };
    });

    const unknownTypesBarChartData = (unknownTypes: UnknownTypeBreakdown[]) => {
        if (!unknownTypes || unknownTypes.length === 0) {
            return { labels: [], datasets: [] };
        }

        return {
            labels: unknownTypes.map((t) => t.typeName),
            datasets: [
                {
                    label: 'Count',
                    data: unknownTypes.map((t) => t.count),
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
    };

    return {
        validationTimeseriesChartData,
        unknownTypesBarChartData,
    };
}
