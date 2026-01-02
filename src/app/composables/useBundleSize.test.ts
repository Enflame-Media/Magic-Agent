/**
 * Tests for useBundleSize Composable
 *
 * Tests the bundle size metrics composable including:
 * - Initial state
 * - Data fetching
 * - Chart data transformation
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 * @see HAP-564 - Add Cloudflare Analytics Engine integration for bundle size metrics
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useBundleSize, useBundleSizeCharts } from './useBundleSize';
import type { BundleSizePoint } from '../lib/api';

// Mock the API module
vi.mock('../lib/api', () => ({
    fetchBundleTrends: vi.fn(),
    fetchBundleLatest: vi.fn(),
}));

// Helper to create mock bundle size point
function mockBundleSizePoint(overrides: Partial<BundleSizePoint> = {}): BundleSizePoint {
    return {
        date: '2024-01-15',
        platform: 'ios',
        avgTotalSize: 5000000,
        avgJsSize: 3000000,
        avgAssetsSize: 2000000,
        buildCount: 5,
        ...overrides,
    };
}

describe('useBundleSize', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial state', () => {
        it('should initialize with default state', () => {
            const { state } = useBundleSize();

            expect(state.value.trends).toEqual([]);
            expect(state.value.latest).toEqual([]);
            expect(state.value.loading).toBe(false);
            expect(state.value.error).toBeNull();
        });
    });

    describe('fetchBundleData', () => {
        it('should set loading state while fetching', async () => {
            const { fetchBundleTrends, fetchBundleLatest } = await import('../lib/api');

            let resolvePromise: () => void;
            const pendingPromise = new Promise<{ data: BundleSizePoint[] }>((resolve) => {
                resolvePromise = () => resolve({ data: [], timestamp: new Date().toISOString() });
            });

            vi.mocked(fetchBundleTrends).mockReturnValue(pendingPromise as never);
            vi.mocked(fetchBundleLatest).mockReturnValue(pendingPromise as never);

            const { state, fetchBundleData } = useBundleSize();

            const fetchPromise = fetchBundleData();

            expect(state.value.loading).toBe(true);

            resolvePromise!();
            await fetchPromise;

            expect(state.value.loading).toBe(false);
        });

        it('should handle errors gracefully', async () => {
            const { fetchBundleTrends, fetchBundleLatest } = await import('../lib/api');

            const error = new Error('Network error');
            vi.mocked(fetchBundleTrends).mockRejectedValue(error);
            vi.mocked(fetchBundleLatest).mockRejectedValue(error);

            const { state, fetchBundleData } = useBundleSize();

            await fetchBundleData();

            expect(state.value.loading).toBe(false);
            expect(state.value.error).toBe('Network error');
        });

        it('should fetch data with default 30 days', async () => {
            const { fetchBundleTrends, fetchBundleLatest } = await import('../lib/api');

            vi.mocked(fetchBundleTrends).mockResolvedValue({
                data: [],
                timestamp: new Date().toISOString(),
            });
            vi.mocked(fetchBundleLatest).mockResolvedValue({
                data: [],
                timestamp: new Date().toISOString(),
            });

            const { fetchBundleData } = useBundleSize();

            await fetchBundleData();

            expect(fetchBundleTrends).toHaveBeenCalledWith(30);
        });

        it('should fetch data with custom days parameter', async () => {
            const { fetchBundleTrends, fetchBundleLatest } = await import('../lib/api');

            vi.mocked(fetchBundleTrends).mockResolvedValue({
                data: [],
                timestamp: new Date().toISOString(),
            });
            vi.mocked(fetchBundleLatest).mockResolvedValue({
                data: [],
                timestamp: new Date().toISOString(),
            });

            const { fetchBundleData } = useBundleSize();

            await fetchBundleData(7);

            expect(fetchBundleTrends).toHaveBeenCalledWith(7);
        });

        it('should populate state with fetched data', async () => {
            const { fetchBundleTrends, fetchBundleLatest } = await import('../lib/api');

            const mockTrends = [mockBundleSizePoint()];
            const mockLatest = [
                {
                    platform: 'ios',
                    branch: 'main',
                    commitHash: 'abc123',
                    totalSize: 5000000,
                    jsSize: 3000000,
                    assetsSize: 2000000,
                    timestamp: new Date().toISOString(),
                },
            ];

            vi.mocked(fetchBundleTrends).mockResolvedValue({
                data: mockTrends,
                timestamp: new Date().toISOString(),
            });
            vi.mocked(fetchBundleLatest).mockResolvedValue({
                data: mockLatest,
                timestamp: new Date().toISOString(),
            });

            const { state, fetchBundleData } = useBundleSize();

            await fetchBundleData();

            expect(state.value.trends).toEqual(mockTrends);
            expect(state.value.latest).toEqual(mockLatest);
        });
    });
});

describe('useBundleSizeCharts', () => {
    describe('bundleSizeChartData', () => {
        it('should return empty data for empty trends', () => {
            const trendsRef = ref<BundleSizePoint[]>([]);
            const { bundleSizeChartData } = useBundleSizeCharts(trendsRef);

            expect(bundleSizeChartData.value).toEqual({
                labels: [],
                datasets: [],
            });
        });

        it('should transform trends into line chart format', () => {
            const trendsRef = ref<BundleSizePoint[]>([
                mockBundleSizePoint({
                    date: '2024-01-15',
                    avgTotalSize: 5000000,
                    avgJsSize: 3000000,
                    avgAssetsSize: 2000000,
                }),
                mockBundleSizePoint({
                    date: '2024-01-16',
                    avgTotalSize: 5100000,
                    avgJsSize: 3100000,
                    avgAssetsSize: 2000000,
                }),
            ]);

            const { bundleSizeChartData } = useBundleSizeCharts(trendsRef);

            expect(bundleSizeChartData.value.labels).toHaveLength(2);
            expect(bundleSizeChartData.value.datasets).toHaveLength(3);

            // Check dataset labels
            expect(bundleSizeChartData.value.datasets[0]!.label).toBe('Total Size');
            expect(bundleSizeChartData.value.datasets[1]!.label).toBe('JS Bundle');
            expect(bundleSizeChartData.value.datasets[2]!.label).toBe('Assets');
        });

        it('should format date labels as MM/DD', () => {
            const trendsRef = ref<BundleSizePoint[]>([
                mockBundleSizePoint({ date: '2024-01-15' }),
                mockBundleSizePoint({ date: '2024-02-20' }),
            ]);

            const { bundleSizeChartData } = useBundleSizeCharts(trendsRef);

            // Date labels should be in M/D format (timezone may shift by 1 day)
            expect(bundleSizeChartData.value.labels).toHaveLength(2);
            expect(bundleSizeChartData.value.labels[0]).toMatch(/^\d{1,2}\/\d{1,2}$/);
            expect(bundleSizeChartData.value.labels[1]).toMatch(/^\d{1,2}\/\d{1,2}$/);
        });

        it('should average data across platforms for same date', () => {
            const trendsRef = ref<BundleSizePoint[]>([
                mockBundleSizePoint({
                    date: '2024-01-15',
                    platform: 'ios',
                    avgTotalSize: 5000000,
                    avgJsSize: 3000000,
                    avgAssetsSize: 2000000,
                }),
                mockBundleSizePoint({
                    date: '2024-01-15',
                    platform: 'android',
                    avgTotalSize: 6000000,
                    avgJsSize: 4000000,
                    avgAssetsSize: 2000000,
                }),
            ]);

            const { bundleSizeChartData } = useBundleSizeCharts(trendsRef);

            // Should only have one date label
            expect(bundleSizeChartData.value.labels).toHaveLength(1);

            // Total size should be averaged: (5000000 + 6000000) / 2 = 5500000
            expect(bundleSizeChartData.value.datasets[0]!.data[0]).toBe(5500000);

            // JS size should be averaged: (3000000 + 4000000) / 2 = 3500000
            expect(bundleSizeChartData.value.datasets[1]!.data[0]).toBe(3500000);
        });

        it('should sort dates chronologically', () => {
            const trendsRef = ref<BundleSizePoint[]>([
                mockBundleSizePoint({ date: '2024-01-20' }),
                mockBundleSizePoint({ date: '2024-01-15' }),
                mockBundleSizePoint({ date: '2024-01-18' }),
            ]);

            const { bundleSizeChartData } = useBundleSizeCharts(trendsRef);

            // Verify 3 labels exist and are in M/D format
            const labels = bundleSizeChartData.value.labels;
            expect(labels).toHaveLength(3);
            for (const label of labels) {
                expect(label).toMatch(/^\d{1,2}\/\d{1,2}$/);
            }

            // Extract day numbers and verify they're sorted ascending
            // (timezone may shift dates but order is preserved)
            const dayNumbers = labels.map((l: string) => parseInt(l.split('/')[1]!, 10));
            const sortedDays = [...dayNumbers].sort((a, b) => a - b);
            expect(dayNumbers).toEqual(sortedDays);
        });
    });
});
