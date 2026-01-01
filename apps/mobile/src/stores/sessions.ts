/**
 * Sessions Store - Pinia store for managing Claude Code sessions
 *
 * Provides reactive state for sessions list, selection, and real-time updates.
 * This store is shared between mobile and web via the @happy-vue/shared package pattern.
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * Session status types matching the CLI states
 */
export type SessionStatus = 'active' | 'idle' | 'disconnected' | 'error';

/**
 * Session interface matching @happy-vue/protocol patterns
 */
export interface Session {
  id: string;
  title: string | null;
  projectPath: string;
  status: SessionStatus;
  machineId: string;
  lastActivity: Date;
  messageCount: number;
}

/**
 * Message interface for session messages
 */
export interface SessionMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'error';
  }>;
}

export const useSessionsStore = defineStore('sessions', () => {
  // State
  const sessions = ref<Map<string, Session>>(new Map());
  const selectedSessionId = ref<string | null>(null);
  const sessionMessages = ref<Map<string, SessionMessage[]>>(new Map());
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  // Getters
  const sessionsList = computed(() =>
    Array.from(sessions.value.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
  );

  const activeSessionsCount = computed(() =>
    Array.from(sessions.value.values())
      .filter(s => s.status === 'active').length
  );

  const selectedSession = computed(() =>
    selectedSessionId.value ? sessions.value.get(selectedSessionId.value) : null
  );

  const selectedSessionMessages = computed(() =>
    selectedSessionId.value
      ? sessionMessages.value.get(selectedSessionId.value) ?? []
      : []
  );

  // Actions
  function addSession(session: Session) {
    sessions.value.set(session.id, session);
  }

  function updateSession(id: string, updates: Partial<Session>) {
    const existing = sessions.value.get(id);
    if (existing) {
      sessions.value.set(id, { ...existing, ...updates });
    }
  }

  function removeSession(id: string) {
    sessions.value.delete(id);
    sessionMessages.value.delete(id);
    if (selectedSessionId.value === id) {
      selectedSessionId.value = null;
    }
  }

  function selectSession(id: string | null) {
    selectedSessionId.value = id;
  }

  function addMessage(sessionId: string, message: SessionMessage) {
    const messages = sessionMessages.value.get(sessionId) ?? [];
    messages.push(message);
    sessionMessages.value.set(sessionId, messages);

    // Update session message count
    const session = sessions.value.get(sessionId);
    if (session) {
      sessions.value.set(sessionId, {
        ...session,
        messageCount: messages.length,
        lastActivity: new Date(),
      });
    }
  }

  function clearMessages(sessionId: string) {
    sessionMessages.value.set(sessionId, []);
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(err: string | null) {
    error.value = err;
  }

  // For demo/development - add mock sessions
  function addMockSessions() {
    addSession({
      id: '1',
      title: 'Project Alpha',
      projectPath: '/Users/dev/projects/alpha',
      status: 'active',
      machineId: 'machine-1',
      lastActivity: new Date(),
      messageCount: 5,
    });
    addSession({
      id: '2',
      title: 'Debug Session',
      projectPath: '/Users/dev/projects/debug',
      status: 'idle',
      machineId: 'machine-1',
      lastActivity: new Date(Date.now() - 3600000),
      messageCount: 12,
    });
    addSession({
      id: '3',
      title: null,
      projectPath: '/Users/dev/experiments/test',
      status: 'disconnected',
      machineId: 'machine-2',
      lastActivity: new Date(Date.now() - 86400000),
      messageCount: 0,
    });
  }

  return {
    // State
    sessions,
    selectedSessionId,
    sessionMessages,
    isLoading,
    error,
    // Getters
    sessionsList,
    activeSessionsCount,
    selectedSession,
    selectedSessionMessages,
    // Actions
    addSession,
    updateSession,
    removeSession,
    selectSession,
    addMessage,
    clearMessages,
    setLoading,
    setError,
    addMockSessions,
  };
});
