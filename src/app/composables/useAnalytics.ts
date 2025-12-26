/**
 * useAnalytics Composable
 *
 * Manages fetching and caching of analytics data from the API.
 * Provides reactive state for loading, error handling, and auto-refresh.
 */
import { ref, computed, onUnmounted } from 'vue';
import {
    fetchSummary,
    fetchTimeseries,
    fetchCacheHits,
    fetchModeDistribution,
    timeRangeToHours,
    type MetricsSummary,
    type TimeseriesPoint,
    type CacheHitRate,
    type ModeDistribution,
    type TimeRange,
} from '../lib/api';

/**
 * Analytics state interface
 */
interface AnalyticsState {
    summary: MetricsSummary[];
    timeseries: TimeseriesPoint[];
    cacheHits: CacheHitRate | null;
    modeDistribution: ModeDistribution | null;
    lastUpdated: string;
}

/**
 * Composable for analytics data management
 *
 * @param autoRefreshInterval - Auto-refresh interval in milliseconds (default: 5 minutes)
 */
export function useAnalytics(autoRefreshInterval = 5 * 60 * 1000) {
    // Reactive state
    const loading = ref(false);
    const error = ref<string | null>(null);
    const timeRange = ref<TimeRange>('24h');
    const autoRefreshEnabled = ref(true);

    const state = ref<AnalyticsState>({
        summary: [],
        timeseries: [],
        cacheHits: null,
        modeDistribution: null,
        lastUpdated: '',
    });

    // Auto-refresh interval handle
    let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * Fetch all analytics data
     */
    async function fetchAll() {
        loading.value = true;
        error.value = null;

        try {
            const hours = timeRangeToHours(timeRange.value);
            const bucket = hours > 24 ? 'day' : 'hour';

            const [summaryRes, timeseriesRes, cacheRes, distributionRes] = await Promise.all([
                fetchSummary(),
                fetchTimeseries(hours, bucket),
                fetchCacheHits(),
                fetchModeDistribution(),
            ]);

            state.value = {
                summary: summaryRes.data,
                timeseries: timeseriesRes.data,
                cacheHits: cacheRes.data,
                modeDistribution: distributionRes.data,
                lastUpdated: new Date().toLocaleTimeString(),
            };
        } catch (err) {
            error.value = err instanceof Error ? err.message : 'Failed to load analytics data';
            console.error('[useAnalytics] Fetch error:', err);
        } finally {
            loading.value = false;
        }
    }

    /**
     * Refresh data manually
     */
    async function refresh() {
        await fetchAll();
    }

    /**
     * Set time range and refetch data
     */
    async function setTimeRange(range: TimeRange) {
        timeRange.value = range;
        await fetchAll();
    }

    /**
     * Toggle auto-refresh
     */
    function toggleAutoRefresh(enabled?: boolean) {
        autoRefreshEnabled.value = enabled ?? !autoRefreshEnabled.value;

        if (autoRefreshEnabled.value && !refreshIntervalId) {
            startAutoRefresh();
        } else if (!autoRefreshEnabled.value && refreshIntervalId) {
            stopAutoRefresh();
        }
    }

    /**
     * Start auto-refresh interval
     */
    function startAutoRefresh() {
        if (refreshIntervalId) return;
        refreshIntervalId = setInterval(fetchAll, autoRefreshInterval);
    }

    /**
     * Stop auto-refresh interval
     */
    function stopAutoRefresh() {
        if (refreshIntervalId) {
            clearInterval(refreshIntervalId);
            refreshIntervalId = null;
        }
    }

    // Computed values for convenience
    const hasData = computed(() => state.value.summary.length > 0 || state.value.modeDistribution !== null);

    const totalSyncs = computed(() => state.value.modeDistribution?.total ?? 0);

    const avgSuccessRate = computed(() => {
        if (state.value.summary.length === 0) return 0;
        return state.value.summary.reduce((acc, s) => acc + s.successRate, 0) / state.value.summary.length;
    });

    const avgDuration = computed(() => {
        if (state.value.summary.length === 0) return 0;
        const totalCount = state.value.summary.reduce((acc, s) => acc + s.count, 0);
        if (totalCount === 0) return 0;
        return (
            state.value.summary.reduce((acc, s) => acc + s.avgDurationMs * s.count, 0) / totalCount
        );
    });

    // Cleanup on unmount
    onUnmounted(() => {
        stopAutoRefresh();
    });

    return {
        // State
        loading,
        error,
        timeRange,
        autoRefreshEnabled,
        state,

        // Computed
        hasData,
        totalSyncs,
        avgSuccessRate,
        avgDuration,

        // Actions
        fetchAll,
        refresh,
        setTimeRange,
        toggleAutoRefresh,
        startAutoRefresh,
        stopAutoRefresh,
    };
}
