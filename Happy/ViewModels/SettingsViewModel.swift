//
//  SettingsViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// ViewModel for the settings/preferences view.
///
/// Manages user preferences and connected account information.
@Observable
final class SettingsViewModel {
    // MARK: - State

    /// The authenticated account, if any.
    var account: AuthenticatedAccount?

    /// The connected machine, if any.
    var machine: ConnectedMachine?

    /// Whether the user is authenticated.
    var isAuthenticated: Bool {
        authService.state == .authenticated
    }

    /// Selected settings tab.
    var selectedTab: SettingsTab = .general

    // MARK: - Preferences

    /// Whether to show notifications for new messages.
    var notificationsEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "notificationsEnabled") }
        set { UserDefaults.standard.set(newValue, forKey: "notificationsEnabled") }
    }

    /// Whether to play sounds for events.
    var soundsEnabled: Bool {
        get { UserDefaults.standard.bool(forKey: "soundsEnabled") }
        set { UserDefaults.standard.set(newValue, forKey: "soundsEnabled") }
    }

    /// Whether to launch at login.
    var launchAtLogin: Bool {
        get { UserDefaults.standard.bool(forKey: "launchAtLogin") }
        set {
            UserDefaults.standard.set(newValue, forKey: "launchAtLogin")
            updateLoginItem(enabled: newValue)
        }
    }

    /// Theme preference.
    var themePreference: ThemePreference {
        get {
            ThemePreference(rawValue: UserDefaults.standard.string(forKey: "themePreference") ?? "system") ?? .system
        }
        set { UserDefaults.standard.set(newValue.rawValue, forKey: "themePreference") }
    }

    /// Server URL (for development/testing).
    var serverURL: String {
        get { UserDefaults.standard.string(forKey: "serverURL") ?? "https://api.happy.engineering" }
        set { UserDefaults.standard.set(newValue, forKey: "serverURL") }
    }

    // MARK: - Private Properties

    private let authService: AuthService

    // MARK: - Initialization

    init(authService: AuthService = .shared) {
        self.authService = authService
        loadAccountInfo()
    }

    // MARK: - Public Methods

    /// Load current account and machine info.
    func loadAccountInfo() {
        account = authService.account
        machine = authService.machine
    }

    /// Log out and disconnect.
    func logout() {
        authService.logout()
        account = nil
        machine = nil
    }

    /// Reset all settings to defaults.
    func resetToDefaults() {
        notificationsEnabled = true
        soundsEnabled = true
        launchAtLogin = false
        themePreference = .system
        serverURL = "https://api.happy.engineering"
    }

    // MARK: - Private Methods

    private func updateLoginItem(enabled: Bool) {
        // TODO: Use SMAppService or LSSharedFileList to manage login items
        // This requires proper entitlements
    }
}

// MARK: - Supporting Types

/// Available settings tabs.
enum SettingsTab: String, CaseIterable, Identifiable {
    case general = "General"
    case account = "Account"
    case notifications = "Notifications"
    case advanced = "Advanced"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .general: return "gearshape"
        case .account: return "person.circle"
        case .notifications: return "bell"
        case .advanced: return "wrench.and.screwdriver"
        }
    }
}

/// Theme preference options.
enum ThemePreference: String, CaseIterable, Identifiable {
    case system = "system"
    case light = "light"
    case dark = "dark"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        }
    }
}
