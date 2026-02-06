package com.enflame.happy.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room entity for persisting session data locally.
 *
 * Stores Claude Code session information fetched from the server
 * for offline access and local caching. Indices are configured on
 * [status] and [updatedAt] columns for efficient query filtering
 * and sorting.
 */
@Entity(
    tableName = "sessions",
    indices = [
        Index(value = ["status"]),
        Index(value = ["updated_at"])
    ]
)
data class SessionEntity(
    @PrimaryKey
    val id: String,

    val title: String? = null,

    val status: String = "UNKNOWN",

    @ColumnInfo(name = "created_at")
    val createdAt: Long,

    @ColumnInfo(name = "updated_at")
    val updatedAt: Long? = null,

    @ColumnInfo(name = "machine_id")
    val machineId: String? = null,

    @ColumnInfo(name = "machine_name")
    val machineName: String? = null
)
