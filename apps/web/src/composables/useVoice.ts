/**
 * useVoice Composable
 *
 * Vue composable for voice assistant functionality.
 * Provides a reactive interface to the voice service and store.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useVoice } from '@/composables/useVoice';
 *
 * const {
 *   isActive,
 *   isConnecting,
 *   isSpeaking,
 *   isListening,
 *   isMuted,
 *   statusMessage,
 *   startSession,
 *   endSession,
 *   toggleMute,
 * } = useVoice();
 *
 * async function handleVoiceToggle(sessionId: string) {
 *   if (isActive.value) {
 *     await endSession();
 *   } else {
 *     await startSession(sessionId);
 *   }
 * }
 * </script>
 *
 * <template>
 *   <button @click="handleVoiceToggle(sessionId)">
 *     {{ isActive ? 'End Voice' : 'Start Voice' }}
 *   </button>
 *   <span>{{ statusMessage }}</span>
 * </template>
 * ```
 */

import { computed, type ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { useVoiceStore } from '@/stores/voice';
import {
    startVoiceSession,
    endVoiceSession,
    voiceHooks,
} from '@/services/voice';

/**
 * Voice composable return type
 */
export interface UseVoiceReturn {
    // State (reactive refs)
    isActive: ComputedRef<boolean>;
    isConnecting: ComputedRef<boolean>;
    isSpeaking: ComputedRef<boolean>;
    isListening: ComputedRef<boolean>;
    isMuted: ComputedRef<boolean>;
    hasError: ComputedRef<boolean>;
    statusMessage: ComputedRef<string>;
    activeSessionId: ComputedRef<string | null>;
    voiceLanguage: ComputedRef<string>;

    // Actions
    startSession: (sessionId: string, initialContext?: string) => Promise<void>;
    endSession: () => Promise<void>;
    toggleMute: () => void;
    setMuted: (muted: boolean) => void;
    setVoiceLanguage: (language: string) => void;

    // Hooks for event integration
    hooks: typeof voiceHooks;
}

/**
 * Use voice assistant functionality
 */
export function useVoice(): UseVoiceReturn {
    const store = useVoiceStore();

    // Get reactive refs from store
    const {
        status,
        mode,
        isMuted,
        activeSessionId,
        error,
        voiceLanguage,
    } = storeToRefs(store);

    // Computed properties
    const isActive = computed(() => status.value === 'connected');
    const isConnecting = computed(() => status.value === 'connecting');
    const isSpeaking = computed(() => mode.value === 'speaking');
    const isListening = computed(() => mode.value === 'listening');
    const hasError = computed(() => status.value === 'error' && !!error.value);

    const statusMessage = computed((): string => {
        switch (status.value) {
            case 'disconnected':
                return 'Voice assistant offline';
            case 'connecting':
                return 'Connecting...';
            case 'connected':
                if (isMuted.value) return 'Muted';
                if (mode.value === 'speaking') return 'Speaking...';
                return 'Listening...';
            case 'error':
                return error.value ?? 'Connection error';
            default:
                return 'Unknown';
        }
    });

    /**
     * Start a voice session
     */
    async function startSession(sessionId: string, initialContext?: string): Promise<void> {
        // Get initial context from voice hooks
        const context = initialContext ?? voiceHooks.onVoiceStarted(sessionId);
        await startVoiceSession(sessionId, context);
    }

    /**
     * End the current voice session
     */
    async function endSession(): Promise<void> {
        voiceHooks.onVoiceStopped();
        await endVoiceSession();
    }

    /**
     * Toggle microphone mute state
     */
    function toggleMute(): void {
        store.toggleMute();
    }

    /**
     * Set microphone mute state
     */
    function setMuted(muted: boolean): void {
        store.setMuted(muted);
    }

    /**
     * Set voice language preference
     */
    function setVoiceLanguage(language: string): void {
        store.setVoiceLanguage(language);
    }

    return {
        // State
        isActive,
        isConnecting,
        isSpeaking,
        isListening,
        isMuted: computed(() => isMuted.value),
        hasError,
        statusMessage,
        activeSessionId: computed(() => activeSessionId.value),
        voiceLanguage: computed(() => voiceLanguage.value),

        // Actions
        startSession,
        endSession,
        toggleMute,
        setMuted,
        setVoiceLanguage,

        // Hooks
        hooks: voiceHooks,
    };
}
