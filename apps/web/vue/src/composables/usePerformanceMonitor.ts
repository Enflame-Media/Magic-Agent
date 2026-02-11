import { ref } from 'vue';

export function usePerformanceMonitor() {
  const apiLatencyMs = ref(180);
  const lastCheckedAt = ref('Just now');

  function refreshMetrics() {
    // TODO: wire to performance monitoring events
    lastCheckedAt.value = 'Just now';
  }

  return {
    apiLatencyMs,
    lastCheckedAt,
    refreshMetrics,
  };
}
