//
//  Message.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a message in a Claude Code session.
struct Message: Identifiable, Codable, Hashable {
    let id: String
    let role: MessageRole
    var content: String
    let createdAt: Date
    var cost: MessageCost?
    var isStreaming: Bool
    var toolUses: [ToolUse]?
}

enum MessageRole: String, Codable, Hashable {
    case user
    case assistant
    case system
    case tool
}

struct MessageCost: Codable, Hashable {
    let inputTokens: Int
    let outputTokens: Int
    let totalCostUSD: Double?

    var formattedCost: String {
        if let cost = totalCostUSD {
            return String(format: "$%.4f", cost)
        }
        return "-"
    }
}

struct ToolUse: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let input: String?
    var output: String?
    var status: ToolStatus
}

enum ToolStatus: String, Codable, Hashable {
    case pending
    case running
    case completed
    case failed
}

extension Message {
    static let sampleUser = Message(
        id: "msg-user-1",
        role: .user,
        content: "Help me fix the bug in the authentication service",
        createdAt: Date(),
        cost: nil,
        isStreaming: false,
        toolUses: nil
    )

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
}
