//
//  AcpSessionUpdate.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Session Update

/// ACP session update, discriminated on the `sessionUpdate` field.
///
/// There are 11 variants matching the ACP protocol specification.
/// Unknown update types are captured as `.unknown` for forward compatibility.
///
/// - SeeAlso: `AcpSessionUpdateSchema` in `@magic-agent/protocol`
enum AcpSessionUpdate: Codable {
    case userMessageChunk(content: AcpContentBlock)
    case agentMessageChunk(content: AcpContentBlock)
    case agentThoughtChunk(content: AcpContentBlock)
    case toolCall(AcpToolCall)
    case toolCallUpdate(AcpToolCallUpdate)
    case plan(entries: [AcpPlanEntry])
    case availableCommandsUpdate(commands: [AcpAvailableCommand])
    case currentModeUpdate(currentModeId: String)
    case configOptionUpdate(configOptions: [AcpSessionConfigOption])
    case sessionInfoUpdate(title: String?, updatedAt: String?)
    case usageUpdate(used: Int, size: Int, cost: AcpCost?)
    case unknown(String)

    // MARK: - Coding Keys

    private enum CodingKeys: String, CodingKey {
        case sessionUpdate
        case content
        case entries
        case availableCommands
        case currentModeId
        case configOptions
        case title
        case updatedAt
        case used, size, cost
        case toolCallId
    }

    // MARK: - Decoding

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let updateType = try container.decode(String.self, forKey: .sessionUpdate)

        switch updateType {
        case "user_message_chunk":
            let content = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .userMessageChunk(content: content)

        case "agent_message_chunk":
            let content = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .agentMessageChunk(content: content)

        case "agent_thought_chunk":
            let content = try container.decode(AcpContentBlock.self, forKey: .content)
            self = .agentThoughtChunk(content: content)

        case "tool_call":
            let toolCall = try AcpToolCall(from: decoder)
            self = .toolCall(toolCall)

        case "tool_call_update":
            let update = try AcpToolCallUpdate(from: decoder)
            self = .toolCallUpdate(update)

        case "plan":
            let entries = try container.decode([AcpPlanEntry].self, forKey: .entries)
            self = .plan(entries: entries)

        case "available_commands_update":
            let commands = try container.decode([AcpAvailableCommand].self, forKey: .availableCommands)
            self = .availableCommandsUpdate(commands: commands)

        case "current_mode_update":
            let modeId = try container.decode(String.self, forKey: .currentModeId)
            self = .currentModeUpdate(currentModeId: modeId)

        case "config_option_update":
            let options = try container.decode([AcpSessionConfigOption].self, forKey: .configOptions)
            self = .configOptionUpdate(configOptions: options)

        case "session_info_update":
            let title = try container.decodeIfPresent(String.self, forKey: .title)
            let updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
            self = .sessionInfoUpdate(title: title, updatedAt: updatedAt)

        case "usage_update":
            let used = try container.decode(Int.self, forKey: .used)
            let size = try container.decode(Int.self, forKey: .size)
            let cost = try container.decodeIfPresent(AcpCost.self, forKey: .cost)
            self = .usageUpdate(used: used, size: size, cost: cost)

        default:
            self = .unknown(updateType)
        }
    }

    // MARK: - Encoding

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

        case .configOptionUpdate(let options):
            try container.encode("config_option_update", forKey: .sessionUpdate)
            try container.encode(options, forKey: .configOptions)

        case .sessionInfoUpdate(let title, let updatedAt):
            try container.encode("session_info_update", forKey: .sessionUpdate)
            try container.encodeIfPresent(title, forKey: .title)
            try container.encodeIfPresent(updatedAt, forKey: .updatedAt)

        case .usageUpdate(let used, let size, let cost):
            try container.encode("usage_update", forKey: .sessionUpdate)
            try container.encode(used, forKey: .used)
            try container.encode(size, forKey: .size)
            try container.encodeIfPresent(cost, forKey: .cost)

        case .unknown(let type):
            try container.encode(type, forKey: .sessionUpdate)
        }
    }
}
