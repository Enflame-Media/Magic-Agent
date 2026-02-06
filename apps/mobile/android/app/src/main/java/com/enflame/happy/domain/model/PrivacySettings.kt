package com.enflame.happy.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Domain model representing user privacy settings.
 *
 * Controls visibility and discoverability preferences for the user's
 * social features. Maps to the server-side privacy settings API (HAP-794).
 *
 * @property onlineStatusVisible Whether online status is visible to friends.
 * @property profileVisibility Who can see the user's full profile.
 * @property friendRequestPermission Who can send the user friend requests.
 */
@Serializable
data class PrivacySettings(
    val onlineStatusVisible: Boolean = true,
    val profileVisibility: ProfileVisibility = ProfileVisibility.EVERYONE,
    val friendRequestPermission: FriendRequestPermission = FriendRequestPermission.EVERYONE
)

/**
 * Controls who can see the user's full profile information.
 */
@Serializable
enum class ProfileVisibility {
    /** Profile is visible to everyone. */
    @SerialName("everyone")
    EVERYONE,

    /** Profile is only visible to accepted friends. */
    @SerialName("friends_only")
    FRIENDS_ONLY
}

/**
 * Controls who can send the user friend requests.
 */
@Serializable
enum class FriendRequestPermission {
    /** Anyone can send friend requests. */
    @SerialName("everyone")
    EVERYONE,

    /** Only friends of friends can send requests. */
    @SerialName("friends_of_friends")
    FRIENDS_OF_FRIENDS,

    /** No one can send friend requests. */
    @SerialName("none")
    NONE
}
