package com.enflame.happy.domain.model.acp

/**
 * An option presented to the user when requesting permission for a tool call.
 */
data class AcpPermissionOption(
    val optionId: String,
    val name: String,
    val kind: AcpPermissionOptionKind,
)

/**
 * A permission request received from the CLI agent.
 *
 * Contains the tool details and available options for user approval/denial.
 * Relayed from CLI through the server as an ACP session update.
 */
data class AcpPermissionRequestState(
    /** Unique request ID for correlating response. */
    val requestId: String,
    /** Session ID this request belongs to. */
    val sessionId: String,
    /** Tool call that needs permission. */
    val toolCall: AcpPermissionToolInfo,
    /** Available permission options. */
    val options: List<AcpPermissionOption>,
    /** When the request was received (epoch millis). */
    val receivedAt: Long,
    /** Timeout deadline (epoch millis), if specified by the agent. */
    val timeoutAt: Long?,
    /** Current status. */
    val status: AcpPermissionRequestStatus,
    /** Selected option ID, if responded. */
    val selectedOptionId: String?,
)

/**
 * Minimal tool call info included in a permission request.
 */
data class AcpPermissionToolInfo(
    val toolCallId: String,
    val title: String,
    val kind: AcpToolKind?,
    val locations: List<AcpToolCallLocation>?,
)

/**
 * A resolved permission decision for the history log.
 */
data class AcpPermissionDecision(
    val requestId: String,
    val toolTitle: String,
    val toolKind: AcpToolKind?,
    val selectedOption: SelectedOptionInfo?,
    val outcome: AcpPermissionOutcome,
    val decidedAt: Long,
)

/**
 * Info about the selected permission option in a decision.
 */
data class SelectedOptionInfo(
    val optionId: String,
    val name: String,
    val kind: AcpPermissionOptionKind,
)

/**
 * Outcome of a permission request.
 */
enum class AcpPermissionOutcome {
    SELECTED,
    EXPIRED,
    CANCELLED,
}
