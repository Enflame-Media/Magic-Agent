//
//  AcpSessionState.swift
//  Happy
//
//  Accumulated ACP session state and update application logic.
//  Mirrors applyAcpSessionUpdate() from acpTypes.ts.
//

import Foundation

/// Maximum number of permission decisions to keep in history.
private let permissionHistoryMax = 50

// MARK: - ACP Session State

/// Accumulated ACP session state for a single session.
///
/// Built up from streaming ACP session updates. Each update kind
/// mutates a specific part of this state.
struct AcpSessionState {
    /// Accumulated agent message text from agent_message_chunk updates.
    var agentMessage: String = ""

    /// Accumulated user message text from user_message_chunk updates.
    var userMessage: String = ""

    /// Accumulated agent thought text from agent_thought_chunk updates.
    var agentThought: String = ""

    /// Active tool calls, keyed by toolCallId.
    var toolCalls: [String: AcpToolCall] = [:]

    /// Current execution plan entries (replaced entirely on each plan update).
    var plan: [AcpPlanEntry] = []

    /// Available slash commands.
    var availableCommands: [AcpAvailableCommand] = []

    /// Current session mode ID (e.g., "code", "ask", "architect").
    var currentModeId: String?

    /// Session config options (e.g., model selection).
    var configOptions: [AcpSessionConfigOption] = []

    /// Session title from session_info_update.
    var sessionTitle: String?

    /// Context window usage.
    var usage: AcpUsage?

    /// Pending permission requests, keyed by requestId.
    var permissionRequests: [String: AcpPermissionRequestState] = [:]

    /// History of resolved permission decisions.
    var permissionHistory: [AcpPermissionDecision] = []

    /// Timestamp of last ACP update received (ms since epoch).
    var lastUpdateAt: TimeInterval = 0
}

// MARK: - Update Application

extension AcpSessionState {
    /// Apply an ACP session update to this state.
    /// Mutates in place for efficiency (value type semantics via struct).
    mutating func applyUpdate(_ update: AcpSessionUpdate) {
        let now = Date().timeIntervalSince1970 * 1000

        switch update {
        case .userMessageChunk(let content):
            userMessage += content.text
            lastUpdateAt = now

        case .agentMessageChunk(let content):
            agentMessage += content.text
            lastUpdateAt = now

        case .agentThoughtChunk(let content):
            agentThought += content.text
            lastUpdateAt = now

        case .toolCall(let toolCall):
            toolCalls[toolCall.toolCallId] = toolCall
            lastUpdateAt = now

        case .toolCallUpdate(let update):
            if var existing = toolCalls[update.toolCallId] {
                // Merge update into existing tool call
                if let title = update.title { existing.title = title }
                if let kind = update.kind { existing.kind = kind }
                if let status = update.status { existing.status = status }
                if let content = update.content { existing.content = content }
                if let locations = update.locations { existing.locations = locations }
                toolCalls[update.toolCallId] = existing
            } else {
                // Create minimal entry for unknown tool call
                let newToolCall = AcpToolCall(
                    toolCallId: update.toolCallId,
                    title: update.title ?? "Unknown Tool",
                    kind: update.kind,
                    status: update.status,
                    content: update.content,
                    locations: update.locations
                )
                toolCalls[update.toolCallId] = newToolCall
            }
            lastUpdateAt = now

        case .plan(let entries):
            plan = entries
            lastUpdateAt = now

        case .availableCommandsUpdate(let commands):
            availableCommands = commands
            lastUpdateAt = now

        case .currentModeUpdate(let modeId):
            currentModeId = modeId
            lastUpdateAt = now

        case .configOptionUpdate(let opts):
            configOptions = opts
            lastUpdateAt = now

        case .sessionInfoUpdate(let title, _):
            if let title = title {
                sessionTitle = title
            }
            lastUpdateAt = now

        case .usageUpdate(let used, let size, let cost):
            usage = AcpUsage(used: used, size: size, cost: cost)
            lastUpdateAt = now

        case .unknown:
            // Forward compatibility: ignore unknown update types
            break
        }
    }
}

// MARK: - Permission Helpers

extension AcpSessionState {
    /// Add a permission request to the session state.
    mutating func addPermissionRequest(_ request: AcpPermissionRequestState) {
        permissionRequests[request.requestId] = request
        lastUpdateAt = Date().timeIntervalSince1970 * 1000
    }

    /// Resolve a permission request (user responded or timeout expired).
    /// Moves the request to history and removes from pending.
    mutating func resolvePermissionRequest(
        requestId: String,
        outcome: AcpPermissionOutcome,
        selectedOptionId: String?
    ) {
        guard let request = permissionRequests[requestId] else { return }

        let selectedOption: AcpPermissionDecision.SelectedOption?
        if let optionId = selectedOptionId,
           let option = request.options.first(where: { $0.optionId == optionId }) {
            selectedOption = AcpPermissionDecision.SelectedOption(
                optionId: option.optionId,
                name: option.name,
                kind: option.kind
            )
        } else {
            selectedOption = nil
        }

        let decision = AcpPermissionDecision(
            requestId: requestId,
            toolTitle: request.toolCall.title,
            toolKind: request.toolCall.kind,
            selectedOption: selectedOption,
            outcome: outcome,
            decidedAt: Date().timeIntervalSince1970 * 1000
        )

        permissionRequests.removeValue(forKey: requestId)
        permissionHistory.insert(decision, at: 0)
        if permissionHistory.count > permissionHistoryMax {
            permissionHistory = Array(permissionHistory.prefix(permissionHistoryMax))
        }
        lastUpdateAt = Date().timeIntervalSince1970 * 1000
    }

    /// Get the oldest pending permission request (first in queue).
    func nextPendingPermission() -> AcpPermissionRequestState? {
        permissionRequests.values
            .filter { $0.status == .pending }
            .sorted { $0.receivedAt < $1.receivedAt }
            .first
    }
}
