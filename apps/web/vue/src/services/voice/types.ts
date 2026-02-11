/**
 * Voice Service Types
 *
 * TypeScript interfaces for the voice/realtime communication system.
 * These types define the contract for voice session management.
 */

/**
 * Configuration for starting a voice session
 */
export interface VoiceSessionConfig {
    /** The session ID to associate with the voice conversation */
    sessionId: string;
    /** Initial context to provide to the voice assistant */
    initialContext?: string;
    /** Authentication token (if required) */
    token?: string;
    /** ElevenLabs agent ID */
    agentId?: string;
}

/**
 * Voice session interface
 * Defines the contract for voice session implementations
 */
export interface VoiceSession {
    /** Start a new voice session */
    startSession(config: VoiceSessionConfig): Promise<void>;
    /** End the current voice session */
    endSession(): Promise<void>;
    /** Send a text message to the voice assistant */
    sendTextMessage(message: string): void;
    /** Send a contextual update (non-interrupting) */
    sendContextualUpdate(update: string): void;
}

/**
 * Voice connection status
 */
export type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * Voice conversation mode
 */
export type VoiceMode = 'speaking' | 'listening' | 'idle';

/**
 * Voice session state
 */
export interface VoiceState {
    /** Current connection status */
    status: VoiceStatus;
    /** Current conversation mode */
    mode: VoiceMode;
    /** Whether the microphone is muted */
    isMuted: boolean;
    /** Current conversation ID (from ElevenLabs) */
    conversationId: string | null;
    /** Error message if status is 'error' */
    error: string | null;
}

/**
 * ElevenLabs agent response event
 */
export interface AgentResponseEvent {
    text: string;
    isFinal: boolean;
}

/**
 * User transcript event
 */
export interface UserTranscriptEvent {
    text: string;
    isFinal: boolean;
}

/**
 * Latency measurement event
 */
export interface LatencyEvent {
    latencyMs: number;
}

/**
 * Voice event callbacks
 */
export interface VoiceEventCallbacks {
    onAgentResponse?: (event: AgentResponseEvent) => void;
    onUserTranscript?: (event: UserTranscriptEvent) => void;
    onLatency?: (event: LatencyEvent) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
    onModeChange?: (mode: VoiceMode) => void;
}
