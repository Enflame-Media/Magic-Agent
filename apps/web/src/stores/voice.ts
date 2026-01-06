/**
 * Voice Store
 *
 * Manages voice assistant state using Pinia.
 * Tracks connection status, mode, and conversation state.
 *
 * @example
 * ```typescript
 * const voice = useVoiceStore();
 * voice.setStatus('connecting');
 * // ... connection established
 * voice.setStatus('connected');
 * voice.setMode('listening');
 * ```
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type { VoiceStatus, VoiceMode } from '@/services/voice/types';

/** LocalStorage key for voice language preference */
const VOICE_LANGUAGE_STORAGE_KEY = 'happy_voice_language';

/**
 * Load voice language from localStorage
 */
function loadVoiceLanguage(): string {
    if (typeof window === 'undefined') return 'en';
    try {
        const stored = localStorage.getItem(VOICE_LANGUAGE_STORAGE_KEY);
        if (stored && typeof stored === 'string') {
            return stored;
        }
    } catch {
        // localStorage not available
    }
    return 'en';
}

/**
 * Save voice language to localStorage
 */
function saveVoiceLanguage(language: string): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(VOICE_LANGUAGE_STORAGE_KEY, language);
    } catch {
        // localStorage not available
    }
}

export const useVoiceStore = defineStore('voice', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /** Current connection status */
    const status = ref<VoiceStatus>('disconnected');

    /** Current conversation mode */
    const mode = ref<VoiceMode>('idle');

    /** Whether the microphone is muted */
    const isMuted = ref(false);

    /** Current conversation ID (from ElevenLabs) */
    const conversationId = ref<string | null>(null);

    /** Active session ID for the voice conversation */
    const activeSessionId = ref<string | null>(null);

    /** Error message if status is 'error' */
    const error = ref<string | null>(null);

    /** User's preferred voice language (persisted to localStorage) */
    const voiceLanguage = ref<string>(loadVoiceLanguage());

    // Persist voice language changes to localStorage
    watch(voiceLanguage, (newLanguage) => {
        saveVoiceLanguage(newLanguage);
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether voice session is active */
    const isActive = computed(() => status.value === 'connected');

    /** Whether currently connecting */
    const isConnecting = computed(() => status.value === 'connecting');

    /** Whether there's an error */
    const hasError = computed(() => status.value === 'error' && !!error.value);

    /** Whether the assistant is speaking */
    const isSpeaking = computed(() => mode.value === 'speaking');

    /** Whether the assistant is listening */
    const isListening = computed(() => mode.value === 'listening');

    /** Human-readable status message */
    const statusMessage = computed((): string => {
        switch (status.value) {
            case 'disconnected':
                return 'Voice assistant offline';
            case 'connecting':
                return 'Connecting to voice assistant...';
            case 'connected':
                return isMuted.value ? 'Muted' : (mode.value === 'speaking' ? 'Speaking...' : 'Listening...');
            case 'error':
                return error.value ?? 'Voice connection error';
            default:
                return 'Unknown';
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Update connection status
     */
    function setStatus(newStatus: VoiceStatus) {
        status.value = newStatus;

        if (newStatus === 'connected') {
            error.value = null;
        } else if (newStatus === 'disconnected') {
            error.value = null;
            mode.value = 'idle';
            conversationId.value = null;
            activeSessionId.value = null;
        }
    }

    /**
     * Update conversation mode
     */
    function setMode(newMode: VoiceMode) {
        mode.value = newMode;
    }

    /**
     * Set error state
     */
    function setError(message: string) {
        status.value = 'error';
        error.value = message;
    }

    /**
     * Set conversation ID
     */
    function setConversationId(id: string | null) {
        conversationId.value = id;
    }

    /**
     * Set active session ID
     */
    function setActiveSessionId(id: string | null) {
        activeSessionId.value = id;
    }

    /**
     * Toggle mute state
     */
    function toggleMute() {
        isMuted.value = !isMuted.value;
    }

    /**
     * Set mute state
     */
    function setMuted(muted: boolean) {
        isMuted.value = muted;
    }

    /**
     * Set voice language preference
     */
    function setVoiceLanguage(language: string) {
        voiceLanguage.value = language;
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        status.value = 'disconnected';
        mode.value = 'idle';
        isMuted.value = false;
        conversationId.value = null;
        activeSessionId.value = null;
        error.value = null;
    }

    return {
        // State
        status,
        mode,
        isMuted,
        conversationId,
        activeSessionId,
        error,
        voiceLanguage,
        // Getters
        isActive,
        isConnecting,
        hasError,
        isSpeaking,
        isListening,
        statusMessage,
        // Actions
        setStatus,
        setMode,
        setError,
        setConversationId,
        setActiveSessionId,
        toggleMute,
        setMuted,
        setVoiceLanguage,
        $reset,
    };
});
