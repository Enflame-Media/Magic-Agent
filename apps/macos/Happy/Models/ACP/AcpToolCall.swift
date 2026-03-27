//
//  AcpToolCall.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Tool Kind

/// Categories of tools that can be invoked.
///
/// Helps clients choose appropriate icons and UI treatment.
///
/// - SeeAlso: `AcpToolKindSchema` in `@magic-agent/protocol`
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
}

// MARK: - Tool Call Status

/// Execution status of a tool call.
///
/// - SeeAlso: `AcpToolCallStatusSchema` in `@magic-agent/protocol`
enum AcpToolCallStatus: String, Codable, Hashable {
    case pending
    case inProgress = "in_progress"
    case completed
    case failed
}

// MARK: - Tool Call Location

/// A file location being accessed or modified by a tool.
///
/// Enables "follow-along" features in clients.
struct AcpToolCallLocation: Codable, Hashable {
    let path: String
    let line: Int?
}

// MARK: - Tool Call Content

/// Content produced by a tool call, discriminated on the `type` field.
///
/// Discriminated on `type`: "content" | "diff" | "terminal"
enum AcpToolCallContent: Codable, Hashable {
    case content(AcpToolCallContentContent)
    case diff(AcpToolCallContentDiff)
    case terminal(AcpToolCallContentTerminal)
    case unknown(String)

    private enum CodingKeys: String, CodingKey {
        case type
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "content":
            self = .content(try AcpToolCallContentContent(from: decoder))
        case "diff":
            self = .diff(try AcpToolCallContentDiff(from: decoder))
        case "terminal":
            self = .terminal(try AcpToolCallContentTerminal(from: decoder))
        default:
            self = .unknown(type)
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .content(let value):
            try value.encode(to: encoder)
        case .diff(let value):
            try value.encode(to: encoder)
        case .terminal(let value):
            try value.encode(to: encoder)
        case .unknown:
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode("unknown", forKey: .type)
        }
    }
}

/// Standard content within a tool call.
struct AcpToolCallContentContent: Codable, Hashable {
    let type: String
    let content: AcpContentBlock
}

/// Diff content showing file modifications.
struct AcpToolCallContentDiff: Codable, Hashable {
    let type: String
    let path: String
    let newText: String
    let oldText: String?
}

/// Terminal content embedding a created terminal.
struct AcpToolCallContentTerminal: Codable, Hashable {
    let type: String
    let terminalId: String
}

// MARK: - Tool Call

/// Represents a tool call that the language model has requested.
///
/// - SeeAlso: `AcpToolCallSchema` in `@magic-agent/protocol`
struct AcpToolCall: Codable, Hashable {
    let toolCallId: String
    var title: String
    var kind: AcpToolKind?
    var status: AcpToolCallStatus?
    var content: [AcpToolCallContent]?
    var locations: [AcpToolCallLocation]?

    // rawInput and rawOutput are not decoded (opaque JSON)
}

// MARK: - Tool Call Update

/// An update to an existing tool call.
///
/// All fields except toolCallId are optional -- only changed fields
/// need to be included.
struct AcpToolCallUpdate: Codable, Hashable {
    let toolCallId: String
    let title: String?
    let kind: AcpToolKind?
    let status: AcpToolCallStatus?
    let content: [AcpToolCallContent]?
    let locations: [AcpToolCallLocation]?
}
