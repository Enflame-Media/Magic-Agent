//
//  Friend.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a friend connection between two Happy users.
///
/// Friends can see each other's online status and share Claude Code sessions
/// in real-time. The friend model mirrors the server-side representation
/// and supports Codable for JSON serialization.
struct Friend: Identifiable, Codable, Hashable {
    /// Unique identifier for the friend relationship.
    let id: String

    /// The friend's user/account ID.
    let userId: String

    /// The friend's display name.
    var displayName: String

    /// The friend's email address, if available.
    var email: String?

    /// The friend's avatar URL, if available.
    var avatarUrl: String?

    /// The friend's current online status.
    var status: FriendStatus

    /// When the friendship was established.
    let friendsSince: Date

    /// The last time this friend was seen online (nil if never or currently online).
    var lastSeenAt: Date?

    /// Number of shared sessions with this friend.
    var sharedSessionCount: Int

    /// Whether this friend is currently online.
    var isOnline: Bool {
        status == .online
    }
}

// MARK: - Friend Status

/// The online status of a friend.
enum FriendStatus: String, Codable, Hashable {
    /// The friend is currently online and active.
    case online

    /// The friend is online but idle/away.
    case away

    /// The friend is currently in a Claude Code session.
    case inSession = "in_session"

    /// The friend is offline.
    case offline

    /// Display text for the status.
    var displayText: String {
        switch self {
        case .online: return "Online"
        case .away: return "Away"
        case .inSession: return "In Session"
        case .offline: return "Offline"
        }
    }

    /// System image name for the status indicator.
    var systemImageName: String {
        switch self {
        case .online: return "circle.fill"
        case .away: return "moon.fill"
        case .inSession: return "terminal.fill"
        case .offline: return "circle"
        }
    }
}

// MARK: - Sample Data

extension Friend {
    static let sample = Friend(
        id: "friend-001",
        userId: "user-123",
        displayName: "Alice Developer",
        email: "alice@example.com",
        avatarUrl: nil,
        status: .online,
        friendsSince: Date().addingTimeInterval(-86400 * 30),
        lastSeenAt: nil,
        sharedSessionCount: 5
    )

    static let sampleOffline = Friend(
        id: "friend-002",
        userId: "user-456",
        displayName: "Bob Engineer",
        email: "bob@example.com",
        avatarUrl: nil,
        status: .offline,
        friendsSince: Date().addingTimeInterval(-86400 * 60),
        lastSeenAt: Date().addingTimeInterval(-3600),
        sharedSessionCount: 2
    )

    static let sampleInSession = Friend(
        id: "friend-003",
        userId: "user-789",
        displayName: "Carol Coder",
        email: nil,
        avatarUrl: nil,
        status: .inSession,
        friendsSince: Date().addingTimeInterval(-86400 * 10),
        lastSeenAt: nil,
        sharedSessionCount: 0
    )

    static let samples: [Friend] = [sample, sampleOffline, sampleInSession]
}
