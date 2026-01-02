/**
 * Tests for useMetrics Composable
 *
 * Tests the chart data transformation functions for:
 * - Timeseries line charts
 * - Duration charts
 * - Mode distribution doughnut charts
 * - Performance bar charts
 * - Success rate charts
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { describe, it, expect } from 'vitest';
import { ref } from 'vue';
import { useMetrics } from './useMetrics';
import type { TimeseriesPoint, MetricsSummary, ModeDistribution } from '../lib/api';

// Helper to create mock timeseries data
function mockTimeseriesPoint(overrides: Partial<TimeseriesPoint> = {}): TimeseriesPoint {
    return {
        timestamp: new Date().toISOString(),
        count: 100,
        avgDurationMs: 150,
        ...overrides,
    };
}

// Helper to create mock summary data
function mockMetricsSummary(overrides: Partial<MetricsSummary> = {}): MetricsSummary {
    return {
        syncType: 'session',
        syncMode: 'full',
        count: 100,
        avgDurationMs: 150,
        p95DurationMs: 300,
        successRate: 0.95,
        ...overrides,
    };
}

// Helper to create mock distribution data
function mockModeDistribution(overrides: Partial<ModeDistribution> = {}): ModeDistribution {
    return {
        full: 100,
        incremental: 200,
        cached: 50,
        total: 350,
        ...overrides,
    };
}

describe('useMetrics', () => {
    describe('timeseriesChartData', () => {
        it('should return empty data for empty timeseries', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { timeseriesChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(timeseriesChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should transform timeseries data into line chart format', () => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const timeseriesRef = ref<TimeseriesPoint[]>([
                mockTimeseriesPoint({ timestamp: oneHourAgo.toISOString(), count: 50 }),
                mockTimeseriesPoint({ timestamp: now.toISOString(), count: 75 }),
            ]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { timeseriesChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(timeseriesChartData.value.labels).toHaveLength(2);
            expect(timeseriesChartData.value.datasets).toHaveLength(1);
            expect(timeseriesChartData.value.datasets[0]!.label).toBe('Sync Count');
            expect(timeseriesChartData.value.datasets[0]!.data).toEqual([50, 75]);
        });

        it('should use time format for short data ranges', () => {
            const now = new Date();
            const timeseriesRef = ref<TimeseriesPoint[]>([
                mockTimeseriesPoint({ timestamp: now.toISOString() }),
            ]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { timeseriesChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            // Should contain time format (HH:MM)
            expect(timeseriesChartData.value.labels[0]).toMatch(/\d{1,2}:\d{2}/);
        });
    });

    describe('durationChartData', () => {
        it('should return empty data for empty timeseries', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { durationChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(durationChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should transform duration data into line chart format', () => {
            const now = new Date();

            const timeseriesRef = ref<TimeseriesPoint[]>([
                mockTimeseriesPoint({ timestamp: now.toISOString(), avgDurationMs: 100 }),
                mockTimeseriesPoint({
                    timestamp: new Date(now.getTime() + 3600000).toISOString(),
                    avgDurationMs: 200,
                }),
            ]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { durationChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(durationChartData.value.datasets[0]!.label).toBe('Avg Duration (ms)');
            expect(durationChartData.value.datasets[0]!.data).toEqual([100, 200]);
        });
    });

    describe('modeDistributionChartData', () => {
        it('should return empty data when no distribution', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { modeDistributionChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(modeDistributionChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should transform distribution data into doughnut chart format', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(
                mockModeDistribution({ full: 100, incremental: 200, cached: 50 })
            );

            const { modeDistributionChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(modeDistributionChartData.value.labels).toEqual(['Full Sync', 'Incremental', 'Cached']);
            expect(modeDistributionChartData.value.datasets[0]!.data).toEqual([100, 200, 50]);
            expect(modeDistributionChartData.value.datasets[0]!.label).toBe('Sync Mode');
        });
    });

    describe('performanceByTypeChartData', () => {
        it('should return empty data for empty summary', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { performanceByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(performanceByTypeChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should group summary data by sync type', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([
                mockMetricsSummary({ syncType: 'session', count: 100 }),
                mockMetricsSummary({ syncType: 'session', count: 50 }),
                mockMetricsSummary({ syncType: 'machine', count: 75 }),
            ]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { performanceByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(performanceByTypeChartData.value.labels).toContain('Session');
            expect(performanceByTypeChartData.value.labels).toContain('Machine');
            expect(performanceByTypeChartData.value.datasets[0]!.label).toBe('Sync Count');

            // Session should have combined count (100 + 50 = 150)
            const sessionIndex = performanceByTypeChartData.value.labels.indexOf('Session');
            expect(performanceByTypeChartData.value.datasets[0]!.data[sessionIndex]).toBe(150);
        });

        it('should capitalize sync type labels', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([
                mockMetricsSummary({ syncType: 'profile' }),
            ]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { performanceByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(performanceByTypeChartData.value.labels[0]).toBe('Profile');
        });
    });

    describe('successRateByTypeChartData', () => {
        it('should return empty data for empty summary', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { successRateByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(successRateByTypeChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should calculate weighted average success rate by type', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([
                mockMetricsSummary({ syncType: 'session', count: 100, successRate: 0.9 }),
                mockMetricsSummary({ syncType: 'session', count: 100, successRate: 0.8 }),
            ]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { successRateByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            // Weighted average: (0.9*100 + 0.8*100) / 200 = 0.85 = 85%
            const sessionIndex = successRateByTypeChartData.value.labels.indexOf('Session');
            expect(successRateByTypeChartData.value.datasets[0]!.data[sessionIndex]).toBeCloseTo(85, 1);
        });

        it('should use green color for high success rates (>=95%)', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([
                mockMetricsSummary({ syncType: 'session', successRate: 0.98 }),
            ]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { successRateByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            const colors = successRateByTypeChartData.value.datasets[0]!.backgroundColor as string[];
            expect(colors[0]).toContain('34, 197, 94'); // green
        });

        it('should use yellow color for medium success rates (90-95%)', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([
                mockMetricsSummary({ syncType: 'session', successRate: 0.92 }),
            ]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { successRateByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            const colors = successRateByTypeChartData.value.datasets[0]!.backgroundColor as string[];
            expect(colors[0]).toContain('234, 179, 8'); // yellow
        });

        it('should use red color for low success rates (<90%)', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([
                mockMetricsSummary({ syncType: 'session', successRate: 0.85 }),
            ]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { successRateByTypeChartData } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            const colors = successRateByTypeChartData.value.datasets[0]!.backgroundColor as string[];
            expect(colors[0]).toContain('239, 68, 68'); // red
        });
    });

    describe('COLORS export', () => {
        it('should expose COLORS constant for custom styling', () => {
            const timeseriesRef = ref<TimeseriesPoint[]>([]);
            const summaryRef = ref<MetricsSummary[]>([]);
            const distributionRef = ref<ModeDistribution | null>(null);

            const { COLORS } = useMetrics(timeseriesRef, summaryRef, distributionRef);

            expect(COLORS).toBeDefined();
            expect(COLORS.primary).toBeDefined();
            expect(COLORS.full).toBeDefined();
            expect(COLORS.session).toBeDefined();
        });
    });
});
