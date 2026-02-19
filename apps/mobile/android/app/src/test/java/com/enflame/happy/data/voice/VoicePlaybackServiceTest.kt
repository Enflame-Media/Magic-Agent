package com.enflame.happy.data.voice

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.os.IBinder
import android.support.v4.media.session.MediaSessionCompat
import com.enflame.happy.domain.model.VoicePlaybackState
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [VoicePlaybackService].
 *
 * Tests foreground service lifecycle, media session management,
 * playback controls, and notification creation. Uses mocked Android
 * framework classes since these tests run on the JVM, not on-device.
 *
 * Note: Tests for MediaPlayer behavior are limited to state management
 * verification since MediaPlayer is not available in JVM unit tests.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class VoicePlaybackServiceTest {

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // --- Initial State ---

    @Test
    fun `initial playback state is idle`() = runTest {
        val service = createService()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    @Test
    fun `initial volume is 1_0`() {
        val service = createService()

        assertEquals(1.0f, service.volume)
    }

    @Test
    fun `initial onPlaybackComplete callback is null`() {
        val service = createService()

        assertNull(service.onPlaybackComplete)
    }

    @Test
    fun `initial onPlaybackError callback is null`() {
        val service = createService()

        assertNull(service.onPlaybackError)
    }

    // --- Volume Control ---

    @Test
    fun `setting volume updates the volume property`() {
        val service = createService()

        service.volume = 0.5f

        assertEquals(0.5f, service.volume)
    }

    @Test
    fun `volume can be set to zero`() {
        val service = createService()

        service.volume = 0.0f

        assertEquals(0.0f, service.volume)
    }

    @Test
    fun `volume can be set to maximum`() {
        val service = createService()

        service.volume = 1.0f

        assertEquals(1.0f, service.volume)
    }

    // --- Service Binding ---

    @Test
    fun `onBind returns VoicePlaybackBinder`() {
        val service = createService()
        val intent = mockk<Intent>(relaxed = true)

        val binder = service.onBind(intent)

        assertNotNull(binder)
        assertTrue(binder is VoicePlaybackService.VoicePlaybackBinder)
    }

    @Test
    fun `binder getService returns the service instance`() {
        val service = createService()
        val intent = mockk<Intent>(relaxed = true)
        val binder = service.onBind(intent) as VoicePlaybackService.VoicePlaybackBinder

        val returnedService = binder.getService()

        assertEquals(service, returnedService)
    }

    // --- onStartCommand Actions ---

    @Test
    fun `onStartCommand with ACTION_STOP stops playback`() = runTest {
        val service = createService()
        val intent = mockk<Intent>(relaxed = true) {
            every { action } returns VoicePlaybackService.ACTION_STOP
        }

        service.onStartCommand(intent, 0, 1)

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    @Test
    fun `onStartCommand with null intent returns START_NOT_STICKY`() {
        val service = createService()

        val result = service.onStartCommand(null, 0, 1)

        assertEquals(android.app.Service.START_NOT_STICKY, result)
    }

    @Test
    fun `onStartCommand with ACTION_PLAY without file path does not crash`() {
        val service = createService()
        val intent = mockk<Intent>(relaxed = true) {
            every { action } returns VoicePlaybackService.ACTION_PLAY
            every { getStringExtra(VoicePlaybackService.EXTRA_AUDIO_FILE_PATH) } returns null
            every { getStringExtra(VoicePlaybackService.EXTRA_TITLE) } returns null
        }

        // Should not throw
        service.onStartCommand(intent, 0, 1)
    }

    @Test
    fun `onStartCommand returns START_NOT_STICKY`() {
        val service = createService()
        val intent = mockk<Intent>(relaxed = true) {
            every { action } returns VoicePlaybackService.ACTION_PAUSE
        }

        val result = service.onStartCommand(intent, 0, 1)

        assertEquals(android.app.Service.START_NOT_STICKY, result)
    }

    // --- Pause ---

    @Test
    fun `pause with no active media player does not crash`() {
        val service = createService()

        // Should not throw
        service.pause()
    }

    @Test
    fun `pause does not change state when idle`() = runTest {
        val service = createService()

        service.pause()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- Resume ---

    @Test
    fun `resume with no active media player does not crash`() {
        val service = createService()

        // Should not throw
        service.resume()
    }

    @Test
    fun `resume does not change state when idle`() = runTest {
        val service = createService()

        service.resume()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- Stop Playback ---

    @Test
    fun `stopPlayback sets state to idle`() = runTest {
        val service = createService()

        service.stopPlayback()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    @Test
    fun `stopPlayback can be called multiple times safely`() = runTest {
        val service = createService()

        service.stopPlayback()
        service.stopPlayback()

        assertEquals(VoicePlaybackState.IDLE, service.playbackState.first())
    }

    // --- Playback Callbacks ---

    @Test
    fun `onPlaybackComplete callback can be set`() {
        val service = createService()
        var callbackInvoked = false

        service.onPlaybackComplete = { callbackInvoked = true }
        service.onPlaybackComplete?.invoke()

        assertTrue(callbackInvoked)
    }

    @Test
    fun `onPlaybackError callback can be set and receives error message`() {
        val service = createService()
        var errorMessage: String? = null

        service.onPlaybackError = { message -> errorMessage = message }
        service.onPlaybackError?.invoke("Test error")

        assertEquals("Test error", errorMessage)
    }

    // --- Intent Factory Methods ---

    @Test
    fun `createPlayIntent creates intent with correct action`() {
        val context = mockk<Context>(relaxed = true)

        val intent = VoicePlaybackService.createPlayIntent(
            context = context,
            audioFilePath = "/tmp/audio.mp3",
            title = "Test Title"
        )

        assertEquals(VoicePlaybackService.ACTION_PLAY, intent.action)
    }

    @Test
    fun `createPlayIntent includes audio file path extra`() {
        val context = mockk<Context>(relaxed = true)

        val intent = VoicePlaybackService.createPlayIntent(
            context = context,
            audioFilePath = "/tmp/audio.mp3"
        )

        assertEquals(
            "/tmp/audio.mp3",
            intent.getStringExtra(VoicePlaybackService.EXTRA_AUDIO_FILE_PATH)
        )
    }

    @Test
    fun `createPlayIntent includes title extra`() {
        val context = mockk<Context>(relaxed = true)

        val intent = VoicePlaybackService.createPlayIntent(
            context = context,
            audioFilePath = "/tmp/audio.mp3",
            title = "Custom Title"
        )

        assertEquals(
            "Custom Title",
            intent.getStringExtra(VoicePlaybackService.EXTRA_TITLE)
        )
    }

    @Test
    fun `createPlayIntent uses default title when not specified`() {
        val context = mockk<Context>(relaxed = true)

        val intent = VoicePlaybackService.createPlayIntent(
            context = context,
            audioFilePath = "/tmp/audio.mp3"
        )

        assertEquals(
            "Happy Voice",
            intent.getStringExtra(VoicePlaybackService.EXTRA_TITLE)
        )
    }

    @Test
    fun `createStopIntent creates intent with correct action`() {
        val context = mockk<Context>(relaxed = true)

        val intent = VoicePlaybackService.createStopIntent(context)

        assertEquals(VoicePlaybackService.ACTION_STOP, intent.action)
    }

    // --- Constants ---

    @Test
    fun `ACTION_PLAY has correct value`() {
        assertEquals("com.enflame.happy.voice.ACTION_PLAY", VoicePlaybackService.ACTION_PLAY)
    }

    @Test
    fun `ACTION_PAUSE has correct value`() {
        assertEquals("com.enflame.happy.voice.ACTION_PAUSE", VoicePlaybackService.ACTION_PAUSE)
    }

    @Test
    fun `ACTION_RESUME has correct value`() {
        assertEquals("com.enflame.happy.voice.ACTION_RESUME", VoicePlaybackService.ACTION_RESUME)
    }

    @Test
    fun `ACTION_STOP has correct value`() {
        assertEquals("com.enflame.happy.voice.ACTION_STOP", VoicePlaybackService.ACTION_STOP)
    }

    @Test
    fun `EXTRA_AUDIO_FILE_PATH has correct value`() {
        assertEquals("extra_audio_file_path", VoicePlaybackService.EXTRA_AUDIO_FILE_PATH)
    }

    @Test
    fun `EXTRA_TITLE has correct value`() {
        assertEquals("extra_title", VoicePlaybackService.EXTRA_TITLE)
    }

    // --- PlaybackState Flow ---

    @Test
    fun `playbackState is observable as StateFlow`() = runTest {
        val service = createService()

        val state = service.playbackState.first()

        assertEquals(VoicePlaybackState.IDLE, state)
    }

    // --- Helper ---

    /**
     * Create a [VoicePlaybackService] for testing.
     *
     * Note: This creates the service directly without going through the
     * Android service lifecycle (no Context attached). Tests that need
     * notification or foreground service functionality are limited to
     * state management verification.
     */
    private fun createService(): VoicePlaybackService {
        return VoicePlaybackService()
    }
}
