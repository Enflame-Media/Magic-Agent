package com.enflame.happy.domain.model.acp

import kotlinx.serialization.Serializable

/**
 * ACP session state containing all data for an active ACP session.
 * This is the root state object collected from the WebSocket sync flow.
 */
@Serializable
data class AcpSessionState(
    val sessionId: String,
    val messages: List<AcpMessage> = emptyList(),
    val thoughts: List<AcpThought> = emptyList(),
    val plan: AcpPlan? = null,
    val toolCalls: List<AcpToolCall> = emptyList(),
    val usage: AcpUsage? = null,
    val mode: AcpMode = AcpMode.AGENT,
    val commands: List<AcpCommand> = emptyList(),
    val config: AcpConfig? = null,
    val contentBlocks: List<AcpContentBlock> = emptyList(),
    val isStreaming: Boolean = false
)

/**
 * A message in an ACP session conversation.
 */
@Serializable
data class AcpMessage(
    val id: String,
    val role: AcpRole,
    val content: String,
    val timestamp: Long,
    val contentBlocks: List<AcpContentBlock> = emptyList()
)

/**
 * Role of a message sender in ACP.
 */
@Serializable
enum class AcpRole {
    USER,
    ASSISTANT,
    SYSTEM,
    TOOL
}

/**
 * Agent reasoning / thinking step.
 */
@Serializable
data class AcpThought(
    val id: String,
    val content: String,
    val timestamp: Long,
    val isCollapsed: Boolean = true
)

/**
 * Agent execution plan with ordered steps.
 */
@Serializable
data class AcpPlan(
    val id: String,
    val title: String,
    val steps: List<AcpPlanStep> = emptyList()
)

/**
 * A single step within an agent plan.
 */
@Serializable
data class AcpPlanStep(
    val id: String,
    val description: String,
    val status: AcpPlanStepStatus = AcpPlanStepStatus.PENDING
)

/**
 * Status of a plan step.
 */
@Serializable
enum class AcpPlanStepStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
    FAILED,
    SKIPPED
}

/**
 * A tool call made by the agent.
 */
@Serializable
data class AcpToolCall(
    val id: String,
    val name: String,
    val kind: AcpToolKind = AcpToolKind.OTHER,
    val status: AcpToolCallStatus = AcpToolCallStatus.PENDING,
    val input: String? = null,
    val output: String? = null,
    val locations: List<AcpFileLocation> = emptyList(),
    val timestamp: Long = 0L,
    val durationMs: Long? = null
)

/**
 * Kind of tool being called.
 */
@Serializable
enum class AcpToolKind {
    READ,
    WRITE,
    EDIT,
    BASH,
    SEARCH,
    BROWSER,
    MCP,
    OTHER
}

/**
 * Status of a tool call.
 */
@Serializable
enum class AcpToolCallStatus {
    PENDING,
    RUNNING,
    COMPLETED,
    FAILED
}

/**
 * A file location referenced by a tool call.
 */
@Serializable
data class AcpFileLocation(
    val path: String,
    val line: Int? = null,
    val column: Int? = null
)

/**
 * Context window usage and cost data.
 */
@Serializable
data class AcpUsage(
    val tokensUsed: Long = 0,
    val tokensTotal: Long = 0,
    val cost: AcpCost? = null
)

/**
 * Cost information for a session.
 */
@Serializable
data class AcpCost(
    val amount: Double,
    val currency: String = "USD"
)

/**
 * Agent operating mode.
 */
@Serializable
enum class AcpMode {
    AGENT,
    PLAN,
    EDIT,
    CHAT
}

/**
 * A command available in the command palette.
 */
@Serializable
data class AcpCommand(
    val id: String,
    val name: String,
    val description: String? = null,
    val shortcut: String? = null,
    val category: String? = null
)

/**
 * Session configuration with typed fields.
 */
@Serializable
data class AcpConfig(
    val fields: List<AcpConfigField> = emptyList()
)

/**
 * A single configuration field.
 */
@Serializable
data class AcpConfigField(
    val id: String,
    val label: String,
    val type: AcpConfigFieldType = AcpConfigFieldType.TEXT,
    val value: String = "",
    val options: List<String> = emptyList(),
    val description: String? = null
)

/**
 * Type of a configuration field.
 */
@Serializable
enum class AcpConfigFieldType {
    TEXT,
    BOOLEAN,
    SELECT
}

/**
 * A content block within a message or session.
 */
@Serializable
data class AcpContentBlock(
    val id: String,
    val type: AcpContentBlockType,
    val content: String = "",
    val language: String? = null,
    val imageUrl: String? = null,
    val mimeType: String? = null,
    val resourceName: String? = null,
    val resourceUri: String? = null,
    val diff: AcpDiff? = null
)

/**
 * Type of content block.
 */
@Serializable
enum class AcpContentBlockType {
    TEXT,
    CODE,
    IMAGE,
    DIFF,
    TERMINAL,
    RESOURCE
}

/**
 * A unified diff with added/removed lines.
 */
@Serializable
data class AcpDiff(
    val filePath: String,
    val hunks: List<AcpDiffHunk> = emptyList()
)

/**
 * A hunk within a diff.
 */
@Serializable
data class AcpDiffHunk(
    val startLine: Int,
    val lines: List<AcpDiffLine> = emptyList()
)

/**
 * A single line in a diff.
 */
@Serializable
data class AcpDiffLine(
    val content: String,
    val type: AcpDiffLineType
)

/**
 * Type of diff line.
 */
@Serializable
enum class AcpDiffLineType {
    CONTEXT,
    ADDED,
    REMOVED
}
