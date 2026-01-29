import { ref } from 'vue';

export function usePlanLimits() {
  const limit = ref(100000);
  const used = ref(24500);
  const resetAt = ref('Next month');

  function refreshLimits() {
    // TODO: wire to usage sync data
    // Placeholder - will be implemented when usage sync is ready
  }

  return {
    limit,
    used,
    resetAt,
    refreshLimits,
  };
}
