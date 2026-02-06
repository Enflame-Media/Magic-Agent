package com.enflame.happy.domain.model

/**
 * Available text-to-speech providers.
 */
enum class VoiceProvider(val displayName: String, val description: String) {
    /**
     * Android's built-in TextToSpeech (always available, no API key needed).
     */
    SYSTEM(
        displayName = "System (Android)",
        description = "Built-in Android text-to-speech. No API key required."
    ),

    /**
     * ElevenLabs high-quality AI voices (requires API key).
     */
    ELEVEN_LABS(
        displayName = "ElevenLabs",
        description = "High-quality AI voices. Requires an ElevenLabs API key."
    )
}

/**
 * Represents the current state of voice playback.
 */
enum class VoicePlaybackState {
    /** No speech in progress. */
    IDLE,

    /** Speech is in progress. */
    SPEAKING,

    /** Speech is paused. */
    PAUSED,

    /** Loading audio from ElevenLabs API. */
    LOADING
}

/**
 * Configuration model for voice/text-to-speech settings.
 *
 * Stores user preferences for voice playback including the TTS provider,
 * voice selection, speed, and auto-play behavior. Persisted via DataStore.
 *
 * @property provider The TTS provider to use.
 * @property elevenLabsVoiceId The selected voice identifier for ElevenLabs.
 * @property elevenLabsVoiceName Display name of the selected ElevenLabs voice.
 * @property hasElevenLabsApiKey Whether an ElevenLabs API key is configured.
 * @property systemVoiceName The selected system voice name (null = device default).
 * @property speechRate Speech rate multiplier (0.5 = half speed, 1.0 = normal, 2.0 = double).
 * @property volume Volume level (0.0 to 1.0).
 * @property autoPlayAssistantMessages Whether to automatically read aloud new assistant messages.
 * @property skipToolOutputs Whether to skip reading tool use outputs.
 * @property elevenLabsModelId The ElevenLabs model to use for TTS.
 */
data class VoiceSettings(
    val provider: VoiceProvider = VoiceProvider.SYSTEM,
    val elevenLabsVoiceId: String = DEFAULT_ELEVEN_LABS_VOICE_ID,
    val elevenLabsVoiceName: String = DEFAULT_ELEVEN_LABS_VOICE_NAME,
    val hasElevenLabsApiKey: Boolean = false,
    val systemVoiceName: String? = null,
    val speechRate: Float = DEFAULT_SPEECH_RATE,
    val volume: Float = DEFAULT_VOLUME,
    val autoPlayAssistantMessages: Boolean = false,
    val skipToolOutputs: Boolean = true,
    val elevenLabsModelId: String = DEFAULT_ELEVEN_LABS_MODEL_ID
) {
    companion object {
        const val DEFAULT_ELEVEN_LABS_VOICE_ID = "21m00Tcm4TlvDq8ikWAM"
        const val DEFAULT_ELEVEN_LABS_VOICE_NAME = "Rachel"
        const val DEFAULT_ELEVEN_LABS_MODEL_ID = "eleven_monolingual_v1"
        const val DEFAULT_SPEECH_RATE = 1.0f
        const val DEFAULT_VOLUME = 1.0f
    }
}

/**
 * Pre-defined ElevenLabs voice options.
 *
 * @property id The ElevenLabs voice identifier.
 * @property name The display name of the voice.
 * @property description A brief description of the voice character.
 */
data class ElevenLabsVoice(
    val id: String,
    val name: String,
    val description: String
) {
    companion object {
        /**
         * Default voice options available in ElevenLabs.
         */
        val defaultVoices: List<ElevenLabsVoice> = listOf(
            ElevenLabsVoice(
                id = "21m00Tcm4TlvDq8ikWAM",
                name = "Rachel",
                description = "Calm, clear female voice"
            ),
            ElevenLabsVoice(
                id = "29vD33N1CtxCmqQRPOHJ",
                name = "Drew",
                description = "Warm, confident male voice"
            ),
            ElevenLabsVoice(
                id = "EXAVITQu4vr4xnSDxMaL",
                name = "Bella",
                description = "Soft, friendly female voice"
            ),
            ElevenLabsVoice(
                id = "ErXwobaYiN019PkySvjV",
                name = "Antoni",
                description = "Articulate, expressive male voice"
            ),
            ElevenLabsVoice(
                id = "MF3mGyEYCl7XYWbV9V6O",
                name = "Elli",
                description = "Youthful, energetic female voice"
            ),
            ElevenLabsVoice(
                id = "TxGEqnHWrfWFTfGW9XjX",
                name = "Josh",
                description = "Deep, resonant male voice"
            )
        )
    }
}

/**
 * Errors that can occur during voice operations.
 */
sealed class VoiceServiceError(val message: String) {
    /** ElevenLabs API key is not configured. */
    data object ApiKeyMissing : VoiceServiceError(
        "ElevenLabs API key is not configured. Please add it in Voice Settings."
    )

    /** Network request to ElevenLabs failed. */
    data class NetworkError(val detail: String) : VoiceServiceError(
        "Network error: $detail"
    )

    /** ElevenLabs API returned an error. */
    data class ApiError(val statusCode: Int, val detail: String) : VoiceServiceError(
        "ElevenLabs API error ($statusCode): $detail"
    )

    /** Failed to decode audio data. */
    data object AudioDecodingFailed : VoiceServiceError(
        "Failed to decode audio data from ElevenLabs."
    )

    /** Audio focus request failed. */
    data class AudioFocusError(val detail: String) : VoiceServiceError(
        "Audio focus error: $detail"
    )

    /** The selected voice is not available. */
    data class VoiceNotAvailable(val name: String) : VoiceServiceError(
        "Voice '$name' is not available on this device."
    )

    /** Speech synthesis failed. */
    data class SynthesisFailed(val detail: String) : VoiceServiceError(
        "Speech synthesis failed: $detail"
    )
}
