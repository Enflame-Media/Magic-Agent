/**
 * useWebSocketMetrics Composable
 *
 * Provides WebSocket performance metrics data fetching and chart data transformation.
 * Used by the dashboard to display connection times, broadcast latency, and error rates.
 *
 * @see HAP-896 - Add WebSocket performance metrics to admin dashboard
 */
import { ref, computed, type Ref } from 'vue';
import {
    fetchWebSocketSummary,
    fetchWebSocketConnections,
    fetchWebSocketBroadcasts,
    fetchWebSocketErrors,
    type WebSocketSummary,
    type ConnectionTimePoint,
    type BroadcastLatencyPoint,
    type WebSocketErrorBreakdown,
} from '../lib/api';

interface WebSocketMetricsState {
    summary: WebSocketSummary | null;
    connections: ConnectionTimePoint[];
    broadcasts: BroadcastLatencyPoint[];
    errors: WebSocketErrorBreakdown[];
    totalErrors: number;
    loading: boolean;
    error: string | null;
}

/**
 * Composable for WebSocket metrics
 */
export function useWebSocketMetrics() {
    const state = ref<WebSocketMetricsState>({
        summary: null,
        connections: [],
        broadcasts: [],
        errors: [],
        totalErrors: 0,
        loading: false,
        error: null,
    });

    /**
     * Fetch all WebSocket metrics data in parallel
     * @param hours - Number of hours to look back (default: 24)
     */
    async function fetchWebSocketData(hours: number = 24) {
        state.value.loading = true;
        state.value.error = null;

        try {
            const bucket = hours > 48 ? 'day' : 'hour';
            const [summaryRes, connectionsRes, broadcastsRes, errorsRes] = await Promise.all([
                fetchWebSocketSummary(hours),
                fetchWebSocketConnections(hours, bucket),
                fetchWebSocketBroadcasts(hours, bucket),
                fetchWebSocketErrors(hours),
            ]);

            state.value.summary = summaryRes.data;
            state.value.connections = connectionsRes.data;
            state.value.broadcasts = broadcastsRes.data;
            state.value.errors = errorsRes.data;
            state.value.totalErrors = errorsRes.total;
        } catch (err) {
            state.value.error = err instanceof Error ? err.message : 'Failed to fetch WebSocket metrics';
            console.error('[useWebSocketMetrics] Error:', err);
        } finally {
            state.value.loading = false;
        }
    }

    return {
        state,
        fetchWebSocketData,
    };
}

/**
 * Transform WebSocket connection time data for Chart.js line chart
 */
export function useWebSocketCharts(
    connectionsRef: Ref<ConnectionTimePoint[]>,
    broadcastsRef: Ref<BroadcastLatencyPoint[]>
) {
    const connectionTimeChartData = computed(() => {
        const connections = connectionsRef.value;
        if (!connections || connections.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Determine if data spans multiple days
        const firstPoint = connections[0]!;
        const lastPoint = connections[connections.length - 1]!;
        const firstDate = new Date(firstPoint.timestamp);
        const lastDate = new Date(lastPoint.timestamp);
        const spanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

        // Format timestamps as labels
        const labels = connections.map((point) => {
            const date = new Date(point.timestamp);
            if (spanDays > 1) {
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Avg Connection Time (ms)',
                    data: connections.map((p) => p.avgTimeMs),
                    borderColor: 'rgb(99, 102, 241)',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                },
                {
                    label: 'P95 Connection Time (ms)',
                    data: connections.map((p) => p.p95TimeMs),
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
                {
                    label: 'P99 Connection Time (ms)',
                    data: connections.map((p) => p.p99TimeMs),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                },
            ],
        };
    });

    const broadcastLatencyChartData = computed(() => {
        const broadcasts = broadcastsRef.value;
        if (!broadcasts || broadcasts.length === 0) {
            return { labels: [], datasets: [] };
        }

        // Determine if data spans multiple days
        const firstPoint = broadcasts[0]!;
        const lastPoint = broadcasts[broadcasts.length - 1]!;
        const firstDate = new Date(firstPoint.timestamp);
        const lastDate = new Date(lastPoint.timestamp);
        const spanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);

        // Format timestamps as labels
        const labels = broadcasts.map((point) => {
            const date = new Date(point.timestamp);
            if (spanDays > 1) {
                return `${date.getMonth() + 1}/${date.getDate()}`;
            }
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Avg Latency (ms)',
                    data: broadcasts.map((p) => p.avgLatencyMs),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    yAxisID: 'y',
                },
                {
                    label: 'P95 Latency (ms)',
                    data: broadcasts.map((p) => p.p95LatencyMs),
                    borderColor: 'rgb(245, 158, 11)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y',
                },
                {
                    label: 'Avg Recipients',
                    data: broadcasts.map((p) => p.avgRecipients),
                    borderColor: 'rgb(139, 92, 246)',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3,
                    yAxisID: 'y1',
                },
            ],
        };
    });

    const errorBreakdownChartData = (errors: WebSocketErrorBreakdown[]) => {
        if (!errors || errors.length === 0) {
            return { labels: [], datasets: [] };
        }

        return {
            labels: errors.map((e) => e.errorType),
            datasets: [
                {
                    label: 'Count',
                    data: errors.map((e) => e.count),
                    backgroundColor: [
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(34, 197, 94, 0.8)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(14, 165, 233, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                    ],
                    borderWidth: 0,
                    borderRadius: 4,
                },
            ],
        };
    };

    return {
        connectionTimeChartData,
        broadcastLatencyChartData,
        errorBreakdownChartData,
    };
}
