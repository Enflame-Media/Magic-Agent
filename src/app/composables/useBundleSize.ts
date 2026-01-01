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
        loading: false,
        error: null,
    });

    /**
     * Fetch all bundle size data
     */
    async function fetchBundleData(days: number = 30) {
        state.value.loading = true;
        state.value.error = null;

        try {
            const [trendsRes, latestRes] = await Promise.all([
                fetchBundleTrends(days),
                fetchBundleLatest(),
            ]);

            state.value.trends = trendsRes.data;
            state.value.latest = latestRes.data;
        } catch (err) {
            state.value.error = err instanceof Error ? err.message : 'Failed to fetch bundle data';
            console.error('[useBundleSize] Error:', err);
        } finally {
            state.value.loading = false;
        }
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
