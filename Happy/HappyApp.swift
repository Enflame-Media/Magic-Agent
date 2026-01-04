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

    /// Shared purchase service for the app.
    @State private var purchaseService = PurchaseService.shared

    /// Whether the QR scanner sheet is shown.
    @State private var showingQRScanner = false

    /// Whether the paywall sheet is shown.
    @State private var showingPaywall = false

    /// The main application body defining scenes and commands.
    var body: some Scene {
        // Main window
        WindowGroup {
            ContentView()
                .environment(authService)
                .environment(purchaseService)
                .sheet(isPresented: $showingQRScanner) {
                    QRScannerView { qrData in
                        handleQRScan(qrData)
                    }
                }
                .sheet(isPresented: $showingPaywall) {
                    PaywallView()
                }
                .task {
                    // Validate authentication token on app launch
                    await validateAuthenticationOnLaunch()
                    // Configure in-app purchases
                    await configurePurchases()
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

            // Friends menu
            CommandMenu("Friends") {
                Button("Show Friends") {
                    NotificationCenter.default.post(name: .showFriends, object: nil)
                }
                .keyboardShortcut("f", modifiers: [.command, .shift])

                Button("Add Friend...") {
                    NotificationCenter.default.post(name: .addFriend, object: nil)
                }
                .keyboardShortcut("n", modifiers: [.command, .option])

                Divider()

                Button("Refresh Friends") {
                    NotificationCenter.default.post(name: .refreshFriends, object: nil)
                }
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

            // Subscription menu
            CommandMenu("Subscription") {
                Button("Upgrade to Pro...") {
                    showingPaywall = true
                }
                .keyboardShortcut("u", modifiers: [.command, .shift])
                .disabled(purchaseService.isPro)

                Button("Restore Purchases") {
                    Task {
                        try? await purchaseService.restorePurchases()
                    }
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

    // MARK: - Authentication Validation

    /// Validate the stored authentication token on app launch.
    ///
    /// This ensures the token is still valid with the server and refreshes
    /// if needed. On network errors, optimistically assumes valid if
    /// credentials exist (for offline support).
    private func validateAuthenticationOnLaunch() async {
        // Only validate if we have stored credentials
        guard authService.state == .authenticated else {
            return
        }

        do {
            try await authService.validateToken()
            print("[App] Authentication token validated successfully")
        } catch {
            print("[App] Token validation failed: \(error.localizedDescription)")
            // AuthService handles state transitions internally
            // If validation fails completely, user will be shown login
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

    // MARK: - Purchase Configuration

    /// Configure RevenueCat purchases on app launch.
    private func configurePurchases() async {
        let apiKey = RevenueCatKeys.macOS

        guard !apiKey.isEmpty else {
            print("[App] RevenueCat API key not configured. Set REVENUECAT_MACOS_KEY environment variable.")
            return
        }

        // Get user ID from auth service if authenticated
        // Use machine ID or account ID as the RevenueCat app user ID
        let appUserID: String? = authService.state == .authenticated
            ? (authService.machine?.id ?? authService.account?.id)
            : nil

        await purchaseService.configure(apiKey: apiKey, appUserID: appUserID)

        print("[App] RevenueCat configured successfully")
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
    // Session notifications
    static let refreshSessions = Notification.Name("refreshSessions")
    static let copySession = Notification.Name("copySession")
    static let exportSession = Notification.Name("exportSession")

    // Connection notifications
    static let connect = Notification.Name("connect")
    static let disconnect = Notification.Name("disconnect")
    static let showConnectionStatus = Notification.Name("showConnectionStatus")

    // Friends notifications
    static let addFriend = Notification.Name("addFriend")
    static let refreshFriends = Notification.Name("refreshFriends")
    static let showFriends = Notification.Name("showFriends")

    // Subscription notifications
    static let showPaywall = Notification.Name("showPaywall")
}
