package com.enflame.happy.data.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.app.RemoteInput
import androidx.core.content.ContextCompat
import com.enflame.happy.MainActivity
import com.enflame.happy.R
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Helper for creating and managing notifications in the Happy app.
 *
 * Handles:
 * - Creating notification channels (required for Android 8+)
 * - Building styled notifications for each category
 * - Managing notification tap navigation via deep links
 * - Checking POST_NOTIFICATIONS permission (Android 13+)
 *
 * This class is provided as a singleton via Hilt and should be initialized
 * during [com.enflame.happy.HappyApplication.onCreate] to ensure channels
 * are registered before any notifications arrive.
 */
@Singleton
class NotificationHelper @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val notificationManager = NotificationManagerCompat.from(context)

    /**
     * Create all notification channels required by the app.
     *
     * Must be called during application startup (in [com.enflame.happy.HappyApplication.onCreate]).
     * Channels are idempotent - calling this multiple times is safe.
     */
    fun createNotificationChannels() {
        val sessionChannel = NotificationChannel(
            NotificationChannels.CHANNEL_SESSION_UPDATES,
            NotificationChannels.CHANNEL_SESSION_UPDATES_NAME,
            NotificationManager.IMPORTANCE_DEFAULT
        ).apply {
            description = NotificationChannels.CHANNEL_SESSION_UPDATES_DESCRIPTION
            enableVibration(true)
        }

        val messageChannel = NotificationChannel(
            NotificationChannels.CHANNEL_MESSAGES,
            NotificationChannels.CHANNEL_MESSAGES_NAME,
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = NotificationChannels.CHANNEL_MESSAGES_DESCRIPTION
            enableVibration(true)
        }

        val pairingChannel = NotificationChannel(
            NotificationChannels.CHANNEL_PAIRING,
            NotificationChannels.CHANNEL_PAIRING_NAME,
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = NotificationChannels.CHANNEL_PAIRING_DESCRIPTION
            enableVibration(true)
        }

        notificationManager.createNotificationChannels(
            listOf(sessionChannel, messageChannel, pairingChannel)
        )

        Log.d(TAG, "Notification channels created")
    }

    /**
     * Check whether the app has permission to post notifications.
     *
     * On Android 13+ (API 33), the POST_NOTIFICATIONS runtime permission is required.
     * On earlier versions, notifications are always allowed.
     *
     * @return true if the app can post notifications.
     */
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    /**
     * Show a session update notification.
     *
     * @param sessionId The session that was updated.
     * @param title The notification title (e.g., "Session Completed").
     * @param body The notification body text.
     * @param status The session status string for additional context.
     */
    fun showSessionUpdateNotification(
        sessionId: String,
        title: String,
        body: String,
        status: String = "updated"
    ) {
        if (!hasNotificationPermission()) return

        val contentIntent = createSessionPendingIntent(sessionId)
        val viewAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification,
            "View Session",
            contentIntent
        ).build()

        val notificationId = NotificationChannels.NOTIFICATION_ID_SESSION_BASE +
            sessionId.hashCode().and(0xFFF)

        val notification = NotificationCompat.Builder(
            context,
            NotificationChannels.CHANNEL_SESSION_UPDATES
        )
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .addAction(viewAction)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        try {
            notificationManager.notify(notificationId, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Missing POST_NOTIFICATIONS permission", e)
        }
    }

    /**
     * Show a message notification with an optional inline reply action.
     *
     * @param sessionId The session the message belongs to.
     * @param title The notification title (e.g., "New Message").
     * @param body The notification body text.
     */
    fun showMessageNotification(
        sessionId: String,
        title: String,
        body: String
    ) {
        if (!hasNotificationPermission()) return

        val contentIntent = createSessionPendingIntent(sessionId)

        val remoteInput = RemoteInput.Builder(NotificationChannels.ACTION_REPLY)
            .setLabel("Type a response...")
            .build()

        val replyPendingIntent = createReplyPendingIntent(sessionId)

        val replyAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification,
            "Reply",
            replyPendingIntent
        )
            .addRemoteInput(remoteInput)
            .setAllowGeneratedReplies(true)
            .build()

        val viewAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification,
            "View Session",
            contentIntent
        ).build()

        val notificationId = NotificationChannels.NOTIFICATION_ID_MESSAGE_BASE +
            sessionId.hashCode().and(0xFFF)

        val notification = NotificationCompat.Builder(
            context,
            NotificationChannels.CHANNEL_MESSAGES
        )
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .addAction(viewAction)
            .addAction(replyAction)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        try {
            notificationManager.notify(notificationId, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Missing POST_NOTIFICATIONS permission", e)
        }
    }

    /**
     * Show a pairing request notification with approve/reject actions.
     *
     * @param machineId The machine requesting pairing, or null if unknown.
     * @param title The notification title (e.g., "Pairing Request").
     * @param body The notification body text.
     */
    fun showPairingNotification(
        machineId: String?,
        title: String,
        body: String
    ) {
        if (!hasNotificationPermission()) return

        val contentIntent = createMainPendingIntent()

        val approveIntent = createActionPendingIntent(
            NotificationChannels.ACTION_APPROVE_PAIRING,
            machineId
        )
        val approveAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification,
            "Approve",
            approveIntent
        ).build()

        val rejectIntent = createActionPendingIntent(
            NotificationChannels.ACTION_REJECT_PAIRING,
            machineId
        )
        val rejectAction = NotificationCompat.Action.Builder(
            R.drawable.ic_notification,
            "Reject",
            rejectIntent
        ).build()

        val notificationId = NotificationChannels.NOTIFICATION_ID_PAIRING_BASE +
            (machineId?.hashCode()?.and(0xFFF) ?: 0)

        val notification = NotificationCompat.Builder(
            context,
            NotificationChannels.CHANNEL_PAIRING
        )
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(contentIntent)
            .addAction(approveAction)
            .addAction(rejectAction)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        try {
            notificationManager.notify(notificationId, notification)
        } catch (e: SecurityException) {
            Log.w(TAG, "Missing POST_NOTIFICATIONS permission", e)
        }
    }

    /**
     * Cancel all notifications for a specific session.
     *
     * @param sessionId The session to cancel notifications for.
     */
    fun cancelSessionNotifications(sessionId: String) {
        val sessionNotifId = NotificationChannels.NOTIFICATION_ID_SESSION_BASE +
            sessionId.hashCode().and(0xFFF)
        val messageNotifId = NotificationChannels.NOTIFICATION_ID_MESSAGE_BASE +
            sessionId.hashCode().and(0xFFF)

        notificationManager.cancel(sessionNotifId)
        notificationManager.cancel(messageNotifId)
    }

    /**
     * Cancel all notifications posted by the app.
     */
    fun cancelAllNotifications() {
        notificationManager.cancelAll()
    }

    // --- Private helpers ---

    /**
     * Create a PendingIntent that navigates to a specific session.
     */
    private fun createSessionPendingIntent(sessionId: String): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_SESSION_ID, sessionId)
            putExtra(EXTRA_NOTIFICATION_TYPE, NotificationChannels.TYPE_SESSION_UPDATE)
        }

        return PendingIntent.getActivity(
            context,
            sessionId.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Create a PendingIntent that opens the main screen.
     */
    private fun createMainPendingIntent(): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        return PendingIntent.getActivity(
            context,
            NotificationChannels.PENDING_INTENT_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    /**
     * Create a PendingIntent for inline reply from a notification.
     */
    private fun createReplyPendingIntent(sessionId: String): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_SESSION_ID, sessionId)
            putExtra(EXTRA_NOTIFICATION_TYPE, NotificationChannels.TYPE_MESSAGE)
            putExtra(EXTRA_ACTION, NotificationChannels.ACTION_REPLY)
        }

        return PendingIntent.getActivity(
            context,
            sessionId.hashCode() + 1,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
    }

    /**
     * Create a PendingIntent for a notification action (approve/reject pairing).
     */
    private fun createActionPendingIntent(action: String, machineId: String?): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_ACTION, action)
            machineId?.let { putExtra(EXTRA_MACHINE_ID, it) }
            putExtra(EXTRA_NOTIFICATION_TYPE, NotificationChannels.TYPE_PAIRING)
        }

        val requestCode = (action.hashCode() + (machineId?.hashCode() ?: 0))
            .and(0x7FFFFFFF) // Ensure positive

        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    companion object {
        private const val TAG = "NotificationHelper"

        /** Intent extra key for session ID. */
        const val EXTRA_SESSION_ID = "extra_session_id"

        /** Intent extra key for notification type. */
        const val EXTRA_NOTIFICATION_TYPE = "extra_notification_type"

        /** Intent extra key for notification action. */
        const val EXTRA_ACTION = "extra_action"

        /** Intent extra key for machine ID. */
        const val EXTRA_MACHINE_ID = "extra_machine_id"
    }
}
