/**
 * Unit tests for the Messages store
 *
 * Tests Pinia store functionality for:
 * - Message CRUD operations
 * - Session-based message grouping
 * - API update integration
 * - Message count and retrieval
 *
 * @see HAP-877 - Increase test coverage to 80%
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMessagesStore, type Message } from '@/stores/messages';

// Mock message factory
function createMockMessage(sessionId: string, overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    sessionId,
    seq: 0,
    localId: null,
    content: {
      ciphertext: 'encrypted-content',
      nonce: 'test-nonce',
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('Messages Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should have empty messages initially', () => {
      const store = useMessagesStore();

      expect(store.totalCount).toBe(0);
      expect(store.sessionCount).toBe(0);
    });
  });

  describe('addMessage', () => {
    it('should add a new message', () => {
      const store = useMessagesStore();
      const message = createMockMessage('session-1');

      store.addMessage(message);

      expect(store.totalCount).toBe(1);
      expect(store.getMessage('session-1', message.id)).toEqual(message);
    });

    it('should add messages to different sessions', () => {
      const store = useMessagesStore();
      const msg1 = createMockMessage('session-1');
      const msg2 = createMockMessage('session-2');

      store.addMessage(msg1);
      store.addMessage(msg2);

      expect(store.totalCount).toBe(2);
      expect(store.sessionCount).toBe(2);
    });

    it('should add multiple messages to same session', () => {
      const store = useMessagesStore();
      const msg1 = createMockMessage('session-1', { id: 'msg-1', seq: 0 });
      const msg2 = createMockMessage('session-1', { id: 'msg-2', seq: 1 });
      const msg3 = createMockMessage('session-1', { id: 'msg-3', seq: 2 });

      store.addMessage(msg1);
      store.addMessage(msg2);
      store.addMessage(msg3);

      expect(store.totalCount).toBe(3);
      expect(store.sessionCount).toBe(1);
      expect(store.getMessageCount('session-1')).toBe(3);
    });

    it('should update existing message', () => {
      const store = useMessagesStore();
      const message = createMockMessage('session-1', { id: 'msg-1' });

      store.addMessage(message);
      store.addMessage({ ...message, seq: 5 });

      expect(store.totalCount).toBe(1);
      expect(store.getMessage('session-1', 'msg-1')?.seq).toBe(5);
    });
  });

  describe('addFromApi', () => {
    it('should create message from API event', () => {
      const store = useMessagesStore();
      const apiMessage = {
        id: 'api-msg-1',
        seq: 1,
        localId: 'local-1',
        content: { ciphertext: 'encrypted', nonce: 'nonce-1' },
        createdAt: Date.now(),
      };

      store.addFromApi('session-api', apiMessage);

      const message = store.getMessage('session-api', 'api-msg-1');
      expect(message).toBeDefined();
      expect(message?.sessionId).toBe('session-api');
      expect(message?.localId).toBe('local-1');
    });

    it('should handle API message without localId', () => {
      const store = useMessagesStore();
      const apiMessage = {
        id: 'api-msg-1',
        seq: 1,
        content: { ciphertext: 'encrypted', nonce: 'nonce-1' },
        createdAt: Date.now(),
      };

      store.addFromApi('session-api', apiMessage);

      const message = store.getMessage('session-api', 'api-msg-1');
      expect(message?.localId).toBeNull();
    });
  });

  describe('getMessagesForSession', () => {
    it('should return empty array for non-existent session', () => {
      const store = useMessagesStore();

      expect(store.getMessagesForSession('non-existent')).toEqual([]);
    });

    it('should return messages sorted by seq', () => {
      const store = useMessagesStore();

      store.addMessage(createMockMessage('session-1', { id: 'msg-3', seq: 3 }));
      store.addMessage(createMockMessage('session-1', { id: 'msg-1', seq: 1 }));
      store.addMessage(createMockMessage('session-1', { id: 'msg-2', seq: 2 }));

      const messages = store.getMessagesForSession('session-1');
      expect(messages.length).toBe(3);
      expect(messages[0]?.id).toBe('msg-1');
      expect(messages[1]?.id).toBe('msg-2');
      expect(messages[2]?.id).toBe('msg-3');
    });
  });

  describe('getMessageCount', () => {
    it('should return 0 for non-existent session', () => {
      const store = useMessagesStore();

      expect(store.getMessageCount('non-existent')).toBe(0);
    });

    it('should return correct count for existing session', () => {
      const store = useMessagesStore();

      store.addMessage(createMockMessage('session-1'));
      store.addMessage(createMockMessage('session-1'));
      store.addMessage(createMockMessage('session-2'));

      expect(store.getMessageCount('session-1')).toBe(2);
      expect(store.getMessageCount('session-2')).toBe(1);
    });
  });

  describe('getMessage', () => {
    it('should return undefined for non-existent session', () => {
      const store = useMessagesStore();

      expect(store.getMessage('non-existent', 'msg-1')).toBeUndefined();
    });

    it('should return undefined for non-existent message', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));

      expect(store.getMessage('session-1', 'msg-2')).toBeUndefined();
    });

    it('should return the message for existing id', () => {
      const store = useMessagesStore();
      const message = createMockMessage('session-1', { id: 'msg-1' });
      store.addMessage(message);

      expect(store.getMessage('session-1', 'msg-1')).toEqual(message);
    });
  });

  describe('setMessagesForSession', () => {
    it('should replace all messages for a session', () => {
      const store = useMessagesStore();
      const initialMsg = createMockMessage('session-1', { id: 'old-msg' });
      const newMessages = [
        createMockMessage('session-1', { id: 'new-1' }),
        createMockMessage('session-1', { id: 'new-2' }),
      ];

      store.addMessage(initialMsg);
      store.setMessagesForSession('session-1', newMessages);

      expect(store.getMessageCount('session-1')).toBe(2);
      expect(store.getMessage('session-1', 'old-msg')).toBeUndefined();
      expect(store.getMessage('session-1', 'new-1')).toBeDefined();
    });

    it('should create session if it doesnt exist', () => {
      const store = useMessagesStore();
      const messages = [
        createMockMessage('new-session', { id: 'msg-1' }),
      ];

      store.setMessagesForSession('new-session', messages);

      expect(store.sessionCount).toBe(1);
      expect(store.getMessageCount('new-session')).toBe(1);
    });
  });

  describe('removeMessage', () => {
    it('should remove a specific message', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));
      store.addMessage(createMockMessage('session-1', { id: 'msg-2' }));

      store.removeMessage('session-1', 'msg-1');

      expect(store.getMessageCount('session-1')).toBe(1);
      expect(store.getMessage('session-1', 'msg-1')).toBeUndefined();
      expect(store.getMessage('session-1', 'msg-2')).toBeDefined();
    });

    it('should clean up empty session entry', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));

      store.removeMessage('session-1', 'msg-1');

      expect(store.sessionCount).toBe(0);
    });

    it('should do nothing for non-existent session', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));

      store.removeMessage('non-existent', 'msg-1');

      expect(store.totalCount).toBe(1);
    });

    it('should do nothing for non-existent message', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));

      store.removeMessage('session-1', 'non-existent');

      expect(store.totalCount).toBe(1);
    });
  });

  describe('clearSessionMessages', () => {
    it('should clear all messages for a session', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));
      store.addMessage(createMockMessage('session-1', { id: 'msg-2' }));
      store.addMessage(createMockMessage('session-2', { id: 'msg-3' }));

      store.clearSessionMessages('session-1');

      expect(store.getMessageCount('session-1')).toBe(0);
      expect(store.getMessageCount('session-2')).toBe(1);
      expect(store.sessionCount).toBe(1);
    });

    it('should do nothing for non-existent session', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));

      store.clearSessionMessages('non-existent');

      expect(store.totalCount).toBe(1);
    });
  });

  describe('clearAllMessages', () => {
    it('should clear all messages from all sessions', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1', { id: 'msg-1' }));
      store.addMessage(createMockMessage('session-2', { id: 'msg-2' }));
      store.addMessage(createMockMessage('session-3', { id: 'msg-3' }));

      store.clearAllMessages();

      expect(store.totalCount).toBe(0);
      expect(store.sessionCount).toBe(0);
    });
  });

  describe('$reset', () => {
    it('should reset store to initial state', () => {
      const store = useMessagesStore();
      store.addMessage(createMockMessage('session-1'));
      store.addMessage(createMockMessage('session-2'));

      store.$reset();

      expect(store.totalCount).toBe(0);
      expect(store.sessionCount).toBe(0);
    });
  });

  describe('Computed Getters', () => {
    describe('totalCount', () => {
      it('should return total count across all sessions', () => {
        const store = useMessagesStore();

        expect(store.totalCount).toBe(0);

        store.addMessage(createMockMessage('session-1'));
        store.addMessage(createMockMessage('session-1'));
        store.addMessage(createMockMessage('session-2'));

        expect(store.totalCount).toBe(3);
      });
    });

    describe('sessionCount', () => {
      it('should return number of sessions with messages', () => {
        const store = useMessagesStore();

        expect(store.sessionCount).toBe(0);

        store.addMessage(createMockMessage('session-1'));
        expect(store.sessionCount).toBe(1);

        store.addMessage(createMockMessage('session-2'));
        expect(store.sessionCount).toBe(2);

        store.addMessage(createMockMessage('session-1'));
        expect(store.sessionCount).toBe(2); // Still 2, same session
      });
    });
  });
});
