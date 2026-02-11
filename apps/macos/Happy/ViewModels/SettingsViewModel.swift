//
//  SettingsViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import AppKit
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

    // MARK: - Language Settings (HAP-724)

    /// The localization manager for language operations.
    private let localizationManager = LocalizationManager.shared

    /// The current language code ("auto" for system, or specific code like "en", "es").
    var selectedLanguage: String {
        get {
            UserDefaults.standard.string(forKey: "preferredLanguage") ?? "auto"
        }
        set {
            localizationManager.currentLanguage = newValue
            languageChangeRequiresRestart = true
        }
    }

    /// Whether a language change requires restart.
    var languageChangeRequiresRestart: Bool = false

    /// List of supported language options (including auto).
    var supportedLanguages: [(code: String, name: String)] {
        var languages: [(code: String, name: String)] = [("auto", "settings.language.automatic".localized)]
        for locale in LocalizationManager.supportedLocales {
            languages.append((locale, localizationManager.displayName(for: locale)))
        }
        return languages
    }

    // MARK: - Voice Settings (HAP-903)

    /// Whether to enable voice assistant features.
    /// When disabled, VoiceService will not start sessions.
    var voiceAssistantEnabled: Bool {
        get {
            // Default to true if not set (matches React Native implementation)
            if UserDefaults.standard.object(forKey: "voiceAssistantEnabled") == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: "voiceAssistantEnabled")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "voiceAssistantEnabled")
        }
    }

    // MARK: - Privacy Settings (HAP-727, HAP-768)

    /// Whether to show online status to friends.
    /// When disabled, user appears offline to all friends.
    var showOnlineStatus: Bool {
        get {
            // Default to true if not set
            if UserDefaults.standard.object(forKey: "showOnlineStatus") == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: "showOnlineStatus")
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "showOnlineStatus")
            // Sync to server when authenticated
            Task { await syncPrivacySettingsToServer() }
        }
    }

    /// Profile visibility setting (HAP-768).
    var profileVisibility: ProfileVisibility {
        get {
            guard let rawValue = UserDefaults.standard.string(forKey: "profileVisibility") else {
                return .public
            }
            return ProfileVisibility(rawValue: rawValue) ?? .public
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: "profileVisibility")
            Task { await syncPrivacySettingsToServer() }
        }
    }

    /// Friend request permission setting (HAP-768).
    var friendRequestPermission: FriendRequestPermission {
        get {
            guard let rawValue = UserDefaults.standard.string(forKey: "friendRequestPermission") else {
                return .anyone
            }
            return FriendRequestPermission(rawValue: rawValue) ?? .anyone
        }
        set {
            UserDefaults.standard.set(newValue.rawValue, forKey: "friendRequestPermission")
            Task { await syncPrivacySettingsToServer() }
        }
    }

    /// Whether privacy settings are being synced.
    var isSyncingPrivacy: Bool = false

    /// Error message if privacy sync fails.
    var privacySyncError: String?

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
        voiceAssistantEnabled = true
        showOnlineStatus = true
        profileVisibility = .public
        friendRequestPermission = .anyone
        selectedLanguage = "auto"
        languageChangeRequiresRestart = false
    }

    /// Restart the application.
    func restartApp() {
        let task = Process()
        task.launchPath = "/bin/sh"
        task.arguments = ["-c", "sleep 0.5; open \"\(Bundle.main.bundlePath)\""]
        task.launch()

        NSApplication.shared.terminate(nil)
    }

    /// Load privacy settings from server.
    func loadPrivacySettings() async {
        guard isAuthenticated else { return }

        isSyncingPrivacy = true
        privacySyncError = nil

        do {
            let settings = try await fetchPrivacySettings()
            await MainActor.run {
                // Update local cache without triggering sync
                UserDefaults.standard.set(settings.showOnlineStatus, forKey: "showOnlineStatus")
                UserDefaults.standard.set(settings.profileVisibility.rawValue, forKey: "profileVisibility")
                UserDefaults.standard.set(settings.friendRequestPermission.rawValue, forKey: "friendRequestPermission")
                self.isSyncingPrivacy = false
            }
        } catch {
            await MainActor.run {
                self.privacySyncError = error.localizedDescription
                self.isSyncingPrivacy = false
            }
        }
    }

    // MARK: - Private Methods

    private func updateLoginItem(enabled: Bool) {
        // TODO: Use SMAppService or LSSharedFileList to manage login items
        // This requires proper entitlements
    }

    /// Sync privacy settings to server.
    private func syncPrivacySettingsToServer() async {
        guard isAuthenticated else { return }

        await MainActor.run { isSyncingPrivacy = true }

        do {
            let settings = PrivacySettings(
                showOnlineStatus: showOnlineStatus,
                profileVisibility: profileVisibility,
                friendRequestPermission: friendRequestPermission
            )
            _ = try await updatePrivacySettings(settings)
            await MainActor.run {
                self.privacySyncError = nil
                self.isSyncingPrivacy = false
            }
        } catch {
            await MainActor.run {
                self.privacySyncError = error.localizedDescription
                self.isSyncingPrivacy = false
            }
        }
    }

    /// Fetch privacy settings from server.
    private func fetchPrivacySettings() async throws -> PrivacySettings {
        guard let token = authService.account?.token else {
            throw APIError.invalidResponse
        }

        let url = URL(string: "\(serverURL)/v1/users/me/privacy")!
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(PrivacySettings.self, from: data)
    }

    /// Update privacy settings on server.
    private func updatePrivacySettings(_ settings: PrivacySettings) async throws -> PrivacySettings {
        guard let token = authService.account?.token else {
            throw APIError.invalidResponse
        }

        let url = URL(string: "\(serverURL)/v1/users/me/privacy")!
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(settings)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: (response as? HTTPURLResponse)?.statusCode ?? 0)
        }

        return try JSONDecoder().decode(PrivacySettings.self, from: data)
    }
}

