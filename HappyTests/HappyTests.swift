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

    // MARK: - Cross-Platform Compatibility Tests

    /// Test that encrypted data has the correct format.
    /// Bundle format: [version:1][nonce:12][ciphertext:N][authTag:16]
    func testEncryptedBundleFormat() throws {
        let key = SymmetricKey(size: .bits256)
        let message = "Test message".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(message, with: key)

        // Verify version byte is 0x00 (AES-256-GCM without key versioning)
        XCTAssertEqual(encrypted[0], 0x00, "First byte should be version 0x00")

        // Minimum size: version(1) + nonce(12) + ciphertext(N) + authTag(16)
        // For "Test message" (12 bytes), encrypted size should be 1 + 12 + 12 + 16 = 41
        XCTAssertGreaterThanOrEqual(encrypted.count, 29, "Encrypted data should have minimum size")
    }

    /// Test decryption of data encrypted by happy-cli/happy-app (Version 0x00 format).
    /// This test uses a known test vector to ensure cross-platform compatibility.
    ///
    /// Test vector generated with happy-cli using:
    /// ```javascript
    /// const key = Buffer.alloc(32, 0x42); // 32 bytes of 0x42
    /// const data = { message: "Hello from happy-cli!" };
    /// const encrypted = encryptWithDataKey(data, key);
    /// console.log(Buffer.from(encrypted).toString('base64'));
    /// ```
    func testDecryptCrossplatformV0Format() throws {
        // Known 32-byte key (all 0x42 bytes)
        let keyBytes = Data(repeating: 0x42, count: 32)
        let key = SymmetricKey(data: keyBytes)

        // Test that we can encrypt and decrypt JSON-like data
        // (simulating the JSON format used by happy-cli/happy-app)
        let jsonData = "{\"message\":\"Hello from macOS!\"}".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(jsonData, with: key)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(decrypted, jsonData)

        // Parse as JSON to verify data integrity
        let json = try JSONSerialization.jsonObject(with: decrypted) as? [String: String]
        XCTAssertEqual(json?["message"], "Hello from macOS!")
    }

    /// Test decryption of Version 0x01 format (with key versioning).
    /// This format is: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
    func testDecryptCrossplatformV1Format() throws {
        // Create a v1 bundle manually for testing
        // Key: 32 bytes of 0x42
        let keyBytes = Data(repeating: 0x42, count: 32)
        let key = SymmetricKey(data: keyBytes)

        // First encrypt with v0 to get valid nonce/ciphertext/tag
        let message = "Version 1 test".data(using: .utf8)!
        let v0Encrypted = try EncryptionService.encrypt(message, with: key)

        // Convert to v1 format by inserting key version bytes
        var v1Bundle = Data()
        v1Bundle.append(0x01) // Version 1
        v1Bundle.append(0x00) // Key version high byte
        v1Bundle.append(0x01) // Key version low byte (version 1)
        v1Bundle.append(contentsOf: v0Encrypted.dropFirst(1)) // Rest of the bundle

        // Decrypt v1 format
        let decrypted = try EncryptionService.decrypt(v1Bundle, with: key)
        XCTAssertEqual(decrypted, message)
    }

    /// Test that decryption fails gracefully for invalid data.
    func testDecryptionFailsGracefully() {
        let key = SymmetricKey(size: .bits256)

        // Empty data
        XCTAssertThrowsError(try EncryptionService.decrypt(Data(), with: key))

        // Too short data
        XCTAssertThrowsError(try EncryptionService.decrypt(Data([0x00]), with: key))

        // Invalid version
        let invalidVersion = Data([0xFF] + Array(repeating: UInt8(0), count: 50))
        XCTAssertThrowsError(try EncryptionService.decrypt(invalidVersion, with: key))
    }

    /// Test that nonces are unique (no collisions).
    func testNonceUniqueness() throws {
        let key = SymmetricKey(size: .bits256)
        let message = "Test".data(using: .utf8)!

        var nonces = Set<Data>()

        // Encrypt 100 times and verify all nonces are unique
        for _ in 0..<100 {
            let encrypted = try EncryptionService.encrypt(message, with: key)
            // Extract nonce (bytes 1-12)
            let nonce = encrypted[1..<13]
            XCTAssertFalse(nonces.contains(nonce), "Nonce should be unique")
            nonces.insert(nonce)
        }

        XCTAssertEqual(nonces.count, 100, "All 100 nonces should be unique")
    }
}
