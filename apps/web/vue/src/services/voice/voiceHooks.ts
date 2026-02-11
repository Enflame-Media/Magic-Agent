/**
 * Voice Hooks
 *
 * Centralized voice assistant hooks for multi-session context updates.
 * These hooks route app events to the voice assistant with formatted context updates.
 *
 * @example
 * ```typescript
 * import { voiceHooks } from '@/services/voice/voiceHooks';
 *
 * // When a session comes online
 * voiceHooks.onSessionOnline(sessionId, { summary: { text: 'Working on API' } });
 *
 * // When user focuses a session
 * voiceHooks.onSessionFocus(sessionId);
 *
 * // When new messages arrive
 * voiceHooks.onMessages(sessionId, messages);
 * ```
 */

import { voiceService, isVoiceSessionActive } from './VoiceService';
import { VOICE_CONFIG } from './config';
import {
    formatNewMessages,
    formatPermissionRequest,
    formatReadyEvent,
    formatSessionFocus,
    formatSessionFull,
    formatSessionOffline,
    formatSessionOnline,
} from './contextFormatters';
import { useSessionsStore } from '@/stores/sessions';
import { useMessagesStore } from '@/stores/messages';

/**
 * Session metadata for voice context
 */
interface SessionMetadata {
    summary?: { text?: string };
    path?: string;
    machineId?: string;
    [key: string]: unknown;
}

/**
 * Message structure for voice hooks
 */
interface Message {
    id: string;
    kind: 'agent-text' | 'user-text' | 'tool-call' | 'tool-result' | 'system';
    text?: string;
    createdAt: number;
    tool?: {
        name: string;
        description?: string;
        input?: unknown;
    };
}

/** Track which sessions have been reported to avoid duplicates */
const shownSessions = new Set<string>();

/** Track the last focused session to avoid duplicate focus events */
let lastFocusSession: string | null = null;

/**
 * Report a contextual update to the voice assistant
 * Contextual updates provide background information without interrupting
 */
function reportContextualUpdate(update: string | null | undefined): void {
    if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log('[Voice] Reporting contextual update:', update);
    }

    if (!update) return;

    if (!isVoiceSessionActive()) {
        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] No active session, skipping context update');
        }
        return;
    }

    voiceService.sendContextualUpdate(update);
}

/**
 * Report a text update to the voice assistant
 * Text updates may interrupt the current conversation
 */
function reportTextUpdate(update: string | null | undefined): void {
    if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
        console.log('[Voice] Reporting text update:', update);
    }

    if (!update) return;

    if (!isVoiceSessionActive()) {
        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] No active session, skipping text update');
        }
        return;
    }

    voiceService.sendTextMessage(update);
}

/**
 * Report session context if not already reported
 */
function reportSession(sessionId: string): void {
    if (shownSessions.has(sessionId)) return;
    shownSessions.add(sessionId);

    const sessionsStore = useSessionsStore();
    const messagesStore = useMessagesStore();

    const session = sessionsStore.sessions.get(sessionId);
    if (!session) return;

    const messages = messagesStore.getMessagesForSession(sessionId);

    // Convert store messages to voice message format
    const voiceMessages: Message[] = messages.map((msg) => ({
        id: msg.id,
        kind: 'agent-text' as const, // Simplified - real impl would parse content
        text: typeof msg.content === 'string' ? msg.content : undefined,
        createdAt: msg.createdAt,
    }));

    const contextUpdate = formatSessionFull(
        { id: session.id, metadata: undefined }, // Metadata is encrypted
        voiceMessages
    );

    reportContextualUpdate(contextUpdate);
}

/**
 * Voice hooks object
 * Provides methods for routing app events to the voice assistant
 */
export const voiceHooks = {
    /**
     * Called when a session comes online/connects
     */
    onSessionOnline(sessionId: string, metadata?: SessionMetadata): void {
        if (VOICE_CONFIG.DISABLE_SESSION_STATUS) return;

        reportSession(sessionId);
        const contextUpdate = formatSessionOnline(sessionId, metadata);
        reportContextualUpdate(contextUpdate);
    },

    /**
     * Called when a session goes offline/disconnects
     */
    onSessionOffline(sessionId: string, metadata?: SessionMetadata): void {
        if (VOICE_CONFIG.DISABLE_SESSION_STATUS) return;

        reportSession(sessionId);
        const contextUpdate = formatSessionOffline(sessionId, metadata);
        reportContextualUpdate(contextUpdate);
    },

    /**
     * Called when user navigates to/views a session
     */
    onSessionFocus(sessionId: string, metadata?: SessionMetadata): void {
        if (VOICE_CONFIG.DISABLE_SESSION_FOCUS) return;
        if (lastFocusSession === sessionId) return;

        lastFocusSession = sessionId;
        reportSession(sessionId);
        reportContextualUpdate(formatSessionFocus(sessionId, metadata));
    },

    /**
     * Called when Claude requests permission for a tool use
     */
    onPermissionRequested(
        sessionId: string,
        requestId: string,
        toolName: string,
        toolArgs: unknown
    ): void {
        if (VOICE_CONFIG.DISABLE_PERMISSION_REQUESTS) return;

        reportSession(sessionId);
        reportTextUpdate(formatPermissionRequest(sessionId, requestId, toolName, toolArgs));
    },

    /**
     * Called when agent sends a message/response
     */
    onMessages(sessionId: string, messages: Message[]): void {
        if (VOICE_CONFIG.DISABLE_MESSAGES) return;

        reportSession(sessionId);
        reportContextualUpdate(formatNewMessages(sessionId, messages));
    },

    /**
     * Called when voice session starts
     * Returns the initial context for the voice assistant
     */
    onVoiceStarted(sessionId: string): string {
        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Voice session started for:', sessionId);
        }

        shownSessions.clear();

        const messagesStore = useMessagesStore();
        const messages = messagesStore.getMessagesForSession(sessionId);

        // Convert store messages to voice message format
        const voiceMessages: Message[] = messages.map((msg) => ({
            id: msg.id,
            kind: 'agent-text' as const,
            text: typeof msg.content === 'string' ? msg.content : undefined,
            createdAt: msg.createdAt,
        }));

        let prompt = '';
        prompt +=
            'THIS IS AN ACTIVE SESSION: \n\n' +
            formatSessionFull(
                { id: sessionId, metadata: undefined },
                voiceMessages
            );

        shownSessions.add(sessionId);

        return prompt;
    },

    /**
     * Called when Claude Code finishes processing (ready event)
     */
    onReady(sessionId: string): void {
        if (VOICE_CONFIG.DISABLE_READY_EVENTS) return;

        reportSession(sessionId);
        reportTextUpdate(formatReadyEvent(sessionId));
    },

    /**
     * Called when voice session stops
     */
    onVoiceStopped(): void {
        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Voice session stopped');
        }

        shownSessions.clear();
        lastFocusSession = null;
    },
};
