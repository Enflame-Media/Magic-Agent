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
 * @see HAP-1048 - Build Vue ACP interactive features
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
  type AcpPermissionRequestState,
  type AcpAgentRegistryState,
  type AcpRegisteredAgent,
  createAcpSessionState,
  createAcpAgentRegistryState,
  applyAcpSessionUpdate,
  addPermissionRequest,
  resolvePermissionRequest,
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

  /**
   * HAP-1048: Per-session agent registry state, indexed by session ID.
   */
  const agentRegistries = shallowRef<Map<string, AcpAgentRegistryState>>(new Map());

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

  /**
   * HAP-1048: Get the agent registry state for a session ID.
   */
  function getAgentRegistry(sessionId: string): AcpAgentRegistryState | undefined {
    return agentRegistries.value.get(sessionId);
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
   * HAP-1048: Add a permission request to the session state.
   */
  function addPermission(sessionId: string, request: AcpPermissionRequestState): void {
    const existing = sessions.value.get(sessionId) ?? createAcpSessionState();
    const updated = addPermissionRequest(existing, request);
    sessions.value.set(sessionId, updated);
    triggerRef(sessions);
  }

  /**
   * HAP-1048: Resolve a permission request (user responded or timeout expired).
   */
  function resolvePermission(
    sessionId: string,
    requestId: string,
    outcome: 'selected' | 'expired' | 'cancelled',
    selectedOptionId: string | null
  ): void {
    const existing = sessions.value.get(sessionId);
    if (!existing) return;
    const updated = resolvePermissionRequest(existing, requestId, outcome, selectedOptionId);
    sessions.value.set(sessionId, updated);
    triggerRef(sessions);
  }

  /**
   * HAP-1048: Update the agent registry for a session.
   */
  function updateAgentRegistry(
    sessionId: string,
    agents: Record<string, AcpRegisteredAgent>,
    activeAgentId: string | null
  ): void {
    const existing = agentRegistries.value.get(sessionId) ?? createAcpAgentRegistryState();
    agentRegistries.value.set(sessionId, {
      ...existing,
      agents,
      activeAgentId,
    });
    triggerRef(agentRegistries);
  }

  /**
   * HAP-1048: Set the agent switching state for a session.
   */
  function setAgentSwitching(
    sessionId: string,
    switching: boolean,
    switchError: string | null = null
  ): void {
    const existing = agentRegistries.value.get(sessionId) ?? createAcpAgentRegistryState();
    agentRegistries.value.set(sessionId, {
      ...existing,
      switching,
      switchError,
    });
    triggerRef(agentRegistries);
  }

  /**
   * Reset ACP state for a session (e.g., when session ends).
   */
  function resetAcpSession(sessionId: string): void {
    const deleted = sessions.value.delete(sessionId);
    const deletedRegistry = agentRegistries.value.delete(sessionId);
    if (deleted) triggerRef(sessions);
    if (deletedRegistry) triggerRef(agentRegistries);
  }

  /**
   * Clear all ACP session state.
   */
  function clearAll(): void {
    sessions.value = new Map();
    agentRegistries.value = new Map();
    triggerRef(sessions);
    triggerRef(agentRegistries);
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
    agentRegistries,
    // Getters
    getAcpSession,
    getAgentRegistry,
    // Actions
    applyAcpUpdate,
    addPermission,
    resolvePermission,
    updateAgentRegistry,
    setAgentSwitching,
    resetAcpSession,
    clearAll,
    $reset,
  };
});
