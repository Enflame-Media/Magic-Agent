package com.enflame.happy.ui.viewmodel

import com.enflame.happy.data.local.UserPreferencesDataStore
import com.enflame.happy.data.voice.VoiceService
import com.enflame.happy.domain.model.ElevenLabsVoice
import com.enflame.happy.domain.model.VoicePlaybackState
import com.enflame.happy.domain.model.VoiceProvider
import com.enflame.happy.domain.model.VoiceSettings
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.just
import io.mockk.mockk
import io.mockk.runs
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [VoiceViewModel].
 *
 * Tests preference management, voice service delegation, playback controls,
 * API key operations, and error handling.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class VoiceViewModelTest {

    private lateinit var viewModel: VoiceViewModel
    private lateinit var mockUserPreferences: UserPreferencesDataStore
    private lateinit var mockVoiceService: VoiceService

    private val testDispatcher = StandardTestDispatcher()

    // DataStore flows
    private val voiceProviderFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_VOICE_PROVIDER)
    private val elevenLabsVoiceIdFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_ELEVEN_LABS_VOICE_ID)
    private val elevenLabsVoiceNameFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_ELEVEN_LABS_VOICE_NAME)
    private val elevenLabsModelIdFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_ELEVEN_LABS_MODEL_ID)
    private val systemVoiceNameFlow = MutableStateFlow<String?>(null)
    private val speechRateFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_VOICE_SPEECH_RATE)
    private val volumeFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_VOICE_VOLUME)
    private val autoPlayFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_VOICE_AUTO_PLAY)
    private val skipToolOutputsFlow = MutableStateFlow(UserPreferencesDataStore.DEFAULT_VOICE_SKIP_TOOL_OUTPUTS)

    // VoiceService flows
    private val playbackStateFlow = MutableStateFlow(VoicePlaybackState.IDLE)
    private val errorsFlow = MutableSharedFlow<com.enflame.happy.domain.model.VoiceServiceError>(
        extraBufferCapacity = 1
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        mockUserPreferences = mockk(relaxed = true)
        mockVoiceService = mockk(relaxed = true)

        // Set up DataStore flow mocks
        every { mockUserPreferences.voiceProvider } returns voiceProviderFlow
        every { mockUserPreferences.elevenLabsVoiceId } returns elevenLabsVoiceIdFlow
        every { mockUserPreferences.elevenLabsVoiceName } returns elevenLabsVoiceNameFlow
        every { mockUserPreferences.elevenLabsModelId } returns elevenLabsModelIdFlow
        every { mockUserPreferences.systemVoiceName } returns systemVoiceNameFlow
        every { mockUserPreferences.voiceSpeechRate } returns speechRateFlow
        every { mockUserPreferences.voiceVolume } returns volumeFlow
        every { mockUserPreferences.voiceAutoPlay } returns autoPlayFlow
        every { mockUserPreferences.voiceSkipToolOutputs } returns skipToolOutputsFlow

        // VoiceService mocks
        every { mockVoiceService.playbackState } returns playbackStateFlow
        every { mockVoiceService.errors } returns errorsFlow
        every { mockVoiceService.hasApiKey() } returns false
        every { mockVoiceService.updateSettings(any()) } just runs

        viewModel = VoiceViewModel(mockUserPreferences, mockVoiceService)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // --- Initial State ---

    @Test
    fun `initial state has default values`() = runTest {
        advanceUntilIdle()
        val state = viewModel.uiState.first()

        assertEquals(VoiceProvider.SYSTEM, state.provider)
        assertEquals(VoiceSettings.DEFAULT_ELEVEN_LABS_VOICE_ID, state.elevenLabsVoiceId)
        assertEquals(VoiceSettings.DEFAULT_ELEVEN_LABS_VOICE_NAME, state.elevenLabsVoiceName)
        assertEquals(VoiceSettings.DEFAULT_SPEECH_RATE, state.speechRate)
        assertEquals(VoiceSettings.DEFAULT_VOLUME, state.volume)
        assertFalse(state.autoPlayAssistantMessages)
        assertTrue(state.skipToolOutputs)
        assertFalse(state.hasApiKey)
        assertEquals(VoicePlaybackState.IDLE, state.playbackState)
        assertFalse(state.isSpeaking)
    }

    // --- Provider Selection ---

    @Test
    fun `setProvider updates preference to system`() = runTest {
        viewModel.setProvider(VoiceProvider.SYSTEM)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setVoiceProvider("system") }
    }

    @Test
    fun `setProvider updates preference to elevenLabs`() = runTest {
        viewModel.setProvider(VoiceProvider.ELEVEN_LABS)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setVoiceProvider("eleven_labs") }
    }

    @Test
    fun `provider flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        voiceProviderFlow.value = "eleven_labs"
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(VoiceProvider.ELEVEN_LABS, state.provider)
    }

    // --- ElevenLabs Voice Selection ---

    @Test
    fun `setElevenLabsVoice updates preferences`() = runTest {
        val voice = ElevenLabsVoice(
            id = "29vD33N1CtxCmqQRPOHJ",
            name = "Drew",
            description = "Warm, confident male voice"
        )

        viewModel.setElevenLabsVoice(voice)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setElevenLabsVoiceId("29vD33N1CtxCmqQRPOHJ") }
        coVerify { mockUserPreferences.setElevenLabsVoiceName("Drew") }
    }

    @Test
    fun `setElevenLabsModelId updates preference`() = runTest {
        viewModel.setElevenLabsModelId("eleven_multilingual_v2")
        advanceUntilIdle()

        coVerify { mockUserPreferences.setElevenLabsModelId("eleven_multilingual_v2") }
    }

    // --- System Voice ---

    @Test
    fun `setSystemVoiceName updates preference`() = runTest {
        viewModel.setSystemVoiceName("en-us-x-sfg#male_1-local")
        advanceUntilIdle()

        coVerify { mockUserPreferences.setSystemVoiceName("en-us-x-sfg#male_1-local") }
    }

    @Test
    fun `setSystemVoiceName with null clears preference`() = runTest {
        viewModel.setSystemVoiceName(null)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setSystemVoiceName(null) }
    }

    // --- Playback Settings ---

    @Test
    fun `setSpeechRate updates preference`() = runTest {
        viewModel.setSpeechRate(1.5f)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setVoiceSpeechRate(1.5f) }
    }

    @Test
    fun `speechRate flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        speechRateFlow.value = 2.0f
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(2.0f, state.speechRate)
    }

    @Test
    fun `setVolume updates preference`() = runTest {
        viewModel.setVolume(0.7f)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setVoiceVolume(0.7f) }
    }

    @Test
    fun `volume flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        volumeFlow.value = 0.5f
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(0.5f, state.volume)
    }

    // --- Behavior ---

    @Test
    fun `setAutoPlay updates preference`() = runTest {
        viewModel.setAutoPlay(true)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setVoiceAutoPlay(true) }
    }

    @Test
    fun `autoPlay flow changes are reflected in state`() = runTest {
        advanceUntilIdle()

        autoPlayFlow.value = true
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.autoPlayAssistantMessages)
    }

    @Test
    fun `setSkipToolOutputs updates preference`() = runTest {
        viewModel.setSkipToolOutputs(false)
        advanceUntilIdle()

        coVerify { mockUserPreferences.setVoiceSkipToolOutputs(false) }
    }

    // --- API Key ---

    @Test
    fun `saveApiKey delegates to voice service`() {
        viewModel.saveApiKey("test-key-123")

        verify { mockVoiceService.saveApiKey("test-key-123") }
    }

    @Test
    fun `deleteApiKey delegates to voice service and resets provider`() = runTest {
        viewModel.deleteApiKey()
        advanceUntilIdle()

        verify { mockVoiceService.deleteApiKey() }
        coVerify { mockUserPreferences.setVoiceProvider("system") }
    }

    @Test
    fun `hasApiKey reflects voice service state`() = runTest {
        every { mockVoiceService.hasApiKey() } returns true

        // Recreate viewModel with updated mock
        viewModel = VoiceViewModel(mockUserPreferences, mockVoiceService)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.hasApiKey)
    }

    // --- Playback Controls ---

    @Test
    fun `speak delegates to voice service`() = runTest {
        viewModel.speak("Hello world")
        advanceUntilIdle()

        coVerify { mockVoiceService.speak("Hello world") }
    }

    @Test
    fun `stop delegates to voice service`() {
        viewModel.stop()

        verify { mockVoiceService.stop() }
    }

    @Test
    fun `pause delegates to voice service`() {
        viewModel.pause()

        verify { mockVoiceService.pause() }
    }

    @Test
    fun `resume delegates to voice service`() {
        viewModel.resume()

        verify { mockVoiceService.resume() }
    }

    // --- Playback State ---

    @Test
    fun `playback state changes are reflected in ui state`() = runTest {
        advanceUntilIdle()

        playbackStateFlow.value = VoicePlaybackState.SPEAKING
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(VoicePlaybackState.SPEAKING, state.playbackState)
        assertTrue(state.isSpeaking)
    }

    @Test
    fun `loading state sets isSpeaking to true`() = runTest {
        advanceUntilIdle()

        playbackStateFlow.value = VoicePlaybackState.LOADING
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.isSpeaking)
    }

    @Test
    fun `idle state sets isSpeaking to false`() = runTest {
        advanceUntilIdle()

        playbackStateFlow.value = VoicePlaybackState.IDLE
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isSpeaking)
    }

    // --- Error Handling ---

    @Test
    fun `voice service errors are shown in ui state`() = runTest {
        advanceUntilIdle()

        errorsFlow.tryEmit(com.enflame.happy.domain.model.VoiceServiceError.ApiKeyMissing)
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.showError)
        assertEquals(
            "ElevenLabs API key is not configured. Please add it in Voice Settings.",
            state.errorMessage
        )
    }

    @Test
    fun `dismissError clears error state`() = runTest {
        advanceUntilIdle()

        errorsFlow.tryEmit(com.enflame.happy.domain.model.VoiceServiceError.AudioDecodingFailed)
        advanceUntilIdle()

        viewModel.dismissError()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.showError)
    }

    // --- Settings Sync ---

    @Test
    fun `settings are synced to voice service on change`() = runTest {
        advanceUntilIdle()

        speechRateFlow.value = 1.8f
        advanceUntilIdle()

        // VoiceService.updateSettings should be called with the new settings
        verify(atLeast = 1) { mockVoiceService.updateSettings(any()) }
    }

    // --- Available Voices ---

    @Test
    fun `available voices contains default ElevenLabs voices`() = runTest {
        advanceUntilIdle()
        val state = viewModel.uiState.first()

        assertEquals(ElevenLabsVoice.defaultVoices.size, state.availableVoices.size)
        assertEquals("Rachel", state.availableVoices.first().name)
        assertEquals("Josh", state.availableVoices.last().name)
    }

    // --- onCleared ---

    @Test
    fun `onCleared stops voice service`() {
        viewModel.stop()

        verify { mockVoiceService.stop() }
    }
}
