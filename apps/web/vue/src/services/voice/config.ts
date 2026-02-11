/**
 * Voice Configuration
 *
 * Static configuration for the voice assistant system.
 * Controls what information is sent to the voice context.
 */

/**
 * Voice context configuration
 * Controls what types of updates are forwarded to the voice assistant
 */
export const VOICE_CONFIG = {
    /** Disable all tool call information from being sent to voice context */
    DISABLE_TOOL_CALLS: false,

    /** Send only tool names and descriptions, exclude arguments */
    LIMITED_TOOL_CALLS: true,

    /** Disable permission request forwarding */
    DISABLE_PERMISSION_REQUESTS: false,

    /** Disable session online/offline notifications */
    DISABLE_SESSION_STATUS: true,

    /** Disable message forwarding */
    DISABLE_MESSAGES: false,

    /** Disable session focus notifications */
    DISABLE_SESSION_FOCUS: false,

    /** Disable ready event notifications */
    DISABLE_READY_EVENTS: false,

    /** Maximum number of messages to include in session history */
    MAX_HISTORY_MESSAGES: 50,

    /** Enable debug logging for voice context updates */
    ENABLE_DEBUG_LOGGING: import.meta.env.DEV,
} as const;

/**
 * ElevenLabs agent configuration
 */
export const ELEVENLABS_CONFIG = {
    /** Development agent ID */
    AGENT_ID_DEV: 'agent_7801k2c0r5hjfraa1kdbytpvs6yt',

    /** Production agent ID */
    AGENT_ID_PROD: 'agent_6701k211syvvegba4kt7m68nxjmw',

    /** Get the appropriate agent ID based on environment */
    get agentId(): string {
        return import.meta.env.DEV ? this.AGENT_ID_DEV : this.AGENT_ID_PROD;
    },

    /** Default TTS model */
    TTS_MODEL: 'eleven_turbo_v2',

    /** Connection type for conversations */
    CONNECTION_TYPE: 'webrtc' as const,
} as const;

/**
 * Supported voice languages
 * Maps user preference codes to ElevenLabs language codes
 */
export const VOICE_LANGUAGES: Record<string, string> = {
    en: 'en',
    es: 'es',
    ru: 'ru',
    pl: 'pl',
    pt: 'pt',
    ca: 'ca',
    'zh-Hans': 'zh',
};

/**
 * Get ElevenLabs language code from user preference
 */
export function getElevenLabsLanguageCode(preference: string): string {
    return VOICE_LANGUAGES[preference] ?? 'en';
}
