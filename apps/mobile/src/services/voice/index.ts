/**
 * Voice Services Module for NativeScript
 *
 * Exports voice functionality for the mobile application.
 *
 * @example
 * ```typescript
 * import {
 *   voiceService,
 *   startVoiceSession,
 *   endVoiceSession,
 *   isVoiceSessionActive,
 * } from '@/services/voice';
 *
 * // Start a voice session
 * await startVoiceSession('session-123', 'Initial context');
 *
 * // Check state
 * const state = voiceService.getState();
 * console.log(state.status);
 * ```
 */

// Types
export type {
    VoiceSession,
    VoiceSessionConfig,
    VoiceStatus,
    VoiceMode,
    VoiceState,
} from './types';

// Configuration
export { VOICE_CONFIG, ELEVENLABS_CONFIG, getElevenLabsLanguageCode } from './config';

// Core service
export {
    voiceService,
    startVoiceSession,
    endVoiceSession,
    isVoiceSessionActive,
    getVoiceState,
} from './VoiceService';
