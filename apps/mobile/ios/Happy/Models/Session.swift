//
//  Session.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a Claude Code session.
struct Session: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var status: SessionStatus
    var machineId: String
    var createdAt: Date
    var updatedAt: Date

    var isActive: Bool {
        status == .active
    }
}

enum SessionStatus: String, Codable, Hashable {
    case active
    case paused
    case completed
    case error
}

extension Session {
    static let empty = Session(
        id: "",
        title: "",
        status: .active,
        machineId: "",
        createdAt: Date(),
        updatedAt: Date()
    )

    static let sample = Session(
        id: "sample-123",
        title: "Sample Session",
        status: .active,
        machineId: "machine-456",
        createdAt: Date(),
        updatedAt: Date()
    )
}
