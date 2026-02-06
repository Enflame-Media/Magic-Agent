package com.enflame.happy.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * QR code payload for friend invitations.
 *
 * This format is cross-platform compatible with iOS (HAP-1011).
 * Both platforms encode/decode this JSON structure when generating
 * and scanning friend invite QR codes.
 *
 * @property type The type identifier, always "friend-invite".
 * @property userId The inviting user's unique identifier.
 * @property username The inviting user's username.
 * @property displayName The inviting user's display name.
 * @property code A unique invite code for server validation.
 */
@Serializable
data class FriendInvitePayload(
    val type: String = PAYLOAD_TYPE,
    val userId: String,
    val username: String,
    val displayName: String? = null,
    val code: String
) {
    companion object {
        /** Expected type field value for friend invite QR codes. */
        const val PAYLOAD_TYPE = "friend-invite"
    }
}

/**
 * Response from the server when generating a friend invite link/code.
 *
 * @property code The unique invite code.
 * @property url The shareable invite URL (e.g., https://happy.app/invite/{code}).
 * @property expiresAt Timestamp when the invite expires.
 */
@Serializable
data class FriendInviteLink(
    val code: String,
    val url: String,
    val expiresAt: Long? = null
)

/**
 * Request body for processing a friend invite (from QR scan or deep link).
 *
 * @property code The invite code from the QR payload or URL.
 * @property source How the invite was received.
 */
@Serializable
data class ProcessFriendInviteRequest(
    val code: String,
    val source: InviteSource = InviteSource.QR_CODE
)

/**
 * Source of a friend invite.
 */
@Serializable
enum class InviteSource {
    /** Invite was scanned from a QR code. */
    @SerialName("qr_code")
    QR_CODE,

    /** Invite was opened from a shareable link. */
    @SerialName("link")
    LINK
}
