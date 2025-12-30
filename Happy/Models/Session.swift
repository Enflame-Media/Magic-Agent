//
//  Session.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a Claude Code session.
///
/// Sessions are the primary unit of work in Happy, representing an active
/// Claude Code interaction on a connected machine.
struct Session: Identifiable, Codable, Hashable {
    /// Unique identifier for the session.
    let id: String

    /// Display title for the session.
    var title: String

    /// Current status of the session.
    var status: SessionStatus

    /// The machine this session is running on.
    var machineId: String

    /// When the session was created.
    var createdAt: Date

    /// When the session was last updated.
    var updatedAt: Date

    /// Whether this session is currently active.
    var isActive: Bool {
        status == .active
    }
}

/// Possible states for a session.
enum SessionStatus: String, Codable, Hashable {
    case active
    case paused
    case completed
    case error
}

// MARK: - Sample Data

extension Session {
    /// Empty session for previews and testing.
    static let empty = Session(
        id: "",
        title: "",
        status: .active,
        machineId: "",
        createdAt: Date(),
        updatedAt: Date()
    )

    /// Sample session for previews.
    static let sample = Session(
        id: "sample-123",
        title: "Sample Session",
        status: .active,
        machineId: "machine-456",
        createdAt: Date(),
        updatedAt: Date()
    )
}
