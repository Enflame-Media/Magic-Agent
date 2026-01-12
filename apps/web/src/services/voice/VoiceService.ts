/**
 * Voice Service
 *
 * Core voice service implementation using ElevenLabs Conversational AI.
 * Manages WebRTC connections for real-time voice communication.
 *
 * @example
 * ```typescript
 * import { voiceService } from '@/services/voice';
 *
 * await voiceService.startSession({
 *   sessionId: 'session-123',
 *   initialContext: 'User is viewing a coding session'
 * });
 *
 * voiceService.sendContextualUpdate('User clicked on file.ts');
 *
 * await voiceService.endSession();
 * ```
 */

import { Conversation, type Mode, type DisconnectionDetails } from '@11labs/client';
import type { VoiceSession, VoiceSessionConfig, VoiceEventCallbacks, VoiceMode } from './types';
import { ELEVENLABS_CONFIG, VOICE_CONFIG, getElevenLabsLanguageCode } from './config';
import { useVoiceStore } from '@/stores/voice';

/**
 * Global conversation instance
 * Managed by the VoiceService singleton
 */
let conversationInstance: Conversation | null = null;

/**
 * Convert SDK mode to our VoiceMode type
 */
function convertMode(sdkMode: Mode): VoiceMode {
    return sdkMode === 'speaking' ? 'speaking' : 'listening';
}

/**
 * Voice Service Implementation
 *
 * Implements the VoiceSession interface using ElevenLabs SDK.
 * Uses the Conversation class for framework-agnostic WebRTC communication.
 */
class VoiceServiceImpl implements VoiceSession {
    private _callbacks: VoiceEventCallbacks = {};
    private audioContext: AudioContext | null = null;

    /**
     * Request microphone permission
     */
    private async requestMicrophonePermission(): Promise<boolean> {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            // Stop all tracks after permission check
            stream.getTracks().forEach((track) => { track.stop(); });
            return true;
        } catch (error) {
            console.error('Microphone permission denied:', error);
            return false;
        }
    }

    /**
     * Initialize audio context (required for web audio)
     */
    private initAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new AudioContext();
        }
        return this.audioContext;
    }

    /**
     * Start a voice session
     */
    async startSession(config: VoiceSessionConfig): Promise<void> {
        const store = useVoiceStore();

        // Request microphone permission first
        const hasPermission = await this.requestMicrophonePermission();
        if (!hasPermission) {
            store.setError('Microphone permission denied');
            return;
        }

        store.setStatus('connecting');
        store.setActiveSessionId(config.sessionId);

        try {
            // Initialize audio context
            this.initAudioContext();

            // Get language preference from store
            const language = getElevenLabsLanguageCode(store.voiceLanguage);

            // Determine agent ID
            const agentId = config.agentId ?? ELEVENLABS_CONFIG.agentId;

            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] Starting session with agent:', agentId);
                console.log('[Voice] Language:', language);
            }

            // Connect to ElevenLabs Conversational AI via WebRTC
            await this.connectToElevenLabs(config, agentId, language);

            store.setStatus('connected');
            store.setMode('listening');

            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] Session started successfully');
            }
        } catch (error) {
            console.error('[Voice] Failed to start session:', error);
            store.setError(error instanceof Error ? error.message : 'Failed to start voice session');
        }
    }

    /**
     * Connect to ElevenLabs Conversational AI
     * This method handles the actual WebRTC connection setup
     */
    private async connectToElevenLabs(
        config: VoiceSessionConfig,
        agentId: string,
        language: string
    ): Promise<void> {
        const store = useVoiceStore();

        conversationInstance = await Conversation.startSession({
            agentId,
            connectionType: ELEVENLABS_CONFIG.CONNECTION_TYPE,
            dynamicVariables: {
                sessionId: config.sessionId,
                initialConversationContext: config.initialContext ?? '',
            },
            overrides: {
                agent: {
                    language: language as 'en' | 'es' | 'ru' | 'pl' | 'pt' | 'zh',
                },
            },
            onConnect: ({ conversationId }) => {
                if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                    console.log('[Voice] Connected with conversation ID:', conversationId);
                }
                store.setConversationId(conversationId);
                this._callbacks.onConnect?.();
            },
            onDisconnect: (details: DisconnectionDetails) => {
                if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                    console.log('[Voice] Disconnected:', details.reason);
                }
                store.setStatus('disconnected');
                this._callbacks.onDisconnect?.();
            },
            onError: (message: string, context?: unknown) => {
                console.error('[Voice] Error:', message, context);
                store.setError(message);
                this._callbacks.onError?.(new Error(message));
            },
            onModeChange: ({ mode }) => {
                const voiceMode = convertMode(mode);
                if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                    console.log('[Voice] Mode changed to:', voiceMode);
                }
                store.setMode(voiceMode);
                this._callbacks.onModeChange?.(voiceMode);
            },
            onMessage: ({ message, source }) => {
                if (source === 'ai') {
                    this._callbacks.onAgentResponse?.({ text: message, isFinal: true });
                } else {
                    this._callbacks.onUserTranscript?.({ text: message, isFinal: true });
                }
            },
        });

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Session started with ID:', conversationInstance.getId());
        }
    }

    /**
     * End the current voice session
     */
    async endSession(): Promise<void> {
        const store = useVoiceStore();

        try {
            if (conversationInstance) {
                await conversationInstance.endSession();
                conversationInstance = null;
            }

            store.setStatus('disconnected');

            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] Session ended');
            }
        } catch (error) {
            console.error('[Voice] Failed to end session:', error);
        }
    }

    /**
     * Send a text message to the voice assistant
     */
    sendTextMessage(message: string): void {
        if (!conversationInstance) {
            console.warn('[Voice] No active session');
            return;
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Sending text message:', message);
        }

        conversationInstance.sendUserMessage(message);
    }

    /**
     * Send a contextual update to the voice assistant
     * Contextual updates provide background information without interrupting
     */
    sendContextualUpdate(update: string): void {
        if (!conversationInstance) {
            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] No active session, skipping context update');
            }
            return;
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Sending contextual update:', update);
        }

        conversationInstance.sendContextualUpdate(update);
    }

    /**
     * Register event callbacks
     */
    setCallbacks(callbacks: VoiceEventCallbacks): void {
        this._callbacks = callbacks;
    }

    /**
     * Get current callbacks
     */
    getCallbacks(): VoiceEventCallbacks {
        return this._callbacks;
    }

    /**
     * Check if a session is currently active
     */
    isSessionActive(): boolean {
        return conversationInstance !== null;
    }

    /**
     * Get the current conversation ID
     */
    getConversationId(): string | null {
        return conversationInstance?.getId() ?? null;
    }
}

/**
 * Singleton voice service instance
 */
export const voiceService = new VoiceServiceImpl();

/**
 * Start a voice session for a given session ID
 */
export async function startVoiceSession(
    sessionId: string,
    initialContext?: string
): Promise<void> {
    await voiceService.startSession({ sessionId, initialContext });
}

/**
 * End the current voice session
 */
export async function endVoiceSession(): Promise<void> {
    await voiceService.endSession();
}

/**
 * Check if voice session is active
 */
export function isVoiceSessionActive(): boolean {
    return voiceService.isSessionActive();
}
