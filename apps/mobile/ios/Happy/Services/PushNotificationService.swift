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

        /// A tool usage approval request.
        static let toolApproval = "TOOL_APPROVAL"
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

        /// Approve a tool usage request.
        static let approveTool = "APPROVE_TOOL"

        /// Reject a tool usage request.
        static let rejectTool = "REJECT_TOOL"

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

        // Tool Approval category - Approve and Reject actions
        let approveToolAction = UNNotificationAction(
            identifier: Action.approveTool,
            title: "Approve",
            options: [.foreground]
        )

        let rejectToolAction = UNNotificationAction(
            identifier: Action.rejectTool,
            title: "Reject",
            options: [.destructive]
        )

        let toolApprovalCategory = UNNotificationCategory(
            identifier: Category.toolApproval,
            actions: [approveToolAction, rejectToolAction, viewSessionAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        notificationCenter.setNotificationCategories([
            sessionUpdateCategory,
            messageCategory,
            pairingCategory,
            toolApprovalCategory
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
    /// Converts the raw token data to a hex string, stores it in the Keychain,
    /// and registers it with happy-server via the API. Without server registration,
    /// the server cannot deliver push notifications to this device.
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

        // Register token with happy-server so it can send push notifications
        Task {
            await registerTokenWithServer(tokenString)
        }

        // Notify observers that a new token is available
        NotificationCenter.default.post(
            name: .deviceTokenUpdated,
            object: nil,
            userInfo: ["token": tokenString]
        )
    }

    /// Register the device token with happy-server.
    ///
    /// Retries up to 3 times with exponential backoff if registration fails.
    /// Only attempts registration if the user is authenticated (has an auth token).
    ///
    /// - Parameter token: The hex-encoded APNs device token string.
    private func registerTokenWithServer(_ token: String) async {
        // Only register if the user is authenticated
        guard KeychainHelper.exists(.authToken) else {
            #if DEBUG
            print("[PushNotificationService] Skipping server registration: not authenticated")
            #endif
            return
        }

        let maxRetries = 3
        for attempt in 0..<maxRetries {
            do {
                try await APIService.shared.registerDeviceToken(token)
                #if DEBUG
                print("[PushNotificationService] Device token registered with server")
                #endif
                return
            } catch {
                #if DEBUG
                print("[PushNotificationService] Server registration attempt \(attempt + 1)/\(maxRetries) failed: \(error.localizedDescription)")
                #endif
                if attempt < maxRetries - 1 {
                    // Exponential backoff: 1s, 2s, 4s
                    let delay = UInt64(pow(2.0, Double(attempt))) * 1_000_000_000
                    try? await Task.sleep(nanoseconds: delay)
                }
            }
        }

        #if DEBUG
        print("[PushNotificationService] Failed to register device token with server after \(maxRetries) attempts")
        #endif
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

        case "tool_approval":
            return handleToolApprovalNotification(userInfo)

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

    /// Handle a tool approval notification.
    ///
    /// Presents a notification with approve/reject actions when a tool
    /// in a session requests permission to execute.
    ///
    /// - Parameter userInfo: The notification payload.
    /// - Returns: The fetch result.
    private func handleToolApprovalNotification(_ userInfo: [AnyHashable: Any]) -> UIBackgroundFetchResult {
        guard let sessionId = userInfo["sessionId"] as? String else {
            return .noData
        }

        let toolName = userInfo["toolName"] as? String ?? "Unknown tool"
        let title = userInfo["title"] as? String ?? "Tool Approval Required"
        let body = userInfo["body"] as? String ?? "\(toolName) is requesting permission to run."
        let requestId = userInfo["requestId"] as? String

        NotificationCenter.default.post(
            name: .toolApprovalRequested,
            object: nil,
            userInfo: [
                "sessionId": sessionId,
                "toolName": toolName,
                "requestId": requestId as Any
            ]
        )

        var notificationInfo: [String: String] = [
            "sessionId": sessionId,
            "toolName": toolName,
            "type": "tool_approval"
        ]
        if let requestId {
            notificationInfo["requestId"] = requestId
        }

        showLocalNotification(
            title: title,
            body: body,
            category: Category.toolApproval,
            userInfo: notificationInfo
        )

        return .newData
    }

    // MARK: - Local Notifications

    /// Show a local notification to the user.
    ///
    /// Used to present push notification content when the app processes
    /// a silent notification, or to re-display content for background updates.
    /// Notifications with the same `sessionId` are grouped together using
    /// `threadIdentifier` so they stack neatly in the notification center.
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

        // Check notification preferences before displaying
        if !shouldShowNotification(for: category) {
            return
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = category
        content.userInfo = userInfo

        // Group notifications by session using threadIdentifier
        if let sessionId = userInfo["sessionId"] {
            content.threadIdentifier = "session-\(sessionId)"
        } else if let machineId = userInfo["machineId"] {
            content.threadIdentifier = "machine-\(machineId)"
        }

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

        // Update badge count
        Task { @MainActor in
            incrementBadgeCount()
        }
    }

    // MARK: - Badge Management

    /// The current badge count tracked locally.
    private var currentBadgeCount: Int = 0

    /// Reset the app badge count to zero.
    ///
    /// Should be called when the app becomes active (foreground)
    /// to clear the badge indicator.
    @MainActor
    func resetBadgeCount() {
        currentBadgeCount = 0
        UIApplication.shared.applicationIconBadgeNumber = 0
    }

    /// Set the app badge count.
    ///
    /// - Parameter count: The number to display on the app icon badge.
    @MainActor
    func setBadgeCount(_ count: Int) {
        currentBadgeCount = count
        UIApplication.shared.applicationIconBadgeNumber = count
    }

    /// Increment the badge count by one.
    ///
    /// Called when a new notification is received to reflect unread count.
    @MainActor
    func incrementBadgeCount() {
        currentBadgeCount += 1
        UIApplication.shared.applicationIconBadgeNumber = currentBadgeCount
    }

    // MARK: - Notification Preferences

    /// User defaults keys for notification preferences.
    private enum PreferenceKey {
        static let sessionUpdates = "notification_session_updates"
        static let messages = "notification_messages"
        static let pairing = "notification_pairing"
        static let toolApproval = "notification_tool_approval"
    }

    /// Check whether a notification should be shown based on user preferences.
    ///
    /// Consults the UserDefaults toggles that the NotificationSettingsView controls.
    /// If no preference has been set for a category, defaults to showing the notification.
    ///
    /// - Parameter category: The notification category identifier.
    /// - Returns: `true` if the notification should be displayed.
    private func shouldShowNotification(for category: String) -> Bool {
        let defaults = UserDefaults.standard

        switch category {
        case Category.sessionUpdate:
            // Default to true if not previously set
            if defaults.object(forKey: PreferenceKey.sessionUpdates) != nil {
                return defaults.bool(forKey: PreferenceKey.sessionUpdates)
            }
            return true

        case Category.message:
            if defaults.object(forKey: PreferenceKey.messages) != nil {
                return defaults.bool(forKey: PreferenceKey.messages)
            }
            return true

        case Category.pairing:
            if defaults.object(forKey: PreferenceKey.pairing) != nil {
                return defaults.bool(forKey: PreferenceKey.pairing)
            }
            return true

        case Category.toolApproval:
            // Tool approval defaults to always showing (critical notification)
            if defaults.object(forKey: PreferenceKey.toolApproval) != nil {
                return defaults.bool(forKey: PreferenceKey.toolApproval)
            }
            return true

        default:
            return true
        }
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

        case Action.approveTool:
            let sessionId = userInfo["sessionId"] as? String
            let requestId = userInfo["requestId"] as? String
            await MainActor.run {
                var info: [String: String] = [:]
                if let sessionId { info["sessionId"] = sessionId }
                if let requestId { info["requestId"] = requestId }
                NotificationCenter.default.post(
                    name: .approveToolRequest,
                    object: nil,
                    userInfo: info
                )
            }

        case Action.rejectTool:
            let sessionId = userInfo["sessionId"] as? String
            let requestId = userInfo["requestId"] as? String
            await MainActor.run {
                var info: [String: String] = [:]
                if let sessionId { info["sessionId"] = sessionId }
                if let requestId { info["requestId"] = requestId }
                NotificationCenter.default.post(
                    name: .rejectToolRequest,
                    object: nil,
                    userInfo: info
                )
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

    /// Posted when a tool approval request notification is received.
    static let toolApprovalRequested = Notification.Name("toolApprovalRequested")

    /// Posted to approve a tool usage request from a notification action.
    static let approveToolRequest = Notification.Name("approveToolRequest")

    /// Posted to reject a tool usage request from a notification action.
    static let rejectToolRequest = Notification.Name("rejectToolRequest")
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
