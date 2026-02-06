package com.enflame.happy.ui.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.enflame.happy.data.local.UserPreferencesDataStore
import com.enflame.happy.data.voice.VoiceService
import com.enflame.happy.domain.model.ElevenLabsVoice
import com.enflame.happy.domain.model.VoicePlaybackState
import com.enflame.happy.domain.model.VoiceProvider
import com.enflame.happy.domain.model.VoiceSettings
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * UI state for the voice settings screen.
 *
 * @property provider The currently selected TTS provider.
 * @property elevenLabsVoiceId Selected ElevenLabs voice ID.
 * @property elevenLabsVoiceName Selected ElevenLabs voice display name.
 * @property elevenLabsModelId Selected ElevenLabs model ID.
 * @property systemVoiceName Selected system voice name (null = device default).
 * @property speechRate Speech rate multiplier (0.5 to 2.0).
 * @property volume Volume level (0.0 to 1.0).
 * @property autoPlayAssistantMessages Whether to auto-read new assistant messages.
 * @property skipToolOutputs Whether to skip reading tool use outputs.
 * @property hasApiKey Whether an ElevenLabs API key is configured.
 * @property playbackState Current playback state.
 * @property errorMessage Last error message, if any.
 * @property showError Whether to show the error dialog.
 * @property availableVoices List of available ElevenLabs voices.
 */
data class VoiceUiState(
    val provider: VoiceProvider = VoiceProvider.SYSTEM,
    val elevenLabsVoiceId: String = VoiceSettings.DEFAULT_ELEVEN_LABS_VOICE_ID,
    val elevenLabsVoiceName: String = VoiceSettings.DEFAULT_ELEVEN_LABS_VOICE_NAME,
    val elevenLabsModelId: String = VoiceSettings.DEFAULT_ELEVEN_LABS_MODEL_ID,
    val systemVoiceName: String? = null,
    val speechRate: Float = VoiceSettings.DEFAULT_SPEECH_RATE,
    val volume: Float = VoiceSettings.DEFAULT_VOLUME,
    val autoPlayAssistantMessages: Boolean = false,
    val skipToolOutputs: Boolean = true,
    val hasApiKey: Boolean = false,
    val playbackState: VoicePlaybackState = VoicePlaybackState.IDLE,
    val errorMessage: String? = null,
    val showError: Boolean = false,
    val availableVoices: List<ElevenLabsVoice> = ElevenLabsVoice.defaultVoices
) {
    /** Whether speech is currently in progress. */
    val isSpeaking: Boolean
        get() = playbackState == VoicePlaybackState.SPEAKING ||
            playbackState == VoicePlaybackState.LOADING
}

/**
 * ViewModel for the voice settings screen.
 *
 * Manages voice preferences via [UserPreferencesDataStore] and controls
 * speech playback via [VoiceService]. All preference changes are persisted
 * reactively and the voice service is kept in sync.
 */
