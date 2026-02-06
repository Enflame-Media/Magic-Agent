package com.enflame.happy.data.local

import androidx.room.TypeConverter
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.model.ToolUse
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Room type converters for non-primitive types.
 *
 * Handles conversions for:
 * - [SessionStatus] enum to/from String
 * - [MessageRole] enum to/from String
 * - List<[ToolUse]> to/from JSON String using kotlinx.serialization
 */
class Converters {

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    // --- SessionStatus ---

    @TypeConverter
    fun fromSessionStatus(status: SessionStatus): String {
        return status.name
    }

    @TypeConverter
    fun toSessionStatus(value: String): SessionStatus {
        return try {
            SessionStatus.valueOf(value)
        } catch (_: IllegalArgumentException) {
            SessionStatus.UNKNOWN
        }
    }

    // --- MessageRole ---

    @TypeConverter
    fun fromMessageRole(role: MessageRole): String {
        return role.name
    }

    @TypeConverter
    fun toMessageRole(value: String): MessageRole {
        return try {
            MessageRole.valueOf(value)
        } catch (_: IllegalArgumentException) {
            MessageRole.SYSTEM
        }
    }

    // --- List<ToolUse> ---

    @TypeConverter
    fun fromToolUseList(toolUses: List<ToolUse>?): String? {
        return toolUses?.let { json.encodeToString(it) }
    }

    @TypeConverter
    fun toToolUseList(value: String?): List<ToolUse>? {
        return value?.let {
            try {
                json.decodeFromString<List<ToolUse>>(it)
            } catch (_: Exception) {
                null
            }
        }
    }
}
