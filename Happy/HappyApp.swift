//
//  HappyApp.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// The main entry point for the Happy macOS application.
///
/// Happy is a native macOS client for remote control and session sharing
/// with Claude Code, providing end-to-end encrypted communication.
@main
struct HappyApp: App {
    /// The main application body defining scenes and commands.
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .commands {
            // Custom menu commands will be added here
            // Example: CommandGroup for session management
            // CommandMenu("Sessions") {
            //     Button("New Session") { }
            //     Button("Refresh") { }
            // }
        }
        .windowStyle(.automatic)
        .windowToolbarStyle(.unified)
    }
}
