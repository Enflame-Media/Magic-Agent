package com.enflame.happy.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Domain model representing a friend connection between two Happy users.
 *
 * Friends can see each other's online status and share Claude Code sessions
 * in real-time. This model mirrors the server-side representation.
 *
 * @property id Unique identifier for the friend relationship.
 * @property displayName The friend's display name.
 * @property username The friend's username for identification.
 * @property avatarUrl The friend's avatar URL, if available.
 * @property status The friend's current online status.
 * @property lastSeen Timestamp of when the friend was last seen online (null if currently online).
 * @property addedAt Timestamp of when the friendship was established.
 * @property sharedSessionCount Number of shared sessions with this friend.
 */
@Serializable
data class Friend(
    val id: String,
    val displayName: String,
    val username: String,
    val avatarUrl: String? = null,
    val status: FriendStatus = FriendStatus.OFFLINE,
    val lastSeen: Long? = null,
    val addedAt: Long,
    val sharedSessionCount: Int = 0
) {
    /**
     * Whether this friend is currently online (any non-offline status).
     */
    val isOnline: Boolean
        get() = status != FriendStatus.OFFLINE
}

/**
 * Online status of a friend.
 */
@Serializable
enum class FriendStatus {
    /** The friend is currently online and active. */
    @SerialName("online")
    ONLINE,

    /** The friend is online but idle/away. */
    @SerialName("away")
    AWAY,

    /** The friend is currently in a Claude Code session. */
    @SerialName("in_session")
    IN_SESSION,

    /** The friend is offline. */
    @SerialName("offline")
    OFFLINE
}

/**
 * Domain model representing a friend request.
 *
 * @property id Unique identifier for the friend request.
 * @property fromUser The user who sent the request.
 * @property toUser The user who received the request.
 * @property status The current status of the request.
 * @property message Optional message included with the request.
 * @property createdAt Timestamp of when the request was created.
 */
@Serializable
data class FriendRequest(
    val id: String,
    val fromUser: FriendRequestUser,
    val toUser: FriendRequestUser,
    val status: FriendRequestStatus = FriendRequestStatus.PENDING,
    val message: String? = null,
    val createdAt: Long
)

/**
 * Minimal user info included in a friend request.
 *
 * @property id The user's unique identifier.
 * @property displayName The user's display name.
 * @property username The user's username.
 * @property avatarUrl The user's avatar URL, if available.
 */
@Serializable
data class FriendRequestUser(
    val id: String,
    val displayName: String,
    val username: String,
    val avatarUrl: String? = null
)

/**
 * Status of a friend request.
 */
@Serializable
enum class FriendRequestStatus {
    /** The request is awaiting a response. */
    @SerialName("pending")
    PENDING,

    /** The request has been accepted. */
    @SerialName("accepted")
    ACCEPTED,

    /** The request has been declined. */
    @SerialName("declined")
    DECLINED
}
