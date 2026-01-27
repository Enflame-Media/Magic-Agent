/**
 * Voice Service
 *
 * Core voice service implementation using ElevenLabs Conversational AI.
 * Manages WebRTC connections for real-time voice communication.
 *
 * Features:
 * - Text-to-speech via ElevenLabs
 * - WebRTC audio streaming
 * - Voice Activity Detection (VAD)
 * - Mute/unmute microphone control
 * - Client tools for session interaction
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
 * voiceService.setMicMuted(true); // Mute microphone
 *
 * await voiceService.endSession();
 * ```
 *
 * @see HAP-681 - Implement voice features across all platforms
 */

import { Conversation, type Mode, type DisconnectionDetails } from '@11labs/client';
import type { VoiceSession, VoiceSessionConfig, VoiceEventCallbacks, VoiceMode } from './types';
import { ELEVENLABS_CONFIG, VOICE_CONFIG, getElevenLabsLanguageCode } from './config';
import { voiceClientTools } from './clientTools';
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
 * Voice Activity Detection (VAD) polling interval in ms
 * Used to check input/output volume levels for UI feedback
 */
const VAD_POLLING_INTERVAL_MS = 100;

/**
 * Volume threshold for detecting voice activity (0-1 scale)
 * Values above this threshold indicate active speech
 */
const VAD_VOLUME_THRESHOLD = 0.1;

/**
 * Voice Service Implementation
 *
 * Implements the VoiceSession interface using ElevenLabs SDK.
 * Uses the Conversation class for framework-agnostic WebRTC communication.
 */
class VoiceServiceImpl implements VoiceSession {
    private _callbacks: VoiceEventCallbacks = {};
    private audioContext: AudioContext | null = null;
    private vadPollingInterval: ReturnType<typeof setInterval> | null = null;

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
            // Register client tools for voice assistant to interact with Claude Code
            clientTools: voiceClientTools,
            onConnect: ({ conversationId }) => {
                if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                    console.log('[Voice] Connected with conversation ID:', conversationId);
                }
                store.setConversationId(conversationId);

                // Start Voice Activity Detection polling
                this.startVadPolling();

                this._callbacks.onConnect?.();
            },
            onDisconnect: (details: DisconnectionDetails) => {
                if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                    console.log('[Voice] Disconnected:', details.reason);
                }

                // Stop VAD polling
                this.stopVadPolling();

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

        // Stop VAD polling first
        this.stopVadPolling();

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

    /**
     * Set microphone mute state
     *
     * When muted, the microphone input is disabled but the voice session
     * remains active and can still receive audio from the assistant.
     *
     * @param isMuted - Whether to mute the microphone
     */
    setMicMuted(isMuted: boolean): void {
        if (!conversationInstance) {
            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] No active session, cannot set mute state');
            }
            return;
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Setting mic muted:', isMuted);
        }

        conversationInstance.setMicMuted(isMuted);
    }

    /**
     * Get current input (microphone) volume level
     *
     * Returns a normalized value between 0 and 1 representing
     * the current microphone input volume.
     *
     * @returns Volume level (0-1), or 0 if no active session
     */
    getInputVolume(): number {
        if (!conversationInstance) {
            return 0;
        }
        return conversationInstance.getInputVolume();
    }

    /**
     * Get current output (speaker) volume level
     *
     * Returns a normalized value between 0 and 1 representing
     * the current audio output volume.
     *
     * @returns Volume level (0-1), or 0 if no active session
     */
    getOutputVolume(): number {
        if (!conversationInstance) {
            return 0;
        }
        return conversationInstance.getOutputVolume();
    }

    /**
     * Check if voice activity is detected on input (user speaking)
     *
     * Uses the input volume and compares against the VAD threshold
     * to determine if the user is currently speaking.
     *
     * @returns True if voice activity detected
     */
    isInputVoiceActive(): boolean {
        return this.getInputVolume() > VAD_VOLUME_THRESHOLD;
    }

    /**
     * Check if voice activity is detected on output (AI speaking)
     *
     * Uses the output volume and compares against the VAD threshold
     * to determine if the AI is currently speaking.
     *
     * @returns True if voice activity detected
     */
    isOutputVoiceActive(): boolean {
        return this.getOutputVolume() > VAD_VOLUME_THRESHOLD;
    }

    /**
     * Start Voice Activity Detection polling
     *
     * Periodically checks input/output volume levels and updates
     * the voice store with activity state for UI feedback.
     */
    private startVadPolling(): void {
        if (this.vadPollingInterval) {
            return; // Already polling
        }

        this.vadPollingInterval = setInterval(() => {
            if (!conversationInstance) {
                this.stopVadPolling();
                return;
            }

            // Get volume levels for potential UI updates
            const inputVolume = this.getInputVolume();
            const outputVolume = this.getOutputVolume();

            // Emit latency callback if registered (for debugging/monitoring)
            if (this._callbacks.onLatency && (inputVolume > 0 || outputVolume > 0)) {
                // Note: This is a simplified latency metric based on activity
                this._callbacks.onLatency({ latencyMs: VAD_POLLING_INTERVAL_MS });
            }
        }, VAD_POLLING_INTERVAL_MS);
    }

    /**
     * Stop Voice Activity Detection polling
     */
    private stopVadPolling(): void {
        if (this.vadPollingInterval) {
            clearInterval(this.vadPollingInterval);
            this.vadPollingInterval = null;
        }
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

/**
 * Set microphone mute state
 *
 * @param isMuted - Whether to mute the microphone
 */
export function setMicMuted(isMuted: boolean): void {
    voiceService.setMicMuted(isMuted);
}

/**
 * Get current input volume level (0-1)
 */
export function getInputVolume(): number {
    return voiceService.getInputVolume();
}

/**
 * Get current output volume level (0-1)
 */
export function getOutputVolume(): number {
    return voiceService.getOutputVolume();
}

/**
 * Check if voice activity is detected on input (user speaking)
 */
export function isInputVoiceActive(): boolean {
    return voiceService.isInputVoiceActive();
}

/**
 * Check if voice activity is detected on output (AI speaking)
 */
export function isOutputVoiceActive(): boolean {
    return voiceService.isOutputVoiceActive();
}
