package com.enflame.happy.domain.repository

import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendInviteLink
import com.enflame.happy.domain.model.FriendRequest
import com.enflame.happy.domain.model.InviteSource
import com.enflame.happy.domain.model.PrivacySettings
import com.enflame.happy.domain.model.SessionShare
import com.enflame.happy.domain.model.SharePermission
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for friends data operations.
 *
 * Defines the contract for accessing friends data regardless of the
 * underlying data source (network, local cache, etc.).
 */
interface FriendsRepository {

    /**
     * Get all friends as a Flow for reactive updates.
     */
    fun getFriends(): Flow<List<Friend>>

    /**
     * Get all pending friend requests as a Flow for reactive updates.
     */
    fun getFriendRequests(): Flow<List<FriendRequest>>

    /**
     * Refresh friends list from the remote server.
     */
    suspend fun refreshFriends()

    /**
     * Refresh friend requests from the remote server.
     */
    suspend fun refreshFriendRequests()

    /**
     * Send a friend request to a user by username.
     *
     * @param username The target user's username.
     * @param message Optional message to include with the request.
     * @return The created friend request.
     */
    suspend fun sendFriendRequest(username: String, message: String? = null): FriendRequest

    /**
     * Accept a pending friend request.
     *
     * @param requestId The unique identifier of the friend request.
     * @return The updated friend request.
     */
    suspend fun acceptFriendRequest(requestId: String): FriendRequest

    /**
     * Decline a pending friend request.
     *
     * @param requestId The unique identifier of the friend request.
     * @return The updated friend request.
     */
    suspend fun declineFriendRequest(requestId: String): FriendRequest

    /**
     * Remove a friend connection.
     *
     * @param friendId The unique identifier of the friend to remove.
     */
    suspend fun removeFriend(friendId: String)

    // --- Privacy Settings ---

    /**
     * Get the current user's privacy settings.
     *
     * @return The current privacy settings.
     */
    suspend fun getPrivacySettings(): PrivacySettings

    /**
     * Update the current user's privacy settings.
     *
     * @param settings The updated privacy settings.
     * @return The updated privacy settings as confirmed by the server.
     */
    suspend fun updatePrivacySettings(settings: PrivacySettings): PrivacySettings

    // --- Session Sharing ---

    /**
     * Share a session with a friend.
     *
     * @param sessionId The ID of the session to share.
     * @param friendId The ID of the friend to share with.
     * @param permission The permission level to grant.
     * @return The created session share record.
     */
    suspend fun shareSession(
        sessionId: String,
        friendId: String,
        permission: SharePermission = SharePermission.VIEW
    ): SessionShare

    /**
     * Get all sessions shared with a specific friend.
     *
     * @param friendId The friend's unique identifier.
     * @return List of session shares with this friend.
     */
    suspend fun getSharedSessions(friendId: String): List<SessionShare>

    /**
     * Revoke a session share.
     *
     * @param sessionId The session ID.
     * @param shareId The share record ID to revoke.
     */
    suspend fun revokeSessionShare(sessionId: String, shareId: String)

    // --- Friend Invites ---

    /**
     * Generate a friend invite link/code.
     *
     * @return The generated invite with code, URL, and expiration.
     */
    suspend fun generateFriendInvite(): FriendInviteLink

    /**
     * Process a friend invite code (from QR scan or deep link).
     *
     * @param code The invite code.
     * @param source How the invite was received (QR_CODE or LINK).
     * @return The resulting friend request.
     */
    suspend fun processFriendInvite(code: String, source: InviteSource): FriendRequest
}
