package com.enflame.happy.data.notifications

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for [NotificationChannels] constants and utility functions.
 *
 * Verifies that channel IDs, action IDs, and deep link builders produce
 * the expected values. These tests ensure consistency with the iOS APNs
 * category/action identifiers for feature parity.
 */
class NotificationChannelsTest {

    // --- Channel IDs ---

    @Test
    fun `channel IDs are unique`() {
        val channelIds = setOf(
            NotificationChannels.CHANNEL_SESSION_UPDATES,
            NotificationChannels.CHANNEL_MESSAGES,
            NotificationChannels.CHANNEL_PAIRING
        )
        assertEquals("All channel IDs must be unique", 3, channelIds.size)
    }

    @Test
    fun `channel IDs match expected values`() {
        assertEquals("session_updates", NotificationChannels.CHANNEL_SESSION_UPDATES)
        assertEquals("messages", NotificationChannels.CHANNEL_MESSAGES)
        assertEquals("pairing", NotificationChannels.CHANNEL_PAIRING)
    }

    // --- Notification Types ---

    @Test
    fun `notification types match iOS categories`() {
        // These must match the iOS PushNotificationService.Category values
        assertEquals("session_update", NotificationChannels.TYPE_SESSION_UPDATE)
        assertEquals("message", NotificationChannels.TYPE_MESSAGE)
        assertEquals("pairing", NotificationChannels.TYPE_PAIRING)
    }

    // --- Action IDs ---

    @Test
    fun `action IDs are unique`() {
        val actionIds = setOf(
            NotificationChannels.ACTION_VIEW_SESSION,
            NotificationChannels.ACTION_REPLY,
            NotificationChannels.ACTION_APPROVE_PAIRING,
            NotificationChannels.ACTION_REJECT_PAIRING
        )
        assertEquals("All action IDs must be unique", 4, actionIds.size)
    }

    @Test
    fun `action IDs match iOS action identifiers`() {
        // These must match the iOS PushNotificationService.Action values
        assertEquals("VIEW_SESSION", NotificationChannels.ACTION_VIEW_SESSION)
        assertEquals("REPLY", NotificationChannels.ACTION_REPLY)
        assertEquals("APPROVE_PAIRING", NotificationChannels.ACTION_APPROVE_PAIRING)
        assertEquals("REJECT_PAIRING", NotificationChannels.ACTION_REJECT_PAIRING)
    }

    // --- Deep Links ---

    @Test
    fun `buildSessionDeepLink produces correct URI format`() {
        val deepLink = NotificationChannels.buildSessionDeepLink("session-123")
        assertEquals("happy://session/session-123", deepLink)
    }

    @Test
    fun `buildSessionDeepLink handles special characters in session ID`() {
        val deepLink = NotificationChannels.buildSessionDeepLink("abc-def-456")
        assertEquals("happy://session/abc-def-456", deepLink)
    }

    @Test
    fun `deep link scheme is correct`() {
        assertEquals("happy", NotificationChannels.DEEP_LINK_SCHEME)
    }

    @Test
    fun `deep link host is correct`() {
        assertEquals("session", NotificationChannels.DEEP_LINK_HOST)
    }

    // --- Notification ID Bases ---

    @Test
    fun `notification ID bases are non-overlapping`() {
        val bases = listOf(
            NotificationChannels.NOTIFICATION_ID_SESSION_BASE,
            NotificationChannels.NOTIFICATION_ID_MESSAGE_BASE,
            NotificationChannels.NOTIFICATION_ID_PAIRING_BASE
        )

        // Each base should be at least 1000 apart to avoid collisions
        for (i in bases.indices) {
            for (j in i + 1 until bases.size) {
                val diff = kotlin.math.abs(bases[i] - bases[j])
                assertTrue(
                    "Notification ID bases should be at least 1000 apart, got $diff",
                    diff >= 1000
                )
            }
        }
    }

    @Test
    fun `notification ID bases are positive`() {
        assertTrue(NotificationChannels.NOTIFICATION_ID_SESSION_BASE > 0)
        assertTrue(NotificationChannels.NOTIFICATION_ID_MESSAGE_BASE > 0)
        assertTrue(NotificationChannels.NOTIFICATION_ID_PAIRING_BASE > 0)
    }

    // --- Channel Display Names ---

    @Test
    fun `channel names are non-empty`() {
        assertTrue(NotificationChannels.CHANNEL_SESSION_UPDATES_NAME.isNotBlank())
        assertTrue(NotificationChannels.CHANNEL_MESSAGES_NAME.isNotBlank())
        assertTrue(NotificationChannels.CHANNEL_PAIRING_NAME.isNotBlank())
    }

    @Test
    fun `channel descriptions are non-empty`() {
        assertTrue(NotificationChannels.CHANNEL_SESSION_UPDATES_DESCRIPTION.isNotBlank())
        assertTrue(NotificationChannels.CHANNEL_MESSAGES_DESCRIPTION.isNotBlank())
        assertTrue(NotificationChannels.CHANNEL_PAIRING_DESCRIPTION.isNotBlank())
    }
}
