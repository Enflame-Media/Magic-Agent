package com.enflame.happy.data.voice

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Binder
import android.os.Build
import android.os.IBinder
import android.support.v4.media.MediaMetadataCompat
import android.support.v4.media.session.MediaSessionCompat
import android.support.v4.media.session.PlaybackStateCompat
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media.app.NotificationCompat as MediaNotificationCompat
import com.enflame.happy.MainActivity
import com.enflame.happy.R
import com.enflame.happy.data.notifications.NotificationChannels
import com.enflame.happy.domain.model.VoicePlaybackState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.io.File

/**
 * Android foreground service for background audio playback.
 *
 * Implements a proper foreground service with [MediaSessionCompat] integration,
 * providing:
 * - Background audio playback that continues when the app is backgrounded
 * - MediaStyle notification with play/pause/stop controls
 * - Audio focus management (duck/pause for interruptions)
 * - Integration with system media controls (lockscreen, Bluetooth, etc.)
 *
 * This service is started by [VoiceService] when audio playback begins and
 * stopped when playback completes or is cancelled by the user.
 *
 * ## Lifecycle
 * 1. [VoiceService] calls `startForegroundService()` with audio data file path
 * 2. Service enters foreground with media notification
 * 3. [MediaPlayer] plays the audio with audio focus
 * 4. Notification updates with playback state changes
 * 5. Service stops itself when playback completes or user stops
 *
 * ## Android Version Compatibility
 * - API 26+: Foreground service with notification channel
 * - API 34+: Requires `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission
 */
