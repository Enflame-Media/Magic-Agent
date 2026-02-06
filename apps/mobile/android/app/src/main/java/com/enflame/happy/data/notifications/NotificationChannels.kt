package com.enflame.happy.data.notifications

/**
 * Notification channel and category definitions for the Happy app.
 *
 * Defines the notification channels required by Android 8+ (API 26+) and
 * the notification categories/actions that match the iOS APNs categories
 * for feature parity.
 *
 * ## Channels
 * - **session_updates** - Session state changes (completed, error, waiting for input)
 * - **messages** - New messages in a session
 * - **pairing** - Pairing request status changes
 *
 * ## Actions
 * - **VIEW_SESSION** - Open the session in the app
 * - **REPLY** - Inline reply to a session prompt
 * - **APPROVE_PAIRING** - Approve a pairing request
 * - **REJECT_PAIRING** - Reject a pairing request
 */
object NotificationChannels {

    // --- Channel IDs ---

    /** Channel for session state change notifications. */
    const val CHANNEL_SESSION_UPDATES = "session_updates"

    /** Channel for new message notifications. */
    const val CHANNEL_MESSAGES = "messages"

    /** Channel for pairing request notifications. */
    const val CHANNEL_PAIRING = "pairing"

    /** Channel for media playback foreground service notifications. */
    const val CHANNEL_MEDIA_PLAYBACK = "media_playback"

    // --- Channel Display Names ---

    const val CHANNEL_SESSION_UPDATES_NAME = "Session Updates"
    const val CHANNEL_SESSION_UPDATES_DESCRIPTION =
        "Notifications about session state changes (completed, error, waiting for input)"

    const val CHANNEL_MESSAGES_NAME = "Messages"
    const val CHANNEL_MESSAGES_DESCRIPTION =
        "Notifications for new messages in your sessions"

    const val CHANNEL_PAIRING_NAME = "Pairing Requests"
    const val CHANNEL_PAIRING_DESCRIPTION =
        "Notifications about device pairing requests and status changes"

    const val CHANNEL_MEDIA_PLAYBACK_NAME = "Media Playback"
    const val CHANNEL_MEDIA_PLAYBACK_DESCRIPTION =
        "Controls for audio playback when playing in the background"

    // --- Notification Types (from server payload) ---

    /** Notification type for session state changes. */
    const val TYPE_SESSION_UPDATE = "session_update"

    /** Notification type for new messages. */
    const val TYPE_MESSAGE = "message"

    /** Notification type for pairing requests. */
    const val TYPE_PAIRING = "pairing"

    // --- Action IDs ---

    /** Action to view the associated session. */
    const val ACTION_VIEW_SESSION = "VIEW_SESSION"

    /** Action to reply to a session prompt. */
    const val ACTION_REPLY = "REPLY"

    /** Action to approve a pairing request. */
    const val ACTION_APPROVE_PAIRING = "APPROVE_PAIRING"

    /** Action to reject a pairing request. */
    const val ACTION_REJECT_PAIRING = "REJECT_PAIRING"

    // --- Deep Link Scheme ---

    /** Deep link scheme for notification tap navigation. */
    const val DEEP_LINK_SCHEME = "happy"

    /** Deep link host for session navigation. */
    const val DEEP_LINK_HOST = "session"

    /**
     * Build a deep link URI for navigating to a specific session.
     *
     * @param sessionId The session to navigate to.
     * @return The deep link URI string: "happy://session/{sessionId}"
     */
    fun buildSessionDeepLink(sessionId: String): String {
        return "$DEEP_LINK_SCHEME://$DEEP_LINK_HOST/$sessionId"
    }

    // --- Notification IDs ---

    /** Base notification ID for session update notifications. */
    const val NOTIFICATION_ID_SESSION_BASE = 1000

    /** Base notification ID for message notifications. */
    const val NOTIFICATION_ID_MESSAGE_BASE = 2000

    /** Base notification ID for pairing notifications. */
    const val NOTIFICATION_ID_PAIRING_BASE = 3000

    /** Request code for notification pending intents. */
    const val PENDING_INTENT_REQUEST_CODE = 0
}
