/**
 * useVoiceAccess Composable
 *
 * Vue composable for checking voice trial/subscription access status.
 * Provides a lightweight check for displaying voice access status in settings.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useVoiceAccess } from '@/composables/useVoiceAccess';
 *
 * const {
 *   hasAccess,
 *   isLoading,
 *   error,
 *   checkAccess,
 * } = useVoiceAccess();
 *
 * // Check access on mount
 * onMounted(() => {
 *   checkAccess();
 * });
 * </script>
 *
 * <template>
 *   <div v-if="isLoading">Checking access...</div>
 *   <div v-else-if="hasAccess">Voice Access: Active</div>
 *   <div v-else>Voice Access: Inactive</div>
 * </template>
 * ```
 */

import { ref, readonly, type Ref, type DeepReadonly } from 'vue';
import { checkVoiceAccess as apiCheckVoiceAccess } from '@/services/apiVoice';

/**
 * Voice access composable return type
 */
export interface UseVoiceAccessReturn {
  /** Whether the user has voice access (subscription active or trial remaining) */
  hasAccess: DeepReadonly<Ref<boolean>>;
  /** Whether access check is in progress */
  isLoading: DeepReadonly<Ref<boolean>>;
  /** Error message if access check failed */
  error: DeepReadonly<Ref<string | null>>;
  /** Reason for denied access (if applicable) */
  deniedReason: DeepReadonly<Ref<string | null>>;
  /** Check voice access status */
  checkAccess: () => Promise<boolean>;
  /** Reset state to initial values */
  reset: () => void;
}

// Cached access state to avoid repeated API calls
let cachedAccess: boolean | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 60 * 1000; // 1 minute cache

/**
 * Use voice access status
 *
 * Provides reactive state for voice trial/subscription access.
 * Integrates with the voice API client to check entitlements.
 * Uses the lightweight /v1/voice/access endpoint (HAP-816).
 */
export function useVoiceAccess(): UseVoiceAccessReturn {
  const hasAccess = ref(cachedAccess ?? false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const deniedReason = ref<string | null>(null);

  /**
   * Check if user has voice access
   *
   * Makes a lightweight API call to verify subscription/trial status.
   * Results are cached to avoid repeated API calls.
   *
   * @returns Whether voice access is allowed
   */
  async function checkAccess(): Promise<boolean> {
    // Use cached value if still valid
    const now = Date.now();
    if (cachedAccess !== null && now - cacheTimestamp < CACHE_DURATION_MS) {
      hasAccess.value = cachedAccess;
      return cachedAccess;
    }

    isLoading.value = true;
    error.value = null;
    deniedReason.value = null;

    try {
      const result = await apiCheckVoiceAccess();
      hasAccess.value = result.allowed;
      deniedReason.value = result.reason ?? null;

      // Update cache
      cachedAccess = result.allowed;
      cacheTimestamp = now;

      return result.allowed;
    } catch (err) {
      const errorMessage = err instanceof Error
        ? err.message
        : 'Failed to check voice access';
      error.value = errorMessage;
      hasAccess.value = false;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Reset state to initial values and clear cache
   */
  function reset(): void {
    hasAccess.value = false;
    isLoading.value = false;
    error.value = null;
    deniedReason.value = null;
    cachedAccess = null;
    cacheTimestamp = 0;
  }

  return {
    hasAccess: readonly(hasAccess),
    isLoading: readonly(isLoading),
    error: readonly(error),
    deniedReason: readonly(deniedReason),
    checkAccess,
    reset,
  };
}
