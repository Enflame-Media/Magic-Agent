//
//  PushNotificationService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import UserNotifications
import UIKit

/// Service for managing push notifications via Apple Push Notification service (APNs).
///
/// This service handles the complete push notification lifecycle:
/// - Requesting notification permission from the user
/// - Registering with APNs and obtaining device tokens
/// - Processing incoming remote notifications
/// - Managing notification categories and actions
/// - Storing the device token for server registration
///
/// ## Architecture
/// Uses `UNUserNotificationCenter` for notification management and integrates
/// with UIKit's `UIApplicationDelegate` for APNs token registration.
///
/// ## Notification Categories
/// - **Session Update**: Session state changes (completed, error, waiting for input)
/// - **Message**: New messages in a session
/// - **Pairing**: Pairing request status changes
///
/// ## Usage
/// ```swift
/// let service = PushNotificationService.shared
/// await service.requestPermission()
/// // Token is automatically stored when APNs registration succeeds
/// ```
final class PushNotificationService: NSObject, ObservableObject {

    // MARK: - Singleton

    /// Shared instance for app-wide push notification handling.
    static let shared = PushNotificationService()

    // MARK: - Published Properties

    /// Whether notification permission has been granted by the user.
    @Published private(set) var isAuthorized: Bool = false

    /// Whether notification permission has not yet been requested.
    @Published private(set) var isNotDetermined: Bool = true

    /// The current APNs device token as a hex string, or nil if not registered.
    @Published private(set) var deviceToken: String?

    /// The current authorization status for notifications.
    @Published private(set) var authorizationStatus: UNAuthorizationStatus = .notDetermined

    // MARK: - Private Properties

    /// The notification center for scheduling and managing notifications.
    private let notificationCenter = UNUserNotificationCenter.current()

    // MARK: - Notification Categories

    /// Identifiers for notification categories.
    enum Category {
        /// A session state change (completed, error, waiting for input).
        static let sessionUpdate = "SESSION_UPDATE"

        /// A new message in a monitored session.
        static let message = "MESSAGE"

        /// A pairing request status change.
        static let pairing = "PAIRING"
    }

    /// Identifiers for notification actions.
    enum Action {
        /// View the session associated with the notification.
        static let viewSession = "VIEW_SESSION"

        /// Reply to a session prompt.
        static let reply = "REPLY"

        /// Approve a pairing request.
        static let approvePairing = "APPROVE_PAIRING"

        /// Reject a pairing request.
        static let rejectPairing = "REJECT_PAIRING"

        /// Dismiss the notification.
        static let dismiss = "DISMISS"
    }

    // MARK: - Keychain Integration

    /// Keychain key for storing the device token.
    /// Extends the existing KeychainHelper.Key enum pattern.
    static let deviceTokenKeychainKey = "apns_device_token"

    // MARK: - Initialization

    private override init() {
        super.init()
        notificationCenter.delegate = self
        setupNotificationCategories()
        Task {
            await refreshAuthorizationStatus()
        }
    }

    // MARK: - Setup

