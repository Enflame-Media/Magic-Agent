//
//  HappyTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

/// Unit tests for the Happy macOS application.
final class HappyTests: XCTestCase {

    // MARK: - Session Model Tests

    func testSessionIsActiveWhenStatusActive() {
        let session = Session(
            id: "test",
            title: "Test Session",
            status: .active,
            machineId: "machine",
            createdAt: Date(),
            updatedAt: Date()
        )

        XCTAssertTrue(session.isActive)
    }

    func testSessionIsNotActiveWhenStatusCompleted() {
        let session = Session(
            id: "test",
            title: "Test Session",
            status: .completed,
            machineId: "machine",
            createdAt: Date(),
            updatedAt: Date()
        )

        XCTAssertFalse(session.isActive)
    }

    // MARK: - Machine Model Tests

    func testMachineIsOnlineWhenConnected() {
        let machine = Machine(
            id: "test",
            name: "Test Machine",
            platform: .macOS,
            connectionStatus: .connected,
            connectedAt: Date(),
            lastSeenAt: Date()
        )

        XCTAssertTrue(machine.isOnline)
    }

    func testMachineIsOfflineWhenDisconnected() {
        let machine = Machine(
            id: "test",
            name: "Test Machine",
            platform: .macOS,
            connectionStatus: .disconnected,
            connectedAt: Date(),
            lastSeenAt: Date()
        )

        XCTAssertFalse(machine.isOnline)
    }

    // MARK: - Encryption Tests

    func testKeyPairGeneration() {
        let (privateKey, publicKey) = EncryptionService.generateKeyPair()

        XCTAssertEqual(privateKey.count, 32, "Private key should be 32 bytes")
        XCTAssertEqual(publicKey.count, 32, "Public key should be 32 bytes")
    }

    func testEncryptionRoundTrip() throws {
        // Generate two key pairs (simulating two parties)
        let (alicePrivate, alicePublic) = EncryptionService.generateKeyPair()
        let (bobPrivate, bobPublic) = EncryptionService.generateKeyPair()

        // Derive shared secrets (should be identical)
        let aliceShared = try EncryptionService.deriveSharedSecret(
            privateKey: alicePrivate,
            peerPublicKey: bobPublic
        )

        let bobShared = try EncryptionService.deriveSharedSecret(
            privateKey: bobPrivate,
            peerPublicKey: alicePublic
        )

        // Test encryption/decryption
        let originalMessage = "Hello, Happy!".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(originalMessage, with: aliceShared)
        let decrypted = try EncryptionService.decrypt(encrypted, with: bobShared)

        XCTAssertEqual(decrypted, originalMessage)
    }
}
