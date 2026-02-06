package com.enflame.happy.domain.repository

import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendRequest
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
}
