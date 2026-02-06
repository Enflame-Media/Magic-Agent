//
//  HappyApp.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI
import UserNotifications

/// The main entry point for the Happy iOS application.
///
/// Happy is a native iOS client for remote control and session sharing
/// with Claude Code, providing end-to-end encrypted communication.
@main
struct HappyApp: App {

    /// The app delegate handling UIKit lifecycle events, including APNs registration.
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    /// The main application body defining scenes and commands.
    var body: some Scene {
        // Main window
        WindowGroup {
            ContentView()
        }
    }
}

// MARK: - App Delegate

/// UIKit app delegate for handling push notification registration with APNs.
///
/// SwiftUI does not natively support APNs device token registration callbacks,
/// so we use `UIApplicationDelegateAdaptor` to bridge the UIKit delegate methods.
///
/// This delegate handles:
/// - APNs device token registration success/failure
/// - Remote notification receipt (for background updates)
final class AppDelegate: NSObject, UIApplicationDelegate {

    /// Called when the application finishes launching.
    ///
    /// Initializes the push notification service to set up notification
    /// categories and check current authorization status.
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Initialize the shared push notification service
        _ = PushNotificationService.shared
        return true
    }

    /// Called when APNs successfully registers the device and provides a token.
    ///
    /// Forwards the token to `PushNotificationService` for storage and
    /// server registration.
    ///
    /// - Parameters:
    ///   - application: The application instance.
    ///   - deviceToken: The raw APNs device token data.
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushNotificationService.shared.handleDeviceTokenRegistration(deviceToken)
        }
    }

    /// Called when APNs registration fails.
    ///
    /// Forwards the error to `PushNotificationService` for logging and
    /// error handling.
    ///
    /// - Parameters:
    ///   - application: The application instance.
    ///   - error: The error describing why registration failed.
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        PushNotificationService.shared.handleDeviceTokenRegistrationFailure(error)
    }

    /// Called when a remote notification is received while the app is running
    /// or in the background.
    ///
    /// Forwards the notification payload to `PushNotificationService` for
    /// processing and dispatching.
    ///
    /// - Parameters:
    ///   - application: The application instance.
    ///   - userInfo: The notification payload.
    ///   - completionHandler: Callback with the fetch result.
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        Task {
            let result = await PushNotificationService.shared.handleRemoteNotification(userInfo)
            completionHandler(result)
        }
    }
}
