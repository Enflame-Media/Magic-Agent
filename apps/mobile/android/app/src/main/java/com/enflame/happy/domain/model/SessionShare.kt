package com.enflame.happy.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Domain model representing a session shared with a friend.
 *
 * Maps to the server-side session sharing API (HAP-772).
 *
 * @property id Unique identifier for the share record.
 * @property sessionId The ID of the shared session.
 * @property sessionTitle The title of the shared session, if available.
 * @property friendId The ID of the friend the session is shared with.
 * @property friendDisplayName The display name of the friend.
 * @property permission The permission level granted to the friend.
 * @property sharedAt Timestamp of when the session was shared.
 */
@Serializable
data class SessionShare(
    val id: String,
    val sessionId: String,
    val sessionTitle: String? = null,
    val friendId: String,
    val friendDisplayName: String? = null,
    val permission: SharePermission = SharePermission.VIEW,
    val sharedAt: Long
)

/**
 * Permission level for a shared session.
 */
@Serializable
enum class SharePermission {
    /** The friend can only view the session content. */
    @SerialName("view")
    VIEW,

    /** The friend can interact with the session (send messages). */
    @SerialName("interact")
    INTERACT
}

/**
 * Request body for sharing a session with a friend.
 *
 * @property friendId The ID of the friend to share with.
 * @property permission The permission level to grant.
 */
@Serializable
data class ShareSessionRequest(
    val friendId: String,
    val permission: SharePermission = SharePermission.VIEW
)
