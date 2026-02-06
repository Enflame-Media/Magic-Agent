package com.enflame.happy.data.api

import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.DeviceRegistrationRequest
import com.enflame.happy.domain.model.DeviceRegistrationResponse
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionShare
import com.enflame.happy.domain.model.ShareSessionRequest
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

/**
 * Retrofit API service interface for Happy server.
 *
 * Defines all HTTP endpoints for communicating with the Happy backend.
 * All methods are suspend functions for coroutine-based async execution.
 */
interface HappyApiService {

    /**
     * Get list of all sessions for the authenticated user.
     */
    @GET("v1/sessions")
    suspend fun getSessions(): List<Session>

    /**
     * Get details for a specific session.
     *
     * @param sessionId The unique identifier of the session.
     */
    @GET("v1/sessions/{sessionId}")
    suspend fun getSession(@Path("sessionId") sessionId: String): Session

    /**
     * Get artifacts for a specific session.
     *
     * @param sessionId The unique identifier of the session.
     */
    @GET("v1/sessions/{sessionId}/artifacts")
    suspend fun getArtifacts(@Path("sessionId") sessionId: String): List<Artifact>

    // --- Session Sharing (HAP-772) ---

    /**
     * Share a session with a friend.
     *
     * @param sessionId The unique identifier of the session to share.
     * @param request The share request with friend ID and permission level.
     * @return The created session share record.
     */
    @POST("v1/sessions/{sessionId}/share")
    suspend fun shareSession(
        @Path("sessionId") sessionId: String,
        @Body request: ShareSessionRequest
    ): SessionShare

    /**
     * Revoke a session share.
     *
     * @param sessionId The session ID.
     * @param shareId The share record ID to revoke.
     */
    @DELETE("v1/sessions/{sessionId}/share/{shareId}")
    suspend fun revokeSessionShare(
        @Path("sessionId") sessionId: String,
        @Path("shareId") shareId: String
    )

    /**
     * Get all sessions shared with a specific friend.
     *
     * @param friendId The friend's unique identifier.
     * @return List of session shares with this friend.
     */
    @GET("v1/friends/{friendId}/shared-sessions")
    suspend fun getSharedSessions(
        @Path("friendId") friendId: String
    ): List<SessionShare>

    // --- Device Registration (Push Notifications) ---

    /**
     * Register a device for push notifications.
     *
     * Sends the FCM registration token to the server so it can deliver
     * push notifications to this device. Should be called on first launch
     * and whenever the FCM token is refreshed.
     *
     * @param request The device registration request with FCM token and platform info.
     * @return The registration response with device ID confirmation.
     */
    @POST("v1/devices/register")
    suspend fun registerDevice(@Body request: DeviceRegistrationRequest): DeviceRegistrationResponse

    /**
     * Unregister a device from push notifications.
     *
     * Called during logout to stop receiving push notifications on this device.
     *
     * @param deviceToken The FCM token to unregister.
     */
    @DELETE("v1/devices/{deviceToken}")
    suspend fun unregisterDevice(@Path("deviceToken") deviceToken: String)

    // Additional endpoints will be added as development progresses:
    // - POST /v1/sessions - Create session
    // - PUT /v1/sessions/{sessionId} - Update session
    // - DELETE /v1/sessions/{sessionId} - Delete session
    // - POST /v1/sessions/{sessionId}/messages - Send message
}
