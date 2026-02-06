package com.enflame.happy.data.sync

import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Lifecycle-aware manager for the WebSocket [SyncService].
 *
 * Observes app-level lifecycle events via [ProcessLifecycleOwner] and automatically
 * disconnects the WebSocket when the app enters the background (ON_STOP) and
 * reconnects when the app returns to the foreground (ON_START).
 *
 * ## Design: Separation of Concerns (Option B)
 *
 * Rather than making [SyncService] implement [DefaultLifecycleObserver] directly,
 * this class acts as a dedicated wrapper that:
 * 1. Observes [ProcessLifecycleOwner] for app-level lifecycle events
 * 2. Delegates to [SyncService.connect] and [SyncService.disconnect]
 * 3. Tracks whether the connection was active before backgrounding
 * 4. Handles network unavailability gracefully on reconnection
 *
 * Using [ProcessLifecycleOwner] (not Activity lifecycle) avoids false disconnect/reconnect
 * cycles during configuration changes such as screen rotation or multi-window transitions.
 *
 * ## Usage
 *
 * Register in [com.enflame.happy.HappyApplication.onCreate]:
 * ```kotlin
 * syncLifecycleManager.register()
 * ```
 *
 * The manager then automatically handles connect/disconnect based on app foreground state.
 * Manual calls to [SyncService.connect]/[SyncService.disconnect] continue to work as before.
 *
 * ## Cross-Platform Parity
 * This mirrors the iOS `SyncLifecycleHandler` pattern from HAP-1013.
 *
 * @param syncService The WebSocket sync service to manage.
 * @param coroutineScope Scope for async operations (grace period delay, reconnection).
 */
@Singleton
class SyncLifecycleManager @Inject constructor(
    private val syncService: SyncService,
    private val coroutineScope: CoroutineScope
) : DefaultLifecycleObserver {

    /**
     * Whether the WebSocket was connected (or connecting/reconnecting) before
     * the app was backgrounded. Used to determine if reconnection is needed
     * when the app returns to the foreground.
     */
    @Volatile
    private var wasConnectedBeforeBackground = false

    /**
     * Whether this manager has been registered with a [LifecycleOwner].
     */
    @Volatile
    private var isRegistered = false

    /**
     * Job for the grace period delay before disconnecting.
     * Cancelled if the app returns to the foreground within the grace period.
     */
    private var disconnectJob: Job? = null

    /**
     * Grace period in milliseconds before disconnecting after the app enters the background.
     *
     * A short grace period prevents unnecessary disconnect/reconnect cycles during
     * quick app switches (e.g., briefly checking a notification and returning).
     * Set to 0 to disable the grace period and disconnect immediately.
     */
    var gracePeriodMs: Long = DEFAULT_GRACE_PERIOD_MS

    // ========================================================================
    // Registration
    // ========================================================================

    /**
     * Register this manager with [ProcessLifecycleOwner].
     *
     * After registration, the manager will automatically observe app-level
     * lifecycle events and manage the WebSocket connection accordingly.
     *
     * This method is idempotent -- calling it multiple times has no effect.
     */
    fun register() {
        register(ProcessLifecycleOwner.get())
    }

    /**
     * Register this manager with a specific [LifecycleOwner].
     *
     * Primarily used for testing with [androidx.lifecycle.testing.TestLifecycleOwner].
     *
     * @param lifecycleOwner The lifecycle owner to observe.
     */
    fun register(lifecycleOwner: LifecycleOwner) {
        if (isRegistered) {
            Log.d(TAG, "SyncLifecycleManager already registered, skipping")
            return
        }

        lifecycleOwner.lifecycle.addObserver(this)
        isRegistered = true
        Log.d(TAG, "Registered with lifecycle owner: ${lifecycleOwner::class.simpleName}")
    }

    /**
     * Unregister this manager from its current [LifecycleOwner].
     *
     * Cancels any pending disconnect job and resets internal state.
     * After unregistration, lifecycle events will no longer trigger
     * connect/disconnect operations.
     *
     * @param lifecycleOwner The lifecycle owner to stop observing.
     */
    fun unregister(lifecycleOwner: LifecycleOwner) {
        disconnectJob?.cancel()
        disconnectJob = null
        lifecycleOwner.lifecycle.removeObserver(this)
        isRegistered = false
        wasConnectedBeforeBackground = false
        Log.d(TAG, "Unregistered from lifecycle owner")
    }

    // ========================================================================
    // Lifecycle Callbacks
    // ========================================================================

    /**
     * Called when the app moves to the foreground (ON_START).
     *
     * Cancels any pending grace period disconnect and reconnects the WebSocket
     * if it was connected before the app was backgrounded.
     */
    override fun onStart(owner: LifecycleOwner) {
        Log.d(TAG, "App entered foreground (ON_START)")

        // Cancel pending disconnect if returning within grace period
        disconnectJob?.cancel()
        disconnectJob = null

        if (wasConnectedBeforeBackground) {
            wasConnectedBeforeBackground = false
            Log.d(TAG, "Reconnecting WebSocket (was connected before background)")

            // Reconnect. SyncService.connect() already handles:
            // - Duplicate connection prevention (returns early if already connected)
            // - Network unavailability (transitions to DISCONNECTED, no crash/spin-loop)
            // - Encryption key validation
            try {
                syncService.connect()
            } catch (e: Exception) {
                // SyncService.connect() doesn't throw (catches internally),
                // but guard against unexpected exceptions for robustness.
                Log.e(TAG, "Failed to reconnect on foreground", e)
            }
        }
    }

    /**
     * Called when the app moves to the background (ON_STOP).
     *
     * Records the current connection state and schedules a disconnect.
     * If a grace period is configured, the disconnect is delayed to avoid
     * unnecessary cycles during quick app switches.
     */
    override fun onStop(owner: LifecycleOwner) {
        Log.d(TAG, "App entered background (ON_STOP)")

        // Record whether we were connected (or in a connecting/reconnecting state)
        val currentState = syncService.connectionState.value
        wasConnectedBeforeBackground = currentState != ConnectionState.DISCONNECTED

        if (!wasConnectedBeforeBackground) {
            Log.d(TAG, "Not connected, nothing to disconnect")
            return
        }

        if (gracePeriodMs > 0) {
            Log.d(TAG, "Scheduling disconnect after ${gracePeriodMs}ms grace period")
            disconnectJob?.cancel()
            disconnectJob = coroutineScope.launch {
                delay(gracePeriodMs)
                performDisconnect()
            }
        } else {
            performDisconnect()
        }
    }

    // ========================================================================
    // Private
    // ========================================================================

    /**
     * Perform the actual WebSocket disconnect.
     */
    private fun performDisconnect() {
        Log.d(TAG, "Disconnecting WebSocket for background")
        try {
            syncService.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "Error disconnecting WebSocket", e)
        }
    }

    companion object {
        private const val TAG = "SyncLifecycleManager"

        /**
         * Default grace period before disconnecting: 5 seconds.
         *
         * This allows quick app switches (e.g., checking a notification)
         * without triggering a full disconnect/reconnect cycle.
         */
        const val DEFAULT_GRACE_PERIOD_MS = 5_000L
    }
}
