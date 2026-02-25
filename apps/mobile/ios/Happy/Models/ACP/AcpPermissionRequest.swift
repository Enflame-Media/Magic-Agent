//
//  AcpPermissionRequest.swift
//  Happy
//
//  ACP permission request types for the Agent Client Protocol.
//  Mirrors @magic-agent/protocol permission schemas and acpTypes.ts permission state.
//

import Foundation

// MARK: - Permission Option Kind

/// The type of permission option being presented to the user.
enum AcpPermissionOptionKind: String, Codable, Hashable {
    case allowOnce = "allow_once"
    case allowAlways = "allow_always"
    case rejectOnce = "reject_once"
    case rejectAlways = "reject_always"
}

// MARK: - Permission Option

/// An option presented to the user when requesting permission.
struct AcpPermissionOption: Codable, Hashable {
    let optionId: String
    let name: String
    let kind: AcpPermissionOptionKind

    private enum CodingKeys: String, CodingKey {
        case optionId, name, kind
        case meta = "_meta"
    }

    init(optionId: String, name: String, kind: AcpPermissionOptionKind) {
        self.optionId = optionId
        self.name = name
        self.kind = kind
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.optionId = try container.decode(String.self, forKey: .optionId)
        self.name = try container.decode(String.self, forKey: .name)
        self.kind = try container.decode(AcpPermissionOptionKind.self, forKey: .kind)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(optionId, forKey: .optionId)
        try container.encode(name, forKey: .name)
        try container.encode(kind, forKey: .kind)
    }
}

// MARK: - Permission Request Status

/// Status of a permission request in the mobile app.
enum AcpPermissionRequestStatus: String, Codable, Hashable {
    case pending
    case responded
    case expired
}

// MARK: - Permission Request State

/// A permission request received from the CLI agent.
/// Contains tool details and available options for user approval/denial.
struct AcpPermissionRequestState: Codable, Hashable {
    let requestId: String
    let sessionId: String
    let toolCall: AcpPermissionToolCallInfo
    let options: [AcpPermissionOption]
    let receivedAt: TimeInterval
    let timeoutAt: TimeInterval?
    var status: AcpPermissionRequestStatus
    var selectedOptionId: String?

    /// Simplified tool call info for the permission request context.
    struct AcpPermissionToolCallInfo: Codable, Hashable {
        let toolCallId: String
        let title: String
        let kind: String?
        let locations: [AcpToolCallLocation]?
    }

    init(
        requestId: String,
        sessionId: String,
        toolCall: AcpPermissionToolCallInfo,
        options: [AcpPermissionOption],
        receivedAt: TimeInterval = Date().timeIntervalSince1970 * 1000,
        timeoutAt: TimeInterval? = nil,
        status: AcpPermissionRequestStatus = .pending,
        selectedOptionId: String? = nil
    ) {
        self.requestId = requestId
        self.sessionId = sessionId
        self.toolCall = toolCall
        self.options = options
        self.receivedAt = receivedAt
        self.timeoutAt = timeoutAt
        self.status = status
        self.selectedOptionId = selectedOptionId
    }
}

// MARK: - Permission Decision

/// A resolved permission decision for the history log.
struct AcpPermissionDecision: Codable, Hashable {
    let requestId: String
    let toolTitle: String
    let toolKind: String?
    let selectedOption: SelectedOption?
    let outcome: AcpPermissionOutcome
    let decidedAt: TimeInterval

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

// MARK: - Wire Format: Permission Request from Server

/// The permission request payload as received from the server relay.
/// This is the decrypted content of the `payload` field in `acp-permission-request` events.
struct AcpWirePermissionRequest: Codable {
    let sessionId: String
    let toolCall: AcpToolCallUpdate
    let options: [AcpPermissionOption]

    private enum CodingKeys: String, CodingKey {
        case sessionId, toolCall, options
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.sessionId = try container.decode(String.self, forKey: .sessionId)
        self.toolCall = try container.decode(AcpToolCallUpdate.self, forKey: .toolCall)
        self.options = try container.decode([AcpPermissionOption].self, forKey: .options)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(sessionId, forKey: .sessionId)
        try container.encode(toolCall, forKey: .toolCall)
        try container.encode(options, forKey: .options)
    }
}
