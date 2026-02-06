package com.enflame.happy.data.repository

import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.data.local.dao.MessageDao
import com.enflame.happy.data.local.dao.SessionDao
import com.enflame.happy.data.local.entity.toDomain
import com.enflame.happy.data.local.entity.toEntity
import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.repository.SessionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository implementation that coordinates between Room local
 * storage and the remote Happy API.
 *
 * Follows an offline-first strategy:
 * 1. Local Room database is the single source of truth for UI observations.
 * 2. Remote API is fetched and results are persisted to Room.
 * 3. UI observes Room flows, which automatically emit on data changes.
 *
 * This replaces the in-memory [SessionRepositoryImpl] with a durable
 * local cache backed by Room.
 */
@Singleton
class LocalSessionRepository @Inject constructor(
    private val sessionDao: SessionDao,
    private val messageDao: MessageDao,
    private val apiService: HappyApiService
) : SessionRepository {

    /**
     * Observe all sessions from the local database.
     * Returns a reactive Flow that emits whenever session data changes.
     */
    override fun getSessions(): Flow<List<Session>> {
        return sessionDao.observeAll().map { entities ->
            entities.map { it.toDomain() }
        }
    }

    /**
     * Get a single session by ID, trying local first, then remote.
     */
    override suspend fun getSession(sessionId: String): Session? {
        // Try local cache first
        val local = sessionDao.getById(sessionId)
        if (local != null) {
            return local.toDomain()
        }

        // Fall back to remote API
        return try {
            val remote = apiService.getSession(sessionId)
            // Cache locally
            sessionDao.insert(remote.toEntity())
            remote
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Refresh sessions from the remote API and persist to local storage.
     */
    override suspend fun refreshSessions() {
        val remoteSessions = apiService.getSessions()
        sessionDao.insertAll(remoteSessions.map { it.toEntity() })
    }

    /**
     * Subscribe to real-time updates for a session.
     * WebSocket subscription will be implemented in SyncService.
     */
    override suspend fun subscribeToSession(sessionId: String) {
        // WebSocket subscription will be implemented in SyncService.
        // When updates arrive, they will be persisted to Room via
        // sessionDao.insert() and messageDao.insert(), which will
        // automatically trigger Flow emissions to the UI.
    }

    /**
     * Unsubscribe from session updates.
     */
    override suspend fun unsubscribeFromSession(sessionId: String) {
        // WebSocket unsubscription will be implemented in SyncService.
    }

    // --- Message operations ---

    /**
     * Observe messages for a session from local storage.
     */
    fun getMessages(sessionId: String): Flow<List<Message>> {
        return messageDao.observeBySessionId(sessionId).map { entities ->
            entities.map { it.toDomain() }
        }
    }

    /**
     * Insert or update a session in local storage.
     */
    suspend fun saveSession(session: Session) {
        sessionDao.insert(session.toEntity())
    }

    /**
     * Insert or update a message in local storage.
     */
    suspend fun saveMessage(message: Message) {
        messageDao.insert(message.toEntity())
    }

    /**
     * Insert or update multiple messages in local storage.
     */
    suspend fun saveMessages(messages: List<Message>) {
        messageDao.insertAll(messages.map { it.toEntity() })
    }

    /**
     * Delete a session and all its associated messages from local storage.
     */
    suspend fun deleteSession(sessionId: String) {
        sessionDao.deleteById(sessionId)
        // Messages are cascade-deleted via foreign key
    }

    /**
     * Clear all cached data from local storage.
     */
    suspend fun clearCache() {
        sessionDao.deleteAll()
        messageDao.deleteAll()
    }
}
