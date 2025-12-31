/**
 * Sessions Store
 *
 * Manages session collection with optimized Map-based storage.
 * Sessions represent Claude Code conversation instances.
 *
 * @example
 * ```typescript
 * const sessions = useSessionsStore();
 * sessions.upsertSession(newSession);
 * const active = sessions.activeSession;
 * ```
 */

import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef } from 'vue';
import type { ApiUpdateNewSession } from '@happy-vue/protocol';

/**
 * Session data structure
 *
 * Based on ApiUpdateNewSession from protocol, with additional client-side fields.
 * Note: metadata and agentState are encrypted strings - decryption happens in composables.
 */
export interface Session {
    /** Session ID (sid from protocol) */
    id: string;
    /** Sequence number for ordering */
    seq: number;
    /** Encrypted metadata JSON string */
    metadata: string;
    /** Metadata version for optimistic concurrency */
    metadataVersion: number;
    /** Encrypted agent state JSON string */
    agentState: string | null;
    /** Agent state version */
    agentStateVersion: number;
    /** Data encryption key (Base64) */
    dataEncryptionKey: string | null;
    /** Whether session is currently active */
    active: boolean;
    /** Timestamp of last activity */
    activeAt: number;
    /** Creation timestamp */
    createdAt: number;
    /** Last update timestamp */
    updatedAt: number;
}

/**
 * Convert API update to Session interface
 */
function fromApiUpdate(update: ApiUpdateNewSession): Session {
    return {
        id: update.sid,
        seq: update.seq,
        metadata: update.metadata,
        metadataVersion: update.metadataVersion,
        agentState: update.agentState,
        agentStateVersion: update.agentStateVersion,
        dataEncryptionKey: update.dataEncryptionKey,
        active: update.active,
        activeAt: update.activeAt,
        createdAt: update.createdAt,
        updatedAt: update.updatedAt,
    };
}

export const useSessionsStore = defineStore('sessions', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Session collection indexed by ID
     * Using shallowRef for better performance with Map mutations
     */
    const sessions = shallowRef<Map<string, Session>>(new Map());

    /** Currently selected session ID */
    const activeSessionId = ref<string | null>(null);

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Currently active session */
    const activeSession = computed(() =>
        activeSessionId.value ? sessions.value.get(activeSessionId.value) ?? null : null
    );

    /** Total number of sessions */
    const count = computed(() => sessions.value.size);

    /** Sessions sorted by updatedAt (most recent first) */
    const sessionsList = computed(() =>
        Array.from(sessions.value.values()).sort((a, b) => b.updatedAt - a.updatedAt)
    );

    /** Active (live) sessions sorted by activeAt */
    const activeSessions = computed(() =>
        Array.from(sessions.value.values())
            .filter((s) => s.active)
            .sort((a, b) => b.activeAt - a.activeAt)
    );

    /** Inactive (archived) sessions */
    const inactiveSessions = computed(() =>
        Array.from(sessions.value.values())
            .filter((s) => !s.active)
            .sort((a, b) => b.updatedAt - a.updatedAt)
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get a session by ID
     */
    function getSession(id: string): Session | undefined {
        return sessions.value.get(id);
    }

    /**
     * Insert or update a session
     */
    function upsertSession(session: Session) {
        sessions.value.set(session.id, session);
        triggerRef(sessions);
    }

    /**
     * Insert or update from API update event
     */
    function upsertFromApi(update: ApiUpdateNewSession) {
        const session = fromApiUpdate(update);
        upsertSession(session);
    }

    /**
     * Update partial session data (from update-session events)
     */
    function updateSession(
        id: string,
        updates: Partial<Omit<Session, 'id'>>
    ) {
        const existing = sessions.value.get(id);
        if (existing) {
            sessions.value.set(id, { ...existing, ...updates });
            triggerRef(sessions);
        }
    }

    /**
     * Remove a session by ID
     */
    function removeSession(id: string) {
        const deleted = sessions.value.delete(id);
        if (deleted) {
            triggerRef(sessions);
            // Clear active if it was the deleted session
            if (activeSessionId.value === id) {
                activeSessionId.value = null;
            }
        }
    }

    /**
     * Set the active session
     */
    function setActiveSession(id: string | null) {
        activeSessionId.value = id;
    }

    /**
     * Bulk update sessions (for initial sync)
     */
    function setSessions(newSessions: Session[]) {
        const map = new Map<string, Session>();
        for (const session of newSessions) {
            map.set(session.id, session);
        }
        sessions.value = map;
        triggerRef(sessions);
    }

    /**
     * Clear all sessions
     */
    function clearSessions() {
        sessions.value = new Map();
        activeSessionId.value = null;
        triggerRef(sessions);
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        clearSessions();
    }

    return {
        // State
        sessions,
        activeSessionId,
        // Getters
        activeSession,
        count,
        sessionsList,
        activeSessions,
        inactiveSessions,
        // Actions
        getSession,
        upsertSession,
        upsertFromApi,
        updateSession,
        removeSession,
        setActiveSession,
        setSessions,
        clearSessions,
        $reset,
    };
});
