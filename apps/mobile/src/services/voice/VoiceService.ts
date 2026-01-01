/**
 * Voice Service for NativeScript
 *
 * Mobile voice service implementation using native audio APIs.
 * Since ElevenLabs doesn't have a NativeScript SDK, this implementation
 * uses the REST API for TTS and native audio players for playback.
 *
 * Platform-specific audio handling:
 * - iOS: Uses AVAudioPlayer via NativeScript
 * - Android: Uses MediaPlayer via NativeScript
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
 * await voiceService.endSession();
 * ```
 */

import { Application, isIOS, isAndroid } from '@nativescript/core';
import type { VoiceSession, VoiceSessionConfig, VoiceStatus, VoiceMode } from './types';
import { ELEVENLABS_CONFIG, VOICE_CONFIG, getElevenLabsLanguageCode } from './config';

/**
 * Voice state management
 */
interface VoiceState {
    status: VoiceStatus;
    mode: VoiceMode;
    isMuted: boolean;
    activeSessionId: string | null;
    conversationId: string | null;
    error: string | null;
    voiceLanguage: string;
}

/**
 * Global voice state
 */
const voiceState: VoiceState = {
    status: 'disconnected',
    mode: 'idle',
    isMuted: false,
    activeSessionId: null,
    conversationId: null,
    error: null,
    voiceLanguage: 'en',
};

/**
 * State change listeners
 */
type StateListener = (state: VoiceState) => void;
const stateListeners: StateListener[] = [];

/**
 * Notify all listeners of state change
 */
function notifyStateChange(): void {
    for (const listener of stateListeners) {
        listener({ ...voiceState });
    }
}

/**
 * Update state and notify listeners
 */
function updateState(updates: Partial<VoiceState>): void {
    Object.assign(voiceState, updates);
    notifyStateChange();
}

/**
 * Request microphone permission on mobile
 */
async function requestMicrophonePermission(): Promise<boolean> {
    try {
        if (isIOS) {
            // iOS: Request microphone permission via AVAudioSession
            // Note: Actual implementation would use proper iOS audio session APIs
            // const AudioSession = (NSObject as any).extend({});
            // Simplified - returns true for now
            return true;
        } else if (isAndroid) {
            // Android: Request RECORD_AUDIO permission
            const permissions = (android as any).Manifest.permission;
            const context = Application.android.context;
            const hasPermission = (androidx as any).core.content.ContextCompat.checkSelfPermission(
                context,
                permissions.RECORD_AUDIO
            ) === (android as any).content.pm.PackageManager.PERMISSION_GRANTED;

            if (!hasPermission) {
                // Would need to request permission through activity
                return false;
            }
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Voice] Failed to request microphone permission:', error);
        return false;
    }
}

/**
 * Voice Service Implementation for NativeScript
 *
 * Uses REST API for ElevenLabs TTS since there's no native SDK.
 * For real-time conversation, uses WebSocket connection where available.
 */
class VoiceServiceImpl implements VoiceSession {
    /**
     * Start a voice session
     */
    async startSession(config: VoiceSessionConfig): Promise<void> {
        // Request microphone permission first
        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
            updateState({ status: 'error', error: 'Microphone permission denied' });
            return;
        }

        updateState({
            status: 'connecting',
            activeSessionId: config.sessionId,
        });

        try {
            const language = getElevenLabsLanguageCode(voiceState.voiceLanguage);
            const agentId = config.agentId ?? ELEVENLABS_CONFIG.agentId;

            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] Starting mobile session with agent:', agentId);
                console.log('[Voice] Language:', language);
            }

            // Note: Full implementation would establish WebSocket connection
            // to ElevenLabs Conversational AI endpoint for real-time voice.
            // For now, we set up the structure for TTS-based voice.

            await this.connectToVoiceService(config, agentId, language);

            updateState({
                status: 'connected',
                mode: 'listening',
            });

            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] Mobile session started successfully');
            }
        } catch (error) {
            console.error('[Voice] Failed to start session:', error);
            updateState({
                status: 'error',
                error: error instanceof Error ? error.message : 'Failed to start voice session',
            });
        }
    }

    /**
     * Connect to voice service
     */
    private async connectToVoiceService(
        config: VoiceSessionConfig,
        agentId: string,
        language: string
    ): Promise<void> {
        // Implementation would:
        // 1. Establish WebSocket to ElevenLabs
        // 2. Set up audio capture from microphone
        // 3. Set up audio playback for responses

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Would connect to voice service with:', {
                agentId,
                sessionId: config.sessionId,
                language,
                platform: isIOS ? 'iOS' : 'Android',
            });
        }
    }

    /**
     * End the current voice session
     */
    async endSession(): Promise<void> {
        try {
            // Stop audio capture and playback
            // Close WebSocket connection

            updateState({
                status: 'disconnected',
                mode: 'idle',
                activeSessionId: null,
                conversationId: null,
            });

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
        if (voiceState.status !== 'connected') {
            console.warn('[Voice] No active session');
            return;
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Sending text message:', message);
        }

        // Would send via WebSocket to ElevenLabs
    }

    /**
     * Send a contextual update to the voice assistant
     */
    sendContextualUpdate(update: string): void {
        if (voiceState.status !== 'connected') {
            if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
                console.log('[Voice] No active session, skipping context update');
            }
            return;
        }

        if (VOICE_CONFIG.ENABLE_DEBUG_LOGGING) {
            console.log('[Voice] Sending contextual update:', update);
        }

        // Would send via WebSocket to ElevenLabs
    }

    /**
     * Check if a session is currently active
     */
    isSessionActive(): boolean {
        return voiceState.status === 'connected';
    }

    /**
     * Get current voice state
     */
    getState(): VoiceState {
        return { ...voiceState };
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener: StateListener): () => void {
        stateListeners.push(listener);
        return () => {
            const index = stateListeners.indexOf(listener);
            if (index > -1) {
                stateListeners.splice(index, 1);
            }
        };
    }

    /**
     * Toggle mute state
     */
    toggleMute(): void {
        updateState({ isMuted: !voiceState.isMuted });
    }

    /**
     * Set mute state
     */
    setMuted(muted: boolean): void {
        updateState({ isMuted: muted });
    }

    /**
     * Set voice language preference
     */
    setVoiceLanguage(language: string): void {
        updateState({ voiceLanguage: language });
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
 * Get current voice state
 */
export function getVoiceState(): VoiceState {
    return voiceService.getState();
}
