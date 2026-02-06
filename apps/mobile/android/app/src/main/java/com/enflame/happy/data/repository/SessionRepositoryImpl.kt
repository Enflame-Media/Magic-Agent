package com.enflame.happy.data.repository

import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.repository.SessionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Implementation of SessionRepository.
 *
 * Coordinates between the remote API and local cache to provide
 * session data to the domain layer.
 */
@Singleton
class SessionRepositoryImpl @Inject constructor(
    private val apiService: HappyApiService
) : SessionRepository {

    private val _sessions = MutableStateFlow<List<Session>>(emptyList())

    override fun getSessions(): Flow<List<Session>> = _sessions.asStateFlow()

    override suspend fun getSession(sessionId: String): Session? {
        return try {
            apiService.getSession(sessionId)
        } catch (e: Exception) {
            // Try to find in cache
            _sessions.value.find { it.id == sessionId }
        }
    }

    override suspend fun refreshSessions() {
        try {
            val sessions = apiService.getSessions()
            _sessions.value = sessions
        } catch (e: Exception) {
            // Handle error - could emit to error channel
            throw e
        }
    }

    override suspend fun subscribeToSession(sessionId: String) {
        // WebSocket subscription will be implemented in SyncService
        // This will connect to the WebSocket and listen for updates
    }

    override suspend fun unsubscribeFromSession(sessionId: String) {
        // WebSocket unsubscription will be implemented in SyncService
    }

    override suspend fun getArtifacts(sessionId: String): List<Artifact> {
        return try {
            apiService.getArtifacts(sessionId)
        } catch (e: Exception) {
            throw e
        }
    }

    override suspend fun getActiveSessions(): List<Session> {
        // Refresh from server to get the latest status, then filter for active sessions
        refreshSessions()
        return _sessions.value.filter {
            it.status == SessionStatus.ACTIVE || it.status == SessionStatus.IDLE
        }
    }
}
