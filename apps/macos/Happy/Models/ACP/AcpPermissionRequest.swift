//
//  AcpPermissionRequest.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a tool call permission request from the agent.
///
/// When an agent wants to execute a tool (e.g., edit a file, run a command),
/// it sends a permission request that the user must approve or deny.
/// This mirrors the `AcpRequestPermissionRequest` schema from `@magic-agent/protocol`.
struct AcpPermissionRequest: Identifiable, Codable, Hashable {
    /// Unique identifier for this permission request.
    let requestId: String

    /// The session this request belongs to.
    let sessionId: String

    /// Details about the tool call requesting permission.
    let toolCall: AcpToolCallInfo

    /// Available permission options for the user to choose from.
    let options: [AcpPermissionOption]

    /// Timestamp (ms since epoch) when this request expires, if any.
    let timeoutAt: Int64?

    /// Current status of this permission request.
    var status: AcpPermissionStatus

    // MARK: - Identifiable

    var id: String { requestId }

    /// Whether this request has expired.
    var isExpired: Bool {
        if status == .expired { return true }
        guard let timeout = timeoutAt else { return false }
        return Date().timeIntervalSince1970 * 1000 >= Double(timeout)
    }

    /// Seconds remaining until timeout, or nil if no timeout.
    var secondsRemaining: Int? {
        guard let timeout = timeoutAt else { return nil }
        let remaining = (Double(timeout) - Date().timeIntervalSince1970 * 1000) / 1000
        return max(0, Int(ceil(remaining)))
    }
}

// MARK: - Permission Status

/// Status of a permission request.
enum AcpPermissionStatus: String, Codable, Hashable {
    case pending
    case approved
    case rejected
    case expired
    case cancelled
}

// MARK: - Tool Call Info

/// Information about a tool call within a permission request.
struct AcpToolCallInfo: Codable, Hashable {
    /// Unique identifier for the tool call.
    let toolCallId: String

    /// Display title for the tool call.
    let title: String

    /// Category of tool (read, edit, execute, etc.).
    let kind: AcpToolKind?

    /// File locations affected by this tool call.
    let locations: [AcpToolCallLocation]?

    /// Raw input data for the tool call (JSON string for display).
    let rawInput: String?
}

// MARK: - Tool Kind

/// Categories of tools that can be invoked.
/// Maps to SF Symbol names for icon display.
enum AcpToolKind: String, Codable, Hashable {
    case read
    case edit
    case delete
    case move
    case search
    case execute
    case think
    case fetch
    case switchMode = "switch_mode"
    case other

    /// SF Symbol name for this tool kind.
    var sfSymbolName: String {
        switch self {
        case .read: return "doc.text"
        case .edit: return "pencil.line"
        case .delete: return "trash"
        case .move: return "arrow.right.arrow.left"
        case .search: return "magnifyingglass"
        case .execute: return "terminal"
        case .think: return "lightbulb"
        case .fetch: return "icloud.and.arrow.down"
        case .switchMode: return "arrow.left.arrow.right"
        case .other: return "wrench"
        }
    }
}

// MARK: - Tool Call Location

/// A file location being accessed or modified by a tool.
struct AcpToolCallLocation: Codable, Hashable {
    /// File path.
    let path: String

    /// Line number, if applicable.
    let line: Int?

    /// Formatted display string.
    var displayString: String {
        if let line = line {
            return "\(path):\(line)"
        }
        return path
    }
}

// MARK: - Permission Option

/// An option presented to the user when requesting permission.
struct AcpPermissionOption: Identifiable, Codable, Hashable {
    /// Unique identifier for this option.
    let optionId: String

    /// Display name for the option.
    let name: String

    /// The kind of permission action.
    let kind: AcpPermissionOptionKind

    var id: String { optionId }

    /// Whether this is an allow action.
    var isAllow: Bool {
        kind == .allowOnce || kind == .allowAlways
    }
}

// MARK: - Permission Option Kind

/// The type of permission option being presented.
enum AcpPermissionOptionKind: String, Codable, Hashable {
    case allowOnce = "allow_once"
    case allowAlways = "allow_always"
    case rejectOnce = "reject_once"
    case rejectAlways = "reject_always"

    /// SF Symbol name for this option kind.
    var sfSymbolName: String {
        switch self {
        case .allowOnce: return "checkmark.circle"
        case .allowAlways: return "checkmark.circle.fill"
        case .rejectOnce: return "xmark.circle"
        case .rejectAlways: return "xmark.circle.fill"
        }
    }
}

// MARK: - Permission Response

/// The response sent back through the relay when the user selects an option.
struct AcpPermissionResponse: Codable {
    /// The type of response message.
    let type: String

    /// The request ID being responded to.
    let requestId: String

    /// The selected outcome.
    let outcome: AcpPermissionOutcome

    init(requestId: String, outcome: AcpPermissionOutcome) {
        self.type = "acp-permission-response"
        self.requestId = requestId
        self.outcome = outcome
    }
}

/// The outcome of a permission request.
struct AcpPermissionOutcome: Codable {
    /// Either "selected" or "cancelled".
    let outcome: String

    /// The selected option ID (only when outcome is "selected").
    let optionId: String?

    static func selected(optionId: String) -> AcpPermissionOutcome {
        AcpPermissionOutcome(outcome: "selected", optionId: optionId)
    }

    static let cancelled = AcpPermissionOutcome(outcome: "cancelled", optionId: nil)
}

// MARK: - Permission History Entry

/// A completed permission request for history display.
struct AcpPermissionHistoryEntry: Identifiable, Hashable {
    let id: String
    let toolTitle: String
    let toolKind: AcpToolKind?
    let selectedOption: String
    let wasAllowed: Bool
    let timestamp: Date
}

// MARK: - Sample Data

extension AcpPermissionRequest {
    /// Sample permission request for previews.
    static let sample = AcpPermissionRequest(
        requestId: "perm-001",
        sessionId: "session-123",
        toolCall: AcpToolCallInfo(
            toolCallId: "tc-001",
            title: "Edit file: Sources/App/main.swift",
            kind: .edit,
            locations: [
                AcpToolCallLocation(path: "Sources/App/main.swift", line: 42),
                AcpToolCallLocation(path: "Sources/App/config.swift", line: nil)
            ],
            rawInput: "{ \"path\": \"Sources/App/main.swift\", \"content\": \"import Foundation\\n...\" }"
        ),
        options: [
            AcpPermissionOption(optionId: "opt-1", name: "Allow Once", kind: .allowOnce),
            AcpPermissionOption(optionId: "opt-2", name: "Allow Always", kind: .allowAlways),
            AcpPermissionOption(optionId: "opt-3", name: "Reject Once", kind: .rejectOnce),
            AcpPermissionOption(optionId: "opt-4", name: "Reject Always", kind: .rejectAlways)
        ],
        timeoutAt: Int64((Date().timeIntervalSince1970 + 30) * 1000),
        status: .pending
    )
}