class VoicePlaybackService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var mediaSession: MediaSessionCompat? = null
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null

    private val binder = VoicePlaybackBinder()

    private val _playbackState = MutableStateFlow(VoicePlaybackState.IDLE)

    /** Current playback state as a reactive flow. */
    val playbackState: StateFlow<VoicePlaybackState> = _playbackState.asStateFlow()

    /** Volume level (0.0 to 1.0). Updated by VoiceService. */
    var volume: Float = 1.0f
        set(value) {
            field = value
            mediaPlayer?.setVolume(value, value)
        }

    /** Callback invoked when playback completes or encounters an error. */
    var onPlaybackComplete: (() -> Unit)? = null

    /** Callback invoked when a playback error occurs. */
    var onPlaybackError: ((String) -> Unit)? = null

    inner class VoicePlaybackBinder : Binder() {
        fun getService(): VoicePlaybackService = this@VoicePlaybackService
    }

    override fun onBind(intent: Intent?): IBinder = binder

    override fun onCreate() {
        super.onCreate()
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        initializeMediaSession()
        Log.d(TAG, "VoicePlaybackService created")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY -> {
                val filePath = intent.getStringExtra(EXTRA_AUDIO_FILE_PATH)
                val title = intent.getStringExtra(EXTRA_TITLE) ?: "Happy Voice"
                if (filePath != null) {
                    playAudio(filePath, title)
                }
            }
            ACTION_PAUSE -> pause()
            ACTION_RESUME -> resume()
            ACTION_STOP -> stopPlayback()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopPlayback()
        mediaSession?.release()
        mediaSession = null
        Log.d(TAG, "VoicePlaybackService destroyed")
        super.onDestroy()
    }

    // --- MediaSession ---

    /**
     * Initialize the MediaSession for system media control integration.
     *
     * Handles play/pause/stop callbacks from system UI, lockscreen controls,
     * Bluetooth AVRCP commands, and notification actions.
     */
    private fun initializeMediaSession() {
        mediaSession = MediaSessionCompat(this, MEDIA_SESSION_TAG).apply {
            setCallback(object : MediaSessionCompat.Callback() {
                override fun onPlay() {
                    resume()
                }

                override fun onPause() {
                    pause()
                }

                override fun onStop() {
                    stopPlayback()
                }
            })

            // Allow the media session to receive transport controls
            isActive = true
        }
    }

    // --- Playback Controls ---

    /**
     * Start playing audio from a file path.
     *
     * Requests audio focus, starts the foreground service with a media
     * notification, and begins playback.
     *
     * @param filePath Absolute path to the audio file.
     * @param title Display title for the notification.
     */
    fun playAudio(filePath: String, title: String = "Happy Voice") {
        // Stop any existing playback
        releaseMediaPlayer()

        if (!requestAudioFocus()) {
            onPlaybackError?.invoke("Could not acquire audio focus")
            _playbackState.value = VoicePlaybackState.IDLE
            return
        }

        try {
            mediaPlayer = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )

                setDataSource(filePath)
                setVolume(volume, volume)

                setOnPreparedListener {
                    _playbackState.value = VoicePlaybackState.SPEAKING
                    start()
                    updateMediaSessionState(PlaybackStateCompat.STATE_PLAYING)
                    updateNotification(title, isPlaying = true)
                }

                setOnCompletionListener {
                    _playbackState.value = VoicePlaybackState.IDLE
                    updateMediaSessionState(PlaybackStateCompat.STATE_STOPPED)
                    onPlaybackComplete?.invoke()
                    cleanupAndStop(filePath)
                }

                setOnErrorListener { _, what, extra ->
                    Log.e(TAG, "MediaPlayer error: what=$what extra=$extra")
                    _playbackState.value = VoicePlaybackState.IDLE
                    updateMediaSessionState(PlaybackStateCompat.STATE_ERROR)
                    onPlaybackError?.invoke("Playback error: what=$what extra=$extra")
                    cleanupAndStop(filePath)
                    true
                }

                prepareAsync()
            }

            // Update metadata for media session
            mediaSession?.setMetadata(
                MediaMetadataCompat.Builder()
                    .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, "Happy")
                    .build()
            )

            _playbackState.value = VoicePlaybackState.LOADING

            // Start as foreground service with notification
            startForeground(NOTIFICATION_ID, buildNotification(title, isPlaying = false))
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize MediaPlayer", e)
            _playbackState.value = VoicePlaybackState.IDLE
            onPlaybackError?.invoke(e.localizedMessage ?: "Failed to play audio")
            stopSelf()
        }
    }

    /**
     * Pause the current playback.
     */
    fun pause() {
        mediaPlayer?.let { player ->
            if (player.isPlaying) {
                player.pause()
                _playbackState.value = VoicePlaybackState.PAUSED
                updateMediaSessionState(PlaybackStateCompat.STATE_PAUSED)
                updateNotification("Happy Voice", isPlaying = false)
            }
        }
    }

    /**
     * Resume paused playback.
     */
    fun resume() {
        mediaPlayer?.let { player ->
            if (_playbackState.value == VoicePlaybackState.PAUSED) {
                if (requestAudioFocus()) {
                    player.start()
                    _playbackState.value = VoicePlaybackState.SPEAKING
                    updateMediaSessionState(PlaybackStateCompat.STATE_PLAYING)
                    updateNotification("Happy Voice", isPlaying = true)
                }
            }
        }
    }

    /**
     * Stop all playback and release resources.
     */
    fun stopPlayback() {
        releaseMediaPlayer()
        abandonAudioFocus()
        _playbackState.value = VoicePlaybackState.IDLE
        updateMediaSessionState(PlaybackStateCompat.STATE_STOPPED)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    // --- Audio Focus ---

    /**
     * Request audio focus for speech playback.
     *
     * Uses [AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK] which allows
     * other audio to duck (lower volume) while speech is playing.
     *
     * @return `true` if audio focus was granted.
     */
    private fun requestAudioFocus(): Boolean {
        val manager = audioManager ?: return false

        val focusRequest = AudioFocusRequest.Builder(
            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
        )
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
            )
            .setOnAudioFocusChangeListener { focusChange ->
                handleAudioFocusChange(focusChange)
            }
            .build()

        audioFocusRequest = focusRequest
        val result = manager.requestAudioFocus(focusRequest)
        return result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    }

    /**
     * Handle audio focus changes.
     *
     * - Loss: Stop playback completely
     * - Transient loss: Pause playback (can resume)
     * - Duck: Lower volume temporarily
     * - Gain: Restore volume after ducking
     */
    private fun handleAudioFocusChange(focusChange: Int) {
        when (focusChange) {
            AudioManager.AUDIOFOCUS_LOSS -> {
                // Permanent loss - stop
                stopPlayback()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                // Temporary loss (phone call, etc.) - pause
                pause()
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                // Lower volume temporarily
                mediaPlayer?.setVolume(volume * DUCK_VOLUME_FACTOR, volume * DUCK_VOLUME_FACTOR)
            }
            AudioManager.AUDIOFOCUS_GAIN -> {
                // Regained focus - restore volume
                mediaPlayer?.setVolume(volume, volume)
                if (_playbackState.value == VoicePlaybackState.PAUSED) {
                    resume()
                }
            }
        }
    }

    /**
     * Abandon audio focus after playback completes.
     */
    private fun abandonAudioFocus() {
        audioFocusRequest?.let { request ->
            audioManager?.abandonAudioFocusRequest(request)
            audioFocusRequest = null
        }
    }

    // --- Notification ---

    /**
     * Build a MediaStyle notification with playback controls.
     *
     * Shows play/pause and stop actions in the notification. Uses
     * [MediaNotificationCompat.MediaStyle] for integration with the
     * system media controls.
     *
     * @param title The title to display in the notification.
     * @param isPlaying Whether audio is currently playing.
     * @return The built [Notification].
     */
    private fun buildNotification(title: String, isPlaying: Boolean): Notification {
        val contentIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val playPauseAction = if (isPlaying) {
            NotificationCompat.Action.Builder(
                R.drawable.ic_notification,
                "Pause",
                createActionPendingIntent(ACTION_PAUSE)
            ).build()
        } else {
            NotificationCompat.Action.Builder(
                R.drawable.ic_notification,
                "Play",
                createActionPendingIntent(ACTION_RESUME)
            ).build()
        }

        val stopAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification,
            "Stop",
            createActionPendingIntent(ACTION_STOP)
        ).build()

        return NotificationCompat.Builder(this, NotificationChannels.CHANNEL_MEDIA_PLAYBACK)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(
                if (isPlaying) "Playing audio..." else "Paused"
            )
            .setContentIntent(contentIntent)
            .setOngoing(isPlaying)
            .setShowWhen(false)
            .addAction(playPauseAction)
            .addAction(stopAction)
            .setStyle(
                MediaNotificationCompat.MediaStyle()
                    .setMediaSession(mediaSession?.sessionToken)
                    .setShowActionsInCompactView(0, 1) // Show both in compact view
            )
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    /**
     * Update the ongoing notification with new playback state.
     */
    private fun updateNotification(title: String, isPlaying: Boolean) {
        try {
            val notification = buildNotification(title, isPlaying)
            val notificationManager =
                getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to update notification", e)
        }
    }

    /**
     * Create a PendingIntent for a notification action.
     */
    private fun createActionPendingIntent(action: String): PendingIntent {
        val intent = Intent(this, VoicePlaybackService::class.java).apply {
            this.action = action
        }
        return PendingIntent.getService(
            this,
            action.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    // --- MediaSession State ---

    /**
     * Update the MediaSession playback state for system UI integration.
     */
    private fun updateMediaSessionState(state: Int) {
        val position = mediaPlayer?.currentPosition?.toLong() ?: 0L
        val playbackSpeed = if (state == PlaybackStateCompat.STATE_PLAYING) 1.0f else 0.0f

        mediaSession?.setPlaybackState(
            PlaybackStateCompat.Builder()
                .setState(state, position, playbackSpeed)
                .setActions(
                    PlaybackStateCompat.ACTION_PLAY or
                        PlaybackStateCompat.ACTION_PAUSE or
                        PlaybackStateCompat.ACTION_STOP or
                        PlaybackStateCompat.ACTION_PLAY_PAUSE
                )
                .build()
        )
    }

    // --- Cleanup ---

    /**
     * Release the MediaPlayer and its resources.
     */
    private fun releaseMediaPlayer() {
        mediaPlayer?.apply {
            if (isPlaying) {
                stop()
            }
            release()
        }
        mediaPlayer = null
    }

    /**
     * Clean up temporary audio file and stop the service.
     */
    private fun cleanupAndStop(filePath: String) {
        try {
            File(filePath).delete()
        } catch (e: Exception) {
            Log.w(TAG, "Failed to delete temp audio file", e)
        }
        abandonAudioFocus()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    companion object {
        private const val TAG = "VoicePlaybackService"
        private const val MEDIA_SESSION_TAG = "HappyVoicePlayback"
        private const val NOTIFICATION_ID = 4001
        private const val DUCK_VOLUME_FACTOR = 0.2f

        /** Intent action to start playing audio. */
        const val ACTION_PLAY = "com.enflame.happy.voice.ACTION_PLAY"

        /** Intent action to pause playback. */
        const val ACTION_PAUSE = "com.enflame.happy.voice.ACTION_PAUSE"

        /** Intent action to resume playback. */
        const val ACTION_RESUME = "com.enflame.happy.voice.ACTION_RESUME"

        /** Intent action to stop playback. */
        const val ACTION_STOP = "com.enflame.happy.voice.ACTION_STOP"

        /** Extra key for the audio file path. */
        const val EXTRA_AUDIO_FILE_PATH = "extra_audio_file_path"

        /** Extra key for the display title. */
        const val EXTRA_TITLE = "extra_title"

        /**
         * Create an intent to start audio playback via the foreground service.
         *
         * @param context The context to create the intent from.
         * @param audioFilePath Path to the audio file to play.
         * @param title Display title for the notification.
         * @return An intent configured for starting the service.
         */
        fun createPlayIntent(
            context: Context,
            audioFilePath: String,
            title: String = "Happy Voice"
        ): Intent {
            return Intent(context, VoicePlaybackService::class.java).apply {
                action = ACTION_PLAY
                putExtra(EXTRA_AUDIO_FILE_PATH, audioFilePath)
                putExtra(EXTRA_TITLE, title)
            }
        }

        /**
         * Create an intent to stop audio playback.
         *
         * @param context The context to create the intent from.
         * @return An intent configured to stop playback.
         */
        fun createStopIntent(context: Context): Intent {
            return Intent(context, VoicePlaybackService::class.java).apply {
                action = ACTION_STOP
            }
        }
    }
}
