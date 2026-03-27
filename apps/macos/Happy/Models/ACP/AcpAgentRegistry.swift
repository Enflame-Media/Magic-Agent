//
//  AcpAgentRegistry.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a registered agent that can be connected to.
///
/// Agents are CLI instances that have been paired with the macOS app.
/// Each agent has capabilities that determine which session actions
/// are available (load, resume, fork).
struct AcpAgent: Identifiable, Codable, Hashable {
    /// Unique identifier for this agent.
    let id: String

    /// Display name for the agent.
    let name: String

    /// Version string of the agent.
    let version: String

    /// Optional display title for the agent.
    let title: String?

    /// Current connection status.
    var status: AcpAgentStatus

    /// Capabilities supported by this agent.
    let capabilities: AcpAgentCapabilities

    /// Display title, falling back to name.
    var displayTitle: String {
        title ?? name
    }

    /// SF Symbol name for the agent's status.
    var statusSymbolName: String {
        status.sfSymbolName
    }
}

// MARK: - Agent Status

/// Connection status of an agent.
enum AcpAgentStatus: String, Codable, Hashable {
    case online
    case offline
    case busy
    case error

    /// SF Symbol name for this status.
    var sfSymbolName: String {
        switch self {
        case .online: return "circle.fill"
        case .offline: return "circle"
        case .busy: return "circle.dotted"
        case .error: return "exclamationmark.circle.fill"
        }
    }

    /// Color name for this status (maps to SwiftUI Color).
    var colorName: String {
        switch self {
        case .online: return "green"
        case .offline: return "gray"
        case .busy: return "orange"
        case .error: return "red"
        }
    }

    /// Human-readable status text.
    var displayText: String {
        switch self {
        case .online: return "Online"
        case .offline: return "Offline"
        case .busy: return "Busy"
        case .error: return "Error"
        }
    }
}

// MARK: - Agent Capabilities

/// Capabilities advertised by an agent during initialization.
///
/// These determine which session management features are available
/// in the UI. Actions for unsupported capabilities are hidden.
struct AcpAgentCapabilities: Codable, Hashable {
    /// Whether the agent supports loading existing sessions.
    let loadSession: Bool

    /// Whether the agent supports resuming sessions.
    let resumeSession: Bool

    /// Whether the agent supports forking sessions.
    let forkSession: Bool

    /// Whether the agent supports listing sessions.
    let listSessions: Bool

    /// Default capabilities (all features disabled).
    static let none = AcpAgentCapabilities(
        loadSession: false,
        resumeSession: false,
        forkSession: false,
        listSessions: false
    )

    /// Full capabilities (all features enabled).
    static let full = AcpAgentCapabilities(
        loadSession: true,
        resumeSession: true,
        forkSession: true,
        listSessions: true
    )
}

// MARK: - Agent Switch Request

/// Request to switch the active agent.
struct AcpAgentSwitchRequest: Codable {
    /// The type of request message.
    let type: String

    /// The agent ID to switch to.
    let agentId: String

    init(agentId: String) {
        self.type = "acp-agent-switch"
        self.agentId = agentId
    }
}

// MARK: - Agent Switch Response

/// Response from an agent switch attempt.
struct AcpAgentSwitchResponse: Codable {
    /// Whether the switch was successful.
    let success: Bool

    /// Error message if the switch failed.
    let error: String?

    /// The previous agent ID for rollback reference.
    let previousAgentId: String?
}

// MARK: - Sample Data

extension AcpAgent {
    /// Sample agent for previews.
    static let sample = AcpAgent(
        id: "agent-claude-code",
        name: "claude-code",
        version: "1.0.42",
        title: "Claude Code",
        status: .online,
        capabilities: .full
    )

    /// Sample offline agent for previews.
    static let sampleOffline = AcpAgent(
        id: "agent-codex",
        name: "codex",
        version: "2.1.0",
        title: "Codex",
        status: .offline,
        capabilities: AcpAgentCapabilities(
            loadSession: true,
            resumeSession: false,
            forkSession: false,
            listSessions: true
        )
    )
}
