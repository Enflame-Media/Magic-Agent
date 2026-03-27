package com.enflame.happy.data.acp

import com.enflame.happy.domain.model.acp.AcpPermissionDecision
import com.enflame.happy.domain.model.acp.AcpPermissionOutcome
import com.enflame.happy.domain.model.acp.AcpPermissionRequestState
import com.enflame.happy.domain.model.acp.AcpSessionState
import com.enflame.happy.domain.model.acp.AcpSessionUpdate
import com.enflame.happy.domain.model.acp.AcpToolCall
import com.enflame.happy.domain.model.acp.AcpUsage
import com.enflame.happy.domain.model.acp.SelectedOptionInfo
import com.enflame.happy.domain.model.acp.extractText

/**
 * Pure function that applies ACP session updates to the accumulated state.
 *
 * Handles all 11 ACP session update kinds plus unknown types.
 * Returns a new state object (immutable update pattern).
 *
 * This mirrors the Vue implementation at `apps/web/vue/src/stores/acpTypes.ts`.
 */
object AcpUpdateApplier {

    /**
     * Apply an ACP session update to the accumulated state.
     *
     * @param state The current session state.
     * @param update The update to apply.
     * @return A new state with the update applied.
     */
    fun apply(state: AcpSessionState, update: AcpSessionUpdate): AcpSessionState {
        val now = System.currentTimeMillis()

        return when (update) {
            is AcpSessionUpdate.AgentMessageChunk -> {
                val text = update.content.extractText()
                state.copy(
                    agentMessage = state.agentMessage + text,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.UserMessageChunk -> {
                val text = update.content.extractText()
                state.copy(
                    userMessage = state.userMessage + text,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.AgentThoughtChunk -> {
                val text = update.content.extractText()
                state.copy(
                    agentThought = state.agentThought + text,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.ToolCallNotification -> {
                state.copy(
                    toolCalls = state.toolCalls + (update.toolCall.toolCallId to update.toolCall),
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.ToolCallStatusUpdate -> {
                val tcUpdate = update.toolCallUpdate
                val existing = state.toolCalls[tcUpdate.toolCallId]

                val merged = if (existing != null) {
                    existing.copy(
                        title = tcUpdate.title ?: existing.title,
                        kind = tcUpdate.kind ?: existing.kind,
                        status = tcUpdate.status ?: existing.status,
                        content = tcUpdate.content ?: existing.content,
                        locations = tcUpdate.locations ?: existing.locations,
                    )
                } else {
                    // Update for unknown tool call - create a minimal entry
                    AcpToolCall(
                        toolCallId = tcUpdate.toolCallId,
                        title = tcUpdate.title ?: "Unknown Tool",
                        kind = tcUpdate.kind,
                        status = tcUpdate.status,
                        content = tcUpdate.content,
                        locations = tcUpdate.locations,
                    )
                }

                state.copy(
                    toolCalls = state.toolCalls + (tcUpdate.toolCallId to merged),
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.PlanUpdate -> {
                state.copy(
                    plan = update.entries,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.AvailableCommandsUpdate -> {
                state.copy(
                    availableCommands = update.availableCommands,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.CurrentModeUpdate -> {
                state.copy(
                    currentModeId = update.currentModeId,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.ConfigOptionUpdate -> {
                state.copy(
                    configOptions = update.configOptions,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.SessionInfoUpdate -> {
                state.copy(
                    sessionTitle = update.title ?: state.sessionTitle,
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.UsageUpdate -> {
                state.copy(
                    usage = AcpUsage(
                        used = update.used,
                        size = update.size,
                        cost = update.cost,
                    ),
                    lastUpdateAt = now,
                )
            }

            is AcpSessionUpdate.Unknown -> {
                // Unknown update type - ignore gracefully
                state
            }
        }
    }

    /**
     * Add a permission request to the session state.
     *
     * @param state The current session state.
     * @param request The permission request to add.
     * @return A new state with the request added.
     */
    fun addPermissionRequest(
        state: AcpSessionState,
        request: AcpPermissionRequestState,
    ): AcpSessionState {
        return state.copy(
            permissionRequests = state.permissionRequests + (request.requestId to request),
            lastUpdateAt = System.currentTimeMillis(),
        )
    }

    /**
     * Resolve a permission request (user responded or timeout expired).
     * Moves the request to history and removes from pending.
     *
     * @param state The current session state.
     * @param requestId The request ID to resolve.
     * @param outcome The outcome of the request.
     * @param selectedOptionId The selected option ID, or null.
     * @return A new state with the request resolved.
     */
    fun resolvePermissionRequest(
        state: AcpSessionState,
        requestId: String,
        outcome: AcpPermissionOutcome,
        selectedOptionId: String?,
    ): AcpSessionState {
        val request = state.permissionRequests[requestId] ?: return state

        val selectedOption = if (selectedOptionId != null) {
            request.options.find { it.optionId == selectedOptionId }
        } else {
            null
        }

        val decision = AcpPermissionDecision(
            requestId = requestId,
            toolTitle = request.toolCall.title,
            toolKind = request.toolCall.kind,
            selectedOption = selectedOption?.let {
                SelectedOptionInfo(
                    optionId = it.optionId,
                    name = it.name,
                    kind = it.kind,
                )
            },
            outcome = outcome,
            decidedAt = System.currentTimeMillis(),
        )

        val remainingRequests = state.permissionRequests - requestId
        val updatedHistory = (listOf(decision) + state.permissionHistory)
            .take(AcpSessionState.PERMISSION_HISTORY_MAX)

        return state.copy(
            permissionRequests = remainingRequests,
            permissionHistory = updatedHistory,
            lastUpdateAt = System.currentTimeMillis(),
        )
    }

    /**
     * Get the oldest pending permission request (first in queue).
     *
     * @param state The current session state.
     * @return The oldest pending request, or null.
     */
    fun getNextPendingPermission(state: AcpSessionState): AcpPermissionRequestState? {
        return state.permissionRequests.values
            .filter { it.status == com.enflame.happy.domain.model.acp.AcpPermissionRequestStatus.PENDING }
            .minByOrNull { it.receivedAt }
    }
}
