package com.enflame.happy.domain.model.acp

import kotlinx.serialization.Serializable

/**
 * A single entry in the ACP execution plan.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/agent-plan#plan-entries">ACP Plan Entries</a>
 */
@Serializable
data class AcpPlanEntry(
    val content: String,
    val priority: AcpPlanEntryPriority,
    val status: AcpPlanEntryStatus,
)
