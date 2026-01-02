/**
 * Tests for useValidation Composable
 *
 * Tests the validation metrics chart data transformation functions.
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useValidation, useValidationCharts } from './useValidation';

// Mock the API module
vi.mock('../lib/api', () => ({
    fetchValidationSummary: vi.fn(),
    fetchValidationUnknownTypes: vi.fn(),
    fetchValidationTimeseries: vi.fn(),
}));

describe('useValidation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should initialize with default state', () => {
            const { state } = useValidation();

            expect(state.value.summary).toBeNull();
            expect(state.value.unknownTypes).toEqual([]);
            expect(state.value.timeseries).toEqual([]);
            expect(state.value.loading).toBe(false);
            expect(state.value.error).toBeNull();
        });
    });

    describe('fetchValidationData', () => {
        it('should set loading state while fetching', async () => {
            const { fetchValidationSummary, fetchValidationUnknownTypes, fetchValidationTimeseries } =
                await import('../lib/api');

            // Make the promises never resolve to test loading state
            let resolvePromise: () => void;
            const pendingPromise = new Promise<{ data: null }>((resolve) => {
                resolvePromise = () => resolve({ data: null });
            });

            vi.mocked(fetchValidationSummary).mockReturnValue(pendingPromise);
            vi.mocked(fetchValidationUnknownTypes).mockReturnValue(pendingPromise);
            vi.mocked(fetchValidationTimeseries).mockReturnValue(pendingPromise);

            const { state, fetchValidationData } = useValidation();

            const fetchPromise = fetchValidationData();

            // Loading should be true immediately
            expect(state.value.loading).toBe(true);

            // Resolve the promises
            resolvePromise!();
            await fetchPromise;

            expect(state.value.loading).toBe(false);
        });

        it('should handle fetch errors gracefully', async () => {
            const { fetchValidationSummary, fetchValidationUnknownTypes, fetchValidationTimeseries } =
                await import('../lib/api');

            const error = new Error('Network error');
            vi.mocked(fetchValidationSummary).mockRejectedValue(error);
            vi.mocked(fetchValidationUnknownTypes).mockRejectedValue(error);
            vi.mocked(fetchValidationTimeseries).mockRejectedValue(error);

            const { state, fetchValidationData } = useValidation();

            await fetchValidationData();

            expect(state.value.loading).toBe(false);
            expect(state.value.error).toBe('Network error');
        });

        it('should use default hours parameter', async () => {
            const { fetchValidationSummary, fetchValidationUnknownTypes, fetchValidationTimeseries } =
                await import('../lib/api');

            vi.mocked(fetchValidationSummary).mockResolvedValue({ data: null });
            vi.mocked(fetchValidationUnknownTypes).mockResolvedValue({ data: [] });
            vi.mocked(fetchValidationTimeseries).mockResolvedValue({ data: [] });

            const { fetchValidationData } = useValidation();

            await fetchValidationData();

            // Default is 24 hours
            expect(fetchValidationUnknownTypes).toHaveBeenCalledWith(24, 10);
            expect(fetchValidationTimeseries).toHaveBeenCalledWith(24, 'hour');
        });

        it('should use day bucket for hours > 48', async () => {
            const { fetchValidationSummary, fetchValidationUnknownTypes, fetchValidationTimeseries } =
                await import('../lib/api');

            vi.mocked(fetchValidationSummary).mockResolvedValue({ data: null });
            vi.mocked(fetchValidationUnknownTypes).mockResolvedValue({ data: [] });
            vi.mocked(fetchValidationTimeseries).mockResolvedValue({ data: [] });

            const { fetchValidationData } = useValidation();

            await fetchValidationData(72);

            expect(fetchValidationTimeseries).toHaveBeenCalledWith(72, 'day');
        });
    });
});

describe('useValidationCharts', () => {
    describe('validationTimeseriesChartData', () => {
        it('should return empty data for empty timeseries', () => {
            const timeseriesRef = ref([]);
            const { validationTimeseriesChartData } = useValidationCharts(timeseriesRef);

            expect(validationTimeseriesChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should transform timeseries data into chart format', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const timeseriesRef = ref([
                {
                    timestamp: oneHourAgo.toISOString(),
                    totalFailures: 10,
                    unknownTypes: 5,
                    schemaFailures: 3,
                    strictFailures: 2,
                },
                {
                    timestamp: now.toISOString(),
                    totalFailures: 8,
                    unknownTypes: 4,
                    schemaFailures: 2,
                    strictFailures: 2,
                },
            ]);

            const { validationTimeseriesChartData } = useValidationCharts(timeseriesRef);

            const chartData = validationTimeseriesChartData.value;

            // Should have 2 labels
            expect(chartData.labels).toHaveLength(2);

            // Should have 4 datasets
            expect(chartData.datasets).toHaveLength(4);

            // Verify dataset labels
            expect(chartData.datasets[0].label).toBe('Total Failures');
            expect(chartData.datasets[1].label).toBe('Unknown Types');
            expect(chartData.datasets[2].label).toBe('Schema Errors');
            expect(chartData.datasets[3].label).toBe('Strict Failures');

            // Verify data values
            expect(chartData.datasets[0].data).toEqual([10, 8]);
            expect(chartData.datasets[1].data).toEqual([5, 4]);
            expect(chartData.datasets[2].data).toEqual([3, 2]);
            expect(chartData.datasets[3].data).toEqual([2, 2]);
        });

        it('should use MM/DD format for data spanning multiple days', () => {
            const now = new Date();
            const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

            const timeseriesRef = ref([
                {
                    timestamp: twoDaysAgo.toISOString(),
                    totalFailures: 10,
                    unknownTypes: 5,
                    schemaFailures: 3,
                    strictFailures: 2,
                },
                {
                    timestamp: now.toISOString(),
                    totalFailures: 8,
                    unknownTypes: 4,
                    schemaFailures: 2,
                    strictFailures: 2,
                },
            ]);

            const { validationTimeseriesChartData } = useValidationCharts(timeseriesRef);

            const chartData = validationTimeseriesChartData.value;

            // Labels should be in MM/DD format
            chartData.labels.forEach((label) => {
                expect(label).toMatch(/^\d{1,2}\/\d{1,2}$/);
            });
        });

        it('should use HH:MM format for data within a single day', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const timeseriesRef = ref([
                {
                    timestamp: oneHourAgo.toISOString(),
                    totalFailures: 10,
                    unknownTypes: 5,
                    schemaFailures: 3,
                    strictFailures: 2,
                },
                {
                    timestamp: now.toISOString(),
                    totalFailures: 8,
                    unknownTypes: 4,
                    schemaFailures: 2,
                    strictFailures: 2,
                },
            ]);

            const { validationTimeseriesChartData } = useValidationCharts(timeseriesRef);

            const chartData = validationTimeseriesChartData.value;

            // Labels should be in HH:MM format
            chartData.labels.forEach((label) => {
                expect(label).toMatch(/^\d{2}:\d{2}$/);
            });
        });
    });

    describe('unknownTypesBarChartData', () => {
        it('should return empty data for empty unknown types', () => {
            const timeseriesRef = ref([]);
            const { unknownTypesBarChartData } = useValidationCharts(timeseriesRef);

            const chartData = unknownTypesBarChartData([]);

            expect(chartData).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should transform unknown types into bar chart format', () => {
            const unknownTypes = [
                { typeName: 'UnknownType1', count: 100 },
                { typeName: 'UnknownType2', count: 50 },
                { typeName: 'UnknownType3', count: 25 },
            ];

            const timeseriesRef = ref([]);
            const { unknownTypesBarChartData } = useValidationCharts(timeseriesRef);

            const chartData = unknownTypesBarChartData(unknownTypes);

            expect(chartData.labels).toEqual(['UnknownType1', 'UnknownType2', 'UnknownType3']);
            expect(chartData.datasets).toHaveLength(1);
            expect(chartData.datasets[0].label).toBe('Count');
            expect(chartData.datasets[0].data).toEqual([100, 50, 25]);
        });

        it('should have 10 background colors for the bar chart', () => {
            const unknownTypes = [{ typeName: 'Type1', count: 10 }];

            const timeseriesRef = ref([]);
            const { unknownTypesBarChartData } = useValidationCharts(timeseriesRef);

            const chartData = unknownTypesBarChartData(unknownTypes);

            expect(chartData.datasets[0].backgroundColor).toHaveLength(10);
        });
    });
});
