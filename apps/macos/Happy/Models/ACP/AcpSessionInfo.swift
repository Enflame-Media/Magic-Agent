//
//  AcpSessionInfo.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Information about a session returned by the agent's session/list capability.
///
/// This is distinct from the main `Session` model — it represents sessions
/// known to the agent (which may include historical sessions not currently
/// being synced to the macOS app).
struct AcpSessionInfo: Identifiable, Codable, Hashable {
    /// Unique session identifier.
    let sessionId: String

    /// Working directory for this session.
    let cwd: String

    /// Display title for the session.
    let title: String?

    /// When the session was last updated (ISO 8601 string).
    let updatedAt: String?

    // MARK: - Identifiable

    var id: String { sessionId }

    /// Parsed date from the updatedAt string.
    var updatedDate: Date? {
        guard let dateString = updatedAt else { return nil }
        return ISO8601DateFormatter().date(from: dateString)
    }

    /// Display title, falling back to session ID.
    var displayTitle: String {
        title ?? sessionId
    }

    /// Short display of the working directory (last path component).
    var shortCwd: String {
        (cwd as NSString).lastPathComponent
    }
}

// MARK: - Session Action

/// Actions that can be performed on a session through the ACP.
enum AcpSessionAction: String, CaseIterable {
    case load
    case resume
    case fork

    /// Human-readable label.
    var label: String {
        switch self {
        case .load: return "Load Session"
        case .resume: return "Resume Session"
        case .fork: return "Fork Session"
        }
    }

    /// SF Symbol name for this action.
    var sfSymbolName: String {
        switch self {
        case .load: return "arrow.down.doc"
        case .resume: return "play.circle"
        case .fork: return "arrow.triangle.branch"
        }
    }

    /// Description of what this action does.
    var actionDescription: String {
        switch self {
        case .load: return "Load the full session history and continue."
        case .resume: return "Resume without loading previous messages."
        case .fork: return "Create a new session based on this one."
        }
    }
}

// MARK: - Session Action Request

/// Request to perform a session action through the relay.
struct AcpSessionActionRequest: Codable {
    /// The type of request message.
    let type: String

    /// The action to perform.
    let action: String

    /// The target session ID.
    let sessionId: String

    /// Working directory (required for load/resume/fork).
    let cwd: String?

    init(action: AcpSessionAction, sessionId: String, cwd: String? = nil) {
        self.type = "acp-session-action"
        self.action = action.rawValue
        self.sessionId = sessionId
        self.cwd = cwd
    }
}

// MARK: - Session Action Response

/// Response from a session action.
struct AcpSessionActionResponse: Codable {
    /// Whether the action was successful.
    let success: Bool

    /// New session ID (for fork action).
    let newSessionId: String?

    /// Error message if the action failed.
    let error: String?
}

// MARK: - Sample Data

extension AcpSessionInfo {
    /// Sample session info for previews.
    static let sample = AcpSessionInfo(
        sessionId: "ses-abc123",
        cwd: "/Users/dev/projects/happy",
        title: "Implement ACP features",
        updatedAt: ISO8601DateFormatter().string(from: Date())
    )

    /// Sample sessions list for previews.
    static let sampleList: [AcpSessionInfo] = [
        AcpSessionInfo(
            sessionId: "ses-001",
            cwd: "/Users/dev/projects/happy",
            title: "Implement ACP features",
            updatedAt: ISO8601DateFormatter().string(from: Date())
        ),
        AcpSessionInfo(
            sessionId: "ses-002",
            cwd: "/Users/dev/projects/api",
            title: "Fix authentication bug",
            updatedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-3600))
        ),
        AcpSessionInfo(
            sessionId: "ses-003",
            cwd: "/Users/dev/projects/docs",
            title: "Update documentation",
            updatedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-86400))
        )
    ]
}
