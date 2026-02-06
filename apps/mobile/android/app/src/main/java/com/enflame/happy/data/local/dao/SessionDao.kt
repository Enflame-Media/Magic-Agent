package com.enflame.happy.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.enflame.happy.data.local.entity.SessionEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for session operations.
 *
 * Provides CRUD operations and reactive queries for locally cached
 * sessions. All query methods returning [Flow] will automatically
 * emit new values when the underlying data changes.
 */
@Dao
interface SessionDao {

    /**
     * Observe all sessions ordered by most recently updated.
     */
    @Query("SELECT * FROM sessions ORDER BY updated_at DESC, created_at DESC")
    fun observeAll(): Flow<List<SessionEntity>>

    /**
     * Observe a single session by ID.
     */
    @Query("SELECT * FROM sessions WHERE id = :sessionId")
    fun observeById(sessionId: String): Flow<SessionEntity?>

    /**
     * Observe sessions filtered by status.
     */
    @Query("SELECT * FROM sessions WHERE status = :status ORDER BY updated_at DESC")
    fun observeByStatus(status: String): Flow<List<SessionEntity>>

    /**
     * Get all sessions (non-reactive, for one-shot reads).
     */
    @Query("SELECT * FROM sessions ORDER BY updated_at DESC, created_at DESC")
    suspend fun getAll(): List<SessionEntity>

    /**
     * Get a single session by ID.
     *
     * @return The session entity, or null if not found.
     */
    @Query("SELECT * FROM sessions WHERE id = :sessionId")
    suspend fun getById(sessionId: String): SessionEntity?

    /**
     * Get the count of sessions.
     */
    @Query("SELECT COUNT(*) FROM sessions")
    suspend fun getCount(): Int

    /**
     * Insert a session. Replaces on conflict (upsert behavior).
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: SessionEntity)

    /**
     * Insert multiple sessions. Replaces on conflict (upsert behavior).
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sessions: List<SessionEntity>)

    /**
     * Update an existing session.
     */
    @Update
    suspend fun update(session: SessionEntity)

    /**
     * Delete a specific session.
     */
    @Delete
    suspend fun delete(session: SessionEntity)

    /**
     * Delete a session by ID.
     */
    @Query("DELETE FROM sessions WHERE id = :sessionId")
    suspend fun deleteById(sessionId: String)

    /**
     * Delete all sessions (used for cache clearing).
     */
    @Query("DELETE FROM sessions")
    suspend fun deleteAll()
}
