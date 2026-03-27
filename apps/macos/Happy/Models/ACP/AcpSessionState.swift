//
//  AcpSessionState.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Available Command Input

/// The input specification for a command.
struct AcpAvailableCommandInput: Codable, Hashable {
    let type: String
    let hint: String
}

// MARK: - Available Command

/// Information about a slash command available in the session.
///
/// - SeeAlso: `AcpAvailableCommandSchema` in `@magic-agent/protocol`
struct AcpAvailableCommand: Codable, Hashable, Identifiable {
    let name: String
    let description: String
    let input: AcpAvailableCommandInput?

    var id: String { name }
}

// MARK: - Session Config Types

/// A possible value for a session configuration option.
struct AcpSessionConfigSelectOption: Codable, Hashable {
    let value: String
    let name: String
    let description: String?
}

/// A group of possible values for a session configuration option.
struct AcpSessionConfigSelectGroup: Codable, Hashable {
    let group: String
    let name: String
    let options: [AcpSessionConfigSelectOption]
}

/// Possible values for a session configuration option (flat or grouped).
///
/// This enum handles the union type from the protocol: either a flat array
/// of options or a grouped array of option groups.
enum AcpSessionConfigSelectOptions: Codable, Hashable {
    case flat([AcpSessionConfigSelectOption])
    case grouped([AcpSessionConfigSelectGroup])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Try grouped first (has 'group' key), then flat
        if let grouped = try? container.decode([AcpSessionConfigSelectGroup].self),
           !grouped.isEmpty,
           grouped.first?.group != nil {
            self = .grouped(grouped)
        } else if let flat = try? container.decode([AcpSessionConfigSelectOption].self) {
            self = .flat(flat)
        } else {
            self = .flat([])
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .flat(let options):
            try container.encode(options)
        case .grouped(let groups):
            try container.encode(groups)
        }
    }
}

/// A session configuration option selector and its current state.
///
/// - SeeAlso: `AcpSessionConfigOptionSchema` in `@magic-agent/protocol`
struct AcpSessionConfigOption: Codable, Hashable, Identifiable {
    let type: String
    let id: String
    let name: String
    let description: String?
    let category: String?
    let currentValue: String
    let options: AcpSessionConfigSelectOptions
}

// MARK: - Cost

/// Cost information for a session.
///
/// - SeeAlso: `AcpCostSchema` in `@magic-agent/protocol`
struct AcpCost: Codable, Hashable {
    let amount: Double
    let currency: String

    /// Formatted cost string.
    var formatted: String {
        String(format: "%.4f %@", amount, currency)
    }
}

// MARK: - Usage

/// Context window usage and cost information.
struct AcpUsage: Codable, Hashable {
    let used: Int
    let size: Int
    let cost: AcpCost?

    /// Usage as a percentage (0.0 to 1.0).
    var percentage: Double {
        guard size > 0 else { return 0 }
        return Double(used) / Double(size)
    }

    /// Formatted usage string (e.g., "50,000 / 200,000").
    var formatted: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        let usedStr = formatter.string(from: NSNumber(value: used)) ?? "\(used)"
        let sizeStr = formatter.string(from: NSNumber(value: size)) ?? "\(size)"
        return "\(usedStr) / \(sizeStr)"
    }
}

// MARK: - Session State

/// Maximum number of permission decisions to keep in history.
private let permissionHistoryMax = 50

/// Accumulated ACP session state for a single session.
///
/// Built up from streaming ACP session updates. Each update kind
/// mutates a specific part of this state.
///
/// Mirrors the TypeScript `AcpSessionState` from `acpTypes.ts`.
struct AcpSessionState: Equatable {
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

    /// Timestamp of last ACP update received (Unix timestamp ms).
    var lastUpdateAt: TimeInterval = 0

    // MARK: - Factory

    /// Create a fresh ACP session state with defaults.
    static func initial() -> AcpSessionState {
        AcpSessionState()
    }

    // MARK: - Computed Properties

    /// Whether there are any pending permission requests.
    var hasPendingPermissions: Bool {
        permissionRequests.values.contains { $0.status == .pending }
    }

    /// The number of active (non-completed, non-failed) tool calls.
    var activeToolCallCount: Int {
        toolCalls.values.filter { tc in
            tc.status != .completed && tc.status != .failed
        }.count
    }

