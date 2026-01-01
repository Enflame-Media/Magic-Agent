/**
 * Voice Services Module
 *
 * Exports all voice-related functionality for the application.
 *
 * @example
 * ```typescript
 * import {
 *   voiceService,
 *   startVoiceSession,
 *   endVoiceSession,
 *   voiceHooks,
 *   useVoiceStore
 * } from '@/services/voice';
 *
 * // Start a voice session
 * await startVoiceSession('session-123', 'Initial context');
 *
 * // Use hooks to report events
 * voiceHooks.onSessionFocus('session-123');
 *
 * // Access voice state
 * const store = useVoiceStore();
 * console.log(store.isActive);
 * ```
 */

// Types
export type {
    VoiceSession,
    VoiceSessionConfig,
    VoiceStatus,
    VoiceMode,
    VoiceState,
    VoiceEventCallbacks,
    AgentResponseEvent,
    UserTranscriptEvent,
    LatencyEvent,
} from './types';

// Configuration
export { VOICE_CONFIG, ELEVENLABS_CONFIG, getElevenLabsLanguageCode } from './config';

// Core service
export {
    voiceService,
    startVoiceSession,
    endVoiceSession,
    isVoiceSessionActive,
} from './VoiceService';

// Voice hooks for event routing
export { voiceHooks } from './voiceHooks';

// Client tools for voice assistant
export { voiceClientTools } from './clientTools';

// Context formatters
export {
    formatMessage,
    formatNewMessages,
    formatNewSingleMessage,
    formatHistory,
    formatSessionFull,
    formatSessionOnline,
    formatSessionOffline,
    formatSessionFocus,
    formatReadyEvent,
    formatPermissionRequest,
} from './contextFormatters';
