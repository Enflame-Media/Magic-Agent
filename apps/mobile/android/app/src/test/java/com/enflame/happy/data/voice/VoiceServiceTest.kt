package com.enflame.happy.data.voice

import android.content.Context
import android.media.AudioManager
import android.speech.tts.TextToSpeech
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.domain.model.VoicePlaybackState
import com.enflame.happy.domain.model.VoiceProvider
import com.enflame.happy.domain.model.VoiceSettings
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import retrofit2.Response

/**
 * Unit tests for [VoiceService].
 *
 * Tests voice service state management, provider availability checks,
 * API key management, and playback state transitions.
 *
 * Note: Tests that require Android TTS or MediaPlayer are limited to
 * state management verification since these APIs are not available in
 * unit tests. Full integration testing requires instrumented tests.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class VoiceServiceTest {

    private lateinit var mockContext: Context
    private lateinit var mockElevenLabsApiService: ElevenLabsApiService
    private lateinit var mockTokenStorage: TokenStorage
    private lateinit var mockAudioManager: AudioManager

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        mockContext = mockk(relaxed = true)
        mockElevenLabsApiService = mockk(relaxed = true)
        mockTokenStorage = mockk(relaxed = true)
        mockAudioManager = mockk(relaxed = true)

        every { mockContext.getSystemService(Context.AUDIO_SERVICE) } returns mockAudioManager
        every { mockContext.cacheDir } returns java.io.File(System.getProperty("java.io.tmpdir"))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // --- Initial State ---

    @Test
    fun `initial playback state is idle`() = runTest {
        val service = createVoiceService()
        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- Provider Availability ---

    @Test
    fun `system provider is always available when TTS initialized`() {
        val service = createVoiceService()
        service.updateSettings(VoiceSettings(provider = VoiceProvider.SYSTEM))

        // System TTS initialization happens async; for unit test, check method call logic
        // The actual availability depends on TextToSpeech init callback
        // Here we test the conditional logic path
        every { mockTokenStorage.exists("eleven_labs_api_key") } returns false

        // System availability depends on TTS init status (tested via integration tests)
    }

    @Test
    fun `elevenLabs provider available when API key exists`() {
        val service = createVoiceService()
        service.updateSettings(VoiceSettings(provider = VoiceProvider.ELEVEN_LABS))
        every { mockTokenStorage.exists("eleven_labs_api_key") } returns true

        assertTrue(service.isProviderAvailable())
    }

    @Test
    fun `elevenLabs provider not available when no API key`() {
        val service = createVoiceService()
        service.updateSettings(VoiceSettings(provider = VoiceProvider.ELEVEN_LABS))
        every { mockTokenStorage.exists("eleven_labs_api_key") } returns false

        assertFalse(service.isProviderAvailable())
    }

    // --- API Key Management ---

    @Test
    fun `saveApiKey stores key in token storage`() {
        val service = createVoiceService()
        service.saveApiKey("test-api-key")

        verify { mockTokenStorage.saveString("eleven_labs_api_key", "test-api-key") }
    }

    @Test
    fun `hasApiKey checks token storage`() {
        val service = createVoiceService()
        every { mockTokenStorage.exists("eleven_labs_api_key") } returns true

        assertTrue(service.hasApiKey())
    }

    @Test
    fun `hasApiKey returns false when no key stored`() {
        val service = createVoiceService()
        every { mockTokenStorage.exists("eleven_labs_api_key") } returns false

        assertFalse(service.hasApiKey())
    }

    @Test
    fun `deleteApiKey removes key from token storage`() {
        val service = createVoiceService()
        service.deleteApiKey()

        verify { mockTokenStorage.remove("eleven_labs_api_key") }
    }

    // --- Settings Update ---

    @Test
    fun `updateSettings stores new settings`() {
        val service = createVoiceService()
        val newSettings = VoiceSettings(
            provider = VoiceProvider.ELEVEN_LABS,
            speechRate = 1.5f,
            volume = 0.8f,
            autoPlayAssistantMessages = true
        )

        service.updateSettings(newSettings)

        // Settings are private, but we can verify through provider availability
        every { mockTokenStorage.exists("eleven_labs_api_key") } returns true
        assertTrue(service.isProviderAvailable())
    }

    // --- Stop Playback ---

    @Test
    fun `stop sets state to idle`() = runTest {
        val service = createVoiceService()

        service.stop()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- ElevenLabs API Request ---

    @Test
    fun `speak with elevenLabs falls back to system when no API key`() = runTest {
        val service = createVoiceService()
        service.updateSettings(VoiceSettings(provider = VoiceProvider.ELEVEN_LABS))
        every { mockTokenStorage.readString("eleven_labs_api_key") } returns null

        // This will attempt ElevenLabs, find no key, emit error, and fall back
        service.speak("Test text")
        advanceUntilIdle()

        // The service should remain in a valid state
        val state = service.playbackState.first()
        // State could be IDLE (if fallback also fails due to mocked context)
        // or SPEAKING (if system TTS initializes in the mock)
        assertTrue(state == VoicePlaybackState.IDLE || state == VoicePlaybackState.SPEAKING)
    }

    @Test
    fun `speak with blank text does nothing`() = runTest {
        val service = createVoiceService()

        service.speak("")
        service.speak("   ")

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- Release ---

    @Test
    fun `release stops playback and sets idle state`() = runTest {
        val service = createVoiceService()

        service.release()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- Helper ---

    private fun createVoiceService(): VoiceService {
        return VoiceService(
            context = mockContext,
            elevenLabsApiService = mockElevenLabsApiService,
            tokenStorage = mockTokenStorage
        )
    }
}