    // MARK: - Apply Update

    /// Apply an ACP session update to this state.
    ///
    /// Returns a new state object (value-type semantics, immutable update pattern).
    /// Mirrors the TypeScript `applyAcpSessionUpdate` function from `acpTypes.ts`.
    func applying(_ update: AcpSessionUpdate) -> AcpSessionState {
        let now = Date().timeIntervalSince1970 * 1000

        switch update {
        case .agentMessageChunk(let content):
            var state = self
            state.agentMessage += content.textContent
            state.lastUpdateAt = now
            return state

        case .userMessageChunk(let content):
            var state = self
            state.userMessage += content.textContent
            state.lastUpdateAt = now
            return state

        case .agentThoughtChunk(let content):
            var state = self
            state.agentThought += content.textContent
            state.lastUpdateAt = now
            return state

        case .toolCall(let toolCall):
            var state = self
            state.toolCalls[toolCall.toolCallId] = toolCall
            state.lastUpdateAt = now
            return state

        case .toolCallUpdate(let update):
            var state = self
            if var existing = state.toolCalls[update.toolCallId] {
                // Merge update into existing tool call
                if let title = update.title { existing.title = title }
                if let kind = update.kind { existing.kind = kind }
                if let status = update.status { existing.status = status }
                if let content = update.content { existing.content = content }
                if let locations = update.locations { existing.locations = locations }
                state.toolCalls[update.toolCallId] = existing
            } else {
                // Update for unknown tool call -- create a minimal entry
                let newToolCall = AcpToolCall(
                    toolCallId: update.toolCallId,
                    title: update.title ?? "Unknown Tool",
                    kind: update.kind,
                    status: update.status,
                    content: update.content,
                    locations: update.locations
                )
                state.toolCalls[update.toolCallId] = newToolCall
            }
            state.lastUpdateAt = now
            return state

        case .plan(let entries):
            var state = self
            state.plan = entries
            state.lastUpdateAt = now
            return state

        case .availableCommandsUpdate(let commands):
            var state = self
            state.availableCommands = commands
            state.lastUpdateAt = now
            return state

        case .currentModeUpdate(let modeId):
            var state = self
            state.currentModeId = modeId
            state.lastUpdateAt = now
            return state

        case .configOptionUpdate(let options):
            var state = self
            state.configOptions = options
            state.lastUpdateAt = now
            return state

        case .sessionInfoUpdate(let title, _):
            var state = self
            if let title = title {
                state.sessionTitle = title
            }
            state.lastUpdateAt = now
            return state

        case .usageUpdate(let used, let size, let cost):
            var state = self
            state.usage = AcpUsage(used: used, size: size, cost: cost)
            state.lastUpdateAt = now
            return state

        case .unknown:
            // Unknown update type -- ignore gracefully
            return self
        }
    }

    // MARK: - Permission Management

    /// Add a permission request to the session state.
    func addingPermissionRequest(_ request: AcpPermissionRequestState) -> AcpSessionState {
        var state = self
        state.permissionRequests[request.requestId] = request
        state.lastUpdateAt = Date().timeIntervalSince1970 * 1000
        return state
    }

    /// Resolve a permission request (user responded or timeout expired).
    /// Moves the request to history and removes from pending.
    func resolvingPermissionRequest(
        requestId: String,
        outcome: AcpPermissionOutcome,
        selectedOptionId: String?
    ) -> AcpSessionState {
        guard let request = permissionRequests[requestId] else { return self }

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

        var state = self
        state.permissionRequests.removeValue(forKey: requestId)
        state.permissionHistory = [decision] + state.permissionHistory
        if state.permissionHistory.count > permissionHistoryMax {
            state.permissionHistory = Array(state.permissionHistory.prefix(permissionHistoryMax))
        }
        state.lastUpdateAt = Date().timeIntervalSince1970 * 1000
        return state
    }

    /// Get the oldest pending permission request (first in queue).
    var nextPendingPermission: AcpPermissionRequestState? {
        permissionRequests.values
            .filter { $0.status == .pending }
            .sorted { $0.receivedAt < $1.receivedAt }
            .first
    }
}
