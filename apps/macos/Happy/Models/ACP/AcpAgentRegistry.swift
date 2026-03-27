//
//  AcpAgentRegistry.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Agent Status

/// Connection status for a registered ACP agent.
///
/// Mirrors the TypeScript `AcpAgentStatus` from `acpTypes.ts`.
enum AcpAgentStatus: String, Codable, Hashable {
    case connected
    case available
    case unavailable
    case error
}

// MARK: - Registered Agent

/// A registered ACP agent in the agent registry.
///
/// Relayed from CLI's AgentRegistry to the macOS app.
///
/// Mirrors the TypeScript `AcpRegisteredAgent` from `acpTypes.ts`.
struct AcpRegisteredAgent: Codable, Hashable, Identifiable {
    /// Unique agent identifier (e.g., "claude-code", "gemini-cli").
    let id: String

    /// Human-readable agent name.
    let name: String

    /// Optional description of the agent.
    let description: String?

    /// Agent connection status.
    var status: AcpAgentStatus

    /// Agent version string.
    let version: String?
}

// MARK: - Agent Registry State

/// Agent registry state relayed from CLI.
///
/// Contains all registered agents and which one is currently active.
///
/// Mirrors the TypeScript `AcpAgentRegistryState` from `acpTypes.ts`.
struct AcpAgentRegistryState: Codable, Hashable {
    /// All registered agents, keyed by agent ID.
    var agents: [String: AcpRegisteredAgent]

    /// ID of the currently active agent, or nil if none.
    var activeAgentId: String?

    /// Whether an agent switch is currently in progress.
    var switching: Bool

    /// Error message from last failed switch attempt.
    var switchError: String?

    /// Create a fresh agent registry state with defaults.
    static func initial() -> AcpAgentRegistryState {
        AcpAgentRegistryState(
            agents: [:],
            activeAgentId: nil,
            switching: false,
            switchError: nil
        )
    }

    /// The currently active agent, if any.
    var activeAgent: AcpRegisteredAgent? {
        guard let id = activeAgentId else { return nil }
        return agents[id]
    }
}
