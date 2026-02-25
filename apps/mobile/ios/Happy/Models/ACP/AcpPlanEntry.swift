//
//  AcpPlanEntry.swift
//  Happy
//
//  ACP plan entry for the Agent Client Protocol.
//  Mirrors @magic-agent/protocol AcpPlanEntry.
//

import Foundation

// MARK: - Plan Entry Priority

enum AcpPlanEntryPriority: String, Codable, Hashable {
    case high, medium, low
}

// MARK: - Plan Entry Status

enum AcpPlanEntryStatus: String, Codable, Hashable {
    case pending
    case inProgress = "in_progress"
    case completed
}

// MARK: - Plan Entry

/// A single entry in the agent's execution plan.
struct AcpPlanEntry: Codable, Hashable {
    let content: String
    let priority: AcpPlanEntryPriority
    let status: AcpPlanEntryStatus

    private enum CodingKeys: String, CodingKey {
        case content, priority, status
        case meta = "_meta"
    }

    init(content: String, priority: AcpPlanEntryPriority, status: AcpPlanEntryStatus) {
        self.content = content
        self.priority = priority
        self.status = status
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.content = try container.decode(String.self, forKey: .content)
        self.priority = try container.decode(AcpPlanEntryPriority.self, forKey: .priority)
        self.status = try container.decode(AcpPlanEntryStatus.self, forKey: .status)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(content, forKey: .content)
        try container.encode(priority, forKey: .priority)
        try container.encode(status, forKey: .status)
    }
}
