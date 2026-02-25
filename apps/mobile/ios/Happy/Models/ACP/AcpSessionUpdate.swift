//
//  AcpSessionUpdate.swift
//  Happy
//
//  ACP session update - discriminated union on `sessionUpdate` field.
//  All 11 update kinds from @magic-agent/protocol.
//

import Foundation

// MARK: - Session Update Kind

/// The 11 ACP session update kinds.
enum AcpSessionUpdateKind: String, Codable {
    case userMessageChunk = "user_message_chunk"
    case agentMessageChunk = "agent_message_chunk"
    case agentThoughtChunk = "agent_thought_chunk"
    case toolCall = "tool_call"
    case toolCallUpdate = "tool_call_update"
    case plan
    case availableCommandsUpdate = "available_commands_update"
    case currentModeUpdate = "current_mode_update"
    case configOptionUpdate = "config_option_update"
    case sessionInfoUpdate = "session_info_update"
    case usageUpdate = "usage_update"
}

// MARK: - Session Update

/// ACP session update - discriminated union with 11 variants.
///
/// Decoded from JSON with `sessionUpdate` as the discriminator field.
/// Unknown update types are preserved as `.unknown` for forward compatibility.
enum AcpSessionUpdate: Codable {
    // Message chunks (3)
    case userMessageChunk(content: AcpContentBlock)
    case agentMessageChunk(content: AcpContentBlock)
    case agentThoughtChunk(content: AcpContentBlock)

    // Tool calls (2)
    case toolCall(AcpToolCall)
    case toolCallUpdate(AcpToolCallUpdate)

    // Plan (1)
    case plan(entries: [AcpPlanEntry])

    // Session state (5)
    case availableCommandsUpdate(commands: [AcpAvailableCommand])
    case currentModeUpdate(currentModeId: String)
    case configOptionUpdate(configOptions: [AcpSessionConfigOption])
    case sessionInfoUpdate(title: String?, updatedAt: String?)
    case usageUpdate(used: Int, size: Int, cost: AcpCost?)

    // Forward compatibility
    case unknown(sessionUpdate: String)

    // MARK: - Codable

    private enum CodingKeys: String, CodingKey {
        case sessionUpdate
        case content
        // tool_call fields are decoded via AcpToolCall/AcpToolCallUpdate
        // plan
        case entries
        // available_commands_update
        case availableCommands
        // current_mode_update
        case currentModeId
        // config_option_update
        case configOptions
        // session_info_update
        case title, updatedAt
        // usage_update
        case used, size, cost
        // meta
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let kindStr = try container.decode(String.self, forKey: .sessionUpdate)

        guard let kind = AcpSessionUpdateKind(rawValue: kindStr) else {
            self = .unknown(sessionUpdate: kindStr)
            return
        }

        switch kind {
        case .userMessageChunk:
            let content = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .userMessageChunk(content: content)

        case .agentMessageChunk:
            let content = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .agentMessageChunk(content: content)

        case .agentThoughtChunk:
            let content = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .agentThoughtChunk(content: content)

        case .toolCall:
            // The tool_call update contains all AcpToolCall fields at the same level
            let toolCall = try AcpToolCall(from: decoder)
            self = .toolCall(toolCall)

        case .toolCallUpdate:
            let toolCallUpdate = try AcpToolCallUpdate(from: decoder)
            self = .toolCallUpdate(toolCallUpdate)

        case .plan:
            let entries = try container.decode([AcpPlanEntry].self, forKey: .entries)
            self = .plan(entries: entries)

        case .availableCommandsUpdate:
            let commands = try container.decode([AcpAvailableCommand].self, forKey: .availableCommands)
            self = .availableCommandsUpdate(commands: commands)

        case .currentModeUpdate:
            let modeId = try container.decode(String.self, forKey: .currentModeId)
            self = .currentModeUpdate(currentModeId: modeId)

        case .configOptionUpdate:
            let opts = try container.decode([AcpSessionConfigOption].self, forKey: .configOptions)
            self = .configOptionUpdate(configOptions: opts)

        case .sessionInfoUpdate:
            let title = try container.decodeIfPresent(String.self, forKey: .title)
            let updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
            self = .sessionInfoUpdate(title: title, updatedAt: updatedAt)

        case .usageUpdate:
            let used = try container.decode(Int.self, forKey: .used)
            let size = try container.decode(Int.self, forKey: .size)
            let cost = try container.decodeIfPresent(AcpCost.self, forKey: .cost)
            self = .usageUpdate(used: used, size: size, cost: cost)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)

        switch self {
        case .userMessageChunk(let content):
            try container.encode("user_message_chunk", forKey: .sessionUpdate)
            try container.encode(content, forKey: .content)

        case .agentMessageChunk(let content):
            try container.encode("agent_message_chunk", forKey: .sessionUpdate)
            try container.encode(content, forKey: .content)

        case .agentThoughtChunk(let content):
            try container.encode("agent_thought_chunk", forKey: .sessionUpdate)
            try container.encode(content, forKey: .content)

        case .toolCall(let toolCall):
            try container.encode("tool_call", forKey: .sessionUpdate)
            try toolCall.encode(to: encoder)

        case .toolCallUpdate(let update):
            try container.encode("tool_call_update", forKey: .sessionUpdate)
            try update.encode(to: encoder)

        case .plan(let entries):
            try container.encode("plan", forKey: .sessionUpdate)
            try container.encode(entries, forKey: .entries)

        case .availableCommandsUpdate(let commands):
            try container.encode("available_commands_update", forKey: .sessionUpdate)
            try container.encode(commands, forKey: .availableCommands)

        case .currentModeUpdate(let modeId):
            try container.encode("current_mode_update", forKey: .sessionUpdate)
            try container.encode(modeId, forKey: .currentModeId)

        case .configOptionUpdate(let opts):
            try container.encode("config_option_update", forKey: .sessionUpdate)
            try container.encode(opts, forKey: .configOptions)

        case .sessionInfoUpdate(let title, let updatedAt):
            try container.encode("session_info_update", forKey: .sessionUpdate)
            try container.encodeIfPresent(title, forKey: .title)
            try container.encodeIfPresent(updatedAt, forKey: .updatedAt)

        case .usageUpdate(let used, let size, let cost):
            try container.encode("usage_update", forKey: .sessionUpdate)
            try container.encode(used, forKey: .used)
            try container.encode(size, forKey: .size)
            try container.encodeIfPresent(cost, forKey: .cost)

        case .unknown(let kind):
            try container.encode(kind, forKey: .sessionUpdate)
        }
    }
}
