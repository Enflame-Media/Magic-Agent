package com.enflame.happy.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.enflame.happy.data.local.entity.MessageEntity
import kotlinx.coroutines.flow.Flow

/**
 * Data Access Object for message operations.
 *
 * Provides CRUD operations and reactive queries for locally cached
 * messages. Messages are associated with sessions via [MessageEntity.sessionId].
 */
@Dao
interface MessageDao {

    /**
     * Observe all messages for a session, ordered chronologically.
     */
    @Query("SELECT * FROM messages WHERE session_id = :sessionId ORDER BY created_at ASC")
    fun observeBySessionId(sessionId: String): Flow<List<MessageEntity>>

    /**
     * Observe a single message by ID.
     */
    @Query("SELECT * FROM messages WHERE id = :messageId")
    fun observeById(messageId: String): Flow<MessageEntity?>

    /**
     * Get all messages for a session (non-reactive, one-shot read).
     */
    @Query("SELECT * FROM messages WHERE session_id = :sessionId ORDER BY created_at ASC")
    suspend fun getBySessionId(sessionId: String): List<MessageEntity>

    /**
     * Get a single message by ID.
     *
     * @return The message entity, or null if not found.
     */
    @Query("SELECT * FROM messages WHERE id = :messageId")
    suspend fun getById(messageId: String): MessageEntity?

    /**
     * Get the count of messages for a session.
     */
    @Query("SELECT COUNT(*) FROM messages WHERE session_id = :sessionId")
    suspend fun getCountBySessionId(sessionId: String): Int

    /**
     * Get the most recent message for a session.
     */
    @Query("SELECT * FROM messages WHERE session_id = :sessionId ORDER BY created_at DESC LIMIT 1")
    suspend fun getLatestBySessionId(sessionId: String): MessageEntity?

    /**
     * Insert a message. Replaces on conflict (upsert behavior).
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: MessageEntity)

    /**
     * Insert multiple messages. Replaces on conflict (upsert behavior).
     */
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(messages: List<MessageEntity>)

    /**
     * Update an existing message.
     */
    @Update
    suspend fun update(message: MessageEntity)

    /**
     * Delete a specific message.
     */
    @Delete
    suspend fun delete(message: MessageEntity)

    /**
     * Delete a message by ID.
     */
    @Query("DELETE FROM messages WHERE id = :messageId")
    suspend fun deleteById(messageId: String)

    /**
     * Delete all messages for a session.
     */
    @Query("DELETE FROM messages WHERE session_id = :sessionId")
    suspend fun deleteBySessionId(sessionId: String)

    /**
     * Delete all messages (used for cache clearing).
     */
    @Query("DELETE FROM messages")
    suspend fun deleteAll()
}
