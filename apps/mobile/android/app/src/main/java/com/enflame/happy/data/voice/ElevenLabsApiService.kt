package com.enflame.happy.data.voice

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit interface for the ElevenLabs Text-to-Speech API.
 *
 * Provides access to the ElevenLabs TTS endpoint for generating
 * high-quality AI voice audio from text input.
 *
 * @see <a href="https://docs.elevenlabs.io/api-reference/text-to-speech">ElevenLabs API Docs</a>
 */
interface ElevenLabsApiService {

    /**
     * Convert text to speech audio using ElevenLabs.
     *
     * Returns raw audio data (MP3 format) as a [ResponseBody] for streaming playback.
     *
     * @param voiceId The ElevenLabs voice identifier.
     * @param apiKey The ElevenLabs API key (passed via `xi-api-key` header).
     * @param request The TTS request body containing text and voice settings.
     * @return A [Response] wrapping the raw audio bytes.
     */
    @POST("v1/text-to-speech/{voice_id}")
    suspend fun textToSpeech(
        @Path("voice_id") voiceId: String,
        @Header("xi-api-key") apiKey: String,
        @Header("Accept") accept: String = "audio/mpeg",
        @Body request: ElevenLabsTtsRequest
    ): Response<ResponseBody>
}

/**
 * Request body for ElevenLabs Text-to-Speech API.
 *
 * @property text The text to convert to speech.
 * @property modelId The ElevenLabs model to use (e.g., "eleven_monolingual_v1").
 * @property voiceSettings Voice configuration parameters.
 */
@Serializable
data class ElevenLabsTtsRequest(
    val text: String,
    @SerialName("model_id")
    val modelId: String,
    @SerialName("voice_settings")
    val voiceSettings: ElevenLabsVoiceSettingsDto
)

/**
 * Voice settings for ElevenLabs TTS API.
 *
 * @property stability Controls the stability of the voice (0.0 to 1.0).
 * @property similarityBoost Controls the similarity to the original voice (0.0 to 1.0).
 * @property style Controls the style/expressiveness (0.0 to 1.0).
 * @property useSpeakerBoost Whether to use speaker boost for clarity.
 */
@Serializable
data class ElevenLabsVoiceSettingsDto(
    val stability: Float = 0.5f,
    @SerialName("similarity_boost")
    val similarityBoost: Float = 0.75f,
    val style: Float = 0.0f,
    @SerialName("use_speaker_boost")
    val useSpeakerBoost: Boolean = true
)
