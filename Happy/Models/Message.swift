//
//  Message.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a message in a Claude Code session.
///
/// Messages are the primary content unit in a session, representing
/// either user input or Claude's responses.
struct Message: Identifiable, Codable, Hashable {
    /// Unique identifier for the message.
    let id: String

    /// The role of the message sender.
    let role: MessageRole

    /// The content of the message.
    var content: String

    /// When the message was created.
    let createdAt: Date

    /// Optional cost information for this message.
    var cost: MessageCost?

    /// Whether this message is currently streaming.
    var isStreaming: Bool

    /// Tool uses within this message.
    var toolUses: [ToolUse]?
}

/// The role of a message sender.
enum MessageRole: String, Codable, Hashable {
    case user
    case assistant
    case system
    case tool
}

/// Cost information for a message.
struct MessageCost: Codable, Hashable {
    /// Input tokens used.
    let inputTokens: Int

    /// Output tokens generated.
    let outputTokens: Int

    /// Total cost in USD.
    let totalCostUSD: Double?

    /// Formatted cost string.
    var formattedCost: String {
        if let cost = totalCostUSD {
            return String(format: "$%.4f", cost)
        }
        return "—"
    }
}

/// Represents a tool use within a message.
struct ToolUse: Identifiable, Codable, Hashable {
    /// Unique identifier.
    let id: String

    /// The name of the tool.
    let name: String

    /// Input parameters (as JSON string).
    let input: String?

    /// Output result (as JSON string).
    var output: String?

    /// Status of the tool execution.
    var status: ToolStatus
}

/// Status of a tool execution.
enum ToolStatus: String, Codable, Hashable {
    case pending
    case running
    case completed
    case failed
}

// MARK: - Sample Data

extension Message {
    /// Sample user message for previews.
    static let sampleUser = Message(
        id: "msg-user-1",
        role: .user,
        content: "Help me fix the bug in the authentication service",
        createdAt: Date(),
        cost: nil,
        isStreaming: false,
        toolUses: nil
    )

    /// Sample assistant message for previews.
    static let sampleAssistant = Message(
        id: "msg-assistant-1",
        role: .assistant,
        content: "I'll help you fix the authentication bug. Let me first look at the relevant code...",
        createdAt: Date(),
        cost: MessageCost(inputTokens: 150, outputTokens: 200, totalCostUSD: 0.0035),
        isStreaming: false,
        toolUses: [
            ToolUse(
                id: "tool-1",
                name: "Read",
                input: "{\"file_path\": \"src/auth/service.ts\"}",
                output: "// Auth service contents...",
                status: .completed
            )
        ]
    )

    /// Sample messages array for previews.
    static let samples: [Message] = [
        sampleUser,
        sampleAssistant
    ]
}
