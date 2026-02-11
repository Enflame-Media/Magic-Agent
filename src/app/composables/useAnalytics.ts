/**
 * useAnalytics Composable
 *
 * Manages fetching and caching of analytics data from the API.
 * Provides reactive state for loading, error handling, and auto-refresh.
 *
 * HAP-872: Updated to handle 503 Service Unavailable responses when
 * Analytics Engine is not configured or datasets are empty.
 */
import { ref, computed, onUnmounted } from 'vue';
import {
    fetchSummary,
    fetchTimeseries,
    fetchCacheHits,
    fetchModeDistribution,
    timeRangeToHours,
    ApiError,
    type MetricsSummary,
    type TimeseriesPoint,
    type CacheHitRate,
    type ModeDistribution,
    type TimeRange,
} from '../lib/api';

/**
 * HAP-872: Reason why data is unavailable
 */
type DataUnavailableReason = 'not_configured' | 'empty_dataset' | 'query_failed';

/**
 * HAP-872: Data unavailable error response from API
 */
interface DataUnavailableResponse {
    error: string;
    reason: DataUnavailableReason;
    message: string;
}

/**
 * Analytics state interface
 */
interface AnalyticsState {
    summary: MetricsSummary[];
    timeseries: TimeseriesPoint[];
    cacheHits: CacheHitRate | null;
    modeDistribution: ModeDistribution | null;
    lastUpdated: string;
    /**
     * HAP-872: Track whether data is unavailable (replaces isMockData)
     * True when API returns 503 because Analytics Engine is not configured
     * or datasets are empty.
     */
    dataUnavailable: boolean;
    /**
     * HAP-872: Track which specific data sources are unavailable
     * Helpful for targeted troubleshooting
     */
    unavailableSources: string[];
    /**
     * HAP-872: The reason why data is unavailable (if any)
     */
    unavailableReason: DataUnavailableReason | null;
    /**
     * HAP-872: Detailed error message from the API
     */
    unavailableMessage: string | null;
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
        dataUnavailable: false,
        unavailableSources: [],
        unavailableReason: null,
        unavailableMessage: null,
    });

    // Auto-refresh interval handle
    let refreshIntervalId: ReturnType<typeof setInterval> | null = null;

    /**
     * HAP-872: Helper to safely fetch an endpoint that may return 503
     * Returns the data on success, or null if unavailable (503)
     */
    async function safeFetch<T>(
        fetcher: () => Promise<{ data: T; timestamp: string }>,
        sourceName: string,
        unavailableSources: string[],
        errorContext: { reason: DataUnavailableReason | null; message: string | null }
    ): Promise<T | null> {
        try {
            const res = await fetcher();
            return res.data;
        } catch (err) {
            if (err instanceof ApiError && err.status === 503) {
                unavailableSources.push(sourceName);
                // Try to parse the error response for detailed reason
                // Note: ApiError doesn't include body, so we use generic reason
                if (!errorContext.reason) {
                    errorContext.reason = 'empty_dataset';
                    errorContext.message = `${sourceName} data unavailable. Check Analytics Engine configuration.`;
                }
                return null;
            }
            // Re-throw non-503 errors
            throw err;
        }
    }

    /**
     * Fetch all analytics data
     *
     * HAP-872: Updated to handle 503 responses gracefully. When endpoints return
     * 503, we track which sources are unavailable rather than showing mock data.
     */
    async function fetchAll() {
        loading.value = true;
        error.value = null;

        try {
            const hours = timeRangeToHours(timeRange.value);
            const bucket = hours > 24 ? 'day' : 'hour';

            // HAP-872: Track unavailable sources
            const unavailableSources: string[] = [];
            const errorContext: { reason: DataUnavailableReason | null; message: string | null } = {
                reason: null,
                message: null,
            };

            // Fetch all endpoints, handling 503 errors gracefully
            const [summary, timeseries, cacheHits, modeDistribution] = await Promise.all([
                safeFetch(() => fetchSummary(), 'Summary', unavailableSources, errorContext),
                safeFetch(() => fetchTimeseries(hours, bucket), 'Timeseries', unavailableSources, errorContext),
                safeFetch(() => fetchCacheHits(), 'Cache Hits', unavailableSources, errorContext),
                safeFetch(() => fetchModeDistribution(), 'Mode Distribution', unavailableSources, errorContext),
            ]);

            state.value = {
                summary: summary ?? [],
                timeseries: timeseries ?? [],
                cacheHits: cacheHits,
                modeDistribution: modeDistribution,
                lastUpdated: new Date().toLocaleTimeString(),
                dataUnavailable: unavailableSources.length > 0,
                unavailableSources,
                unavailableReason: errorContext.reason,
                unavailableMessage: errorContext.message,
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
