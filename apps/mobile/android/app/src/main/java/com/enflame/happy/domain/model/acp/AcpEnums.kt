package com.enflame.happy.domain.model.acp

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Categories of tools that can be invoked by an ACP agent.
 *
 * Helps clients choose appropriate icons and UI treatment.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/tool-calls#creating">ACP Tool Calls</a>
 */
@Serializable
enum class AcpToolKind {
    @SerialName("read")
    READ,

    @SerialName("edit")
    EDIT,

    @SerialName("delete")
    DELETE,

    @SerialName("move")
    MOVE,

    @SerialName("search")
    SEARCH,

    @SerialName("execute")
    EXECUTE,

    @SerialName("think")
    THINK,

    @SerialName("fetch")
    FETCH,

    @SerialName("switch_mode")
    SWITCH_MODE,

    @SerialName("other")
    OTHER,
}

/**
 * Execution status of an ACP tool call.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/tool-calls#status">ACP Tool Call Status</a>
 */
@Serializable
enum class AcpToolCallStatus {
    @SerialName("pending")
    PENDING,

    @SerialName("in_progress")
    IN_PROGRESS,

    @SerialName("completed")
    COMPLETED,

    @SerialName("failed")
    FAILED,
}

/**
 * Status of an ACP plan entry.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/agent-plan#plan-entries">ACP Plan Entries</a>
 */
@Serializable
enum class AcpPlanEntryStatus {
    @SerialName("pending")
    PENDING,

    @SerialName("in_progress")
    IN_PROGRESS,

    @SerialName("completed")
    COMPLETED,
}

/**
 * Priority levels for ACP plan entries.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/agent-plan#plan-entries">ACP Plan Entries</a>
 */
@Serializable
enum class AcpPlanEntryPriority {
    @SerialName("high")
    HIGH,

    @SerialName("medium")
    MEDIUM,

    @SerialName("low")
    LOW,
}

/**
 * The type of permission option being presented to the user.
 */
@Serializable
enum class AcpPermissionOptionKind {
    @SerialName("allow_once")
    ALLOW_ONCE,

    @SerialName("allow_always")
    ALLOW_ALWAYS,

    @SerialName("reject_once")
    REJECT_ONCE,

    @SerialName("reject_always")
    REJECT_ALWAYS,
}

/**
 * Status of a permission request in the Android app.
 */
enum class AcpPermissionRequestStatus {
    PENDING,
    RESPONDED,
    EXPIRED,
}

/**
 * Connection status for a registered ACP agent.
 */
enum class AcpAgentStatus {
    CONNECTED,
    AVAILABLE,
    UNAVAILABLE,
    ERROR,
}
