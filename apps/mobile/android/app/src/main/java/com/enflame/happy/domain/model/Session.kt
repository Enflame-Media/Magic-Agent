package com.enflame.happy.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for a Claude Code session.
 *
 * Represents a connected CLI session with all its associated data.
 * This model is used throughout the domain and presentation layers.
 */
@Serializable
data class Session(
    val id: String,
    val title: String? = null,
    val status: SessionStatus = SessionStatus.UNKNOWN,
    val createdAt: Long,
    val updatedAt: Long? = null,
    val machineId: String? = null,
    val machineName: String? = null
)

/**
 * Status of a session.
 */
@Serializable
enum class SessionStatus {
    UNKNOWN,
    ACTIVE,
    IDLE,
    DISCONNECTED,
    COMPLETED
}

/**
 * Domain model for a message within a session.
 */
@Serializable
data class Message(
    val id: String,
    val sessionId: String,
    val role: MessageRole,
    val content: String,
    val createdAt: Long,
    val toolUses: List<ToolUse>? = null
)

/**
 * Role of the message sender.
 */
@Serializable
enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

/**
 * Represents a tool use within a message.
 */
@Serializable
data class ToolUse(
    val id: String,
    val name: String,
    val input: String? = null,
    val output: String? = null,
    val status: ToolUseStatus = ToolUseStatus.PENDING
)

/**
 * Status of a tool use execution.
 */
@Serializable
enum class ToolUseStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED
}
