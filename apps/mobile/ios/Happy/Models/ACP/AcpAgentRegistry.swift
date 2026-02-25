//
//  AcpAgentRegistry.swift
//  Happy
//
//  ACP agent registry types for the Agent Client Protocol.
//  Mirrors acpTypes.ts AcpRegisteredAgent, AcpAgentRegistryState.
//

import Foundation

// MARK: - Agent Status

/// Connection status for a registered ACP agent.
enum AcpAgentStatus: String, Codable, Hashable {
    case connected
    case available
    case unavailable
    case error
}

// MARK: - Registered Agent

/// A registered ACP agent in the agent registry.
struct AcpRegisteredAgent: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let status: AcpAgentStatus
    let version: String?
}

// MARK: - Agent Registry State

/// Agent registry state relayed from CLI.
struct AcpAgentRegistryState: Codable, Hashable {
    var agents: [String: AcpRegisteredAgent]
    var activeAgentId: String?
    var switching: Bool
    var switchError: String?

    /// The currently active agent, if any.
    var activeAgent: AcpRegisteredAgent? {
        guard let id = activeAgentId else { return nil }
        return agents[id]
    }

    /// Create a fresh agent registry state.
    static func empty() -> AcpAgentRegistryState {
        AcpAgentRegistryState(
            agents: [:],
            activeAgentId: nil,
            switching: false,
            switchError: nil
        )
    }
}

// MARK: - Session Browser

/// Session browser capability helpers derived from agent capabilities.
struct AcpSessionBrowserCapabilities: Hashable {
    let canListSessions: Bool
    let canLoadSession: Bool
    let canResumeSession: Bool
    let canForkSession: Bool

    static let none = AcpSessionBrowserCapabilities(
        canListSessions: false,
        canLoadSession: false,
        canResumeSession: false,
        canForkSession: false
    )
}

/// Session item for the browser list.
struct AcpBrowserSession: Codable, Hashable, Identifiable {
    let id: String
    let sessionId: String
    let title: String
    let cwd: String
    let updatedAt: String?
    let isActive: Bool

    init(sessionId: String, title: String, cwd: String, updatedAt: String? = nil, isActive: Bool = false) {
        self.id = sessionId
        self.sessionId = sessionId
        self.title = title
        self.cwd = cwd
        self.updatedAt = updatedAt
        self.isActive = isActive
    }
}
