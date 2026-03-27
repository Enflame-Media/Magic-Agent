package com.enflame.happy.domain.model.acp

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Represents an ACP agent available for use.
 *
 * Agents are AI assistants that can be switched between during a session.
 * The agent picker displays available agents and allows the user to
 * switch the active agent.
 */
@Serializable
data class AcpAgent(
    /** Unique identifier for this agent. */
    val id: String,
    /** Display name of the agent. */
    val name: String,
    /** Current status of the agent. */
    val status: AcpAgentStatus = AcpAgentStatus.AVAILABLE,
    /** Version string (e.g., "claude-4-opus"). */
    val version: String? = null,
    /** Short description of the agent's capabilities. */
    val description: String? = null,
    /** Icon identifier for display. */
    val iconId: String? = null,
    /** Whether this is the currently active agent. */
    val isActive: Boolean = false,
    /** Capabilities this agent supports. */
    val capabilities: List<String> = emptyList()
)

/**
 * Status of an ACP agent.
 */
@Serializable
enum class AcpAgentStatus {
    @SerialName("available")
    AVAILABLE,

    @SerialName("busy")
    BUSY,

    @SerialName("offline")
    OFFLINE,

    @SerialName("error")
    ERROR
}

/**
 * Request to switch the active agent.
 */
@Serializable
data class AcpAgentSwitchRequest(
    /** The session to switch agents in. */
    val sessionId: String,
    /** The agent ID to switch to. */
    val agentId: String
)

/**
 * Response to an agent switch request.
 */
@Serializable
data class AcpAgentSwitchResponse(
    /** Whether the switch was successful. */
    val success: Boolean,
    /** The new active agent ID, if successful. */
    val activeAgentId: String? = null,
    /** Error message if the switch failed. */
    val error: String? = null
)
