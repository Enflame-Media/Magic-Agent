/**
 * useBundleSize Composable
 *
 * Provides bundle size data fetching and chart data transformation.
 * Used by the dashboard to display bundle size trends and latest sizes.
 *
 * @see HAP-564 - Add Cloudflare Analytics Engine integration for bundle size metrics
 */
import { ref, computed, type Ref } from 'vue';
import {
    fetchBundleTrends,
    fetchBundleLatest,
    type BundleSizePoint,
    type BundleSizeLatest,
} from '../lib/api';

interface BundleSizeState {
    trends: BundleSizePoint[];
    latest: BundleSizeLatest[];
    previousDay: Map<string, number>;
    loading: boolean;
    error: string | null;
}

/**
 * Composable for bundle size metrics
 */
export function useBundleSize() {
    const state = ref<BundleSizeState>({
        trends: [],
        latest: [],
        previousDay: new Map(),
        loading: false,
        error: null,
    });

    /**
     * Fetch all bundle size data
     * @param days - Number of days of trend data to fetch
     * @param platform - Optional platform filter ('ios' | 'android' | 'web')
     */
    async function fetchBundleData(days: number = 30, platform?: 'ios' | 'android' | 'web') {
        state.value.loading = true;
        state.value.error = null;

        try {
            const [trendsRes, latestRes] = await Promise.all([
                fetchBundleTrends(days, platform),
                fetchBundleLatest(),
            ]);

            state.value.trends = trendsRes.data;
            state.value.latest = latestRes.data;
            state.value.previousDay = calculatePreviousDaySizes(trendsRes.data);
        } catch (err) {
            state.value.error = err instanceof Error ? err.message : 'Failed to fetch bundle data';
            console.error('[useBundleSize] Error:', err);
        } finally {
            state.value.loading = false;
        }
    }

    /**
     * Calculate previous day's average size per platform from trends data.
     * Used for showing % change indicators in BundleSizeLatest.
     */
    function calculatePreviousDaySizes(trends: BundleSizePoint[]): Map<string, number> {
        const previousDay = new Map<string, number>();

        if (trends.length === 0) {
            return previousDay;
        }

        // Group by platform and sort by date descending
        const platformDates = new Map<string, BundleSizePoint[]>();
        for (const point of trends) {
            const existing = platformDates.get(point.platform) || [];
            existing.push(point);
            platformDates.set(point.platform, existing);
        }

        // For each platform, sort by date descending and get second entry (yesterday)
        for (const [platform, points] of platformDates) {
            const sorted = [...points].sort((a, b) => b.date.localeCompare(a.date));
            // Index 0 = most recent (today), Index 1 = previous (yesterday)
            const yesterdayPoint = sorted[1];
            if (yesterdayPoint) {
                previousDay.set(platform, yesterdayPoint.avgTotalSize);
            }
        }

        return previousDay;
    }

    return {
        state,
        fetchBundleData,
    };
}

/**
 * Transform bundle size data for Chart.js line chart
 */
export function useBundleSizeCharts(trendsRef: Ref<BundleSizePoint[]>) {
    const bundleSizeChartData = computed(() => {
        const trends = trendsRef.value;
        if (!trends || trends.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Extract unique dates and sort
        const dates = [...new Set(trends.map((t) => t.date))].sort();

        // Group data by date (average across platforms if multiple)
        const dataByDate = new Map<string, { js: number; assets: number; total: number; count: number }>();

        for (const point of trends) {
            const existing = dataByDate.get(point.date) || { js: 0, assets: 0, total: 0, count: 0 };
            existing.js += point.avgJsSize;
            existing.assets += point.avgAssetsSize;
            existing.total += point.avgTotalSize;
            existing.count += 1;
            dataByDate.set(point.date, existing);
        }

        // Calculate averages
        const jsData: number[] = [];
        const assetsData: number[] = [];
        const totalData: number[] = [];

        for (const date of dates) {
            const data = dataByDate.get(date);
            if (data) {
                jsData.push(Math.round(data.js / data.count));
                assetsData.push(Math.round(data.assets / data.count));
                totalData.push(Math.round(data.total / data.count));
            }
        }

        // Format date labels (MM/DD)
        const labels = dates.map((d) => {
            const date = new Date(d);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Total Size',
                    data: totalData,
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'JS Bundle',
                    data: jsData,
                    borderColor: 'rgb(234, 179, 8)',
                    backgroundColor: 'rgba(234, 179, 8, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
                {
                    label: 'Assets',
                    data: assetsData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
            ],
        };
    });

    return {
        bundleSizeChartData,
    };
}
