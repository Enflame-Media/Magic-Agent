/**
 * Tests for useAnalytics Composable
 *
 * Tests the analytics data management composable including:
 * - Initial state
 * - Data fetching
 * - Computed values
 * - Auto-refresh functionality
 *
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAnalytics } from './useAnalytics';

// Mock the API module
vi.mock('../lib/api', () => ({
    fetchSummary: vi.fn(),
    fetchTimeseries: vi.fn(),
    fetchCacheHits: vi.fn(),
    fetchModeDistribution: vi.fn(),
    timeRangeToHours: vi.fn((range: string) => {
        const map: Record<string, number> = {
            '1h': 1,
            '6h': 6,
            '24h': 24,
            '7d': 168,
            '30d': 720,
        };
        return map[range] ?? 24;
    }),
}));

describe('useAnalytics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('initial state', () => {
        it('should initialize with default state', () => {
            const analytics = useAnalytics();

            expect(analytics.loading.value).toBe(false);
            expect(analytics.error.value).toBeNull();
            expect(analytics.timeRange.value).toBe('24h');
            expect(analytics.autoRefreshEnabled.value).toBe(true);
            expect(analytics.state.value.summary).toEqual([]);
            expect(analytics.state.value.timeseries).toEqual([]);
            expect(analytics.state.value.cacheHits).toBeNull();
            expect(analytics.state.value.modeDistribution).toBeNull();
            expect(analytics.state.value.lastUpdated).toBe('');
        });
    });

    describe('computed values', () => {
        it('hasData should be false when no data', () => {
            const analytics = useAnalytics();
            expect(analytics.hasData.value).toBe(false);
        });

        it('hasData should be true when summary has data', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({
                data: [{ successRate: 0.95, count: 100, avgDurationMs: 150 }],
            });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics();
            await analytics.fetchAll();

            expect(analytics.hasData.value).toBe(true);
        });

        it('hasData should be true when modeDistribution has data', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({
                data: { total: 1000, modes: {} },
            });

            const analytics = useAnalytics();
            await analytics.fetchAll();

            expect(analytics.hasData.value).toBe(true);
        });

        it('totalSyncs should return mode distribution total', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({
                data: { total: 5000, modes: {} },
            });

            const analytics = useAnalytics();
            await analytics.fetchAll();

            expect(analytics.totalSyncs.value).toBe(5000);
        });

        it('totalSyncs should return 0 when no distribution', () => {
            const analytics = useAnalytics();
            expect(analytics.totalSyncs.value).toBe(0);
        });

        it('avgSuccessRate should calculate average from summary', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({
                data: [
                    { successRate: 0.9, count: 100, avgDurationMs: 100 },
                    { successRate: 0.8, count: 100, avgDurationMs: 100 },
                ],
            });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics();
            await analytics.fetchAll();

            expect(analytics.avgSuccessRate.value).toBeCloseTo(0.85, 10);
        });

        it('avgSuccessRate should return 0 when no summary', () => {
            const analytics = useAnalytics();
            expect(analytics.avgSuccessRate.value).toBe(0);
        });

        it('avgDuration should calculate weighted average', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({
                data: [
                    { successRate: 0.9, count: 100, avgDurationMs: 100 },
                    { successRate: 0.8, count: 200, avgDurationMs: 200 },
                ],
            });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics();
            await analytics.fetchAll();

            // Weighted average: (100*100 + 200*200) / (100 + 200) = 50000/300 = 166.67
            expect(analytics.avgDuration.value).toBeCloseTo(166.67, 1);
        });

        it('avgDuration should return 0 when no data', () => {
            const analytics = useAnalytics();
            expect(analytics.avgDuration.value).toBe(0);
        });
    });

    describe('fetchAll', () => {
        it('should set loading state while fetching', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            let resolvePromise: () => void;
            const pendingPromise = new Promise<{ data: null }>((resolve) => {
                resolvePromise = () => resolve({ data: null });
            });

            vi.mocked(fetchSummary).mockReturnValue(pendingPromise);
            vi.mocked(fetchTimeseries).mockReturnValue(pendingPromise);
            vi.mocked(fetchCacheHits).mockReturnValue(pendingPromise);
            vi.mocked(fetchModeDistribution).mockReturnValue(pendingPromise);

            const analytics = useAnalytics();
            const fetchPromise = analytics.fetchAll();

            expect(analytics.loading.value).toBe(true);

            resolvePromise!();
            await fetchPromise;

            expect(analytics.loading.value).toBe(false);
        });

        it('should handle errors gracefully', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            const error = new Error('API error');
            vi.mocked(fetchSummary).mockRejectedValue(error);
            vi.mocked(fetchTimeseries).mockRejectedValue(error);
            vi.mocked(fetchCacheHits).mockRejectedValue(error);
            vi.mocked(fetchModeDistribution).mockRejectedValue(error);

            const analytics = useAnalytics();
            await analytics.fetchAll();

            expect(analytics.loading.value).toBe(false);
            expect(analytics.error.value).toBe('API error');
        });

        it('should update lastUpdated timestamp', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics();

            expect(analytics.state.value.lastUpdated).toBe('');

            await analytics.fetchAll();

            expect(analytics.state.value.lastUpdated).not.toBe('');
        });
    });

    describe('setTimeRange', () => {
        it('should update timeRange and refetch data', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics();

            expect(analytics.timeRange.value).toBe('24h');

            await analytics.setTimeRange('7d');

            expect(analytics.timeRange.value).toBe('7d');
            expect(fetchSummary).toHaveBeenCalled();
        });
    });

    describe('auto-refresh', () => {
        it('should toggle auto-refresh on and off', () => {
            const analytics = useAnalytics();

            expect(analytics.autoRefreshEnabled.value).toBe(true);

            analytics.toggleAutoRefresh(false);
            expect(analytics.autoRefreshEnabled.value).toBe(false);

            analytics.toggleAutoRefresh(true);
            expect(analytics.autoRefreshEnabled.value).toBe(true);
        });

        it('should toggle without argument', () => {
            const analytics = useAnalytics();

            expect(analytics.autoRefreshEnabled.value).toBe(true);

            analytics.toggleAutoRefresh();
            expect(analytics.autoRefreshEnabled.value).toBe(false);

            analytics.toggleAutoRefresh();
            expect(analytics.autoRefreshEnabled.value).toBe(true);
        });

        it('startAutoRefresh should set up interval', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            // Use 1 second interval for testing
            const analytics = useAnalytics(1000);

            analytics.startAutoRefresh();

            // Initially no calls
            expect(fetchSummary).not.toHaveBeenCalled();

            // Advance time by 1 second
            await vi.advanceTimersByTimeAsync(1000);

            // Should have called fetch
            expect(fetchSummary).toHaveBeenCalled();

            // Stop to clean up
            analytics.stopAutoRefresh();
        });

        it('stopAutoRefresh should clear interval', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics(1000);

            analytics.startAutoRefresh();
            analytics.stopAutoRefresh();

            // Advance time
            await vi.advanceTimersByTimeAsync(2000);

            // Should not have called fetch since we stopped
            expect(fetchSummary).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should call fetchAll', async () => {
            const { fetchSummary, fetchTimeseries, fetchCacheHits, fetchModeDistribution } =
                await import('../lib/api');

            vi.mocked(fetchSummary).mockResolvedValue({ data: [] });
            vi.mocked(fetchTimeseries).mockResolvedValue({ data: [] });
            vi.mocked(fetchCacheHits).mockResolvedValue({ data: null });
            vi.mocked(fetchModeDistribution).mockResolvedValue({ data: null });

            const analytics = useAnalytics();
            await analytics.refresh();

            expect(fetchSummary).toHaveBeenCalled();
            expect(fetchTimeseries).toHaveBeenCalled();
            expect(fetchCacheHits).toHaveBeenCalled();
            expect(fetchModeDistribution).toHaveBeenCalled();
        });
    });
});