@HiltViewModel
class VoiceViewModel @Inject constructor(
    private val userPreferences: UserPreferencesDataStore,
    private val voiceService: VoiceService
) : ViewModel() {

    private val _errorState = MutableStateFlow(ErrorState())

    /**
     * Combined UI state derived from DataStore flows and local state.
     */
    val uiState: StateFlow<VoiceUiState> = combine(
        userPreferences.voiceProvider,
        userPreferences.elevenLabsVoiceId,
        userPreferences.elevenLabsVoiceName,
        userPreferences.voiceSpeechRate
    ) { provider, voiceId, voiceName, speechRate ->
        VoicePrefsPartial(provider, voiceId, voiceName, speechRate)
    }.combine(
        combine(
            userPreferences.voiceVolume,
            userPreferences.voiceAutoPlay,
            userPreferences.voiceSkipToolOutputs,
            userPreferences.elevenLabsModelId,
            userPreferences.systemVoiceName
        ) { volume, autoPlay, skipToolOutputs, modelId, systemVoice ->
            VoicePrefsPartial2(volume, autoPlay, skipToolOutputs, modelId, systemVoice)
        }
    ) { part1, part2 ->
        Pair(part1, part2)
    }.combine(voiceService.playbackState) { prefs, playback ->
        Triple(prefs.first, prefs.second, playback)
    }.combine(_errorState) { triple, error ->
        val (part1, part2, playback) = triple
        val providerEnum = when (part1.provider) {
            "eleven_labs" -> VoiceProvider.ELEVEN_LABS
            else -> VoiceProvider.SYSTEM
        }

        VoiceUiState(
            provider = providerEnum,
            elevenLabsVoiceId = part1.voiceId,
            elevenLabsVoiceName = part1.voiceName,
            elevenLabsModelId = part2.modelId,
            systemVoiceName = part2.systemVoice,
            speechRate = part1.speechRate,
            volume = part2.volume,
            autoPlayAssistantMessages = part2.autoPlay,
            skipToolOutputs = part2.skipToolOutputs,
            hasApiKey = voiceService.hasApiKey(),
            playbackState = playback,
            errorMessage = error.message,
            showError = error.show
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = VoiceUiState(hasApiKey = voiceService.hasApiKey())
    )

    init {
        // Observe errors from the voice service
        viewModelScope.launch {
            voiceService.errors.collect { error ->
                _errorState.value = ErrorState(message = error.message, show = true)
            }
        }

        // Sync initial settings to voice service
        viewModelScope.launch {
            uiState.collect { state ->
                voiceService.updateSettings(state.toVoiceSettings())
            }
        }
    }

    // --- Provider ---

    /**
     * Set the voice provider.
     *
     * @param provider The provider to use.
     */
    fun setProvider(provider: VoiceProvider) {
        viewModelScope.launch {
            val providerString = when (provider) {
                VoiceProvider.SYSTEM -> "system"
                VoiceProvider.ELEVEN_LABS -> "eleven_labs"
            }
            userPreferences.setVoiceProvider(providerString)
        }
    }

    // --- ElevenLabs Voice ---

    /**
     * Set the selected ElevenLabs voice.
     *
     * @param voice The ElevenLabs voice to select.
     */
    fun setElevenLabsVoice(voice: ElevenLabsVoice) {
        viewModelScope.launch {
            userPreferences.setElevenLabsVoiceId(voice.id)
            userPreferences.setElevenLabsVoiceName(voice.name)
        }
    }

    /**
     * Set the ElevenLabs model ID.
     *
     * @param modelId The model identifier.
     */
    fun setElevenLabsModelId(modelId: String) {
        viewModelScope.launch {
            userPreferences.setElevenLabsModelId(modelId)
        }
    }

    // --- System Voice ---

    /**
     * Set the system voice name.
     *
     * @param voiceName The voice name, or null for device default.
     */
    fun setSystemVoiceName(voiceName: String?) {
        viewModelScope.launch {
            userPreferences.setSystemVoiceName(voiceName)
        }
    }

    // --- Playback Settings ---

    /**
     * Set the speech rate.
     *
     * @param rate Speech rate multiplier (0.5 to 2.0).
     */
    fun setSpeechRate(rate: Float) {
        viewModelScope.launch {
            userPreferences.setVoiceSpeechRate(rate)
        }
    }

    /**
     * Set the volume level.
     *
     * @param volume Volume level (0.0 to 1.0).
     */
    fun setVolume(volume: Float) {
        viewModelScope.launch {
            userPreferences.setVoiceVolume(volume)
        }
    }

    // --- Behavior ---

    /**
     * Set auto-play for assistant messages.
     */
    fun setAutoPlay(enabled: Boolean) {
        viewModelScope.launch {
            userPreferences.setVoiceAutoPlay(enabled)
        }
    }

    /**
     * Set whether to skip tool outputs in speech.
     */
    fun setSkipToolOutputs(skip: Boolean) {
        viewModelScope.launch {
            userPreferences.setVoiceSkipToolOutputs(skip)
        }
    }

    // --- API Key ---

    /**
     * Save an ElevenLabs API key.
     *
     * @param apiKey The API key to store securely.
     */
    fun saveApiKey(apiKey: String) {
        voiceService.saveApiKey(apiKey)
        // Trigger a recomposition by updating error state
        _errorState.value = _errorState.value.copy()
    }

    /**
     * Delete the stored ElevenLabs API key.
     *
     * Also resets the provider to system TTS.
     */
    fun deleteApiKey() {
        voiceService.deleteApiKey()
        setProvider(VoiceProvider.SYSTEM)
    }

    // --- Playback Controls ---

    /**
     * Speak the given text using current settings.
     *
     * @param text The text to speak.
     */
    fun speak(text: String) {
        viewModelScope.launch {
            voiceService.speak(text)
        }
    }

    /**
     * Stop any current speech.
     */
    fun stop() {
        voiceService.stop()
    }

    /**
     * Pause current speech.
     */
    fun pause() {
        voiceService.pause()
    }

    /**
     * Resume paused speech.
     */
    fun resume() {
        voiceService.resume()
    }

    // --- Error Handling ---

    /**
     * Dismiss the current error.
     */
    fun dismissError() {
        _errorState.value = ErrorState()
    }

    override fun onCleared() {
        super.onCleared()
        voiceService.stop()
    }

    private data class ErrorState(
        val message: String? = null,
        val show: Boolean = false
    )

    private data class VoicePrefsPartial(
        val provider: String,
        val voiceId: String,
        val voiceName: String,
        val speechRate: Float
    )

    private data class VoicePrefsPartial2(
        val volume: Float,
        val autoPlay: Boolean,
        val skipToolOutputs: Boolean,
        val modelId: String,
        val systemVoice: String?
    )

    companion object {
        private const val TAG = "VoiceViewModel"
    }
}

/**
 * Convert [VoiceUiState] to [VoiceSettings] for the voice service.
 */
private fun VoiceUiState.toVoiceSettings(): VoiceSettings {
    return VoiceSettings(
        provider = provider,
        elevenLabsVoiceId = elevenLabsVoiceId,
        elevenLabsVoiceName = elevenLabsVoiceName,
        hasElevenLabsApiKey = hasApiKey,
        systemVoiceName = systemVoiceName,
        speechRate = speechRate,
        volume = volume,
        autoPlayAssistantMessages = autoPlayAssistantMessages,
        skipToolOutputs = skipToolOutputs,
        elevenLabsModelId = elevenLabsModelId
    )
}
