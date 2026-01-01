/**
 * Voice Configuration for NativeScript
 *
 * Static configuration for the mobile voice assistant system.
 * Uses native audio APIs for playback on iOS and Android.
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
    ENABLE_DEBUG_LOGGING: __DEV__,
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
        return __DEV__ ? this.AGENT_ID_DEV : this.AGENT_ID_PROD;
    },

    /** ElevenLabs API base URL */
    API_BASE_URL: 'https://api.elevenlabs.io/v1',

    /** Default TTS model */
    TTS_MODEL: 'eleven_turbo_v2',

    /** Default voice ID (Rachel - conversational) */
    DEFAULT_VOICE_ID: 'EXAVITQu4vr4xnSDxMaL',
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

// NativeScript doesn't have __DEV__ by default, declare it
declare const __DEV__: boolean;
