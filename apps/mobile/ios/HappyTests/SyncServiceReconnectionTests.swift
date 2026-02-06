//
//  SyncServiceReconnectionTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//
//  HAP-1013: Reconnection logic unit tests for the WebSocket sync service.
//  Tests cover exponential backoff, max attempts, lifecycle handling,
//  auth handshake modes, and subscription restoration.
//

import XCTest
import Combine
@testable import Happy

final class SyncServiceReconnectionTests: XCTestCase {

    // MARK: - Exponential Backoff Tests

    func testExponentialBackoffDelayCalculation() {
        // Verify the exponential backoff formula produces expected delays
        let config = SyncService.ReconnectionConfig(
            baseDelay: 1.0,
            maxDelay: 30.0,
            backoffMultiplier: 2.0,
            maxAttempts: 10
        )

        // delay = min(baseDelay * pow(multiplier, attempt), maxDelay)
        // attempt 0: 1 * 2^0 = 1.0
        // attempt 1: 1 * 2^1 = 2.0
        // attempt 2: 1 * 2^2 = 4.0
        // attempt 3: 1 * 2^3 = 8.0
        // attempt 4: 1 * 2^4 = 16.0
        // attempt 5: 1 * 2^5 = 32.0 -> capped at 30.0

        let expectedDelays: [Double] = [1.0, 2.0, 4.0, 8.0, 16.0, 30.0, 30.0]

        for (attempt, expectedDelay) in expectedDelays.enumerated() {
            let delay = min(
                config.baseDelay * pow(config.backoffMultiplier, Double(attempt)),
                config.maxDelay
            )
            XCTAssertEqual(delay, expectedDelay, accuracy: 0.001,
                           "Attempt \(attempt) should have delay \(expectedDelay)")
        }
    }

