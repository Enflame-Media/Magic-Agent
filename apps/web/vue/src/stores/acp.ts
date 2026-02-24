/**
 * ACP Store
 *
 * Pinia store for managing ACP (Agent Client Protocol) session state.
 * Accumulates real-time ACP session updates received via the server relay.
 *
 * Uses shallowRef + triggerRef for performance with Map-based storage,
 * matching the pattern in the sessions store.
 *
 * @see HAP-1046 - Build Vue ACP foundation
 *
 * @example
 * ```typescript
 * const acpStore = useAcpStore();
 * acpStore.applyAcpUpdate(sessionId, update);
 * const session = acpStore.getAcpSession(sessionId);
 * ```
 */

import { defineStore } from 'pinia';
import { shallowRef, triggerRef } from 'vue';
import type { AcpSessionUpdate } from '@magic-agent/protocol';
import {
  type AcpSessionState,
  createAcpSessionState,
  applyAcpSessionUpdate,
} from './acpTypes';

export { type AcpSessionState } from './acpTypes';

export const useAcpStore = defineStore('acp', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Per-session ACP state, indexed by session ID.
   * Using shallowRef for better performance with Map mutations.
   */
  const sessions = shallowRef<Map<string, AcpSessionState>>(new Map());

  // ─────────────────────────────────────────────────────────────────────────
  // Getters
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get the ACP session state for a session ID.
   * Returns undefined if no ACP updates have been received for this session.
   */
  function getAcpSession(sessionId: string): AcpSessionState | undefined {
    return sessions.value.get(sessionId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Apply an ACP session update for a given session.
   * Creates initial state if this is the first update for the session.
   */
  function applyAcpUpdate(sessionId: string, update: AcpSessionUpdate): void {
    const existing = sessions.value.get(sessionId) ?? createAcpSessionState();
    const updated = applyAcpSessionUpdate(existing, update);
    sessions.value.set(sessionId, updated);
    triggerRef(sessions);
  }

  /**
   * Reset ACP state for a session (e.g., when session ends).
   */
  function resetAcpSession(sessionId: string): void {
    const deleted = sessions.value.delete(sessionId);
    if (deleted) {
      triggerRef(sessions);
    }
  }

  /**
   * Clear all ACP session state.
   */
  function clearAll(): void {
    sessions.value = new Map();
    triggerRef(sessions);
  }

  /**
   * Reset store to initial state.
   */
  function $reset(): void {
    clearAll();
  }

  return {
    // State
    sessions,
    // Getters
    getAcpSession,
    // Actions
    applyAcpUpdate,
    resetAcpSession,
    clearAll,
    $reset,
  };
});
