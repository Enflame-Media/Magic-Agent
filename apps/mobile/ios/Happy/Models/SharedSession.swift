//
//  SharedSession.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a session that has been shared between two friends.
///
/// When a user shares a Claude Code session with a friend, a `SharedSession`
/// record is created linking the session to the friendship. The friend can
/// then view the session's messages and artifacts in read-only mode.
struct SharedSession: Identifiable, Codable, Hashable {
    /// Unique identifier for the shared session record.
    let id: String

    /// The ID of the underlying Claude Code session.
    let sessionId: String

    /// The session title at the time of sharing.
    var sessionTitle: String

    /// The ID of the user who shared the session.
    let sharedByUserId: String

    /// The display name of the user who shared the session.
    let sharedByDisplayName: String

    /// The ID of the user the session was shared with.
    let sharedWithUserId: String

    /// The display name of the user the session was shared with.
    let sharedWithDisplayName: String

    /// When the session was shared.
    let sharedAt: Date

    /// The status of the underlying session at the time of last update.
    var sessionStatus: SessionStatus

    /// Number of messages in the session.
    var messageCount: Int

    /// Permission level granted to the recipient.
    var permission: SharedSessionPermission
}

// MARK: - Permission

/// The permission level for a shared session.
enum SharedSessionPermission: String, Codable, Hashable {
    /// The recipient can only view the session (read-only).
    case viewOnly = "view_only"

    /// The recipient can view and interact with the session.
    case collaborate

    /// Display text for the permission level.
    var displayText: String {
        switch self {
        case .viewOnly: return "View Only"
        case .collaborate: return "Collaborate"
        }
    }

    /// System image name for the permission level.
    var systemImageName: String {
        switch self {
        case .viewOnly: return "eye"
        case .collaborate: return "person.2"
        }
    }
}

// MARK: - Sample Data

extension SharedSession {
    static let sample = SharedSession(
        id: "shared-001",
        sessionId: "session-123",
        sessionTitle: "Refactor authentication module",
        sharedByUserId: "user-me",
        sharedByDisplayName: "Me",
        sharedWithUserId: "user-123",
        sharedWithDisplayName: "Alice Developer",
        sharedAt: Date().addingTimeInterval(-3600),
        sessionStatus: .active,
        messageCount: 12,
        permission: .viewOnly
    )

    static let sampleCollaborate = SharedSession(
        id: "shared-002",
        sessionId: "session-456",
        sessionTitle: "Fix CI pipeline",
        sharedByUserId: "user-123",
        sharedByDisplayName: "Alice Developer",
        sharedWithUserId: "user-me",
        sharedWithDisplayName: "Me",
        sharedAt: Date().addingTimeInterval(-86400),
        sessionStatus: .completed,
        messageCount: 34,
        permission: .collaborate
    )

    static let samples: [SharedSession] = [sample, sampleCollaborate]
}
