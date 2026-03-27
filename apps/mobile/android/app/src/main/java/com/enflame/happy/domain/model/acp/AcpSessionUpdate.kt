package com.enflame.happy.domain.model.acp

/**
 * Session update - discriminated union of all 11 ACP session update kinds.
 *
 * Different types of updates streamed during session processing.
 * The [kind] string corresponds to the `sessionUpdate` discriminator field in the JSON wire format.
 *
 * @see <a href="https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output">ACP Prompt Turn</a>
 */
sealed class AcpSessionUpdate {

    abstract val kind: String

    /** Agent message content chunk. */
    data class AgentMessageChunk(
        override val kind: String = "agent_message_chunk",
        val content: AcpContentBlock,
    ) : AcpSessionUpdate()

    /** User message content chunk. */
    data class UserMessageChunk(
        override val kind: String = "user_message_chunk",
        val content: AcpContentBlock,
    ) : AcpSessionUpdate()

    /** Agent thought content chunk (internal reasoning). */
    data class AgentThoughtChunk(
        override val kind: String = "agent_thought_chunk",
        val content: AcpContentBlock,
    ) : AcpSessionUpdate()

    /** Notification that a new tool call has been initiated. */
    data class ToolCallNotification(
        override val kind: String = "tool_call",
        val toolCall: AcpToolCall,
    ) : AcpSessionUpdate()

    /** Update on the status or results of an existing tool call. */
    data class ToolCallStatusUpdate(
        override val kind: String = "tool_call_update",
        val toolCallUpdate: AcpToolCallUpdate,
    ) : AcpSessionUpdate()

    /** Execution plan update (replaces entire plan). */
    data class PlanUpdate(
        override val kind: String = "plan",
        val entries: List<AcpPlanEntry>,
    ) : AcpSessionUpdate()

    /** Available commands have changed. */
    data class AvailableCommandsUpdate(
        override val kind: String = "available_commands_update",
        val availableCommands: List<AcpAvailableCommand>,
    ) : AcpSessionUpdate()

    /** Current session mode has changed. */
    data class CurrentModeUpdate(
        override val kind: String = "current_mode_update",
        val currentModeId: String,
    ) : AcpSessionUpdate()

    /** Session configuration options have been updated. */
    data class ConfigOptionUpdate(
        override val kind: String = "config_option_update",
        val configOptions: List<AcpConfigOption>,
    ) : AcpSessionUpdate()

    /** Session metadata has been updated. */
    data class SessionInfoUpdate(
        override val kind: String = "session_info_update",
        val title: String?,
        val updatedAt: String?,
    ) : AcpSessionUpdate()

    /** Context window and cost update (UNSTABLE). */
    data class UsageUpdate(
        override val kind: String = "usage_update",
        val used: Int,
        val size: Int,
        val cost: AcpCost?,
    ) : AcpSessionUpdate()

    /**
     * Unknown update type - handled gracefully.
     * Contains the raw kind string for debugging.
     */
    data class Unknown(
        override val kind: String,
    ) : AcpSessionUpdate()
}
