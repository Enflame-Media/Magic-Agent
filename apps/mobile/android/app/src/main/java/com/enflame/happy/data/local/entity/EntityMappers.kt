package com.enflame.happy.data.local.entity

import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.model.ToolUse
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/**
 * Mapping functions between Room entities and domain models.
 *
 * These extension functions provide a clean boundary between the
 * data layer (Room entities) and domain layer (domain models),
 * following Clean Architecture principles.
 */

private val json = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
}

// --- Session Mappers ---

/**
 * Convert a [SessionEntity] to a domain [Session].
 */
fun SessionEntity.toDomain(): Session = Session(
    id = id,
    title = title,
    status = try {
        SessionStatus.valueOf(status)
    } catch (_: IllegalArgumentException) {
        SessionStatus.UNKNOWN
    },
    createdAt = createdAt,
    updatedAt = updatedAt,
    machineId = machineId,
    machineName = machineName
)

/**
 * Convert a domain [Session] to a [SessionEntity].
 */
fun Session.toEntity(): SessionEntity = SessionEntity(
    id = id,
    title = title,
    status = status.name,
    createdAt = createdAt,
    updatedAt = updatedAt,
    machineId = machineId,
    machineName = machineName
)

// --- Message Mappers ---

/**
 * Convert a [MessageEntity] to a domain [Message].
 */
fun MessageEntity.toDomain(): Message = Message(
    id = id,
    sessionId = sessionId,
    role = try {
        MessageRole.valueOf(role)
    } catch (_: IllegalArgumentException) {
        MessageRole.SYSTEM
    },
    content = content,
    createdAt = createdAt,
    toolUses = toolUses?.let {
        try {
            json.decodeFromString<List<ToolUse>>(it)
        } catch (_: Exception) {
            null
        }
    }
)

/**
 * Convert a domain [Message] to a [MessageEntity].
 */
fun Message.toEntity(): MessageEntity = MessageEntity(
    id = id,
    sessionId = sessionId,
    role = role.name,
    content = content,
    createdAt = createdAt,
    toolUses = toolUses?.let {
        try {
            json.encodeToString(it)
        } catch (_: Exception) {
            null
        }
    }
)
