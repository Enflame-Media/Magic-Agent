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
    /// Shared auth service for the app.
    @State private var authService = AuthService.shared

    /// Whether the QR scanner sheet is shown.
    @State private var showingQRScanner = false

    /// The main application body defining scenes and commands.
    var body: some Scene {
        // Main window
        WindowGroup {
            ContentView()
                .environment(authService)
                .sheet(isPresented: $showingQRScanner) {
                    QRScannerView { qrData in
                        handleQRScan(qrData)
                    }
                }
        }
        .commands {
            // File menu customization
            CommandGroup(replacing: .newItem) {
                Button("Scan QR Code...") {
                    showingQRScanner = true
                }
                .keyboardShortcut("n", modifiers: .command)
            }

            // Session menu
            CommandMenu("Session") {
                Button("Refresh") {
                    NotificationCenter.default.post(name: .refreshSessions, object: nil)
                }
                .keyboardShortcut("r", modifiers: .command)

                Divider()

                Button("Copy Session") {
                    NotificationCenter.default.post(name: .copySession, object: nil)
                }
                .keyboardShortcut("c", modifiers: [.command, .shift])

                Button("Export Session...") {
                    NotificationCenter.default.post(name: .exportSession, object: nil)
                }
                .keyboardShortcut("e", modifiers: [.command, .shift])
            }

            // Connection menu
            CommandMenu("Connection") {
                Button("Connect") {
                    NotificationCenter.default.post(name: .connect, object: nil)
                }
                .keyboardShortcut("k", modifiers: .command)

                Button("Disconnect") {
                    NotificationCenter.default.post(name: .disconnect, object: nil)
                }
                .keyboardShortcut("k", modifiers: [.command, .shift])

                Divider()

                Button("Connection Status...") {
                    NotificationCenter.default.post(name: .showConnectionStatus, object: nil)
                }
            }

            // Help menu additions
            CommandGroup(after: .help) {
                Divider()

                Link("Happy Documentation", destination: URL(string: "https://happy.engineering/docs")!)

                Link("Report an Issue", destination: URL(string: "https://github.com/Enflame-Media/happy/issues")!)
            }
        }
        .windowStyle(.automatic)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 1000, height: 700)

        // Settings window
        Settings {
            SettingsView()
                .environment(authService)
        }
    }

    // MARK: - QR Scan Handling

    private func handleQRScan(_ qrData: String) {
        // Parse the QR data and complete pairing
        guard let data = qrData.data(using: .utf8),
              let pairingInfo = try? JSONDecoder().decode(CLIPairingInfo.self, from: data) else {
            // Invalid QR data
            return
        }

        Task {
            try? await authService.completePairing(
                peerPublicKey: pairingInfo.publicKey,
                token: pairingInfo.token,
                machineId: pairingInfo.machineId
            )
        }
    }
}

// MARK: - CLI Pairing Info

/// Data structure received from CLI QR code.
struct CLIPairingInfo: Codable {
    let publicKey: String
    let token: String
    let machineId: String
    let machineName: String?
}

// MARK: - Notification Names

extension Notification.Name {
    static let refreshSessions = Notification.Name("refreshSessions")
    static let copySession = Notification.Name("copySession")
    static let exportSession = Notification.Name("exportSession")
    static let connect = Notification.Name("connect")
    static let disconnect = Notification.Name("disconnect")
    static let showConnectionStatus = Notification.Name("showConnectionStatus")
}
