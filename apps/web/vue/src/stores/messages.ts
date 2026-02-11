/**
 * Messages Store
 *
 * Manages messages grouped by session ID.
 * Messages contain encrypted conversation content.
 *
 * @example
 * ```typescript
 * const messages = useMessagesStore();
 * messages.addMessage('session123', message);
 * const sessionMessages = messages.getMessagesForSession('session123');
 * ```
 */

import { defineStore } from 'pinia';
import { shallowRef, computed, triggerRef } from 'vue';
import type { ApiMessage, EncryptedContent } from '@magic-agent/protocol';

/**
 * Message data structure
 *
 * Based on ApiMessage from protocol.
 * Content is encrypted - decryption happens in composables.
 */
export interface Message {
    /** Message ID */
    id: string;
    /** Session ID this message belongs to */
    sessionId: string;
    /** Sequence number for ordering within session */
    seq: number;
    /** Local ID for optimistic updates */
    localId: string | null;
    /** Encrypted message content */
    content: EncryptedContent;
    /** Creation timestamp */
    createdAt: number;
}

/**
 * Convert API message to Message interface
 */
function fromApiMessage(sessionId: string, apiMessage: ApiMessage): Message {
    return {
        id: apiMessage.id,
        sessionId,
        seq: apiMessage.seq,
        localId: apiMessage.localId ?? null,
        content: apiMessage.content,
        createdAt: apiMessage.createdAt,
    };
}

export const useMessagesStore = defineStore('messages', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Messages grouped by session ID
     * Outer Map: sessionId -> message Map
     * Inner Map: messageId -> Message
     */
    const messagesBySession = shallowRef<Map<string, Map<string, Message>>>(new Map());

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Total number of messages across all sessions */
    const totalCount = computed(() => {
        let count = 0;
        for (const sessionMessages of messagesBySession.value.values()) {
            count += sessionMessages.size;
        }
        return count;
    });

    /** Number of sessions with messages */
    const sessionCount = computed(() => messagesBySession.value.size);

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all messages for a session, sorted by seq
     */
    function getMessagesForSession(sessionId: string): Message[] {
        const sessionMessages = messagesBySession.value.get(sessionId);
        if (!sessionMessages) return [];
        return Array.from(sessionMessages.values()).sort((a, b) => a.seq - b.seq);
    }

    /**
     * Get message count for a session
     */
    function getMessageCount(sessionId: string): number {
        return messagesBySession.value.get(sessionId)?.size ?? 0;
    }

    /**
     * Get a specific message
     */
    function getMessage(sessionId: string, messageId: string): Message | undefined {
        return messagesBySession.value.get(sessionId)?.get(messageId);
    }

    /**
     * Add or update a message
     */
    function addMessage(message: Message) {
        let sessionMessages = messagesBySession.value.get(message.sessionId);
        if (!sessionMessages) {
            sessionMessages = new Map();
            messagesBySession.value.set(message.sessionId, sessionMessages);
        }
        sessionMessages.set(message.id, message);
        triggerRef(messagesBySession);
    }

    /**
     * Add message from API event
     */
    function addFromApi(sessionId: string, apiMessage: ApiMessage) {
        const message = fromApiMessage(sessionId, apiMessage);
        addMessage(message);
    }

    /**
     * Bulk add messages for a session
     */
    function setMessagesForSession(sessionId: string, messages: Message[]) {
        const map = new Map<string, Message>();
        for (const message of messages) {
            map.set(message.id, message);
        }
        messagesBySession.value.set(sessionId, map);
        triggerRef(messagesBySession);
    }

    /**
     * Remove a specific message
     */
    function removeMessage(sessionId: string, messageId: string) {
        const sessionMessages = messagesBySession.value.get(sessionId);
        if (sessionMessages) {
            const deleted = sessionMessages.delete(messageId);
            if (deleted) {
                // Clean up empty session entry
                if (sessionMessages.size === 0) {
                    messagesBySession.value.delete(sessionId);
                }
                triggerRef(messagesBySession);
            }
        }
    }

    /**
     * Remove all messages for a session
     */
    function clearSessionMessages(sessionId: string) {
        const deleted = messagesBySession.value.delete(sessionId);
        if (deleted) {
            triggerRef(messagesBySession);
        }
    }

    /**
     * Clear all messages
     */
    function clearAllMessages() {
        messagesBySession.value = new Map();
        triggerRef(messagesBySession);
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        clearAllMessages();
    }

    return {
        // State
        messagesBySession,
        // Getters
        totalCount,
        sessionCount,
        // Actions
        getMessagesForSession,
        getMessageCount,
        getMessage,
        addMessage,
        addFromApi,
        setMessagesForSession,
        removeMessage,
        clearSessionMessages,
        clearAllMessages,
        $reset,
    };
});
