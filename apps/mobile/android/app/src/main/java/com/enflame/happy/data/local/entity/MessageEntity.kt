package com.enflame.happy.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room entity for persisting message data locally.
 *
 * Stores messages within Claude Code sessions for offline access.
 * Uses a foreign key relationship to [SessionEntity] with cascade
 * delete, so deleting a session removes all associated messages.
 *
 * Indices are configured on [sessionId] for efficient join queries
 * and on [createdAt] for chronological sorting.
 */
@Entity(
    tableName = "messages",
    foreignKeys = [
        ForeignKey(
            entity = SessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [
        Index(value = ["session_id"]),
        Index(value = ["created_at"])
    ]
)
data class MessageEntity(
    @PrimaryKey
    val id: String,

    @ColumnInfo(name = "session_id")
    val sessionId: String,

    val role: String,

    val content: String,

    @ColumnInfo(name = "created_at")
    val createdAt: Long,

    /**
     * Serialized JSON string of tool use data.
     * Uses kotlinx.serialization for encoding/decoding List<ToolUse>.
     */
    @ColumnInfo(name = "tool_uses")
    val toolUses: String? = null
)
