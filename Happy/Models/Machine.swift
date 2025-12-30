//
//  Machine.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// Represents a connected machine running Claude Code CLI.
///
/// Machines are the physical or virtual computers that run the Happy CLI
/// and connect to this app for remote control.
struct Machine: Identifiable, Codable, Hashable {
    /// Unique identifier for the machine.
    let id: String

    /// User-friendly name for the machine.
    var name: String

    /// Operating system of the machine.
    var platform: Platform

    /// Current connection status.
    var connectionStatus: ConnectionStatus

    /// When the machine was first connected.
    var connectedAt: Date

    /// Last time we received data from this machine.
    var lastSeenAt: Date

    /// Whether the machine is currently online.
    var isOnline: Bool {
        connectionStatus == .connected
    }
}

/// Supported operating systems for connected machines.
enum Platform: String, Codable, Hashable {
    case macOS
    case linux
    case windows
}

/// Connection status for a machine.
enum ConnectionStatus: String, Codable, Hashable {
    case connected
    case disconnected
    case connecting
}

// MARK: - Sample Data

extension Machine {
    /// Sample machine for previews.
    static let sample = Machine(
        id: "machine-sample",
        name: "MacBook Pro",
        platform: .macOS,
        connectionStatus: .connected,
        connectedAt: Date(),
        lastSeenAt: Date()
    )
}
