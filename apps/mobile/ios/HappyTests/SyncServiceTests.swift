//
//  SyncServiceTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
import Combine
@testable import Happy

final class SyncServiceTests: XCTestCase {

    // MARK: - SyncConnectionStatus Tests

    func testConnectionStatusEquality() {
        XCTAssertEqual(SyncConnectionStatus.connected, SyncConnectionStatus.connected)
        XCTAssertEqual(SyncConnectionStatus.connecting, SyncConnectionStatus.connecting)
        XCTAssertEqual(SyncConnectionStatus.disconnected, SyncConnectionStatus.disconnected)
        XCTAssertEqual(SyncConnectionStatus.reconnecting(attempt: 1), SyncConnectionStatus.reconnecting(attempt: 1))
        XCTAssertNotEqual(SyncConnectionStatus.connected, SyncConnectionStatus.disconnected)
        XCTAssertNotEqual(SyncConnectionStatus.reconnecting(attempt: 1), SyncConnectionStatus.reconnecting(attempt: 2))
    }

    // MARK: - SyncMessage Encoding Tests

    func testSyncMessageEncodeSubscribe() throws {
        let message = SyncMessage(type: .subscribe, sessionId: "session-123")
        let data = try JSONEncoder().encode(message)
        let decoded = try JSONDecoder().decode(SyncMessage.self, from: data)

        XCTAssertEqual(decoded.type, .subscribe)
        XCTAssertEqual(decoded.sessionId, "session-123")
    }

    func testSyncMessageEncodeUnsubscribe() throws {
        let message = SyncMessage(type: .unsubscribe, sessionId: "session-456")
        let data = try JSONEncoder().encode(message)
        let decoded = try JSONDecoder().decode(SyncMessage.self, from: data)

        XCTAssertEqual(decoded.type, .unsubscribe)
        XCTAssertEqual(decoded.sessionId, "session-456")
    }

    func testSyncMessageEncodePong() throws {
        let message = SyncMessage(type: .pong)
        let data = try JSONEncoder().encode(message)
        let decoded = try JSONDecoder().decode(SyncMessage.self, from: data)

        XCTAssertEqual(decoded.type, .pong)
        XCTAssertNil(decoded.sessionId)
    }

    func testSyncMessageEncodePing() throws {
        let message = SyncMessage(type: .ping)
        let data = try JSONEncoder().encode(message)
        let decoded = try JSONDecoder().decode(SyncMessage.self, from: data)

        XCTAssertEqual(decoded.type, .ping)
        XCTAssertNil(decoded.sessionId)
    }

    // MARK: - SyncMessageType Encoding Tests

    func testSyncMessageTypeRawValues() {
        XCTAssertEqual(SyncMessageType.subscribe.rawValue, "subscribe")
        XCTAssertEqual(SyncMessageType.unsubscribe.rawValue, "unsubscribe")
        XCTAssertEqual(SyncMessageType.update.rawValue, "update")
        XCTAssertEqual(SyncMessageType.ping.rawValue, "ping")
        XCTAssertEqual(SyncMessageType.pong.rawValue, "pong")
        XCTAssertEqual(SyncMessageType.session.rawValue, "session")
        XCTAssertEqual(SyncMessageType.message.rawValue, "message")
        XCTAssertEqual(SyncMessageType.sessionRevivalPaused.rawValue, "session-revival-paused")
        XCTAssertEqual(SyncMessageType.sessionRevived.rawValue, "session-revived")
    }

