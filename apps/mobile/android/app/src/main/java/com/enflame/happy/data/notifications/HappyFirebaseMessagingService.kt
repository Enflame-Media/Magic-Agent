package com.enflame.happy.data.notifications

import android.util.Log
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.local.UserPreferencesDataStore
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

/**
 * Firebase Cloud Messaging service for the Happy app.
 *
 * Handles the complete FCM lifecycle:
 * - **Token registration**: Stores new/refreshed FCM tokens in [TokenStorage]
 *   and triggers server registration via [FcmTokenRegistrationManager].
 * - **Message processing**: Routes incoming push notifications to the
 *   appropriate [NotificationHelper] method based on the message type.
 * - **Preference enforcement**: Checks user notification preferences from
 *   [UserPreferencesDataStore] before displaying any notification.
 *
 * ## Notification Types
 * Matches the iOS APNs notification categories for feature parity:
 * - `session_update` - Session state changes (completed, error, waiting for input)
 * - `message` - New messages in a session (supports inline reply)
 * - `pairing` - Pairing request status changes (approve/reject actions)
 *
 * ## Hilt Integration
 * Annotated with [@AndroidEntryPoint] to support field injection of
 * [TokenStorage], [NotificationHelper], [FcmTokenRegistrationManager],
 * and [UserPreferencesDataStore] singletons.
 *
 * ## Manifest Registration
 * Must be registered in AndroidManifest.xml:
 * ```xml
 * <service
 *     android:name=".data.notifications.HappyFirebaseMessagingService"
 *     android:exported="false">
 *     <intent-filter>
 *         <action android:name="com.google.firebase.MESSAGING_EVENT" />
 *     </intent-filter>
 * </service>
 * ```
 */
@AndroidEntryPoint
class HappyFirebaseMessagingService : FirebaseMessagingService() {

    @Inject
    lateinit var tokenStorage: TokenStorage

    @Inject
    lateinit var notificationHelper: NotificationHelper

    @Inject
    lateinit var tokenRegistrationManager: FcmTokenRegistrationManager

    @Inject
    lateinit var userPreferences: UserPreferencesDataStore

    /**
     * Called when a new FCM registration token is generated.
     *
     * This can happen when:
     * - The app is installed for the first time
     * - The user uninstalls/reinstalls the app
     * - The user clears app data
     * - The token is rotated by FCM
     *
     * The token is stored securely in [TokenStorage] and registered
     * with the Happy server via [FcmTokenRegistrationManager].
     *
     * @param token The new FCM registration token.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")

        // Register the token with the server (handles storage + retry)
        tokenRegistrationManager.registerToken(token)
    }

    /**
     * Called when an FCM message is received.
     *
     * Processes both data-only messages and notification+data messages.
     * Checks user notification preferences before displaying - if the user
     * has disabled notifications in settings, messages are silently dropped.
     *
     * Routes to the appropriate notification builder based on the `type`
     * field in the data payload.
     *
     * @param message The received FCM message.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Log.d(TAG, "FCM message received from: ${message.from}")

        // Check if user has disabled notifications in app preferences.
        // Uses runBlocking because onMessageReceived runs on a background
        // thread and we need the preference value synchronously.
        val notificationsEnabled = try {
            runBlocking { userPreferences.notificationsEnabled.first() }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to read notification preference, defaulting to enabled", e)
            true
        }

        if (!notificationsEnabled) {
            Log.d(TAG, "Notifications disabled by user preference, dropping message")
            return
        }

        val data = message.data
        val type = data["type"]

        if (type == null) {
            // If no data payload type, fall back to the notification payload
            message.notification?.let { notification ->
                notificationHelper.showSessionUpdateNotification(
                    sessionId = data["sessionId"] ?: "unknown",
                    title = notification.title ?: "Happy",
                    body = notification.body ?: "You have a new notification."
                )
            }
            return
        }

        when (type) {
            NotificationChannels.TYPE_SESSION_UPDATE -> handleSessionUpdate(data)
            NotificationChannels.TYPE_MESSAGE -> handleMessage(data)
            NotificationChannels.TYPE_PAIRING -> handlePairing(data)
            else -> {
                Log.w(TAG, "Unknown notification type: $type")
            }
        }
    }

    /**
     * Handle a session update push notification.
     *
     * Extracts session ID and status from the data payload and shows
     * a notification in the session_updates channel.
     */
    private fun handleSessionUpdate(data: Map<String, String>) {
        val sessionId = data["sessionId"] ?: run {
            Log.w(TAG, "Session update missing sessionId")
            return
        }

        val status = data["status"] ?: "updated"
        val title = data["title"] ?: "Session Update"
        val body = data["body"] ?: "Session has been $status."

        notificationHelper.showSessionUpdateNotification(
            sessionId = sessionId,
            title = title,
            body = body,
            status = status
        )
    }

    /**
     * Handle a message push notification.
     *
     * Extracts session ID from the data payload and shows a notification
     * in the messages channel with an inline reply action.
     */
    private fun handleMessage(data: Map<String, String>) {
        val sessionId = data["sessionId"] ?: run {
            Log.w(TAG, "Message notification missing sessionId")
            return
        }

        val title = data["title"] ?: "New Message"
        val body = data["body"] ?: "You have a new message."

        notificationHelper.showMessageNotification(
            sessionId = sessionId,
            title = title,
            body = body
        )
    }

    /**
     * Handle a pairing request push notification.
     *
     * Extracts machine ID from the data payload and shows a notification
     * in the pairing channel with approve/reject actions.
     */
    private fun handlePairing(data: Map<String, String>) {
        val machineId = data["machineId"]
        val title = data["title"] ?: "Pairing Request"
        val body = data["body"] ?: "A new device wants to connect."

        notificationHelper.showPairingNotification(
            machineId = machineId,
            title = title,
            body = body
        )
    }

    companion object {
        private const val TAG = "HappyFCMService"

        /** Storage key for the FCM registration token in [TokenStorage]. */
        const val KEY_FCM_TOKEN = "fcm_token"
    }
}
