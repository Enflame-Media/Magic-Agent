//
//  NotificationSettingsViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import UIKit
import UserNotifications

/// ViewModel for managing notification preferences and settings.
///
/// Provides a reactive interface for the notification settings view,
/// handling permission requests, status display, and navigation to
/// system settings.
///
/// Uses `ObservableObject` for iOS 16 compatibility (not `@Observable`
/// which requires iOS 17).
final class NotificationSettingsViewModel: ObservableObject {

    // MARK: - Published Properties

    /// Whether push notifications are enabled (authorized).
    @Published private(set) var isEnabled: Bool = false

    /// Whether the permission has not yet been requested.
    @Published private(set) var isNotDetermined: Bool = true

    /// Whether a permission request is currently in progress.
    @Published private(set) var isRequestingPermission: Bool = false

    /// Human-readable status description for the current authorization state.
    @Published private(set) var statusDescription: String = NSLocalizedString("notifications.status.notConfigured", comment: "")

    /// The current device token, if available.
    @Published private(set) var deviceToken: String?

    /// Whether session update notifications are enabled.
    @Published var sessionUpdatesEnabled: Bool = true {
        didSet { savePreferences() }
    }

    /// Whether message notifications are enabled.
    @Published var messagesEnabled: Bool = true {
        didSet { savePreferences() }
    }

    /// Whether pairing request notifications are enabled.
    @Published var pairingEnabled: Bool = true {
        didSet { savePreferences() }
    }

    // MARK: - Dependencies

    private let pushService: PushNotificationService

    // MARK: - Initialization

    /// Creates a new notification settings view model.
    ///
    /// - Parameter pushService: The push notification service to manage.
    ///   Defaults to the shared singleton.
    init(pushService: PushNotificationService = .shared) {
        self.pushService = pushService
        loadPreferences()
    }

    // MARK: - Public Methods

    /// Load the current notification status from the system.
    ///
    /// Should be called when the settings view appears.
    @MainActor
    func loadStatus() async {
        await pushService.refreshAuthorizationStatus()
        isEnabled = pushService.isAuthorized
        isNotDetermined = pushService.isNotDetermined
        deviceToken = pushService.deviceToken ?? pushService.storedDeviceToken()
        updateStatusDescription()
    }

    /// Request notification permission from the user.
    ///
    /// If permission has already been determined, directs the user to
    /// system Settings instead.
    @MainActor
    func requestPermission() async {
        guard isNotDetermined else {
            // Permission was already determined; open Settings
            openSystemSettings()
            return
        }

        isRequestingPermission = true
        let granted = await pushService.requestPermission()
        isRequestingPermission = false
        isEnabled = granted
        isNotDetermined = false

        if granted {
            deviceToken = pushService.deviceToken
        }

        updateStatusDescription()
    }

    /// Open the app's notification settings in the system Settings app.
    func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        Task { @MainActor in
            UIApplication.shared.open(url)
        }
    }

    // MARK: - Private Methods

    /// Update the human-readable status description.
    @MainActor
    private func updateStatusDescription() {
        switch pushService.authorizationStatus {
        case .authorized:
            statusDescription = NSLocalizedString("notifications.status.enabled", comment: "")
        case .denied:
            statusDescription = NSLocalizedString("notifications.status.denied", comment: "")
        case .provisional:
            statusDescription = NSLocalizedString("notifications.status.provisional", comment: "")
        case .ephemeral:
            statusDescription = NSLocalizedString("notifications.status.ephemeral", comment: "")
        case .notDetermined:
            statusDescription = NSLocalizedString("notifications.status.notConfigured", comment: "")
        @unknown default:
            statusDescription = NSLocalizedString("notifications.status.unknown", comment: "")
        }
    }

    // MARK: - Preferences Persistence

    /// User defaults keys for notification preferences.
    private enum PreferenceKey {
        static let sessionUpdates = "notification_session_updates"
        static let messages = "notification_messages"
        static let pairing = "notification_pairing"
    }

    /// Save notification preferences to UserDefaults.
    private func savePreferences() {
        let defaults = UserDefaults.standard
        defaults.set(sessionUpdatesEnabled, forKey: PreferenceKey.sessionUpdates)
        defaults.set(messagesEnabled, forKey: PreferenceKey.messages)
        defaults.set(pairingEnabled, forKey: PreferenceKey.pairing)
    }

    /// Load notification preferences from UserDefaults.
    private func loadPreferences() {
        let defaults = UserDefaults.standard

        // Default to true if not previously set
        if defaults.object(forKey: PreferenceKey.sessionUpdates) != nil {
            sessionUpdatesEnabled = defaults.bool(forKey: PreferenceKey.sessionUpdates)
        }
        if defaults.object(forKey: PreferenceKey.messages) != nil {
            messagesEnabled = defaults.bool(forKey: PreferenceKey.messages)
        }
        if defaults.object(forKey: PreferenceKey.pairing) != nil {
            pairingEnabled = defaults.bool(forKey: PreferenceKey.pairing)
        }
    }
}