    func testSyncMessageTypeDecodeFromJSON() throws {
        let json = #"{"type":"session-revival-paused"}"#
        struct TypeWrapper: Codable { let type: SyncMessageType }
        let decoded = try JSONDecoder().decode(TypeWrapper.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(decoded.type, .sessionRevivalPaused)
    }

    // MARK: - SyncUpdateEnvelope Decoding Tests

    func testDecodeSessionEnvelope() throws {
        let json = """
        {
            "type": "session",
            "session": {
                "id": "sess-001",
                "title": "Test Session",
                "status": "active",
                "machineId": "machine-001",
                "createdAt": "2026-01-15T10:00:00Z",
                "updatedAt": "2026-01-15T10:05:00Z"
            }
        }
        """

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let envelope = try decoder.decode(SyncUpdateEnvelope.self, from: json.data(using: .utf8)!)

        XCTAssertEqual(envelope.type, .session)
        XCTAssertNotNil(envelope.session)
        XCTAssertEqual(envelope.session?.id, "sess-001")
        XCTAssertEqual(envelope.session?.title, "Test Session")
        XCTAssertEqual(envelope.session?.status, .active)
        XCTAssertNil(envelope.message)
    }

    func testDecodeMessageEnvelope() throws {
        let json = """
        {
            "type": "message",
            "message": {
                "id": "msg-001",
                "role": "assistant",
                "content": "Hello from Claude!",
                "createdAt": "2026-01-15T10:00:00Z",
                "isStreaming": false
            }
        }
        """

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let envelope = try decoder.decode(SyncUpdateEnvelope.self, from: json.data(using: .utf8)!)

        XCTAssertEqual(envelope.type, .message)
        XCTAssertNotNil(envelope.message)
        XCTAssertEqual(envelope.message?.id, "msg-001")
        XCTAssertEqual(envelope.message?.role, .assistant)
        XCTAssertEqual(envelope.message?.content, "Hello from Claude!")
        XCTAssertNil(envelope.session)
    }

    func testDecodePingEnvelope() throws {
        let json = #"{"type":"ping"}"#

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let envelope = try decoder.decode(SyncUpdateEnvelope.self, from: json.data(using: .utf8)!)

        XCTAssertEqual(envelope.type, .ping)
        XCTAssertNil(envelope.session)
        XCTAssertNil(envelope.message)
    }

    func testDecodeSessionRevivalPausedEnvelope() throws {
        let json = """
        {
            "type": "session-revival-paused",
            "reason": "Circuit breaker active",
            "remainingMs": 15000,
            "resumesAt": 1737100000000,
            "machineId": "machine-001"
        }
        """

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let envelope = try decoder.decode(SyncUpdateEnvelope.self, from: json.data(using: .utf8)!)

        XCTAssertEqual(envelope.type, .sessionRevivalPaused)
        XCTAssertEqual(envelope.reason, "Circuit breaker active")
        XCTAssertEqual(envelope.remainingMs, 15000)
        XCTAssertEqual(envelope.resumesAt, 1737100000000)
        XCTAssertEqual(envelope.machineId, "machine-001")
    }

    func testDecodeSessionRevivedEnvelope() throws {
        let json = """
        {
            "type": "session-revived",
            "originalSessionId": "sess-old-001",
            "newSessionId": "sess-new-001",
            "machineId": "machine-001"
        }
        """

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let envelope = try decoder.decode(SyncUpdateEnvelope.self, from: json.data(using: .utf8)!)

        XCTAssertEqual(envelope.type, .sessionRevived)
        XCTAssertEqual(envelope.originalSessionId, "sess-old-001")
        XCTAssertEqual(envelope.newSessionId, "sess-new-001")
        XCTAssertEqual(envelope.machineId, "machine-001")
    }

    // MARK: - SyncError Tests

    func testSyncErrorDescriptions() {
        let connectionError = SyncError.connectionFailed("timeout")
        XCTAssertEqual(connectionError.errorDescription, "Failed to connect: timeout")

        let encryptionError = SyncError.encryptionKeyMissing
        XCTAssertEqual(encryptionError.errorDescription, "Encryption key not available. Please re-pair with CLI.")

        let decryptionError = SyncError.decryptionFailed("bad key")
        XCTAssertEqual(decryptionError.errorDescription, "Failed to decrypt message: bad key")

        let sendError = SyncError.sendFailed("not connected")
        XCTAssertEqual(sendError.errorDescription, "Failed to send message: not connected")

        let revivalError = SyncError.sessionRevivalFailed(sessionId: "s-1", reason: "expired")
        XCTAssertEqual(revivalError.errorDescription, "Session s-1 could not be restored: expired")
    }

    func testSyncErrorEquality() {
        XCTAssertEqual(SyncError.encryptionKeyMissing, SyncError.encryptionKeyMissing)
        XCTAssertEqual(SyncError.connectionFailed("a"), SyncError.connectionFailed("a"))
        XCTAssertNotEqual(SyncError.connectionFailed("a"), SyncError.connectionFailed("b"))
        XCTAssertNotEqual(SyncError.encryptionKeyMissing, SyncError.connectionFailed("x"))
        XCTAssertEqual(SyncError.decryptionFailed("x"), SyncError.decryptionFailed("x"))
        XCTAssertEqual(SyncError.sendFailed("y"), SyncError.sendFailed("y"))
        XCTAssertEqual(
            SyncError.sessionRevivalFailed(sessionId: "s", reason: "r"),
            SyncError.sessionRevivalFailed(sessionId: "s", reason: "r")
        )
        XCTAssertNotEqual(
            SyncError.sessionRevivalFailed(sessionId: "s1", reason: "r"),
            SyncError.sessionRevivalFailed(sessionId: "s2", reason: "r")
        )
    }

    // MARK: - SessionRevivalPausedEvent Tests

    func testSessionRevivalPausedEvent() {
        let event = SessionRevivalPausedEvent(
            reason: "cooldown",
            remainingMs: 5000,
            resumesAt: 1737100000000,
            machineId: "m-1"
        )

        XCTAssertEqual(event.reason, "cooldown")
        XCTAssertEqual(event.remainingMs, 5000)
        XCTAssertEqual(event.resumesAt, 1737100000000)
        XCTAssertEqual(event.machineId, "m-1")
    }

    // MARK: - SessionRevivedEvent Tests

    func testSessionRevivedEvent() {
        let event = SessionRevivedEvent(
            originalSessionId: "old-sess",
            newSessionId: "new-sess",
            machineId: "m-1"
        )

        XCTAssertEqual(event.originalSessionId, "old-sess")
        XCTAssertEqual(event.newSessionId, "new-sess")
        XCTAssertEqual(event.machineId, "m-1")
    }

    // MARK: - ReconnectionConfig Tests

    func testReconnectionConfigDefaults() {
        let config = SyncService.ReconnectionConfig.default
        XCTAssertEqual(config.baseDelay, 1.0)
        XCTAssertEqual(config.maxDelay, 30.0)
        XCTAssertEqual(config.backoffMultiplier, 2.0)
        XCTAssertEqual(config.maxAttempts, 10)
    }

    func testReconnectionConfigCustom() {
        let config = SyncService.ReconnectionConfig(
            baseDelay: 0.5,
            maxDelay: 60.0,
            backoffMultiplier: 3.0,
            maxAttempts: 5
        )
        XCTAssertEqual(config.baseDelay, 0.5)
        XCTAssertEqual(config.maxDelay, 60.0)
        XCTAssertEqual(config.backoffMultiplier, 3.0)
        XCTAssertEqual(config.maxAttempts, 5)
    }

    // MARK: - SyncService Initialization Tests

    func testSyncServiceInitializesWithDefaultURL() async {
        let service = SyncService()
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testSyncServiceInitializesWithCustomURL() async {
        let url = URL(string: "wss://test.example.com/sync")!
        let service = SyncService(baseURL: url)
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    func testSyncServiceInitialConnectionStatus() {
        let service = SyncService()
        var receivedStatus: SyncConnectionStatus?
        let cancellable = service.connectionStatus.sink { status in
            receivedStatus = status
        }

        XCTAssertEqual(receivedStatus, .disconnected)
        cancellable.cancel()
    }

    // MARK: - Disconnect Tests

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
        await service.disconnect()
        await service.disconnect()
        let isConnected = await service.isConnected
        XCTAssertFalse(isConnected)
    }

    // MARK: - SyncMessage JSON Format Tests

    func testSyncMessageJSONKeys() throws {
        let message = SyncMessage(type: .subscribe, sessionId: "s-1")
        let data = try JSONEncoder().encode(message)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(json?["type"] as? String, "subscribe")
        XCTAssertEqual(json?["sessionId"] as? String, "s-1")
    }

    func testSyncMessageNilSessionIdOmitted() throws {
        let message = SyncMessage(type: .pong)
        let data = try JSONEncoder().encode(message)
        let jsonString = String(data: data, encoding: .utf8)!

        // sessionId should be null when nil
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        XCTAssertEqual(json?["type"] as? String, "pong")
        XCTAssertTrue(json?["sessionId"] is NSNull || json?["sessionId"] == nil)
    }

    // MARK: - Full Round-Trip Encoding Tests

    func testSyncUpdateEnvelopeRoundTrip() throws {
        let session = Session(
            id: "sess-rt-1",
            title: "Round Trip",
            status: .active,
            machineId: "m-1",
            createdAt: Date(timeIntervalSince1970: 1700000000),
            updatedAt: Date(timeIntervalSince1970: 1700000100)
        )

        let json = """
        {
            "type": "session",
            "session": {
                "id": "sess-rt-1",
                "title": "Round Trip",
                "status": "active",
                "machineId": "m-1",
                "createdAt": "2023-11-14T22:13:20Z",
                "updatedAt": "2023-11-14T22:15:00Z"
            }
        }
        """

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let envelope = try decoder.decode(SyncUpdateEnvelope.self, from: json.data(using: .utf8)!)

        XCTAssertEqual(envelope.type, .session)
        XCTAssertEqual(envelope.session?.id, session.id)
        XCTAssertEqual(envelope.session?.title, session.title)
        XCTAssertEqual(envelope.session?.status, session.status)
    }
}
