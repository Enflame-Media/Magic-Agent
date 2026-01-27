/**
 * Unit tests for the Sessions store
 *
 * Tests Pinia store functionality for:
 * - Session CRUD operations
 * - Computed getters
 * - API update integration
 * - Active session management
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionsStore, type Session } from '@/stores/sessions';

// Mock session factory
function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `session-${Math.random().toString(36).slice(2)}`,
    seq: 0,
    metadata: JSON.stringify({ name: 'Test Session', path: '/test/path' }),
    metadataVersion: 1,
    agentState: null,
    agentStateVersion: 0,
    dataEncryptionKey: null,
    active: true,
    activeAt: Date.now(),
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('Sessions Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should have empty sessions initially', () => {
      const store = useSessionsStore();

      expect(store.count).toBe(0);
      expect(store.sessionsList).toEqual([]);
      expect(store.activeSession).toBeNull();
    });
  });

  describe('upsertSession', () => {
    it('should add a new session', () => {
      const store = useSessionsStore();
      const session = createMockSession();

      store.upsertSession(session);

      expect(store.count).toBe(1);
      expect(store.getSession(session.id)).toEqual(session);
    });

    it('should update an existing session', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'test-id' });

      store.upsertSession(session);
      store.upsertSession({ ...session, metadata: JSON.stringify({ name: 'Updated' }) });

      expect(store.count).toBe(1);
      expect(JSON.parse(store.getSession('test-id')?.metadata ?? '{}')).toEqual({ name: 'Updated' });
    });
  });

  describe('upsertFromApi', () => {
    it('should create session from API update', () => {
      const store = useSessionsStore();
      const apiUpdate = {
        t: 'new-session' as const,
        mid: 'machine-1',
        sid: 'session-api-1',
        seq: 1,
        metadata: JSON.stringify({ name: 'API Session' }),
        metadataVersion: 1,
        agentState: null,
        agentStateVersion: 0,
        dataEncryptionKey: null,
        active: true,
        activeAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      store.upsertFromApi(apiUpdate);

      const session = store.getSession('session-api-1');
      expect(session).toBeDefined();
      expect(session?.id).toBe('session-api-1');
    });
  });

  describe('updateSession', () => {
    it('should partially update an existing session', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'test-id', active: true });

      store.upsertSession(session);
      store.updateSession('test-id', { active: false, metadataVersion: 2 });

      const updated = store.getSession('test-id');
      expect(updated?.active).toBe(false);
      expect(updated?.metadataVersion).toBe(2);
      expect(updated?.id).toBe('test-id'); // ID should remain unchanged
    });

    it('should do nothing for non-existent session', () => {
      const store = useSessionsStore();

      store.updateSession('non-existent', { active: false });

      expect(store.count).toBe(0);
    });
  });

  describe('removeSession', () => {
    it('should remove a session', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'to-remove' });

      store.upsertSession(session);
      expect(store.count).toBe(1);

      store.removeSession('to-remove');
      expect(store.count).toBe(0);
      expect(store.getSession('to-remove')).toBeUndefined();
    });

    it('should clear active session if removed', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'active-session' });

      store.upsertSession(session);
      store.setActiveSession('active-session');
      expect(store.activeSession).toBeTruthy();

      store.removeSession('active-session');
      expect(store.activeSession).toBeNull();
    });
  });

  describe('setActiveSession', () => {
    it('should set the active session', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'my-session' });

      store.upsertSession(session);
      store.setActiveSession('my-session');

      expect(store.activeSessionId).toBe('my-session');
      expect(store.activeSession).toEqual(session);
    });

    it('should allow setting to null', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'my-session' });

      store.upsertSession(session);
      store.setActiveSession('my-session');
      store.setActiveSession(null);

      expect(store.activeSession).toBeNull();
    });
  });

  describe('setSessions', () => {
    it('should replace all sessions', () => {
      const store = useSessionsStore();
      const sessions = [
        createMockSession({ id: 'session-1' }),
        createMockSession({ id: 'session-2' }),
        createMockSession({ id: 'session-3' }),
      ];

      store.upsertSession(createMockSession({ id: 'old-session' }));
      store.setSessions(sessions);

      expect(store.count).toBe(3);
      expect(store.getSession('old-session')).toBeUndefined();
      expect(store.getSession('session-1')).toBeDefined();
    });
  });

  describe('clearSessions', () => {
    it('should clear all sessions and active state', () => {
      const store = useSessionsStore();
      const session = createMockSession({ id: 'session-1' });

      store.upsertSession(session);
      store.setActiveSession('session-1');
      store.clearSessions();

      expect(store.count).toBe(0);
      expect(store.activeSession).toBeNull();
    });
  });

  describe('$reset', () => {
    it('should reset store to initial state', () => {
      const store = useSessionsStore();

      store.upsertSession(createMockSession());
      store.setActiveSession(store.sessionsList[0]?.id ?? null);
      store.$reset();

      expect(store.count).toBe(0);
      expect(store.activeSession).toBeNull();
    });
  });

  describe('Computed Getters', () => {
    describe('sessionsList', () => {
      it('should return sessions sorted by updatedAt (most recent first)', () => {
        const store = useSessionsStore();
        const now = Date.now();

        store.setSessions([
          createMockSession({ id: 's1', updatedAt: now - 2000 }),
          createMockSession({ id: 's2', updatedAt: now }),
          createMockSession({ id: 's3', updatedAt: now - 1000 }),
        ]);

        const list = store.sessionsList;
        expect(list[0]?.id).toBe('s2');
        expect(list[1]?.id).toBe('s3');
        expect(list[2]?.id).toBe('s1');
      });
    });

    describe('activeSessions', () => {
      it('should return only active sessions sorted by activeAt', () => {
        const store = useSessionsStore();
        const now = Date.now();

        store.setSessions([
          createMockSession({ id: 's1', active: true, activeAt: now - 1000 }),
          createMockSession({ id: 's2', active: false }),
          createMockSession({ id: 's3', active: true, activeAt: now }),
        ]);

        const active = store.activeSessions;
        expect(active.length).toBe(2);
        expect(active[0]?.id).toBe('s3');
        expect(active[1]?.id).toBe('s1');
      });
    });

    describe('inactiveSessions', () => {
      it('should return only inactive sessions sorted by updatedAt', () => {
        const store = useSessionsStore();
        const now = Date.now();

        store.setSessions([
          createMockSession({ id: 's1', active: true }),
          createMockSession({ id: 's2', active: false, updatedAt: now }),
          createMockSession({ id: 's3', active: false, updatedAt: now - 1000 }),
        ]);

        const inactive = store.inactiveSessions;
        expect(inactive.length).toBe(2);
        expect(inactive[0]?.id).toBe('s2');
        expect(inactive[1]?.id).toBe('s3');
      });
    });

    describe('count', () => {
      it('should return correct session count', () => {
        const store = useSessionsStore();

        expect(store.count).toBe(0);

        store.upsertSession(createMockSession());
        expect(store.count).toBe(1);

        store.upsertSession(createMockSession());
        expect(store.count).toBe(2);

        store.clearSessions();
        expect(store.count).toBe(0);
      });
    });
  });
});
