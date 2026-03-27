package com.enflame.happy.domain.model.acp

/**
 * A registered ACP agent in the agent registry.
 * Relayed from CLI's AgentRegistry to the Android app.
 */
data class AcpRegisteredAgent(
    /** Unique agent identifier (e.g., "claude-code", "gemini-cli"). */
    val id: String,
    /** Human-readable agent name. */
    val name: String,
    /** Optional description of the agent. */
    val description: String?,
    /** Agent connection status. */
    val status: AcpAgentStatus,
    /** Agent version string. */
    val version: String?,
)

/**
 * Agent registry state relayed from CLI.
 * Contains all registered agents and which one is currently active.
 */
data class AcpAgentRegistryState(
    /** All registered agents, keyed by agent ID. */
    val agents: Map<String, AcpRegisteredAgent> = emptyMap(),
    /** ID of the currently active agent, or null if none. */
    val activeAgentId: String? = null,
    /** Whether an agent switch is currently in progress. */
    val switching: Boolean = false,
    /** Error message from last failed switch attempt. */
    val switchError: String? = null,
)
