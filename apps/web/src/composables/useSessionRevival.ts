/**
 * Session Revival Composable
 *
 * Vue composable for handling session revival errors.
 * Detects SESSION_REVIVAL_FAILED errors and provides UI state for:
 * - Showing revival in-progress toast
 * - Displaying error dialog with session ID and archive option
 *
 * @example
 * ```vue
 * <script setup>
 * import { useSessionRevival } from '@/composables/useSessionRevival';
 *
 * const { reviving, revivalFailed, handleRpcError, archiveFailedSession, dismissError } = useSessionRevival();
 * </script>
 * ```
 *
 * @see HAP-736 - Handle "Method not found" errors with session revival flow
 * @see HAP-750 - Integrate useSessionRevival with WebSocket error events
 */

import { ref, readonly, onMounted, onUnmounted } from 'vue';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { getApiBaseUrl } from '@/services/apiBase';

/** Session revival failure state */
export interface RevivalFailedState {
  /** The session ID that failed to revive */
  sessionId: string;
  /** The error message */
  error: string;
}

/** Error type expected from RPC calls */
export interface RpcError {
  code?: string;
  message?: string;
  context?: {
    sessionId?: string;
    [key: string]: unknown;
  };
}

/** API base URL from environment */
const API_URL = getApiBaseUrl();

/**
 * Composable for handling session revival errors.
 *
 * Provides reactive state for revival progress and failure,
 * along with methods to handle errors and archive failed sessions.
 *
 * @returns Session revival state and control functions
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- Returns complex object literal type
export function useSessionRevival() {
  const { t } = useI18n();
  const authStore = useAuthStore();

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  /** Whether a session revival is in progress */
  const reviving = ref(false);

  /** Information about a failed revival, or null if no failure */
  const revivalFailed = ref<RevivalFailedState | null>(null);

  /** Toast ID for the revival-in-progress toast */
  let revivingToastId: string | number | undefined;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Show the revival in-progress toast.
   * Called when we detect a session is being revived.
   */
  function showRevivingToast(): void {
    reviving.value = true;
    revivingToastId = toast.loading(t('sessionRevival.reviving'), {
      description: t('sessionRevival.revivingDescription'),
    });
  }

  /**
   * Dismiss the revival in-progress toast.
   */
  function dismissRevivingToast(): void {
    reviving.value = false;
    if (revivingToastId !== undefined) {
      toast.dismiss(revivingToastId);
      revivingToastId = undefined;
    }
  }

  /**
   * Handle an RPC error and check for session revival failure.
   *
   * @param error - The error object from an RPC call
   * @returns true if the error was a session revival failure
   */
  function handleRpcError(error: RpcError): boolean {
    // Dismiss any active reviving toast first
    dismissRevivingToast();

    // Check if this is a session revival failure
    if (error.code === 'SESSION_REVIVAL_FAILED') {
      const sessionId = error.context?.sessionId;

      if (sessionId) {
        revivalFailed.value = {
          sessionId,
          error: error.message ?? t('sessionRevival.unknownError'),
        };
        return true;
      }
    }

    return false;
  }

  /**
   * Copy the failed session ID to clipboard.
   *
   * @returns Promise that resolves when copy is complete
   */
  async function copySessionId(): Promise<void> {
    if (!revivalFailed.value) return;

    try {
      await navigator.clipboard.writeText(revivalFailed.value.sessionId);
      toast.success(t('common.copied'));
    } catch {
      toast.error(t('errors.operationFailed'));
    }
  }

  /**
   * Archive the failed session.
   * Calls the server API to archive the session with reason 'revival_failed'.
   *
   * @returns Promise that resolves when archive is complete
   */
  async function archiveFailedSession(): Promise<void> {
    if (!revivalFailed.value) return;

    const sessionId = revivalFailed.value.sessionId;

    try {
      // Get auth token from store
      const token = authStore.token;

      if (!token) {
        toast.error(t('errors.notAuthenticated'));
        return;
      }

      const response = await fetch(`${API_URL}/v1/sessions/${sessionId}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'revival_failed',
        }),
      });

      if (!response.ok) {
        throw new Error('Archive failed with status ' + String(response.status));
      }

      toast.success(t('sessionRevival.archiveSuccess'));
      revivalFailed.value = null;
    } catch (error) {
      console.error('[useSessionRevival] Failed to archive session:', error);
      toast.error(t('sessionRevival.archiveFailed'));
    }
  }

  /**
   * Dismiss the error dialog without archiving.
   * The session remains in its failed state.
   */
  function dismissError(): void {
    revivalFailed.value = null;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WebSocket Error Event Handler (HAP-750)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle session revival error events dispatched from sync handlers.
   * This enables automatic detection of SESSION_REVIVAL_FAILED errors
   * without manual integration in each component.
   *
   * @see HAP-750 - Integrate useSessionRevival with WebSocket error events
   */
  function handleSessionRevivalError(event: CustomEvent<RpcError>): void {
    handleRpcError(event.detail);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  onMounted(() => {
    // Listen for session revival errors from WebSocket sync handlers
    window.addEventListener('session-revival-error', handleSessionRevivalError as EventListener);
  });

  onUnmounted(() => {
    // Clean up event listener
    window.removeEventListener('session-revival-error', handleSessionRevivalError as EventListener);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // State (readonly)
    reviving: readonly(reviving),
    revivalFailed: readonly(revivalFailed),

    // Actions
    showRevivingToast,
    dismissRevivingToast,
    handleRpcError,
    copySessionId,
    archiveFailedSession,
    dismissError,
  };
}
