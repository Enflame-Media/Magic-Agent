package com.enflame.happy.domain.model.acp

/**
 * Accumulated ACP session state for a single session.
 *
 * Built up from streaming ACP session updates. Each update kind
 * mutates a specific part of this state. This is the primary model
 * consumed by Compose UI via StateFlow.
 *
 * Mirrors the Vue implementation at `apps/web/vue/src/stores/acpTypes.ts`.
 */
data class AcpSessionState(
    /** Accumulated agent message text from agent_message_chunk updates. */
    val agentMessage: String = "",

    /** Accumulated user message text from user_message_chunk updates. */
    val userMessage: String = "",

    /** Accumulated agent thought text from agent_thought_chunk updates. */
    val agentThought: String = "",

    /** Active tool calls, keyed by toolCallId. */
    val toolCalls: Map<String, AcpToolCall> = emptyMap(),

    /** Current execution plan entries (replaced entirely on each plan update). */
    val plan: List<AcpPlanEntry> = emptyList(),

    /** Available slash commands. */
    val availableCommands: List<AcpAvailableCommand> = emptyList(),

    /** Current session mode ID (e.g., "code", "ask", "architect"). */
    val currentModeId: String? = null,

    /** Session config options (e.g., model selection). */
    val configOptions: List<AcpConfigOption> = emptyList(),

    /** Session title from session_info_update. */
    val sessionTitle: String? = null,

    /** Context window usage. */
    val usage: AcpUsage? = null,

    /** Pending permission requests, keyed by requestId. */
    val permissionRequests: Map<String, AcpPermissionRequestState> = emptyMap(),

    /** History of resolved permission decisions. */
    val permissionHistory: List<AcpPermissionDecision> = emptyList(),

    /** Timestamp of last ACP update received (epoch millis). */
    val lastUpdateAt: Long = 0L,
) {

    companion object {
        /** Maximum number of permission decisions to keep in history. */
        const val PERMISSION_HISTORY_MAX = 50
    }
}
