/**
 * Voice Client Tools
 *
 * Static client tools for the realtime voice interface.
 * These tools allow the voice assistant to interact with Claude Code sessions.
 *
 * The voice assistant can use these tools to:
 * - Send messages to Claude Code
 * - Process permission requests (allow/deny)
 */

import { z } from 'zod';
import { useVoiceStore } from '@/stores/voice';
import { useSessionsStore } from '@/stores/sessions';
import { VOICE_CONFIG } from './config';

/**
 * Message schema for validation
 */
const messageSchema = z.object({
    message: z.string().min(1, 'Message cannot be empty'),
});

/**
 * Permission decision schema for validation
 */
const permissionSchema = z.object({
    decision: z.enum(['allow', 'deny']),
});

/**
 * Client tools available to the voice assistant
 */
export const voiceClientTools = {
    /**
     * Send a message to Claude Code
     *
     * The voice assistant calls this when the user wants to
     * send a message to the active Claude Code session.
     */
    messageClaudeCode: async (parameters: unknown): Promise<string> => {
        const parsed = messageSchema.safeParse(parameters);

        if (!parsed.success) {
            console.error('[Voice] Invalid message parameter:', parsed.error);
            return 'error (invalid message parameter)';
        }

        const message = parsed.data.message;
        const voiceStore = useVoiceStore();
        const sessionId = voiceStore.activeSessionId;

        if (!sessionId) {
            console.error('[Voice] No active session');
            return 'error (no active session)';
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] messageClaudeCode called with:', message);
            console.log('[Voice] Sending message to session:', sessionId);
        }

        // TODO: Integrate with sync service when available
        // sync.sendMessage(sessionId, message);

        return "sent [DO NOT say anything else, simply say 'sent']";
    },

    /**
     * Process a permission request from Claude Code
     *
     * The voice assistant calls this when the user wants to
     * allow or deny a pending permission request.
     */
    processPermissionRequest: async (parameters: unknown): Promise<string> => {
        const parsed = permissionSchema.safeParse(parameters);

        if (!parsed.success) {
            console.error('[Voice] Invalid decision parameter:', parsed.error);
            return "error (invalid decision parameter, expected 'allow' or 'deny')";
        }

        const decision = parsed.data.decision;
        const voiceStore = useVoiceStore();
        const sessionsStore = useSessionsStore();
        const sessionId = voiceStore.activeSessionId;

        if (!sessionId) {
            console.error('[Voice] No active session');
            return 'error (no active session)';
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] processPermissionRequest called with:', decision);
        }

        // Get the current session to check for permission requests
        const session = sessionsStore.sessions.get(sessionId);

        // Note: agentState is encrypted in the store, would need decryption
        // For now, we check if session exists
        if (!session) {
            console.error('[Voice] Session not found');
            return 'error (session not found)';
        }

        // Simplified - real implementation would decrypt and parse agentState
        const requestId = 'pending-request';

        try {
            // TODO: Integrate with session operations when available
            // if (decision === 'allow') {
            //     await sessionAllow(sessionId, requestId);
            // } else {
            //     await sessionDeny(sessionId, requestId);
            // }

            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log(`[Voice] Would ${decision} permission request:`, requestId);
            }

            return "done [DO NOT say anything else, simply say 'done']";
        } catch (error) {
            console.error('[Voice] Failed to process permission:', error);
            return `error (failed to ${decision} permission)`;
        }
    },
};