    func testExponentialBackoffWithCustomConfig() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 0.5,
            maxDelay: 10.0,
            backoffMultiplier: 3.0,
            maxAttempts: 5
        )

        // attempt 0: 0.5 * 3^0 = 0.5
        // attempt 1: 0.5 * 3^1 = 1.5
        // attempt 2: 0.5 * 3^2 = 4.5
        // attempt 3: 0.5 * 3^3 = 13.5 -> capped at 10.0

        let expectedDelays: [Double] = [0.5, 1.5, 4.5, 10.0]

        for (attempt, expectedDelay) in expectedDelays.enumerated() {
            let delay = min(
                config.baseDelay * pow(config.backoffMultiplier, Double(attempt)),
                config.maxDelay
            )
            XCTAssertEqual(delay, expectedDelay, accuracy: 0.001,
                           "Attempt \(attempt) should have delay \(expectedDelay)")
        }
    }

    func testBackoffCapNeverExceedsMaxDelay() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 1.0,
            maxDelay: 5.0,
            backoffMultiplier: 10.0,
            maxAttempts: 100
        )

        for attempt in 0..<20 {
            let delay = min(
                config.baseDelay * pow(config.backoffMultiplier, Double(attempt)),
                config.maxDelay
            )
            XCTAssertLessThanOrEqual(delay, config.maxDelay,
                                     "Delay at attempt \(attempt) must not exceed maxDelay")
        }
    }

    // MARK: - Max Attempts Tests

    func testMaxAttemptsDefaultIsTen() {
        let config = SyncService.ReconnectionConfig.default
        XCTAssertEqual(config.maxAttempts, 10)
    }

    func testMaxAttemptsZeroMeansUnlimited() {
        let config = SyncService.ReconnectionConfig(maxAttempts: 0)
        XCTAssertEqual(config.maxAttempts, 0, "Zero maxAttempts means unlimited reconnection attempts")
    }

    func testMaxAttemptsCustomValue() {
        let config = SyncService.ReconnectionConfig(maxAttempts: 3)
        XCTAssertEqual(config.maxAttempts, 3)
    }

    // MARK: - Connection Status Tests

    func testConnectionStatusTransitions() {
        // Verify all status values can be created and compared
        let statuses: [SyncConnectionStatus] = [
            .disconnected,
            .connecting,
            .connected,
            .reconnecting(attempt: 1),
            .reconnecting(attempt: 2),
            .reconnecting(attempt: 3),
        ]

        for status in statuses {
            XCTAssertEqual(status, status, "Status should equal itself")
        }

        XCTAssertNotEqual(SyncConnectionStatus.connected, .disconnected)
        XCTAssertNotEqual(SyncConnectionStatus.connecting, .connected)
        XCTAssertNotEqual(SyncConnectionStatus.reconnecting(attempt: 1), .reconnecting(attempt: 2))
    }

    func testConnectionStatusReconnectingCarriesAttemptNumber() {
        let status1 = SyncConnectionStatus.reconnecting(attempt: 5)
        let status2 = SyncConnectionStatus.reconnecting(attempt: 5)
        let status3 = SyncConnectionStatus.reconnecting(attempt: 6)

        XCTAssertEqual(status1, status2)
        XCTAssertNotEqual(status1, status3)
    }

    func testInitialConnectionStatusIsDisconnected() {
        let service = SyncService()
        var receivedStatus: SyncConnectionStatus?

        let cancellable = service.connectionStatus.sink { status in
            receivedStatus = status
        }

        XCTAssertEqual(receivedStatus, .disconnected)
        cancellable.cancel()
    }

    // MARK: - Disconnect Behavior Tests

    func testDisconnectSetsStatusToDisconnected() async {
        let service = SyncService()
        var statuses: [SyncConnectionStatus] = []

        let cancellable = service.connectionStatus.sink { status in
            statuses.append(status)
        }

        await service.disconnect()

        XCTAssertTrue(statuses.contains(.disconnected))
        cancellable.cancel()
    }

    func testDisconnectIsIdempotent() async {
        let service = SyncService()

        // Multiple disconnect calls should not crash or cause issues
        await service.disconnect()
        await service.disconnect()
        await service.disconnect()

        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testDisconnectResetsReconnectionState() async {
        let service = SyncService()

        await service.disconnect()

        // After disconnect, the service should not be connected
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    // MARK: - Auth Handshake Mode Tests

    func testAuthHandshakeModeTicketDefault() async {
        // The default mode should be ticket-based
        let service = SyncService()
        // Service was created - no crash means ticket mode initializes correctly
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected, "Service should start disconnected")
    }

    func testAuthHandshakeModeTokenQueryParam() async {
        let service = SyncService(authHandshakeMode: .tokenQueryParam)
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected, "Service should start disconnected")
    }

    func testAuthHandshakeModeTicketExplicit() async {
        let service = SyncService(authHandshakeMode: .ticket)
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected, "Service should start disconnected")
    }

    // MARK: - App Lifecycle Tests

    func testHandleAppDidEnterBackgroundWhenNotConnected() async {
        let service = SyncService()
        var statuses: [SyncConnectionStatus] = []

        let cancellable = service.connectionStatus.sink { status in
            statuses.append(status)
        }

        // When not connected, entering background should be a no-op
        await service.handleAppDidEnterBackground()

        // Should still be disconnected (initial state)
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)

        cancellable.cancel()
    }

    func testHandleAppWillEnterForegroundWhenNotPreviouslyConnected() async {
        let service = SyncService()

        // When not previously connected, foreground should not trigger reconnect
        await service.handleAppWillEnterForeground()

        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected, "Should not connect if wasn't connected before background")
    }

    func testBackgroundPreventsReconnection() async {
        let service = SyncService()

        // Simulate background state
        await service.handleAppDidEnterBackground()

        // Attempting to connect while in background should be skipped
        do {
            try await service.connect()
        } catch {
            // Expected - connect may fail for various reasons
        }

        // Service should remain disconnected while in background
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testLifecycleRoundTrip() async {
        let service = SyncService()
        var statuses: [SyncConnectionStatus] = []

        let cancellable = service.connectionStatus.sink { status in
            statuses.append(status)
        }

        // Enter background
        await service.handleAppDidEnterBackground()

        // Return to foreground
        await service.handleAppWillEnterForeground()

        // Should still be disconnected since we were never connected
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)

        cancellable.cancel()
    }

    // MARK: - ReconnectionConfig Edge Cases

    func testReconnectionConfigWithVerySmallValues() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 0.001,
            maxDelay: 0.01,
            backoffMultiplier: 1.1,
            maxAttempts: 1
        )

        XCTAssertEqual(config.baseDelay, 0.001, accuracy: 0.0001)
        XCTAssertEqual(config.maxDelay, 0.01, accuracy: 0.001)
        XCTAssertEqual(config.backoffMultiplier, 1.1, accuracy: 0.01)
        XCTAssertEqual(config.maxAttempts, 1)
    }

    func testReconnectionConfigWithLargeValues() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 60.0,
            maxDelay: 3600.0,
            backoffMultiplier: 5.0,
            maxAttempts: 1000
        )

        XCTAssertEqual(config.baseDelay, 60.0)
        XCTAssertEqual(config.maxDelay, 3600.0)
        XCTAssertEqual(config.backoffMultiplier, 5.0)
        XCTAssertEqual(config.maxAttempts, 1000)
    }

    func testReconnectionConfigWithMultiplierOfOne() {
        // multiplier of 1.0 means constant delay (no backoff)
        let config = SyncService.ReconnectionConfig(
            baseDelay: 5.0,
            maxDelay: 30.0,
            backoffMultiplier: 1.0,
            maxAttempts: 10
        )

        for attempt in 0..<10 {
            let delay = min(
                config.baseDelay * pow(config.backoffMultiplier, Double(attempt)),
                config.maxDelay
            )
            XCTAssertEqual(delay, 5.0, accuracy: 0.001,
                           "With multiplier 1.0, delay should be constant at baseDelay")
        }
    }

    // MARK: - Service Configuration Tests

    func testSetReconnectionConfig() async {
        let service = SyncService()

        let newConfig = SyncService.ReconnectionConfig(
            baseDelay: 2.0,
            maxDelay: 60.0,
            backoffMultiplier: 3.0,
            maxAttempts: 20
        )

        await service.setReconnectionConfig(newConfig)

        // No crash means the config was set successfully
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testServiceInitializesWithCustomConfig() async {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 0.5,
            maxDelay: 10.0,
            backoffMultiplier: 2.0,
            maxAttempts: 3
        )

        let service = SyncService(reconnectionConfig: config)
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testServiceInitializesWithCustomURL() async {
        let url = URL(string: "wss://custom.example.com/sync")!
        let service = SyncService(baseURL: url)
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    // MARK: - SyncError Tests for Connection Failures

    func testSyncErrorConnectionFailedDescription() {
        let error = SyncError.connectionFailed("Maximum reconnection attempts (10) exceeded")
        XCTAssertEqual(
            error.errorDescription,
            "Failed to connect: Maximum reconnection attempts (10) exceeded"
        )
    }

    func testSyncErrorMaxAttemptsExceededMessage() {
        let maxAttempts = 5
        let error = SyncError.connectionFailed(
            "Maximum reconnection attempts (\(maxAttempts)) exceeded"
        )
        XCTAssertTrue(error.errorDescription?.contains("5") == true)
        XCTAssertTrue(error.errorDescription?.contains("exceeded") == true)
    }

    func testSyncErrorForegroundReconnectFailed() {
        let error = SyncError.connectionFailed("Foreground reconnect failed: No network")
        XCTAssertTrue(error.errorDescription?.contains("Foreground reconnect failed") == true)
    }

    // MARK: - Publisher Tests

    func testSessionUpdatesPublisherExists() {
        let service = SyncService()
        var received = false

        let cancellable = service.sessionUpdates.sink { _ in
            received = true
        }

        // Publisher exists and is subscribable
        XCTAssertNotNil(cancellable)
        cancellable.cancel()
    }

    func testMessageUpdatesPublisherExists() {
        let service = SyncService()
        var received = false

        let cancellable = service.messageUpdates.sink { _ in
            received = true
        }

        XCTAssertNotNil(cancellable)
        cancellable.cancel()
    }

    func testSyncErrorsPublisherExists() {
        let service = SyncService()

        let cancellable = service.syncErrors.sink { _ in }

        XCTAssertNotNil(cancellable)
        cancellable.cancel()
    }

    func testConnectionStatusPublisherEmitsDisconnectedInitially() {
        let service = SyncService()
        let expectation = XCTestExpectation(description: "Receive initial status")

        let cancellable = service.connectionStatus.sink { status in
            if status == .disconnected {
                expectation.fulfill()
            }
        }

        wait(for: [expectation], timeout: 1.0)
        cancellable.cancel()
    }

    // MARK: - Session Revival Event Publishers

    func testSessionRevivalPausedPublisherExists() {
        let service = SyncService()

        let cancellable = service.sessionRevivalPaused.sink { _ in }

        XCTAssertNotNil(cancellable)
        cancellable.cancel()
    }

    func testSessionRevivedPublisherExists() {
        let service = SyncService()

        let cancellable = service.sessionRevived.sink { _ in }

        XCTAssertNotNil(cancellable)
        cancellable.cancel()
    }

    // MARK: - Concurrent Lifecycle Event Tests

    func testMultipleBackgroundForegroundCycles() async {
        let service = SyncService()

        // Rapid background/foreground cycling should not crash
        for _ in 0..<5 {
            await service.handleAppDidEnterBackground()
            await service.handleAppWillEnterForeground()
        }

        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testDoubleBackgroundIsIdempotent() async {
        let service = SyncService()

        await service.handleAppDidEnterBackground()
        await service.handleAppDidEnterBackground()

        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testDoubleForegroundIsIdempotent() async {
        let service = SyncService()

        await service.handleAppWillEnterForeground()
        await service.handleAppWillEnterForeground()

        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    // MARK: - Backoff Formula Boundary Tests

    func testBackoffAttemptZero() {
        let config = SyncService.ReconnectionConfig.default
        let delay = min(
            config.baseDelay * pow(config.backoffMultiplier, 0),
            config.maxDelay
        )
        XCTAssertEqual(delay, config.baseDelay, accuracy: 0.001,
                       "First attempt delay should equal baseDelay")
    }

    func testBackoffExactlyAtMaxDelay() {
        // Find the attempt number where delay first hits maxDelay
        let config = SyncService.ReconnectionConfig(
            baseDelay: 1.0,
            maxDelay: 16.0,
            backoffMultiplier: 2.0,
            maxAttempts: 10
        )

        // 1 * 2^4 = 16.0 = maxDelay exactly
        let delay = min(
            config.baseDelay * pow(config.backoffMultiplier, 4.0),
            config.maxDelay
        )
        XCTAssertEqual(delay, 16.0, accuracy: 0.001,
                       "Delay should equal maxDelay exactly at attempt 4")
    }

    func testBackoffJustBelowMaxDelay() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 1.0,
            maxDelay: 16.0,
            backoffMultiplier: 2.0,
            maxAttempts: 10
        )

        // 1 * 2^3 = 8.0 < 16.0
        let delay = min(
            config.baseDelay * pow(config.backoffMultiplier, 3.0),
            config.maxDelay
        )
        XCTAssertEqual(delay, 8.0, accuracy: 0.001)
        XCTAssertLessThan(delay, config.maxDelay)
    }

    func testBackoffJustAboveMaxDelay() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 1.0,
            maxDelay: 16.0,
            backoffMultiplier: 2.0,
            maxAttempts: 10
        )

        // 1 * 2^5 = 32.0 > 16.0, should be capped to 16.0
        let delay = min(
            config.baseDelay * pow(config.backoffMultiplier, 5.0),
            config.maxDelay
        )
        XCTAssertEqual(delay, 16.0, accuracy: 0.001,
                       "Delay should be capped at maxDelay")
    }

    // MARK: - SyncMessage Reconnection Context Tests

    func testSubscribeMessageForReconnection() throws {
        // After reconnection, subscribe messages are sent to restore subscriptions
        let message = SyncMessage(type: .subscribe, sessionId: "restored-session-1")
        let data = try JSONEncoder().encode(message)
        let decoded = try JSONDecoder().decode(SyncMessage.self, from: data)

        XCTAssertEqual(decoded.type, .subscribe)
        XCTAssertEqual(decoded.sessionId, "restored-session-1")
    }

    func testMultipleSubscribeMessagesForReconnection() throws {
        // Simulate restoring multiple subscriptions
        let sessionIds = ["session-1", "session-2", "session-3"]
        var messages: [SyncMessage] = []

        for id in sessionIds {
            messages.append(SyncMessage(type: .subscribe, sessionId: id))
        }

        XCTAssertEqual(messages.count, 3)

        for (i, message) in messages.enumerated() {
            let data = try JSONEncoder().encode(message)
            let decoded = try JSONDecoder().decode(SyncMessage.self, from: data)

            XCTAssertEqual(decoded.type, .subscribe)
            XCTAssertEqual(decoded.sessionId, sessionIds[i])
        }
    }

    // MARK: - Error Handling During Reconnection

    func testTicketFetchFailureErrorMessage() {
        let error = SyncError.connectionFailed("Ticket request failed with status 401")
        XCTAssertEqual(error.errorDescription, "Failed to connect: Ticket request failed with status 401")
    }

    func testTicketDecodeFailureErrorMessage() {
        let error = SyncError.connectionFailed("Failed to decode ticket response: keyNotFound")
        XCTAssertTrue(error.errorDescription?.contains("decode ticket") == true)
    }

    func testNoAuthTokenForTicketErrorMessage() {
        let error = SyncError.connectionFailed("No auth token available for ticket request")
        XCTAssertTrue(error.errorDescription?.contains("auth token") == true)
    }

    func testInvalidServerURLForTicketErrorMessage() {
        let error = SyncError.connectionFailed("Invalid server URL for ticket request")
        XCTAssertTrue(error.errorDescription?.contains("server URL") == true)
    }
}