    /// Configure notification categories with associated actions.
    ///
    /// Categories define the types of notifications the app supports and
    /// the actions available to the user for each type.
    private func setupNotificationCategories() {
        // Session Update category - View action
        let viewSessionAction = UNNotificationAction(
            identifier: Action.viewSession,
            title: "View Session",
            options: [.foreground]
        )

        let sessionUpdateCategory = UNNotificationCategory(
            identifier: Category.sessionUpdate,
            actions: [viewSessionAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // Message category - View and Reply actions
        let replyAction = UNTextInputNotificationAction(
            identifier: Action.reply,
            title: "Reply",
            options: [.foreground],
            textInputButtonTitle: "Send",
            textInputPlaceholder: "Type a response..."
        )

        let messageCategory = UNNotificationCategory(
            identifier: Category.message,
            actions: [viewSessionAction, replyAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // Pairing category - Approve and Reject actions
        let approveAction = UNNotificationAction(
            identifier: Action.approvePairing,
            title: "Approve",
            options: [.foreground]
        )

        let rejectAction = UNNotificationAction(
            identifier: Action.rejectPairing,
            title: "Reject",
            options: [.destructive]
        )

        let pairingCategory = UNNotificationCategory(
            identifier: Category.pairing,
            actions: [approveAction, rejectAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        notificationCenter.setNotificationCategories([
            sessionUpdateCategory,
            messageCategory,
            pairingCategory
        ])
    }

    // MARK: - Authorization

    /// Refresh the current notification authorization status.
    ///
    /// Updates the published `isAuthorized`, `isNotDetermined`, and
    /// `authorizationStatus` properties based on the current system settings.
    @MainActor
    func refreshAuthorizationStatus() async {
        let settings = await notificationCenter.notificationSettings()
        authorizationStatus = settings.authorizationStatus
        isAuthorized = settings.authorizationStatus == .authorized
        isNotDetermined = settings.authorizationStatus == .notDetermined
    }

    /// Request notification permission from the user.
    ///
    /// Requests authorization for alerts, sounds, and badges. If granted,
    /// automatically registers with APNs for remote notifications.
    ///
    /// - Returns: `true` if permission was granted.
    @MainActor
    @discardableResult
    func requestPermission() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(
                options: [.alert, .sound, .badge]
            )
            isAuthorized = granted
            isNotDetermined = false
            authorizationStatus = granted ? .authorized : .denied

            if granted {
                registerForRemoteNotifications()
            }

            return granted
        } catch {
            #if DEBUG
            print("[PushNotificationService] Failed to request permission: \(error)")
            #endif
            return false
        }
    }

    /// Register with APNs for remote notifications.
    ///
    /// This triggers the system to call `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`
    /// on the app delegate, which then calls `handleDeviceTokenRegistration(_:)`.
    @MainActor
    func registerForRemoteNotifications() {
        UIApplication.shared.registerForRemoteNotifications()
    }

    // MARK: - Device Token Management

    /// Process a device token received from APNs registration.
    ///
    /// Converts the raw token data to a hex string and stores it for
    /// server registration. The token is also persisted in the Keychain
    /// for retrieval after app restarts.
    ///
    /// - Parameter tokenData: The raw device token data from APNs.
    @MainActor
    func handleDeviceTokenRegistration(_ tokenData: Data) {
        let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()
        deviceToken = tokenString

        // Persist token in Keychain for server registration
        if let data = tokenString.data(using: .utf8) {
            try? KeychainHelper.save(data, for: .deviceToken)
        }

        #if DEBUG
        print("[PushNotificationService] APNs device token: \(tokenString)")
        #endif

        // Notify observers that a new token is available
        NotificationCenter.default.post(
            name: .deviceTokenUpdated,
            object: nil,
            userInfo: ["token": tokenString]
        )
    }

    /// Handle a failed APNs registration attempt.
    ///
    /// - Parameter error: The error describing why registration failed.
    func handleDeviceTokenRegistrationFailure(_ error: Error) {
        #if DEBUG
        print("[PushNotificationService] APNs registration failed: \(error.localizedDescription)")
        #endif

        NotificationCenter.default.post(
            name: .deviceTokenRegistrationFailed,
            object: nil,
            userInfo: ["error": error.localizedDescription]
        )
    }

    /// Retrieve the stored device token from the Keychain.
    ///
    /// - Returns: The hex-encoded device token string, or nil if not stored.
    func storedDeviceToken() -> String? {
        guard let data = KeychainHelper.read(.deviceToken) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    /// Clear the stored device token from both memory and Keychain.
    @MainActor
    func clearDeviceToken() {
        deviceToken = nil
        try? KeychainHelper.delete(.deviceToken)
    }

    // MARK: - Remote Notification Handling

    /// Process a remote notification payload.
    ///
    /// Parses the notification payload and dispatches to the appropriate
    /// handler based on the notification type.
    ///
    /// - Parameter userInfo: The notification payload dictionary.
    /// - Returns: The fetch result indicating how the notification was handled.
    func handleRemoteNotification(_ userInfo: [AnyHashable: Any]) async -> UIBackgroundFetchResult {
        guard let type = userInfo["type"] as? String else {
            return .noData
        }

        switch type {
        case "session_update":
            return handleSessionUpdateNotification(userInfo)

        case "message":
            return handleMessageNotification(userInfo)

        case "pairing":
            return handlePairingNotification(userInfo)

        default:
            #if DEBUG
            print("[PushNotificationService] Unknown notification type: \(type)")
            #endif
            return .noData
        }
    }

    // MARK: - Notification Type Handlers

    /// Handle a session update notification.
    ///
    /// Posts a local notification to inform the user about session state changes
    /// such as completion, errors, or input requests.
    ///
    /// - Parameter userInfo: The notification payload.
    /// - Returns: The fetch result.
    private func handleSessionUpdateNotification(_ userInfo: [AnyHashable: Any]) -> UIBackgroundFetchResult {
        guard let sessionId = userInfo["sessionId"] as? String else {
            return .noData
        }

        let status = userInfo["status"] as? String ?? "updated"
        let title = userInfo["title"] as? String ?? "Session Update"
        let body = userInfo["body"] as? String ?? "Session \(sessionId) has been \(status)."

        NotificationCenter.default.post(
            name: .sessionUpdated,
            object: nil,
            userInfo: [
                "sessionId": sessionId,
                "status": status
            ]
        )

        showLocalNotification(
            title: title,
            body: body,
            category: Category.sessionUpdate,
            userInfo: [
                "sessionId": sessionId,
                "status": status,
                "type": "session_update"
            ]
        )

        return .newData
    }

    /// Handle a message notification.
    ///
    /// - Parameter userInfo: The notification payload.
    /// - Returns: The fetch result.
    private func handleMessageNotification(_ userInfo: [AnyHashable: Any]) -> UIBackgroundFetchResult {
        guard let sessionId = userInfo["sessionId"] as? String else {
            return .noData
        }

        let title = userInfo["title"] as? String ?? "New Message"
        let body = userInfo["body"] as? String ?? "You have a new message."

        NotificationCenter.default.post(
            name: .messageReceived,
            object: nil,
            userInfo: [
                "sessionId": sessionId
            ]
        )

        showLocalNotification(
            title: title,
            body: body,
            category: Category.message,
            userInfo: [
                "sessionId": sessionId,
                "type": "message"
            ]
        )

        return .newData
    }

    /// Handle a pairing notification.
    ///
    /// - Parameter userInfo: The notification payload.
    /// - Returns: The fetch result.
    private func handlePairingNotification(_ userInfo: [AnyHashable: Any]) -> UIBackgroundFetchResult {
        let title = userInfo["title"] as? String ?? "Pairing Request"
        let body = userInfo["body"] as? String ?? "A new device wants to connect."
        let machineId = userInfo["machineId"] as? String

        NotificationCenter.default.post(
            name: .pairingRequestReceived,
            object: nil,
            userInfo: userInfo
        )

        var notificationInfo: [String: String] = ["type": "pairing"]
        if let machineId {
            notificationInfo["machineId"] = machineId
        }

        showLocalNotification(
            title: title,
            body: body,
            category: Category.pairing,
            userInfo: notificationInfo
        )

        return .newData
    }

    // MARK: - Local Notifications

    /// Show a local notification to the user.
    ///
    /// Used to present push notification content when the app processes
    /// a silent notification, or to re-display content for background updates.
    ///
    /// - Parameters:
    ///   - title: The notification title.
    ///   - body: The notification body text.
    ///   - category: The notification category identifier.
    ///   - userInfo: Additional data to attach to the notification.
    private func showLocalNotification(
        title: String,
        body: String,
        category: String,
        userInfo: [String: String]
    ) {
        guard isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = category
        content.userInfo = userInfo

        let identifier = "\(category)_\(Date().timeIntervalSince1970)"
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: nil // Deliver immediately
        )

        notificationCenter.add(request) { error in
            if let error {
                #if DEBUG
                print("[PushNotificationService] Failed to show local notification: \(error)")
                #endif
            }
        }
    }

    // MARK: - Badge Management

    /// Reset the app badge count to zero.
    @MainActor
    func resetBadgeCount() {
        UIApplication.shared.applicationIconBadgeNumber = 0
    }

    /// Set the app badge count.
    ///
    /// - Parameter count: The number to display on the app icon badge.
    @MainActor
    func setBadgeCount(_ count: Int) {
        UIApplication.shared.applicationIconBadgeNumber = count
    }

    // MARK: - Notification Removal

    /// Remove all delivered notifications from the notification center.
    func removeAllDeliveredNotifications() {
        notificationCenter.removeAllDeliveredNotifications()
    }

    /// Remove delivered notifications for a specific session.
    ///
    /// - Parameter sessionId: The session ID to remove notifications for.
    func removeNotifications(for sessionId: String) {
        notificationCenter.getDeliveredNotifications { [weak self] notifications in
            let identifiersToRemove = notifications
                .filter { notification in
                    guard let notifSessionId = notification.request.content.userInfo["sessionId"] as? String else {
                        return false
                    }
                    return notifSessionId == sessionId
                }
                .map { $0.request.identifier }

            self?.notificationCenter.removeDeliveredNotifications(withIdentifiers: identifiersToRemove)
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {

    /// Handle notifications when the app is in the foreground.
    ///
    /// Shows a banner and plays a sound even when the app is active,
    /// so the user is aware of incoming notifications.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .badge]
    }

    /// Handle the user's response to a notification action.
    ///
    /// Dispatches the action to the appropriate handler based on the
    /// action identifier and notification category.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo

        switch response.actionIdentifier {
        case Action.viewSession, UNNotificationDefaultActionIdentifier:
            if let sessionId = userInfo["sessionId"] as? String {
                await MainActor.run {
                    NotificationCenter.default.post(
                        name: .navigateToSession,
                        object: nil,
                        userInfo: ["sessionId": sessionId]
                    )
                }
            }

        case Action.reply:
            if let textResponse = response as? UNTextInputNotificationResponse,
               let sessionId = userInfo["sessionId"] as? String {
                await MainActor.run {
                    NotificationCenter.default.post(
                        name: .replyToSession,
                        object: nil,
                        userInfo: [
                            "sessionId": sessionId,
                            "text": textResponse.userText
                        ]
                    )
                }
            }

        case Action.approvePairing:
            if let machineId = userInfo["machineId"] as? String {
                await MainActor.run {
                    NotificationCenter.default.post(
                        name: .approvePairingRequest,
                        object: nil,
                        userInfo: ["machineId": machineId]
                    )
                }
            }

        case Action.rejectPairing:
            if let machineId = userInfo["machineId"] as? String {
                await MainActor.run {
                    NotificationCenter.default.post(
                        name: .rejectPairingRequest,
                        object: nil,
                        userInfo: ["machineId": machineId]
                    )
                }
            }

        case UNNotificationDismissActionIdentifier:
            break // User dismissed the notification

        default:
            #if DEBUG
            print("[PushNotificationService] Unhandled action: \(response.actionIdentifier)")
            #endif
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when the APNs device token is updated.
    static let deviceTokenUpdated = Notification.Name("deviceTokenUpdated")

    /// Posted when APNs device token registration fails.
    static let deviceTokenRegistrationFailed = Notification.Name("deviceTokenRegistrationFailed")

    /// Posted when a session update notification is received.
    static let sessionUpdated = Notification.Name("sessionUpdated")

    /// Posted when a message notification is received.
    static let messageReceived = Notification.Name("messageReceived")

    /// Posted when a pairing request notification is received.
    static let pairingRequestReceived = Notification.Name("pairingRequestReceived")

    /// Posted to navigate to a specific session.
    static let navigateToSession = Notification.Name("navigateToSession")

    /// Posted to reply to a session from a notification action.
    static let replyToSession = Notification.Name("replyToSession")

    /// Posted to approve a pairing request from a notification action.
    static let approvePairingRequest = Notification.Name("approvePairingRequest")

    /// Posted to reject a pairing request from a notification action.
    static let rejectPairingRequest = Notification.Name("rejectPairingRequest")
}

// MARK: - Push Notification Errors

/// Errors that can occur during push notification operations.
enum PushNotificationError: LocalizedError, Equatable {
    /// Notification permission was denied by the user.
    case permissionDenied

    /// Failed to register with APNs.
    case registrationFailed(String)

    /// The device token is not available.
    case noDeviceToken

    var errorDescription: String? {
        switch self {
        case .permissionDenied:
            return "Notification permission was denied. Enable notifications in Settings."
        case .registrationFailed(let reason):
            return "Failed to register for push notifications: \(reason)"
        case .noDeviceToken:
            return "No device token available. Please ensure notifications are enabled."
        }
    }
}
