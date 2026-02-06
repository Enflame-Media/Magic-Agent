package com.enflame.happy.data.api

import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.Session
import retrofit2.http.GET
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

    // Additional endpoints will be added as development progresses:
    // - POST /v1/sessions - Create session
    // - PUT /v1/sessions/{sessionId} - Update session
    // - DELETE /v1/sessions/{sessionId} - Delete session
    // - POST /v1/sessions/{sessionId}/messages - Send message
}
