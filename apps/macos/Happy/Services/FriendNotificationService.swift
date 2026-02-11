//
//  FriendNotificationService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import UserNotifications

/// Service for handling friend-related notifications.
///
/// This service manages local notifications for friend requests and
/// friend online status changes. It uses the UserNotifications framework
/// for native macOS notification support.
///
/// Usage:
/// ```swift
/// let notificationService = FriendNotificationService.shared
///
/// // Request permission on app launch
/// await notificationService.requestPermission()
///
/// // Show notification for incoming friend request
/// notificationService.showFriendRequestNotification(from: friend)
/// ```
class FriendNotificationService: NSObject, ObservableObject {
    // MARK: - Singleton

    /// Shared instance for app-wide notification handling.
    static let shared = FriendNotificationService()

    // MARK: - Published Properties

    /// Whether notification permission has been granted.
    @Published var isAuthorized = false

    // MARK: - Private Properties

    /// The notification center for scheduling notifications.
    private let notificationCenter = UNUserNotificationCenter.current()

    // MARK: - Notification Identifiers

    private enum NotificationCategory {
        static let friendRequest = "FRIEND_REQUEST"
        static let friendOnline = "FRIEND_ONLINE"
    }

    private enum NotificationAction {
        static let accept = "ACCEPT_FRIEND_REQUEST"
        static let decline = "DECLINE_FRIEND_REQUEST"
        static let view = "VIEW_FRIEND"
    }

    // MARK: - Initialization

    private override init() {
        super.init()
        notificationCenter.delegate = self
        setupNotificationCategories()
        checkAuthorizationStatus()
    }

    // MARK: - Setup

    /// Set up notification categories and actions.
    private func setupNotificationCategories() {
        // Friend request category with accept/decline actions
        let acceptAction = UNNotificationAction(
            identifier: NotificationAction.accept,
            title: "Accept",
            options: [.foreground]
        )

        let declineAction = UNNotificationAction(
            identifier: NotificationAction.decline,
            title: "Decline",
            options: [.destructive]
        )

        let friendRequestCategory = UNNotificationCategory(
            identifier: NotificationCategory.friendRequest,
            actions: [acceptAction, declineAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )

        // Friend online category with view action
        let viewAction = UNNotificationAction(
            identifier: NotificationAction.view,
            title: "View",
            options: [.foreground]
        )

        let friendOnlineCategory = UNNotificationCategory(
            identifier: NotificationCategory.friendOnline,
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        notificationCenter.setNotificationCategories([
            friendRequestCategory,
            friendOnlineCategory
        ])
    }

    /// Check current authorization status.
    private func checkAuthorizationStatus() {
        notificationCenter.getNotificationSettings { [weak self] settings in
            DispatchQueue.main.async {
                self?.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    // MARK: - Public Methods

    /// Request notification permission from the user.
    /// - Returns: `true` if permission was granted.
    @discardableResult
    func requestPermission() async -> Bool {
        do {
            let granted = try await notificationCenter.requestAuthorization(
                options: [.alert, .sound, .badge]
            )
            await MainActor.run {
                isAuthorized = granted
            }
            return granted
        } catch {
            print("[FriendNotificationService] Failed to request permission: \(error)")
            return false
        }
    }

    /// Show a notification for a new friend request.
    /// - Parameter friend: The user who sent the friend request.
    func showFriendRequestNotification(from friend: UserProfile) {
        guard isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "Friend Request"
        content.body = "\(friend.firstName) (@\(friend.username)) wants to be your friend"
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.friendRequest
        content.userInfo = [
            "userId": friend.id,
            "username": friend.username,
            "type": "friend_request"
        ]

        let request = UNNotificationRequest(
            identifier: "friend_request_\(friend.id)",
            content: content,
            trigger: nil // Deliver immediately
        )

        notificationCenter.add(request) { error in
            if let error {
                print("[FriendNotificationService] Failed to show friend request notification: \(error)")
            }
        }
    }

    /// Show a notification when a friend comes online.
    /// - Parameter friend: The friend who came online.
    func showFriendOnlineNotification(for friend: UserProfile) {
        guard isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "\(friend.firstName) is online"
        content.body = "Your friend @\(friend.username) just came online"
        content.sound = .default
        content.categoryIdentifier = NotificationCategory.friendOnline
        content.userInfo = [
            "userId": friend.id,
            "username": friend.username,
            "type": "friend_online"
        ]

        let request = UNNotificationRequest(
            identifier: "friend_online_\(friend.id)_\(Date().timeIntervalSince1970)",
            content: content,
            trigger: nil
        )

        notificationCenter.add(request) { error in
            if let error {
                print("[FriendNotificationService] Failed to show friend online notification: \(error)")
            }
        }
    }

    /// Show a notification when a friend request is accepted.
    /// - Parameter friend: The friend who accepted the request.
    func showFriendAcceptedNotification(for friend: UserProfile) {
        guard isAuthorized else { return }

        let content = UNMutableNotificationContent()
        content.title = "Friend Request Accepted"
        content.body = "\(friend.firstName) (@\(friend.username)) is now your friend"
        content.sound = .default
        content.userInfo = [
            "userId": friend.id,
            "username": friend.username,
            "type": "friend_accepted"
        ]

        let request = UNNotificationRequest(
            identifier: "friend_accepted_\(friend.id)",
            content: content,
            trigger: nil
        )

        notificationCenter.add(request) { error in
            if let error {
                print("[FriendNotificationService] Failed to show friend accepted notification: \(error)")
            }
        }
    }

    /// Remove pending friend request notifications for a user.
    /// - Parameter userId: The user ID to remove notifications for.
    func removeFriendRequestNotification(for userId: String) {
        notificationCenter.removeDeliveredNotifications(withIdentifiers: [
            "friend_request_\(userId)"
        ])
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [
            "friend_request_\(userId)"
        ])
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension FriendNotificationService: UNUserNotificationCenterDelegate {
    /// Handle notification when app is in foreground.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // Show banner and play sound even when app is in foreground
        [.banner, .sound]
    }

    /// Handle notification action response.
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        let userInfo = response.notification.request.content.userInfo
        guard let userId = userInfo["userId"] as? String else { return }

        switch response.actionIdentifier {
        case NotificationAction.accept:
            // Accept friend request
            Task {
                try? await FriendsService.shared.acceptRequest(userId)
            }
            removeFriendRequestNotification(for: userId)

        case NotificationAction.decline:
            // Decline friend request
            Task {
                try? await FriendsService.shared.removeFriend(userId)
            }
            removeFriendRequestNotification(for: userId)

        case NotificationAction.view, UNNotificationDefaultActionIdentifier:
            // Post notification to navigate to friends
            NotificationCenter.default.post(name: .showFriends, object: userId)

        default:
            break
        }
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Notification to show the friends view, optionally with a specific friend selected.
    static let showFriends = Notification.Name("showFriends")
}
