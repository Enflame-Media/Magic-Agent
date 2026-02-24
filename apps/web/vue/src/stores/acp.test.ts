/**
 * Unit tests for ACP Pinia Store
 *
 * Tests cover:
 * - Store initialization
 * - applyAcpUpdate action
 * - resetAcpSession action
 * - clearAll action
 * - getAcpSession getter
 * - $reset
 *
 * @see HAP-1046 - Build Vue ACP foundation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import type { AcpSessionUpdate } from '@magic-agent/protocol';
import { useAcpStore } from './acp';

describe('ACP Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with empty sessions map', () => {
      const store = useAcpStore();
      expect(store.sessions.size).toBe(0);
    });
  });

  describe('getAcpSession', () => {
    it('should return undefined for unknown session', () => {
      const store = useAcpStore();
      expect(store.getAcpSession('unknown')).toBeUndefined();
    });

    it('should return session state after update', () => {
      const store = useAcpStore();
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Hello' },
      };
      store.applyAcpUpdate('session-1', update);

      const session = store.getAcpSession('session-1');
      expect(session).toBeDefined();
      expect(session!.agentMessage).toBe('Hello');
    });
  });

  describe('applyAcpUpdate', () => {
    it('should create new session state for first update', () => {
      const store = useAcpStore();
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'code',
      };
      store.applyAcpUpdate('session-1', update);

      expect(store.sessions.size).toBe(1);
      const session = store.getAcpSession('session-1');
      expect(session!.currentModeId).toBe('code');
    });

    it('should accumulate updates for same session', () => {
      const store = useAcpStore();

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Part 1 ' },
      });

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Part 2' },
      });

      const session = store.getAcpSession('session-1');
      expect(session!.agentMessage).toBe('Part 1 Part 2');
    });

    it('should maintain separate state per session', () => {
      const store = useAcpStore();

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Session 1' },
      });

      store.applyAcpUpdate('session-2', {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Session 2' },
      });

      expect(store.sessions.size).toBe(2);
      expect(store.getAcpSession('session-1')!.agentMessage).toBe('Session 1');
      expect(store.getAcpSession('session-2')!.agentMessage).toBe('Session 2');
    });
  });

  describe('resetAcpSession', () => {
    it('should remove session state', () => {
      const store = useAcpStore();

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'code',
      });

      expect(store.getAcpSession('session-1')).toBeDefined();
      store.resetAcpSession('session-1');
      expect(store.getAcpSession('session-1')).toBeUndefined();
    });

    it('should not affect other sessions', () => {
      const store = useAcpStore();

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'code',
      });

      store.applyAcpUpdate('session-2', {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'ask',
      });

      store.resetAcpSession('session-1');
      expect(store.getAcpSession('session-1')).toBeUndefined();
      expect(store.getAcpSession('session-2')).toBeDefined();
    });

    it('should be a no-op for unknown session', () => {
      const store = useAcpStore();
      store.resetAcpSession('nonexistent');
      expect(store.sessions.size).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should remove all sessions', () => {
      const store = useAcpStore();

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'code',
      });

      store.applyAcpUpdate('session-2', {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'ask',
      });

      expect(store.sessions.size).toBe(2);
      store.clearAll();
      expect(store.sessions.size).toBe(0);
    });
  });

  describe('$reset', () => {
    it('should reset store to initial state', () => {
      const store = useAcpStore();

      store.applyAcpUpdate('session-1', {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'test' },
      });

      expect(store.sessions.size).toBe(1);
      store.$reset();
      expect(store.sessions.size).toBe(0);
    });
  });
});
