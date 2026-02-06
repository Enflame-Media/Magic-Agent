//
//  PushNotificationServiceTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

/// Tests for the PushNotificationService.
///
/// Verifies device token management, notification payload processing,
/// and notification category/action configuration.
final class PushNotificationServiceTests: XCTestCase {

    // MARK: - Device Token Tests

    func testDeviceTokenConversion() {
        // Arrange: Create raw token data (simulating APNs token bytes)
        let tokenBytes: [UInt8] = [
            0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67, 0x89,
            0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67, 0x89,
            0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67, 0x89,
            0xAB, 0xCD, 0xEF, 0x01, 0x23, 0x45, 0x67, 0x89
        ]
        let tokenData = Data(tokenBytes)

        // Act: Convert to hex string (same logic as service)
        let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()

        // Assert: Verify hex representation
        XCTAssertEqual(tokenString, "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789")
        XCTAssertEqual(tokenString.count, 64) // 32 bytes = 64 hex characters
    }

    func testDeviceTokenConversionWithZeros() {
        // Arrange: All zero bytes
        let tokenData = Data(repeating: 0x00, count: 32)

        // Act
        let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()

        // Assert
        XCTAssertEqual(tokenString, String(repeating: "00", count: 32))
    }

    func testDeviceTokenConversionWithMaxBytes() {
        // Arrange: All 0xFF bytes
        let tokenData = Data(repeating: 0xFF, count: 32)

        // Act
        let tokenString = tokenData.map { String(format: "%02x", $0) }.joined()

        // Assert
        XCTAssertEqual(tokenString, String(repeating: "ff", count: 32))
    }

    // MARK: - Notification Category Tests

    func testNotificationCategoryIdentifiers() {
        // Verify category identifiers are unique and non-empty
        let categories = [
            PushNotificationService.Category.sessionUpdate,
            PushNotificationService.Category.message,
            PushNotificationService.Category.pairing,
            PushNotificationService.Category.toolApproval
        ]

        XCTAssertEqual(categories.count, Set(categories).count, "Category identifiers must be unique")

        for category in categories {
            XCTAssertFalse(category.isEmpty, "Category identifier must not be empty")
        }
    }

    func testNotificationActionIdentifiers() {
        // Verify action identifiers are unique and non-empty
        let actions = [
            PushNotificationService.Action.viewSession,
            PushNotificationService.Action.reply,
            PushNotificationService.Action.approvePairing,
            PushNotificationService.Action.rejectPairing,
            PushNotificationService.Action.approveTool,
            PushNotificationService.Action.rejectTool,
            PushNotificationService.Action.dismiss
        ]

        XCTAssertEqual(actions.count, Set(actions).count, "Action identifiers must be unique")

        for action in actions {
            XCTAssertFalse(action.isEmpty, "Action identifier must not be empty")
        }
    }

    // MARK: - Notification Payload Tests

    func testSessionUpdatePayloadParsing() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "session_update",
            "sessionId": "session-123",
            "status": "completed",
            "title": "Session Complete",
            "body": "Your coding session has finished."
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .newData)
    }

    func testMessagePayloadParsing() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "message",
            "sessionId": "session-456",
            "title": "New Message",
            "body": "Claude has a response for you."
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .newData)
    }

    func testPairingPayloadParsing() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "pairing",
            "machineId": "machine-789",
            "title": "Pairing Request",
            "body": "A new machine wants to connect."
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .newData)
    }

    func testUnknownPayloadType() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "unknown_type",
            "data": "some data"
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .noData)
    }

    func testMissingTypeInPayload() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "sessionId": "session-123"
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .noData)
    }

    func testEmptyPayload() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [:]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .noData)
    }

    func testSessionUpdateWithMissingSessionId() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "session_update",
            "status": "completed"
            // Missing sessionId
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .noData)
    }

    func testMessageWithMissingSessionId() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "message"
            // Missing sessionId
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .noData)
    }

    // MARK: - Tool Approval Payload Tests

    func testToolApprovalPayloadParsing() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "tool_approval",
            "sessionId": "session-789",
            "toolName": "bash",
            "requestId": "req-001",
            "title": "Tool Approval Required",
            "body": "bash is requesting permission to run."
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .newData)
    }

    func testToolApprovalWithMissingSessionId() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "tool_approval",
            "toolName": "bash"
            // Missing sessionId
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .noData)
    }

    func testToolApprovalWithMinimalPayload() async {
        // Arrange
        let service = PushNotificationService.shared
        let payload: [AnyHashable: Any] = [
            "type": "tool_approval",
            "sessionId": "session-minimal"
        ]

        // Act
        let result = await service.handleRemoteNotification(payload)

        // Assert
        XCTAssertEqual(result, .newData)
    }

    func testToolApprovalCategoryIdentifier() {
        XCTAssertEqual(PushNotificationService.Category.toolApproval, "TOOL_APPROVAL")
    }

    func testToolApprovalActionIdentifiers() {
        XCTAssertEqual(PushNotificationService.Action.approveTool, "APPROVE_TOOL")
        XCTAssertEqual(PushNotificationService.Action.rejectTool, "REJECT_TOOL")
    }

    // MARK: - Error Type Tests

    func testPushNotificationErrorDescriptions() {
        // Verify all error cases have non-nil descriptions
        let errors: [PushNotificationError] = [
            .permissionDenied,
            .registrationFailed("test reason"),
            .noDeviceToken
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription, "Error \(error) should have a description")
            XCTAssertFalse(error.errorDescription!.isEmpty, "Error description should not be empty")
        }
    }

    func testPushNotificationErrorEquatable() {
        XCTAssertEqual(PushNotificationError.permissionDenied, PushNotificationError.permissionDenied)
        XCTAssertEqual(PushNotificationError.noDeviceToken, PushNotificationError.noDeviceToken)
        XCTAssertEqual(
            PushNotificationError.registrationFailed("reason"),
            PushNotificationError.registrationFailed("reason")
        )
        XCTAssertNotEqual(
            PushNotificationError.registrationFailed("reason1"),
            PushNotificationError.registrationFailed("reason2")
        )
        XCTAssertNotEqual(PushNotificationError.permissionDenied, PushNotificationError.noDeviceToken)
    }

    // MARK: - Keychain Key Tests

    func testDeviceTokenKeychainKey() {
        // Verify the device token key is in the KeychainHelper.Key enum
        let key = KeychainHelper.Key.deviceToken
        XCTAssertEqual(key.rawValue, "apns_device_token")
    }

    // MARK: - Notification Name Tests

    func testNotificationNames() {
        // Verify all notification names are unique
        let names: [Notification.Name] = [
            .deviceTokenUpdated,
            .deviceTokenRegistrationFailed,
            .sessionUpdated,
            .messageReceived,
            .pairingRequestReceived,
            .navigateToSession,
            .replyToSession,
            .approvePairingRequest,
            .rejectPairingRequest,
            .toolApprovalRequested,
            .approveToolRequest,
            .rejectToolRequest
        ]

        let rawNames = names.map { $0.rawValue }
        XCTAssertEqual(rawNames.count, Set(rawNames).count, "Notification names must be unique")

        for name in rawNames {
            XCTAssertFalse(name.isEmpty, "Notification name must not be empty")
        }
    }
}