// MARK: - Privacy Settings (HAP-727, HAP-768)

/// Profile visibility options.
enum ProfileVisibility: String, Codable, CaseIterable, Identifiable {
    case `public` = "public"
    case friendsOnly = "friends-only"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .public: return "Public"
        case .friendsOnly: return "Friends Only"
        }
    }

    var description: String {
        switch self {
        case .public: return "Anyone can view your profile"
        case .friendsOnly: return "Only friends can view your profile"
        }
    }
}

/// Friend request permission options.
enum FriendRequestPermission: String, Codable, CaseIterable, Identifiable {
    case anyone = "anyone"
    case friendsOfFriends = "friends-of-friends"
    case none = "none"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .anyone: return "Anyone"
        case .friendsOfFriends: return "Friends of Friends"
        case .none: return "No One"
        }
    }

    var description: String {
        switch self {
        case .anyone: return "Anyone can send you friend requests"
        case .friendsOfFriends: return "Only friends of your friends can send requests"
        case .none: return "Nobody can send you friend requests"
        }
    }
}

/// Privacy settings structure for API communication.
struct PrivacySettings: Codable {
    let showOnlineStatus: Bool
    let profileVisibility: ProfileVisibility
    let friendRequestPermission: FriendRequestPermission
}

// MARK: - Supporting Types

/// Available settings tabs.
enum SettingsTab: String, CaseIterable, Identifiable {
    case general = "General"
    case account = "Account"
    case subscription = "Subscription"
    case voice = "Voice"
    case language = "Language"
    case privacy = "Privacy"
    case notifications = "Notifications"
    case advanced = "Advanced"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .general: return "gearshape"
        case .account: return "person.circle"
        case .subscription: return "creditcard"
        case .voice: return "waveform"
        case .language: return "globe"
        case .privacy: return "eye.slash"
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
