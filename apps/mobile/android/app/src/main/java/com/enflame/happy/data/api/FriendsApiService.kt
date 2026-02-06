package com.enflame.happy.data.api

import com.enflame.happy.domain.model.Friend
import com.enflame.happy.domain.model.FriendInviteLink
import com.enflame.happy.domain.model.FriendRequest
import com.enflame.happy.domain.model.PrivacySettings
import com.enflame.happy.domain.model.ProcessFriendInviteRequest
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

/**
 * Retrofit API service interface for friends endpoints.
 *
 * Defines all HTTP endpoints for the friends and social features
 * of the Happy server API.
 */
interface FriendsApiService {

    /**
     * Get the list of all friends for the authenticated user.
     *
     * @return List of friends with their current status.
     */
    @GET("v1/friends")
    suspend fun getFriends(): List<Friend>

    /**
     * Send a friend request to another user.
     *
     * @param request The friend request payload containing the target username.
     * @return The created friend request.
     */
    @POST("v1/friends/request")
    suspend fun sendFriendRequest(@Body request: SendFriendRequestBody): FriendRequest

    /**
     * Accept a pending friend request.
     *
     * @param requestId The unique identifier of the friend request.
     * @return The updated friend request with ACCEPTED status.
     */
    @PUT("v1/friends/request/{requestId}/accept")
    suspend fun acceptFriendRequest(@Path("requestId") requestId: String): FriendRequest

    /**
     * Decline a pending friend request.
     *
     * @param requestId The unique identifier of the friend request.
     * @return The updated friend request with DECLINED status.
     */
    @PUT("v1/friends/request/{requestId}/decline")
    suspend fun declineFriendRequest(@Path("requestId") requestId: String): FriendRequest

    /**
     * Get all pending friend requests (both sent and received).
     *
     * @return List of pending friend requests.
     */
    @GET("v1/friends/requests")
    suspend fun getFriendRequests(): List<FriendRequest>

    /**
     * Remove a friend connection.
     *
     * @param friendId The unique identifier of the friend to remove.
     */
    @DELETE("v1/friends/{friendId}")
    suspend fun removeFriend(@Path("friendId") friendId: String)

    // --- Privacy Settings (HAP-794) ---

    /**
     * Get the current user's privacy settings.
     *
     * @return The current privacy settings.
     */
    @GET("v1/users/me/privacy")
    suspend fun getPrivacySettings(): PrivacySettings

    /**
     * Update the current user's privacy settings.
     *
     * @param settings The updated privacy settings.
     * @return The updated privacy settings as confirmed by the server.
     */
    @PATCH("v1/users/me/privacy")
    suspend fun updatePrivacySettings(@Body settings: PrivacySettings): PrivacySettings

    // --- Friend Invites (QR + Links) ---

    /**
     * Generate a friend invite link/code for the current user.
     *
     * The returned code can be encoded into a QR payload or shared as a URL.
     *
     * @return The generated invite link with code and URL.
     */
    @POST("v1/friends/invite")
    suspend fun generateFriendInvite(): FriendInviteLink

    /**
     * Process a friend invite code (from QR scan or deep link).
     *
     * Creates a friend request from the invite sender to the current user,
     * or auto-accepts if both users have invited each other.
     *
     * @param request The invite processing request with code and source.
     * @return The resulting friend request.
     */
    @POST("v1/friends/invite/process")
    suspend fun processFriendInvite(
        @Body request: ProcessFriendInviteRequest
    ): FriendRequest
}

/**
 * Request body for sending a friend request.
 *
 * @property username The target user's username.
 * @property message An optional message to include with the request.
 */
@kotlinx.serialization.Serializable
data class SendFriendRequestBody(
    val username: String,
    val message: String? = null
)
