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

// Note: When @elevenlabs/elevenlabs-js is installed, uncomment this import:
// import { Conversation } from '@elevenlabs/elevenlabs-js';
import type { VoiceSession, VoiceSessionConfig, VoiceEventCallbacks } from './types';
import { ELEVENLABS_CONFIG, VOICE_CONFIG, getElevenLabsLanguageCode } from './config';
import { useVoiceStore } from '@/stores/voice';

// Placeholder type until SDK is installed
type Conversation = unknown;

/**
 * Global conversation instance
 * Managed by the VoiceService singleton
 */
let conversationInstance: Conversation | null = null;

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
            stream.getTracks().forEach((track) => track.stop());
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

            // Note: The actual ElevenLabs SDK integration would go here.
            // For now, we're setting up the structure for when the SDK is installed.
            // The Conversation class from @elevenlabs/elevenlabs-js would be used.

            // Simulated connection for structure (replace with actual SDK call)
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
        _language: string
    ): Promise<void> {
        // Note: store would be used when SDK is integrated
        // const store = useVoiceStore();

        // In a real implementation, this would use the ElevenLabs Conversation class:
        //
        // conversationInstance = new Conversation({
        //     agentId,
        //     requiresAuth: !!config.token,
        //     audioInterface: new DefaultAudioInterface(),
        //     callbackAgentResponse: (text) => {
        //         this.callbacks.onAgentResponse?.({ text, isFinal: true });
        //     },
        //     callbackUserTranscript: (text) => {
        //         this.callbacks.onUserTranscript?.({ text, isFinal: true });
        //     },
        //     callbackLatencyMeasurement: (latencyMs) => {
        //         this.callbacks.onLatency?.({ latencyMs });
        //     }
        // });
        //
        // await conversationInstance.startSession({
        //     dynamicVariables: {
        //         sessionId: config.sessionId,
        //         initialConversationContext: config.initialContext ?? ''
        //     },
        //     overrides: {
        //         agent: { language }
        //     }
        // });

        // For now, simulate the connection structure
        // This will be replaced when the SDK is installed
        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Would connect to ElevenLabs with:', {
                agentId,
                sessionId: config.sessionId,
                language: _language,
                hasToken: !!config.token,
            });
        }

        // Store would track the conversation ID once connected
        // store.setConversationId(conversationInstance.getConversationId());
    }

    /**
     * End the current voice session
     */
    async endSession(): Promise<void> {
        const store = useVoiceStore();

        try {
            if (conversationInstance) {
                // await conversationInstance.endSession();
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

        // conversationInstance.sendUserMessage(message);
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

        // conversationInstance.sendContextualUpdate(update);
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
        // return conversationInstance?.getConversationId() ?? null;
        return null;
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
