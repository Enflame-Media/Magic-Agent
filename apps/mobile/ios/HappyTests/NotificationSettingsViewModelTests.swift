//
//  NotificationSettingsViewModelTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

/// Tests for the NotificationSettingsViewModel.
///
/// Verifies preference persistence, status description updates,
/// and default initialization values.
final class NotificationSettingsViewModelTests: XCTestCase {

    // MARK: - Setup & Teardown

    override func setUp() {
        super.setUp()
        // Clean up UserDefaults between tests
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "notification_session_updates")
        defaults.removeObject(forKey: "notification_messages")
        defaults.removeObject(forKey: "notification_pairing")
    }

    override func tearDown() {
        // Clean up UserDefaults after tests
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "notification_session_updates")
        defaults.removeObject(forKey: "notification_messages")
        defaults.removeObject(forKey: "notification_pairing")
        super.tearDown()
    }

    // MARK: - Initialization Tests

    func testDefaultValues() {
        // Arrange & Act
        let viewModel = NotificationSettingsViewModel()

        // Assert: All notification types default to enabled
        XCTAssertTrue(viewModel.sessionUpdatesEnabled)
        XCTAssertTrue(viewModel.messagesEnabled)
        XCTAssertTrue(viewModel.pairingEnabled)
        XCTAssertFalse(viewModel.isEnabled)
        XCTAssertTrue(viewModel.isNotDetermined)
        XCTAssertFalse(viewModel.isRequestingPermission)
        XCTAssertEqual(viewModel.statusDescription, "Not configured")
        XCTAssertNil(viewModel.deviceToken)
    }

    // MARK: - Preference Persistence Tests

    func testSessionUpdatesPreferencePersistence() {
        // Arrange
        let viewModel = NotificationSettingsViewModel()

        // Act: Disable session updates
        viewModel.sessionUpdatesEnabled = false

        // Assert: Preference is persisted
        let stored = UserDefaults.standard.bool(forKey: "notification_session_updates")
        XCTAssertFalse(stored)

        // Verify new instance loads the preference
        let viewModel2 = NotificationSettingsViewModel()
        XCTAssertFalse(viewModel2.sessionUpdatesEnabled)
    }

    func testMessagesPreferencePersistence() {
        // Arrange
        let viewModel = NotificationSettingsViewModel()

        // Act: Disable messages
        viewModel.messagesEnabled = false

        // Assert
        let stored = UserDefaults.standard.bool(forKey: "notification_messages")
        XCTAssertFalse(stored)

        let viewModel2 = NotificationSettingsViewModel()
        XCTAssertFalse(viewModel2.messagesEnabled)
    }

    func testPairingPreferencePersistence() {
        // Arrange
        let viewModel = NotificationSettingsViewModel()

        // Act: Disable pairing
        viewModel.pairingEnabled = false

        // Assert
        let stored = UserDefaults.standard.bool(forKey: "notification_pairing")
        XCTAssertFalse(stored)

        let viewModel2 = NotificationSettingsViewModel()
        XCTAssertFalse(viewModel2.pairingEnabled)
    }

    func testReEnablingPreference() {
        // Arrange
        let viewModel = NotificationSettingsViewModel()
        viewModel.sessionUpdatesEnabled = false

        // Act: Re-enable
        viewModel.sessionUpdatesEnabled = true

        // Assert
        let stored = UserDefaults.standard.bool(forKey: "notification_session_updates")
        XCTAssertTrue(stored)

        let viewModel2 = NotificationSettingsViewModel()
        XCTAssertTrue(viewModel2.sessionUpdatesEnabled)
    }

    func testAllPreferencesToggled() {
        // Arrange
        let viewModel = NotificationSettingsViewModel()

        // Act: Disable all
        viewModel.sessionUpdatesEnabled = false
        viewModel.messagesEnabled = false
        viewModel.pairingEnabled = false

        // Assert
        let viewModel2 = NotificationSettingsViewModel()
        XCTAssertFalse(viewModel2.sessionUpdatesEnabled)
        XCTAssertFalse(viewModel2.messagesEnabled)
        XCTAssertFalse(viewModel2.pairingEnabled)
    }
}
