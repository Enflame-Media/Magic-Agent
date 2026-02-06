package com.enflame.happy.domain.repository

import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.Session
import kotlinx.coroutines.flow.Flow

/**
 * Repository interface for session data operations.
 *
 * Defines the contract for accessing session data regardless of the
 * underlying data source (network, local database, etc.).
 */
interface SessionRepository {

    /**
     * Get all sessions as a Flow for reactive updates.
     */
    fun getSessions(): Flow<List<Session>>

    /**
     * Get a specific session by ID.
     *
     * @param sessionId The unique identifier of the session.
     * @return The session if found, null otherwise.
     */
    suspend fun getSession(sessionId: String): Session?

    /**
     * Refresh sessions from the remote server.
     */
    suspend fun refreshSessions()

    /**
     * Subscribe to real-time updates for a session.
     *
     * @param sessionId The session to subscribe to.
     */
    suspend fun subscribeToSession(sessionId: String)

    /**
     * Unsubscribe from session updates.
     *
     * @param sessionId The session to unsubscribe from.
     */
    suspend fun unsubscribeFromSession(sessionId: String)

    /**
     * Get artifacts for a specific session.
     *
     * @param sessionId The session to get artifacts for.
     * @return List of artifacts for the session.
     */
    suspend fun getArtifacts(sessionId: String): List<Artifact>

    /**
     * Get all active sessions (status ACTIVE or IDLE) for sharing.
     *
     * @return List of currently active sessions.
     */
    suspend fun getActiveSessions(): List<Session>
}
