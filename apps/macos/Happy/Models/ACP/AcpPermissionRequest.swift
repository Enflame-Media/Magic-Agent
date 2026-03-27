//
//  AcpPermissionRequest.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Permission Option Kind

/// The type of permission option being presented to the user.
///
/// Helps clients choose appropriate icons and UI treatment.
///
/// - SeeAlso: `AcpPermissionOptionKindSchema` in `@magic-agent/protocol`
enum AcpPermissionOptionKind: String, Codable, Hashable {
    case allowOnce = "allow_once"
    case allowAlways = "allow_always"
    case rejectOnce = "reject_once"
    case rejectAlways = "reject_always"
}

// MARK: - Permission Option

/// An option presented to the user when requesting permission.
///
/// - SeeAlso: `AcpPermissionOptionSchema` in `@magic-agent/protocol`
struct AcpPermissionOption: Codable, Hashable, Identifiable {
    let optionId: String
    let name: String
    let kind: AcpPermissionOptionKind

    var id: String { optionId }
}

// MARK: - Permission Request Status

/// Status of a permission request in the macOS app.
enum AcpPermissionRequestStatus: String, Codable, Hashable {
    case pending
    case responded
    case expired
}

// MARK: - Permission Request Tool Call Info

/// Minimal tool call information needed for a permission request display.
struct AcpPermissionRequestToolCall: Codable, Hashable {
    let toolCallId: String
    let title: String
    let kind: AcpToolKind?
    let locations: [AcpToolCallLocation]?
}

// MARK: - Permission Request State

/// A permission request received from the CLI agent.
///
/// Contains the tool details and available options for user approval/denial.
/// Relayed from CLI through the server as an ACP session update.
///
/// Mirrors the TypeScript `AcpPermissionRequestState` from `acpTypes.ts`.
struct AcpPermissionRequestState: Codable, Hashable, Identifiable {
    /// Unique request ID for correlating response.
    let requestId: String

    /// Session ID this request belongs to.
    let sessionId: String

    /// Tool call that needs permission.
    let toolCall: AcpPermissionRequestToolCall

    /// Available permission options.
    let options: [AcpPermissionOption]

    /// When the request was received (Unix timestamp ms).
    let receivedAt: TimeInterval

    /// Timeout deadline (Unix timestamp ms), if specified by the agent.
    let timeoutAt: TimeInterval?

    /// Current status.
    var status: AcpPermissionRequestStatus

    /// Selected option ID, if responded.
    var selectedOptionId: String?

    var id: String { requestId }
}

// MARK: - Permission Decision

/// A resolved permission decision for the history log.
///
/// Mirrors the TypeScript `AcpPermissionDecision` from `acpTypes.ts`.
struct AcpPermissionDecision: Codable, Hashable {
    let requestId: String
    let toolTitle: String
    let toolKind: AcpToolKind?

    /// The selected option, or nil if expired/cancelled.
    let selectedOption: SelectedOption?

    /// Outcome of the decision.
    let outcome: AcpPermissionOutcome

    /// When the decision was made (Unix timestamp ms).
    let decidedAt: TimeInterval

    /// Nested type for the selected option details.
    struct SelectedOption: Codable, Hashable {
        let optionId: String
        let name: String
        let kind: AcpPermissionOptionKind
    }
}

/// Outcome of a permission request.
enum AcpPermissionOutcome: String, Codable, Hashable {
    case selected
    case expired
    case cancelled
}

// MARK: - Server Permission Request Envelope

/// The wire format for an `acp-permission-request` event from the server.
///
/// This wraps the ACP permission request data as received via WebSocket.
struct AcpPermissionRequestEnvelope: Codable {
    let sessionId: String
    let toolCall: AcpToolCallUpdate
    let options: [AcpPermissionOption]
}
