package com.enflame.happy.domain.model.acp

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents an ACP session available for browsing.
 *
 * ACP sessions extend the base [com.enflame.happy.domain.model.Session] with
 * additional metadata for the session browser, including the active agent,
 * supported capabilities, and session actions.
 */
@Serializable
data class AcpSession(
    /** Unique session identifier. */
    val id: String,
    /** Display title for the session. */
    val title: String? = null,
    /** Current session status. */
    val status: AcpSessionStatus = AcpSessionStatus.IDLE,
    /** The active agent in this session. */
    val agentName: String? = null,
    /** Agent ID for the active agent. */
    val agentId: String? = null,
    /** Timestamp when the session was created (epoch millis). */
    val createdAt: Long = 0L,
    /** Timestamp of the last activity (epoch millis). */
    val lastActivityAt: Long? = null,
    /** Machine name where the session is running. */
    val machineName: String? = null,
    /** Machine ID where the session is running. */
    val machineId: String? = null,
    /** Whether this is the currently active session. */
    val isActive: Boolean = false,
    /** Actions available for this session, gated by capabilities. */
    val capabilities: Set<AcpSessionCapability> = emptySet()
)

/**
 * Status of an ACP session.
 */
@Serializable
enum class AcpSessionStatus {
    @SerialName("active")
    ACTIVE,

    @SerialName("idle")
    IDLE,

    @SerialName("paused")
    PAUSED,

    @SerialName("completed")
    COMPLETED,

    @SerialName("error")
    ERROR
}

/**
 * Capabilities that determine which session actions are available.
 */
@Serializable
enum class AcpSessionCapability {
    @SerialName("load")
    LOAD,

    @SerialName("resume")
    RESUME,

    @SerialName("fork")
    FORK
}

/**
 * Request to perform an action on an ACP session.
 */
@Serializable
data class AcpSessionAction(
    /** The target session ID. */
    val sessionId: String,
    /** The action to perform. */
    val action: AcpSessionActionType
)

/**
 * Types of actions that can be performed on an ACP session.
 */
@Serializable
enum class AcpSessionActionType {
    @SerialName("load")
    LOAD,

    @SerialName("resume")
    RESUME,

    @SerialName("fork")
    FORK
}
