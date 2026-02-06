package com.enflame.happy.data.notifications

import android.os.Build
import android.util.Log
import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.domain.model.DeviceRegistrationRequest
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages FCM token registration with the Happy server.
 *
 * Responsible for:
 * - Retrieving the current FCM token from Firebase
 * - Storing the token locally in [TokenStorage]
 * - POSTing the token to the Happy server's device registration endpoint
 * - Handling registration failures with exponential backoff retry
 * - Re-registering when the token refreshes
 *
 * ## Lifecycle
 * - [registerIfNeeded] is called during app startup (from [com.enflame.happy.HappyApplication])
 * - [registerToken] is called from [HappyFirebaseMessagingService.onNewToken] on token refresh
 * - Registration is deferred if the user hasn't completed pairing yet (no auth token)
 *
 * ## Retry Strategy
 * Uses exponential backoff starting at 5 seconds, doubling up to 5 minutes,
 * with a maximum of 5 retry attempts per registration cycle.
 */
@Singleton
class FcmTokenRegistrationManager @Inject constructor(
    private val tokenStorage: TokenStorage,
    private val apiService: HappyApiService,
    private val coroutineScope: CoroutineScope
) {

    @Volatile
    private var isRegistering = false

    /**
     * Retrieve the current FCM token and register it with the server if needed.
     *
     * This should be called during application startup. If the user hasn't
     * completed pairing (no auth token), registration is silently deferred
     * until the next token refresh or manual call.
     */
    fun registerIfNeeded() {
        if (isRegistering) {
            Log.d(TAG, "Registration already in progress, skipping")
            return
        }

        // Defer registration until pairing is complete
        if (!tokenStorage.hasStoredCredentials()) {
            Log.d(TAG, "No auth credentials yet, deferring FCM registration")
            return
        }

        coroutineScope.launch {
            try {
                val token = FirebaseMessaging.getInstance().token.await()
                Log.d(TAG, "Retrieved FCM token, checking if registration needed")

                val storedToken = tokenStorage.fcmToken
                val lastRegisteredToken = tokenStorage.readString(KEY_LAST_REGISTERED_TOKEN)

                // Register if this is a new token or hasn't been registered yet
                if (token != lastRegisteredToken) {
                    tokenStorage.fcmToken = token
                    registerTokenWithRetry(token)
                } else {
                    Log.d(TAG, "FCM token already registered with server")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to retrieve FCM token", e)
            }
        }
    }

    /**
     * Register a specific FCM token with the server.
     *
     * Called from [HappyFirebaseMessagingService.onNewToken] when the token refreshes.
     * If the user hasn't authenticated yet, the token is stored locally and
     * registration is deferred.
     *
     * @param token The new FCM registration token.
     */
    fun registerToken(token: String) {
        // Always store the token locally
        tokenStorage.fcmToken = token

        // Defer server registration until pairing is complete
        if (!tokenStorage.hasStoredCredentials()) {
            Log.d(TAG, "Stored FCM token locally, deferring server registration (no auth)")
            return
        }

        coroutineScope.launch {
            registerTokenWithRetry(token)
        }
    }

    /**
     * Unregister the current device token from the server.
     *
     * Called during logout to stop receiving push notifications.
     */
    fun unregisterCurrentToken() {
        val token = tokenStorage.fcmToken ?: return

        coroutineScope.launch {
            try {
                apiService.unregisterDevice(token)
                tokenStorage.remove(KEY_LAST_REGISTERED_TOKEN)
                Log.d(TAG, "Device unregistered from server")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to unregister device (non-fatal)", e)
            }
        }
    }

    /**
     * Attempt to register the FCM token with the server using exponential backoff.
     *
     * Retries up to [MAX_RETRIES] times with delays starting at [INITIAL_RETRY_DELAY_MS]
     * and doubling up to [MAX_RETRY_DELAY_MS].
     */
    private suspend fun registerTokenWithRetry(token: String) {
        isRegistering = true
        var retryCount = 0
        var currentDelay = INITIAL_RETRY_DELAY_MS

        try {
            while (retryCount <= MAX_RETRIES) {
                try {
                    val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}"
                    val request = DeviceRegistrationRequest(
                        token = token,
                        platform = "android",
                        deviceName = deviceName
                    )

                    val response = apiService.registerDevice(request)
                    Log.d(TAG, "FCM token registered with server (deviceId=${response.deviceId})")

                    // Store the token as successfully registered
                    tokenStorage.saveString(KEY_LAST_REGISTERED_TOKEN, token)
                    return
                } catch (e: Exception) {
                    retryCount++
                    if (retryCount > MAX_RETRIES) {
                        Log.e(TAG, "FCM token registration failed after $MAX_RETRIES retries", e)
                        return
                    }

                    Log.w(
                        TAG,
                        "FCM token registration attempt $retryCount/$MAX_RETRIES failed, " +
                            "retrying in ${currentDelay}ms",
                        e
                    )
                    delay(currentDelay)
                    currentDelay = (currentDelay * 2).coerceAtMost(MAX_RETRY_DELAY_MS)
                }
            }
        } finally {
            isRegistering = false
        }
    }

    companion object {
        private const val TAG = "FcmTokenRegistration"

        /** Key for storing the last token successfully registered with the server. */
        internal const val KEY_LAST_REGISTERED_TOKEN = "fcm_last_registered_token"

        /** Maximum number of retry attempts for token registration. */
        private const val MAX_RETRIES = 5

        /** Initial retry delay in milliseconds (5 seconds). */
        private const val INITIAL_RETRY_DELAY_MS = 5_000L

        /** Maximum retry delay in milliseconds (5 minutes). */
        private const val MAX_RETRY_DELAY_MS = 300_000L
    }
}
