//
//  AcpToolCall.swift
//  Happy
//
//  ACP tool call types for the Agent Client Protocol.
//  Mirrors @magic-agent/protocol AcpToolCall and related schemas.
//

import Foundation

// MARK: - Tool Kind

/// Categories of tools that can be invoked.
enum AcpToolKind: String, Codable, Hashable {
    case read, edit, delete, move, search, execute, think, fetch
    case switchMode = "switch_mode"
    case other
}

// MARK: - Tool Call Status

/// Execution status of a tool call.
enum AcpToolCallStatus: String, Codable, Hashable {
    case pending
    case inProgress = "in_progress"
    case completed
    case failed
}

// MARK: - Tool Call Location

/// A file location being accessed or modified by a tool.
struct AcpToolCallLocation: Codable, Hashable {
    let path: String
    let line: Int?

    private enum CodingKeys: String, CodingKey {
        case path, line
        case meta = "_meta"
    }

    init(path: String, line: Int? = nil) {
        self.path = path
        self.line = line
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.path = try container.decode(String.self, forKey: .path)
        self.line = try container.decodeIfPresent(Int.self, forKey: .line)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(path, forKey: .path)
        try container.encodeIfPresent(line, forKey: .line)
    }
}

// MARK: - Tool Call Content

/// Content produced by a tool call - discriminated union on `type`.
enum AcpToolCallContent: Codable, Hashable {
    case content(AcpContentBlock)
    case diff(path: String, newText: String, oldText: String?)
    case terminal(terminalId: String)
    case unknown

    private enum TypeKey: String {
        case content, diff, terminal
    }

    private enum CodingKeys: String, CodingKey {
        case type, content, path, newText, oldText, terminalId
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let typeStr = try? container.decode(String.self, forKey: .type),
              let kind = TypeKey(rawValue: typeStr) else {
            self = .unknown
            return
        }
        switch kind {
        case .content:
            let block = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .content(block)
        case .diff:
            let path = try container.decode(String.self, forKey: .path)
            let newText = try container.decode(String.self, forKey: .newText)
            let oldText = try container.decodeIfPresent(String.self, forKey: .oldText)
            self = .diff(path: path, newText: newText, oldText: oldText)
        case .terminal:
            let terminalId = try container.decode(String.self, forKey: .terminalId)
            self = .terminal(terminalId: terminalId)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .content(let block):
            try container.encode("content", forKey: .type)
            try container.encode(block, forKey: .content)
        case .diff(let path, let newText, let oldText):
            try container.encode("diff", forKey: .type)
            try container.encode(path, forKey: .path)
            try container.encode(newText, forKey: .newText)
            try container.encodeIfPresent(oldText, forKey: .oldText)
        case .terminal(let terminalId):
            try container.encode("terminal", forKey: .type)
            try container.encode(terminalId, forKey: .terminalId)
        case .unknown:
            break
        }
    }
}

// MARK: - Tool Call

/// Represents a tool call initiated by an agent.
struct AcpToolCall: Codable, Hashable {
    let toolCallId: String
    var title: String
    var kind: AcpToolKind?
    var status: AcpToolCallStatus?
    var content: [AcpToolCallContent]?
    var locations: [AcpToolCallLocation]?

    private enum CodingKeys: String, CodingKey {
        case toolCallId, title, kind, status, content, locations
        case rawInput, rawOutput
        case meta = "_meta"
    }

    init(
        toolCallId: String,
        title: String,
        kind: AcpToolKind? = nil,
        status: AcpToolCallStatus? = nil,
        content: [AcpToolCallContent]? = nil,
        locations: [AcpToolCallLocation]? = nil
    ) {
        self.toolCallId = toolCallId
        self.title = title
        self.kind = kind
        self.status = status
        self.content = content
        self.locations = locations
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.toolCallId = try container.decode(String.self, forKey: .toolCallId)
        self.title = try container.decode(String.self, forKey: .title)
        self.kind = try container.decodeIfPresent(AcpToolKind.self, forKey: .kind)
        self.status = try container.decodeIfPresent(AcpToolCallStatus.self, forKey: .status)
        self.content = try container.decodeIfPresent([AcpToolCallContent].self, forKey: .content)
        self.locations = try container.decodeIfPresent([AcpToolCallLocation].self, forKey: .locations)
        // rawInput and rawOutput are z.unknown() — skipped intentionally
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(toolCallId, forKey: .toolCallId)
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(kind, forKey: .kind)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(content, forKey: .content)
        try container.encodeIfPresent(locations, forKey: .locations)
    }
}

// MARK: - Tool Call Update (Partial)

/// A partial update to an existing tool call. All fields except toolCallId are optional.
struct AcpToolCallUpdate: Codable, Hashable {
    let toolCallId: String
    let title: String?
    let kind: AcpToolKind?
    let status: AcpToolCallStatus?
    let content: [AcpToolCallContent]?
    let locations: [AcpToolCallLocation]?

    private enum CodingKeys: String, CodingKey {
        case toolCallId, title, kind, status, content, locations
        case rawInput, rawOutput
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.toolCallId = try container.decode(String.self, forKey: .toolCallId)
        self.title = try container.decodeIfPresent(String.self, forKey: .title)
        self.kind = try container.decodeIfPresent(AcpToolKind.self, forKey: .kind)
        self.status = try container.decodeIfPresent(AcpToolCallStatus.self, forKey: .status)
        self.content = try container.decodeIfPresent([AcpToolCallContent].self, forKey: .content)
        self.locations = try container.decodeIfPresent([AcpToolCallLocation].self, forKey: .locations)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(toolCallId, forKey: .toolCallId)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encodeIfPresent(kind, forKey: .kind)
        try container.encodeIfPresent(status, forKey: .status)
        try container.encodeIfPresent(content, forKey: .content)
        try container.encodeIfPresent(locations, forKey: .locations)
    }
}
