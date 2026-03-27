//
//  AcpTypes.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Permission Option Types

/// Kind of a permission option, matching ACP protocol specification.
///
/// Maps to `AcpPermissionOptionKind` from `@magic-agent/protocol`.
enum AcpPermissionOptionKind: String, Codable {
    case allowOnce = "allow_once"
    case allowAlways = "allow_always"
    case rejectOnce = "reject_once"
    case rejectAlways = "reject_always"
}

/// A single permission option presented to the user.
///
/// Represents one of the choices the user can select when a tool
/// requests permission (e.g., "Allow Once", "Reject Always").
struct AcpPermissionOption: Codable, Identifiable {
    let optionId: String
    let name: String
    let kind: AcpPermissionOptionKind
    let description: String?

    var id: String { optionId }
}

/// Tool call location reference for display in permission UI.
struct AcpToolCallLocation: Codable {
    let file: String?
    let line: Int?
    let column: Int?
}

// MARK: - Permission Request State

/// Status of a permission request in the iOS app.
enum AcpPermissionRequestStatus: String, Codable {
    case pending
    case responded
    case expired
}

/// The outcome of a permission decision.
///
/// Matches the outcome field used in the ACP protocol permission response.
enum AcpPermissionOutcome: String, Codable {
    /// User selected an option (allow or reject).
    case selected
    /// The permission request expired before the user responded.
    case expired
    /// The permission request was cancelled.
    case cancelled
}

/// A permission request received from the CLI agent.
///
/// Contains the tool details and available options for user approval/denial.
/// Relayed from CLI through the server as an ACP ephemeral event.
struct AcpPermissionRequestState: Identifiable {
    /// Unique request ID for correlating response.
    let requestId: String

    /// Session ID this request belongs to.
    let sessionId: String

    /// Tool call that needs permission.
    let toolCall: AcpPermissionToolCall

    /// Available permission options.
    let options: [AcpPermissionOption]

    /// When the request was received.
    let receivedAt: Date

    /// Timeout deadline, if specified by the agent.
    let timeoutAt: Date?

    /// Current status.
    var status: AcpPermissionRequestStatus

    /// Selected option ID, if responded.
    var selectedOptionId: String?

    var id: String { requestId }
}

/// Tool call information for a permission request.
struct AcpPermissionToolCall {
    let toolCallId: String
    let title: String
    let kind: String?
    let rawInput: Any?
    let locations: [AcpToolCallLocation]?
}

// MARK: - Permission Decision History

/// A resolved permission decision for the history log.
struct AcpPermissionDecision {
    let requestId: String
    let toolTitle: String
    let toolKind: String?
    let selectedOption: SelectedOptionInfo?
    let outcome: AcpPermissionOutcome
    let decidedAt: Date
}

/// Info about the selected option in a permission decision.
struct SelectedOptionInfo {
    let optionId: String
    let name: String
    let kind: AcpPermissionOptionKind
}

// MARK: - Permission Response Payload

/// Payload structure for an ACP permission response sent via WebSocket.
///
/// This matches the format expected by the server relay and CLI agent:
/// ```json
/// {
///     "_meta": {},
///     "outcome": {
///         "outcome": "selected",
///         "_meta": {},
///         "optionId": "allow-once-123"
///     }
/// }
/// ```
///
/// The payload is encrypted with the session's shared key before transmission.
struct AcpPermissionResponsePayload: Codable {
    let _meta: [String: String]
    let outcome: AcpPermissionResponseOutcome

    init(selectedOptionId: String, outcome: AcpPermissionOutcome) {
        self._meta = [:]
        self.outcome = AcpPermissionResponseOutcome(
            outcome: outcome.rawValue,
            _meta: [:],
            optionId: outcome == .selected ? selectedOptionId : nil
        )
    }
}

/// The outcome portion of a permission response payload.
struct AcpPermissionResponseOutcome: Codable {
    let outcome: String
    let _meta: [String: String]
    let optionId: String?
}
