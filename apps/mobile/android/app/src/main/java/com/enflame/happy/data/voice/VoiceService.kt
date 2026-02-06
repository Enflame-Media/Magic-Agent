package com.enflame.happy.data.voice

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.os.IBinder
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
 * - [VoicePlaybackService] foreground service for background audio playback (HAP-1021)
 * - [AudioDeviceManager] for Bluetooth and audio output routing (HAP-1021)
 * - Kotlin [StateFlow]/[SharedFlow] for reactive state updates
 *
 * ## Background Audio (HAP-1021)
 * ElevenLabs audio playback is delegated to [VoicePlaybackService], a foreground
 * service that:
 * - Continues playback when the app is backgrounded
 * - Shows a MediaStyle notification with play/pause/stop controls
 * - Integrates with system media controls and MediaSession
 * - Handles audio focus changes (duck/pause for interruptions)
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
    private val tokenStorage: TokenStorage,
    private val audioDeviceManager: AudioDeviceManager
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
    private var textToSpeech: TextToSpeech? = null
    private var isTtsInitialized = false
    private val audioManager: AudioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private var audioFocusRequest: AudioFocusRequest? = null

    /** Bound foreground service for background audio playback. */
    private var playbackService: VoicePlaybackService? = null
    private var isServiceBound = false

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /**
     * ServiceConnection for binding to [VoicePlaybackService].
     *
     * When bound, observes the service's playback state and forwards
     * it to this service's state flow.
     */
    private val serviceConnection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
            val binder = service as VoicePlaybackService.VoicePlaybackBinder
            playbackService = binder.getService().also { svc ->
                svc.volume = settings.volume
                svc.onPlaybackComplete = {
                    _playbackState.value = VoicePlaybackState.IDLE
                }
                svc.onPlaybackError = { message ->
                    _playbackState.value = VoicePlaybackState.IDLE
                    _errors.tryEmit(VoiceServiceError.SynthesisFailed(message))
                }

                // Observe foreground service playback state
                serviceScope.launch {
                    svc.playbackState.collect { state ->
                        _playbackState.value = state
                    }
                }
            }
            isServiceBound = true
            Log.d(TAG, "VoicePlaybackService bound")
        }

        override fun onServiceDisconnected(name: ComponentName?) {
            playbackService = null
            isServiceBound = false
            Log.d(TAG, "VoicePlaybackService disconnected")
        }
    }

    companion object {
        private const val TAG = "VoiceService"
        private const val UTTERANCE_ID = "happy_voice_utterance"
        private const val KEY_ELEVEN_LABS_API_KEY = "eleven_labs_api_key"
    }

    init {
        initializeSystemTts()
        bindPlaybackService()
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

        // Stop the foreground playback service
        if (isServiceBound) {
            playbackService?.stopPlayback()
        } else {
            // Send a stop intent even if not bound
            try {
                context.startService(VoicePlaybackService.createStopIntent(context))
            } catch (e: Exception) {
                Log.w(TAG, "Failed to send stop intent to playback service", e)
            }
        }

        abandonAudioFocus()
        _playbackState.value = VoicePlaybackState.IDLE
    }

    /**
     * Pause the current speech playback.
     *
     * Only ElevenLabs audio (via foreground service) supports pause. System TTS
     * does not support pausing mid-utterance on Android.
     */
    fun pause() {
        playbackService?.pause()
    }

    /**
     * Resume paused speech playback.
     */
    fun resume() {
        playbackService?.resume()
    }

    /**
     * Update the voice settings.
     *
     * @param newSettings The updated voice settings.
     */
    fun updateSettings(newSettings: VoiceSettings) {
        settings = newSettings
        playbackService?.volume = newSettings.volume
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
        unbindPlaybackService()
        audioDeviceManager.stopMonitoring()
    }

    // --- Playback Service Binding ---

    /**
     * Bind to the [VoicePlaybackService] for background audio control.
     */
    private fun bindPlaybackService() {
        try {
            val intent = Intent(context, VoicePlaybackService::class.java)
            context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to bind VoicePlaybackService", e)
        }
    }

    /**
     * Unbind from the [VoicePlaybackService].
     */
    private fun unbindPlaybackService() {
        if (isServiceBound) {
            try {
                context.unbindService(serviceConnection)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to unbind VoicePlaybackService", e)
            }
            isServiceBound = false
            playbackService = null
        }
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
     * Audio playback is delegated to [VoicePlaybackService] for background support.
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

            playAudioViaForegroundService(audioData)
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
     * Play audio data via the [VoicePlaybackService] foreground service.
     *
     * Writes audio bytes to a temporary file and starts the foreground service
     * for background-capable playback with media notification.
     *
     * @param data The raw audio bytes (MP3 format).
     */
    private suspend fun playAudioViaForegroundService(data: ByteArray) {
        withContext(Dispatchers.IO) {
            // Write audio data to a temp file for the foreground service
            val tempFile = File.createTempFile("happy_tts_", ".mp3", context.cacheDir)
            FileOutputStream(tempFile).use { it.write(data) }

            withContext(Dispatchers.Main) {
                try {
                    // Start the foreground service with the audio file
                    val intent = VoicePlaybackService.createPlayIntent(
                        context = context,
                        audioFilePath = tempFile.absolutePath,
                        title = "Happy Voice"
                    )

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(intent)
                    } else {
                        context.startService(intent)
                    }

                    // If bound, also trigger playback directly
                    playbackService?.let { service ->
                        service.volume = settings.volume
                        service.playAudio(tempFile.absolutePath, "Happy Voice")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to start foreground playback service", e)
                    _playbackState.value = VoicePlaybackState.IDLE
                    _errors.tryEmit(VoiceServiceError.SynthesisFailed(
                        e.localizedMessage ?: "Failed to start playback"
                    ))
                    tempFile.delete()
                }
            }
        }
    }

    // --- Audio Focus (for System TTS only) ---

    /**
     * Request audio focus for system TTS speech playback.
     *
     * ElevenLabs audio focus is managed by [VoicePlaybackService].
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
                        textToSpeech?.stop()
                        _playbackState.value = VoicePlaybackState.IDLE
                        abandonAudioFocus()
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
