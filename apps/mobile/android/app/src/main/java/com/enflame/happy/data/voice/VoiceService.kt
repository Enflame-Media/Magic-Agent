package com.enflame.happy.data.voice

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.domain.model.VoicePlaybackState
import com.enflame.happy.domain.model.VoiceServiceError
import com.enflame.happy.domain.model.VoiceSettings
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Service for text-to-speech using either ElevenLabs or Android's built-in TextToSpeech.
 *
 * This service provides a unified interface for TTS that abstracts the underlying
 * provider. It uses Android's [TextToSpeech] as a built-in fallback when ElevenLabs
 * is not configured or unavailable.
 *
 * ## Architecture
 * - Android [TextToSpeech] for system TTS (always available)
 * - ElevenLabs REST API for high-quality AI voices (requires API key)
 * - [MediaPlayer] for ElevenLabs audio playback with background audio support
 * - Kotlin [StateFlow]/[SharedFlow] for reactive state updates
 *
 * ## Usage
 * ```kotlin
 * val service = voiceService // injected via Hilt
 * service.updateSettings(settings)
 * service.speak("Hello from Claude Code!")
 * ```
 */
@Singleton
class VoiceService @Inject constructor(
    @ApplicationContext private val context: Context,
    private val elevenLabsApiService: ElevenLabsApiService,
    private val tokenStorage: TokenStorage
) {

    // --- State ---

    private val _playbackState = MutableStateFlow(VoicePlaybackState.IDLE)

    /** Current playback state as a reactive flow. */
    val playbackState: StateFlow<VoicePlaybackState> = _playbackState.asStateFlow()

    private val _errors = MutableSharedFlow<VoiceServiceError>(extraBufferCapacity = 1)

    /** Errors emitted during voice operations. */
    val errors: SharedFlow<VoiceServiceError> = _errors.asSharedFlow()

    // --- Private Properties ---

    private var settings: VoiceSettings = VoiceSettings()
    private var mediaPlayer: MediaPlayer? = null
    private var textToSpeech: TextToSpeech? = null
    private var isTtsInitialized = false
    private val audioManager: AudioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    companion object {
        private const val TAG = "VoiceService"
        private const val UTTERANCE_ID = "happy_voice_utterance"
        private const val KEY_ELEVEN_LABS_API_KEY = "eleven_labs_api_key"
    }

    init {
        initializeSystemTts()
    }

    // --- Public Methods ---

    /**
     * Speak the given text aloud using the configured provider.
     *
     * If the text is blank, this method does nothing. Any currently playing
     * speech is stopped before new speech begins.
     *
     * @param text The text to convert to speech.
     */
    suspend fun speak(text: String) {
        if (text.isBlank()) return

        stop()

        when (settings.provider) {
            com.enflame.happy.domain.model.VoiceProvider.SYSTEM -> speakWithSystem(text)
            com.enflame.happy.domain.model.VoiceProvider.ELEVEN_LABS -> speakWithElevenLabs(text)
        }
    }

    /**
     * Stop any current speech playback.
     */
    fun stop() {
        textToSpeech?.stop()

        mediaPlayer?.apply {
            if (isPlaying) {
                stop()
            }
            release()
        }
        mediaPlayer = null

        abandonAudioFocus()
        _playbackState.value = VoicePlaybackState.IDLE
    }

    /**
     * Pause the current speech playback.
     *
     * Only ElevenLabs audio (MediaPlayer) supports pause. System TTS
     * does not support pausing mid-utterance on Android.
     */
    fun pause() {
        mediaPlayer?.let { player ->
            if (player.isPlaying) {
                player.pause()
                _playbackState.value = VoicePlaybackState.PAUSED
            }
        }
    }

    /**
     * Resume paused speech playback.
     */
    fun resume() {
        mediaPlayer?.let { player ->
            if (_playbackState.value == VoicePlaybackState.PAUSED) {
                player.start()
                _playbackState.value = VoicePlaybackState.SPEAKING
            }
        }
    }

    /**
     * Update the voice settings.
     *
     * @param newSettings The updated voice settings.
     */
    fun updateSettings(newSettings: VoiceSettings) {
        settings = newSettings
    }

    /**
     * Check if the current provider is available and configured.
     *
     * @return `true` if the provider is ready for use.
     */
    fun isProviderAvailable(): Boolean {
        return when (settings.provider) {
            com.enflame.happy.domain.model.VoiceProvider.SYSTEM -> isTtsInitialized
            com.enflame.happy.domain.model.VoiceProvider.ELEVEN_LABS ->
                tokenStorage.exists(KEY_ELEVEN_LABS_API_KEY)
        }
    }

    /**
     * Save the ElevenLabs API key to secure storage.
     *
     * @param apiKey The API key to store.
     */
    fun saveApiKey(apiKey: String) {
        tokenStorage.saveString(KEY_ELEVEN_LABS_API_KEY, apiKey)
    }

    /**
     * Check if an ElevenLabs API key is stored.
     *
     * @return `true` if an API key exists in secure storage.
     */
    fun hasApiKey(): Boolean {
        return tokenStorage.exists(KEY_ELEVEN_LABS_API_KEY)
    }

    /**
     * Delete the stored ElevenLabs API key.
     */
    fun deleteApiKey() {
        tokenStorage.remove(KEY_ELEVEN_LABS_API_KEY)
    }

    /**
     * Release all resources held by this service.
     *
     * Should be called when the service is no longer needed.
     */
    fun release() {
        stop()
        textToSpeech?.shutdown()
        textToSpeech = null
        isTtsInitialized = false
    }

    // --- System TTS ---

    /**
     * Initialize the Android TextToSpeech engine.
     */
    private fun initializeSystemTts() {
        textToSpeech = TextToSpeech(context) { status ->
            isTtsInitialized = status == TextToSpeech.SUCCESS
            if (status != TextToSpeech.SUCCESS) {
                Log.e(TAG, "TextToSpeech initialization failed with status: $status")
            }
        }
    }

    /**
     * Speak text using Android's built-in TextToSpeech.
     */
    private fun speakWithSystem(text: String) {
        val tts = textToSpeech ?: run {
            _errors.tryEmit(VoiceServiceError.SynthesisFailed("TextToSpeech not initialized"))
            return
        }

        if (!isTtsInitialized) {
            _errors.tryEmit(VoiceServiceError.SynthesisFailed("TextToSpeech not ready"))
            return
        }

        if (!requestAudioFocus()) {
            _errors.tryEmit(VoiceServiceError.AudioFocusError("Could not acquire audio focus"))
            return
        }

        // Apply settings
        tts.setSpeechRate(settings.speechRate)

        // Set voice if specified
        settings.systemVoiceName?.let { voiceName ->
            val availableVoices = tts.voices ?: emptySet()
            val selectedVoice = availableVoices.find { it.name == voiceName }
            if (selectedVoice != null) {
                tts.voice = selectedVoice
            } else {
                tts.language = Locale.getDefault()
            }
        } ?: run {
            tts.language = Locale.getDefault()
        }

        // Set up listener
        tts.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {
                _playbackState.value = VoicePlaybackState.SPEAKING
            }

            override fun onDone(utteranceId: String?) {
                _playbackState.value = VoicePlaybackState.IDLE
                abandonAudioFocus()
            }

            @Deprecated("Deprecated in Java", ReplaceWith("onError(utteranceId, errorCode)"))
            override fun onError(utteranceId: String?) {
                _playbackState.value = VoicePlaybackState.IDLE
                _errors.tryEmit(VoiceServiceError.SynthesisFailed("TTS error"))
                abandonAudioFocus()
            }

            override fun onError(utteranceId: String?, errorCode: Int) {
                _playbackState.value = VoicePlaybackState.IDLE
                _errors.tryEmit(VoiceServiceError.SynthesisFailed("TTS error code: $errorCode"))
                abandonAudioFocus()
            }
        })

        _playbackState.value = VoicePlaybackState.SPEAKING
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, UTTERANCE_ID)
    }

    // --- ElevenLabs TTS ---

    /**
     * Speak text using ElevenLabs API.
     *
     * Falls back to system TTS if the API call fails.
     */
    private suspend fun speakWithElevenLabs(text: String) {
        val apiKey = tokenStorage.readString(KEY_ELEVEN_LABS_API_KEY)
        if (apiKey == null) {
            _errors.tryEmit(VoiceServiceError.ApiKeyMissing)
            // Fall back to system TTS
            speakWithSystem(text)
            return
        }

        _playbackState.value = VoicePlaybackState.LOADING

        try {
            val audioData = requestElevenLabsAudio(
                text = text,
                voiceId = settings.elevenLabsVoiceId,
                modelId = settings.elevenLabsModelId,
                apiKey = apiKey
            )

            playAudioData(audioData)
        } catch (e: VoiceServiceError) {
            _errors.tryEmit(e)
            Log.w(TAG, "ElevenLabs failed, falling back to system TTS: ${e.message}")
            speakWithSystem(text)
        } catch (e: Exception) {
            val error = VoiceServiceError.SynthesisFailed(e.localizedMessage ?: "Unknown error")
            _errors.tryEmit(error)
            Log.w(TAG, "ElevenLabs failed, falling back to system TTS", e)
            speakWithSystem(text)
        }
    }

    /**
     * Request audio from ElevenLabs Text-to-Speech API.
     *
     * @param text The text to convert to speech.
     * @param voiceId The ElevenLabs voice identifier.
     * @param modelId The ElevenLabs model identifier.
     * @param apiKey The ElevenLabs API key.
     * @return Raw audio data (MP3 format).
     */
    private suspend fun requestElevenLabsAudio(
        text: String,
        voiceId: String,
        modelId: String,
        apiKey: String
    ): ByteArray = withContext(Dispatchers.IO) {
        val request = ElevenLabsTtsRequest(
            text = text,
            modelId = modelId,
            voiceSettings = ElevenLabsVoiceSettingsDto(
                stability = 0.5f,
                similarityBoost = 0.75f,
                style = 0.0f,
                useSpeakerBoost = true
            )
        )

        try {
            val response = elevenLabsApiService.textToSpeech(
                voiceId = voiceId,
                apiKey = apiKey,
                request = request
            )

            if (!response.isSuccessful) {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                throw VoiceServiceError.ApiError(
                    statusCode = response.code(),
                    detail = errorBody
                )
            }

            val body = response.body()
                ?: throw VoiceServiceError.AudioDecodingFailed

            val bytes = body.bytes()
            if (bytes.isEmpty()) {
                throw VoiceServiceError.AudioDecodingFailed
            }

            bytes
        } catch (e: VoiceServiceError) {
            throw e
        } catch (e: Exception) {
            throw VoiceServiceError.NetworkError(e.localizedMessage ?: "Connection failed")
        }
    }

    /**
     * Play raw audio data using MediaPlayer.
     *
     * Writes the audio bytes to a temporary file and plays it with MediaPlayer
     * configured for spoken audio with background playback support.
     *
     * @param data The raw audio bytes (MP3 format).
     */
    private suspend fun playAudioData(data: ByteArray) {
        withContext(Dispatchers.IO) {
            // Write audio data to a temp file for MediaPlayer
            val tempFile = File.createTempFile("happy_tts_", ".mp3", context.cacheDir)
            FileOutputStream(tempFile).use { it.write(data) }

            withContext(Dispatchers.Main) {
                if (!requestAudioFocus()) {
                    _errors.tryEmit(
                        VoiceServiceError.AudioFocusError("Could not acquire audio focus")
                    )
                    tempFile.delete()
                    _playbackState.value = VoicePlaybackState.IDLE
                    return@withContext
                }

                try {
                    mediaPlayer = MediaPlayer().apply {
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .build()
                        )

                        setDataSource(tempFile.absolutePath)
                        setVolume(settings.volume, settings.volume)

                        setOnPreparedListener {
                            _playbackState.value = VoicePlaybackState.SPEAKING
                            start()
                        }

                        setOnCompletionListener {
                            _playbackState.value = VoicePlaybackState.IDLE
                            release()
                            mediaPlayer = null
                            abandonAudioFocus()
                            tempFile.delete()
                        }

                        setOnErrorListener { _, what, extra ->
                            Log.e(TAG, "MediaPlayer error: what=$what extra=$extra")
                            _playbackState.value = VoicePlaybackState.IDLE
                            _errors.tryEmit(
                                VoiceServiceError.AudioDecodingFailed
                            )
                            release()
                            mediaPlayer = null
                            abandonAudioFocus()
                            tempFile.delete()
                            true
                        }

                        prepareAsync()
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to initialize MediaPlayer", e)
                    _playbackState.value = VoicePlaybackState.IDLE
                    _errors.tryEmit(VoiceServiceError.AudioDecodingFailed)
                    abandonAudioFocus()
                    tempFile.delete()
                }
            }
        }
    }

    // --- Audio Focus ---

    /**
     * Request audio focus for speech playback.
     *
     * @return `true` if audio focus was granted.
     */
    private fun requestAudioFocus(): Boolean {
        val focusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            )
            .setOnAudioFocusChangeListener { focusChange ->
                when (focusChange) {
                    AudioManager.AUDIOFOCUS_LOSS,
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                        stop()
                    }
                    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                        // Lower volume temporarily (handled by system ducking)
                    }
                }
            }
            .build()

        audioFocusRequest = focusRequest
        val result = audioManager.requestAudioFocus(focusRequest)
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    /**
     * Abandon audio focus after speech completes.
     */
    private fun abandonAudioFocus() {
        audioFocusRequest?.let { request ->
            audioManager.abandonAudioFocusRequest(request)
            audioFocusRequest = null
        }
    }
}
