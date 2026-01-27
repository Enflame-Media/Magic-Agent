/**
 * Revival Cooldown Composable
 *
 * Vue composable for managing session revival cooldown state.
 * Handles the circuit breaker cooldown UI when session revival is paused.
 *
 * HAP-869: This composable provides:
 * - Real-time countdown display for circuit breaker cooldown
 * - Listens for 'session-revival-paused' events from WebSocket handlers
 * - Auto-clear when cooldown expires or on 'session-revived' event
 * - State accessible from any component that needs cooldown info
 *
 * @example
 * ```vue
 * <script setup>
 * import { useRevivalCooldown } from '@/composables/useRevivalCooldown';
 *
 * const { cooldown, clearCooldown } = useRevivalCooldown();
 * </script>
 *
 * <template>
 *   <div v-if="cooldown">
 *     Revival paused: {{ cooldown.remainingSeconds }}s remaining
 *   </div>
 * </template>
 * ```
 *
 * @see HAP-784 - CLI notify mobile app when session revival is paused
 * @see HAP-867 - React Native implementation (reference)
 * @see HAP-868 - macOS implementation
 */

import { ref, readonly, onMounted, onUnmounted } from 'vue';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cooldown state representing an active circuit breaker pause.
 */
export interface RevivalCooldownState {
  /** Reason for the cooldown (currently only 'circuit_breaker') */
  reason: 'circuit_breaker';
  /** Remaining time in seconds (updated every second) */
  remainingSeconds: number;
  /** Timestamp when cooldown will expire */
  resumesAt: number;
  /** Machine ID this cooldown originated from */
  machineId: string;
}

/**
 * Payload structure for the session-revival-paused WebSocket event.
 * This matches the CLI's event emission format from HAP-784.
 */
export interface SessionRevivalPausedPayload {
  reason: 'circuit_breaker';
  remainingMs: number;
  resumesAt: number;
  machineId: string;
}

/**
 * Payload structure for the session-revived WebSocket event.
 * Used to clear cooldown state when a session is successfully revived.
 */
interface SessionRevivedPayload {
  originalSessionId: string;
  newSessionId: string;
  machineId: string;
}

/**
 * Return type for the useRevivalCooldown composable.
 */
export interface RevivalCooldownHandler {
  /**
   * Current cooldown state, or null if no cooldown is active.
   */
  cooldown: Readonly<typeof ref<RevivalCooldownState | null>>;

  /**
   * Manually clear the cooldown state.
   * Called when user dismisses the banner or cooldown expires.
   */
  clearCooldown: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable for managing session revival cooldown state.
 *
 * Listens for 'session-revival-paused' events and maintains a countdown timer
 * that updates every second. Automatically clears when the cooldown expires
 * or when a 'session-revived' event is received.
 *
 * @returns Cooldown state and control functions
 */
export function useRevivalCooldown(): RevivalCooldownHandler {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  /** Current cooldown state, or null if no cooldown is active */
  const cooldown = ref<RevivalCooldownState | null>(null);

  /** Reference to the countdown interval timer */
  let timerRef: ReturnType<typeof setInterval> | null = null;

  // ─────────────────────────────────────────────────────────────────────────
  // Internal Functions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Clear any existing countdown timer.
   */
  function clearTimer(): void {
    if (timerRef) {
      clearInterval(timerRef);
      timerRef = null;
    }
  }

  /**
   * Clear the cooldown state and timer.
   */
  function clearCooldown(): void {
    clearTimer();
    cooldown.value = null;
  }

  /**
   * Start a countdown timer that updates remaining seconds every second.
   */
  function startCountdown(resumesAt: number): void {
    clearTimer();

    const updateRemaining = (): void => {
      const remaining = Math.max(0, Math.ceil((resumesAt - Date.now()) / 1000));
      if (remaining <= 0) {
        clearCooldown();
      } else if (cooldown.value) {
        cooldown.value = { ...cooldown.value, remainingSeconds: remaining };
      }
    };

    // Update immediately
    updateRemaining();

    // Then update every second
    timerRef = setInterval(updateRemaining, 1000);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Handle session-revival-paused event from WebSocket handlers.
   * Dispatched via CustomEvent from sync/handlers.ts.
   */
  function handleRevivalPaused(event: CustomEvent<SessionRevivalPausedPayload>): void {
    const payload = event.detail;

    // Validate payload structure
    if (
      typeof payload !== 'object' ||
      payload === null ||
      payload.reason !== 'circuit_breaker' ||
      typeof payload.remainingMs !== 'number' ||
      typeof payload.resumesAt !== 'number' ||
      typeof payload.machineId !== 'string'
    ) {
      console.warn('[HAP-869] Invalid session-revival-paused payload:', payload);
      return;
    }

    const remainingSeconds = Math.ceil(payload.remainingMs / 1000);

    cooldown.value = {
      reason: payload.reason,
      remainingSeconds,
      resumesAt: payload.resumesAt,
      machineId: payload.machineId,
    };

    // Start countdown timer
    startCountdown(payload.resumesAt);
  }

  /**
   * Handle session-revived event from WebSocket handlers.
   * Clears cooldown when a session is successfully revived.
   */
  function handleSessionRevived(event: CustomEvent<SessionRevivedPayload>): void {
    const payload = event.detail;

    // Validate it's a valid session-revived event
    if (
      typeof payload !== 'object' ||
      payload === null ||
      typeof payload.machineId !== 'string'
    ) {
      return;
    }

    // Clear cooldown for this machine when session is revived
    if (cooldown.value && cooldown.value.machineId === payload.machineId) {
      clearCooldown();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  onMounted(() => {
    // Listen for session revival paused events from sync handlers
    window.addEventListener(
      'session-revival-paused',
      handleRevivalPaused as EventListener
    );
    // Listen for session revived events to clear cooldown
    window.addEventListener(
      'session-revived',
      handleSessionRevived as EventListener
    );
  });

  onUnmounted(() => {
    // Clean up event listeners
    window.removeEventListener(
      'session-revival-paused',
      handleRevivalPaused as EventListener
    );
    window.removeEventListener(
      'session-revived',
      handleSessionRevived as EventListener
    );
    // Clean up timer
    clearTimer();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    cooldown: readonly(cooldown),
    clearCooldown,
  };
}
