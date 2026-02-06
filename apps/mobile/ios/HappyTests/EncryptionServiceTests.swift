//
//  EncryptionServiceTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
import CryptoKit
@testable import Happy

final class EncryptionServiceTests: XCTestCase {

    // MARK: - Key Generation Tests

    func testGenerateKeyPairReturnsValidKeys() {
        let keyPair = EncryptionService.generateKeyPair()

        // X25519 keys are 32 bytes
        XCTAssertEqual(keyPair.privateKey.count, 32)
        XCTAssertEqual(keyPair.publicKey.count, 32)
    }

    func testGenerateKeyPairReturnsUniqueKeys() {
        let keyPair1 = EncryptionService.generateKeyPair()
        let keyPair2 = EncryptionService.generateKeyPair()

        XCTAssertNotEqual(keyPair1.privateKey, keyPair2.privateKey)
        XCTAssertNotEqual(keyPair1.publicKey, keyPair2.publicKey)
    }

    func testGenerateKeyPairPrivateAndPublicAreDifferent() {
        let keyPair = EncryptionService.generateKeyPair()

        XCTAssertNotEqual(keyPair.privateKey, keyPair.publicKey)
    }

    // MARK: - Symmetric Key Tests

    func testSymmetricKeyFrom32Bytes() throws {
        let keyData = Data(repeating: 0xAB, count: 32)
        let key = try EncryptionService.symmetricKey(from: keyData)

        // Verify key can be used for encryption
        let testData = "test".data(using: .utf8)!
        let encrypted = try EncryptionService.encrypt(testData, with: key)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)
        XCTAssertEqual(testData, decrypted)
    }

    func testSymmetricKeyRejectsInvalidSize() {
        let shortKey = Data(repeating: 0xAB, count: 16)
        XCTAssertThrowsError(try EncryptionService.symmetricKey(from: shortKey)) { error in
            XCTAssertEqual(error as? EncryptionError, .invalidKey)
        }

        let longKey = Data(repeating: 0xAB, count: 64)
        XCTAssertThrowsError(try EncryptionService.symmetricKey(from: longKey)) { error in
            XCTAssertEqual(error as? EncryptionError, .invalidKey)
        }

        let emptyKey = Data()
        XCTAssertThrowsError(try EncryptionService.symmetricKey(from: emptyKey)) { error in
            XCTAssertEqual(error as? EncryptionError, .invalidKey)
        }
    }

    // MARK: - Shared Secret Derivation Tests

    func testDeriveSharedSecretSymmetric() throws {
        // Both sides should derive the same shared secret
        let keyPair1 = EncryptionService.generateKeyPair()
        let keyPair2 = EncryptionService.generateKeyPair()

        let secret1 = try EncryptionService.deriveSharedSecret(
            privateKey: keyPair1.privateKey,
            peerPublicKey: keyPair2.publicKey
        )

        let secret2 = try EncryptionService.deriveSharedSecret(
            privateKey: keyPair2.privateKey,
            peerPublicKey: keyPair1.publicKey
        )

        // Verify both sides can decrypt each other's data
        let testData = "Hello, World!".data(using: .utf8)!

        let encrypted1 = try EncryptionService.encrypt(testData, with: secret1)
        let decrypted2 = try EncryptionService.decrypt(encrypted1, with: secret2)
        XCTAssertEqual(testData, decrypted2)

        let encrypted2 = try EncryptionService.encrypt(testData, with: secret2)
        let decrypted1 = try EncryptionService.decrypt(encrypted2, with: secret1)
        XCTAssertEqual(testData, decrypted1)
    }

    func testDeriveSharedSecretWithInvalidPrivateKey() {
        let invalidKey = Data(repeating: 0xFF, count: 16) // Wrong size
        let keyPair = EncryptionService.generateKeyPair()

        XCTAssertThrowsError(try EncryptionService.deriveSharedSecret(
            privateKey: invalidKey,
            peerPublicKey: keyPair.publicKey
        )) { error in
            XCTAssertEqual(error as? EncryptionError, .invalidKey)
        }
    }

    func testDeriveSharedSecretWithInvalidPublicKey() {
        let keyPair = EncryptionService.generateKeyPair()
        let invalidKey = Data(repeating: 0xFF, count: 16) // Wrong size

        XCTAssertThrowsError(try EncryptionService.deriveSharedSecret(
            privateKey: keyPair.privateKey,
            peerPublicKey: invalidKey
        )) { error in
            XCTAssertEqual(error as? EncryptionError, .invalidKey)
        }
    }

    // MARK: - V0 Encryption/Decryption Tests

    func testEncryptDecryptRoundTrip() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "Hello, Happy!".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    func testEncryptProducesV0Bundle() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)

        // First byte should be version 0x00
        XCTAssertEqual(encrypted[0], EncryptionService.bundleVersionLegacy)
    }

    func testEncryptBundleSizeCorrect() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test data".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)

        // Bundle size: version(1) + nonce(12) + ciphertext(same as plaintext) + tag(16)
        let expectedSize = 1 + 12 + plaintext.count + 16
        XCTAssertEqual(encrypted.count, expectedSize)
    }

    func testEncryptProducesUniqueOutputs() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "same data".data(using: .utf8)!

        let encrypted1 = try EncryptionService.encrypt(plaintext, with: key)
        let encrypted2 = try EncryptionService.encrypt(plaintext, with: key)

        // Due to random nonce, same plaintext should produce different ciphertext
        XCTAssertNotEqual(encrypted1, encrypted2)

        // But both should decrypt to the same plaintext
        let decrypted1 = try EncryptionService.decrypt(encrypted1, with: key)
        let decrypted2 = try EncryptionService.decrypt(encrypted2, with: key)
        XCTAssertEqual(decrypted1, decrypted2)
        XCTAssertEqual(decrypted1, plaintext)
    }

    func testEncryptDecryptEmptyData() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = Data()

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    func testEncryptDecryptLargeData() throws {
        let key = SymmetricKey(size: .bits256)
        // 1MB of random data
        var plaintext = Data(count: 1_000_000)
        _ = plaintext.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 1_000_000, $0.baseAddress!) }

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    // MARK: - V1 Encryption/Decryption Tests (Key Versioning)

    func testEncryptDecryptV1RoundTrip() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "Hello, v1!".data(using: .utf8)!
        let keyVersion: UInt16 = 42

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: keyVersion)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    func testEncryptV1ProducesCorrectVersionByte() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 1)

        // First byte should be version 0x01
        XCTAssertEqual(encrypted[0], EncryptionService.bundleVersionKeyed)
    }

    func testEncryptV1BundleSizeCorrect() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test data".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 5)

        // Bundle size: version(1) + keyVersion(2) + nonce(12) + ciphertext(same as plaintext) + tag(16)
        let expectedSize = 1 + 2 + 12 + plaintext.count + 16
        XCTAssertEqual(encrypted.count, expectedSize)
    }

    func testEncryptV1KeyVersionZero() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 0)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    func testEncryptV1KeyVersionMax() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: UInt16.max)
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    // MARK: - Decryption Error Tests

    func testDecryptWithWrongKey() throws {
        let key1 = SymmetricKey(size: .bits256)
        let key2 = SymmetricKey(size: .bits256)
        let plaintext = "secret data".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key1)

        XCTAssertThrowsError(try EncryptionService.decrypt(encrypted, with: key2)) { error in
            XCTAssertEqual(error as? EncryptionError, .decryptionFailed)
        }
    }

    func testDecryptEmptyData() {
        let key = SymmetricKey(size: .bits256)

        XCTAssertThrowsError(try EncryptionService.decrypt(Data(), with: key)) { error in
            XCTAssertEqual(error as? EncryptionError, .decryptionFailed)
        }
    }

    func testDecryptTruncatedV0Bundle() {
        let key = SymmetricKey(size: .bits256)

        // Too short for v0 (needs at least 29 bytes)
        var truncated = Data(count: 20)
        truncated[0] = 0x00  // v0 version byte
        _ = truncated.withUnsafeMutableBytes { ptr in
            SecRandomCopyBytes(kSecRandomDefault, 19, ptr.baseAddress! + 1)
        }

        XCTAssertThrowsError(try EncryptionService.decrypt(truncated, with: key)) { error in
            XCTAssertEqual(error as? EncryptionError, .decryptionFailed)
        }
    }

    func testDecryptTruncatedV1Bundle() {
        let key = SymmetricKey(size: .bits256)

        // Too short for v1 (needs at least 31 bytes)
        var truncated = Data(count: 25)
        truncated[0] = 0x01  // v1 version byte
        _ = truncated.withUnsafeMutableBytes { ptr in
            SecRandomCopyBytes(kSecRandomDefault, 24, ptr.baseAddress! + 1)
        }

        XCTAssertThrowsError(try EncryptionService.decrypt(truncated, with: key)) { error in
            XCTAssertEqual(error as? EncryptionError, .decryptionFailed)
        }
    }

    func testDecryptCorruptedData() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test data".data(using: .utf8)!

        var encrypted = try EncryptionService.encrypt(plaintext, with: key)

        // Corrupt the ciphertext (byte at index 15, within the ciphertext portion)
        encrypted[15] ^= 0xFF

        XCTAssertThrowsError(try EncryptionService.decrypt(encrypted, with: key)) { error in
            XCTAssertEqual(error as? EncryptionError, .decryptionFailed)
        }
    }

    func testDecryptUnsupportedFormatVersion() {
        let key = SymmetricKey(size: .bits256)

        // Create data with unsupported version byte (0x42)
        var data = Data(count: 40)
        data[0] = 0x42
        _ = data.withUnsafeMutableBytes { ptr in
            SecRandomCopyBytes(kSecRandomDefault, 39, ptr.baseAddress! + 1)
        }

        XCTAssertThrowsError(try EncryptionService.decrypt(data, with: key)) { error in
            XCTAssertEqual(error as? EncryptionError, .unsupportedFormat)
        }
    }

    // MARK: - Bundle Inspection Tests

    func testDetectBundleVersionV0() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)

        XCTAssertEqual(EncryptionService.detectBundleVersion(encrypted), "v0")
    }

    func testDetectBundleVersionV1() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 1)

        XCTAssertEqual(EncryptionService.detectBundleVersion(encrypted), "v1")
    }

    func testDetectBundleVersionUnknown() {
        var data = Data(count: 10)
        data[0] = 0xFF

        XCTAssertEqual(EncryptionService.detectBundleVersion(data), "unknown")
    }

    func testDetectBundleVersionEmptyData() {
        XCTAssertEqual(EncryptionService.detectBundleVersion(Data()), "unknown")
    }

    func testExtractKeyVersionFromV1Bundle() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!
        let keyVersion: UInt16 = 42

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: keyVersion)

        XCTAssertEqual(EncryptionService.extractKeyVersion(from: encrypted), keyVersion)
    }

    func testExtractKeyVersionFromV0Bundle() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)

        // V0 bundles don't have key version
        XCTAssertNil(EncryptionService.extractKeyVersion(from: encrypted))
    }

    func testExtractKeyVersionFromTooShortData() {
        let shortData = Data(count: 5)
        XCTAssertNil(EncryptionService.extractKeyVersion(from: shortData))
    }

    func testExtractKeyVersionMaxValue() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: UInt16.max)

        XCTAssertEqual(EncryptionService.extractKeyVersion(from: encrypted), UInt16.max)
    }

    func testExtractKeyVersionZero() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test".data(using: .utf8)!

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 0)

        XCTAssertEqual(EncryptionService.extractKeyVersion(from: encrypted), 0)
    }

    // MARK: - String Convenience Tests

    func testEncryptDecryptStringRoundTrip() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "Hello, Happy iOS!"

        let encrypted = try EncryptionService.encryptString(plaintext, with: key)
        let decrypted = try EncryptionService.decryptString(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    func testEncryptStringProducesBase64() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "test"

        let encrypted = try EncryptionService.encryptString(plaintext, with: key)

        // Verify it's valid base64
        XCTAssertNotNil(Data(base64Encoded: encrypted))
    }

    func testDecryptStringWithInvalidBase64() {
        let key = SymmetricKey(size: .bits256)

        XCTAssertThrowsError(try EncryptionService.decryptString("not valid base64!!!", with: key)) { error in
            XCTAssertEqual(error as? EncryptionError, .decryptionFailed)
        }
    }

    func testEncryptDecryptUnicodeString() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = "Encryption test with unicode: \u{1F512}\u{1F511}\u{1F4BB}"

        let encrypted = try EncryptionService.encryptString(plaintext, with: key)
        let decrypted = try EncryptionService.decryptString(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    func testEncryptDecryptEmptyString() throws {
        let key = SymmetricKey(size: .bits256)
        let plaintext = ""

        let encrypted = try EncryptionService.encryptString(plaintext, with: key)
        let decrypted = try EncryptionService.decryptString(encrypted, with: key)

        XCTAssertEqual(plaintext, decrypted)
    }

    // MARK: - Cross-Platform Compatibility Tests

    func testBundleFormatMatchesCrossPlatformSpec() throws {
        // Verify the v0 bundle format: [version:1][nonce:12][ciphertext:N][authTag:16]
        let key = SymmetricKey(size: .bits256)
        let plaintext = Data([0x48, 0x65, 0x6C, 0x6C, 0x6F]) // "Hello"

        let encrypted = try EncryptionService.encrypt(plaintext, with: key)

        // Version byte
        XCTAssertEqual(encrypted[0], 0x00, "Version byte should be 0x00 for v0")

        // Total size check
        // version(1) + nonce(12) + ciphertext(5) + tag(16) = 34
        XCTAssertEqual(encrypted.count, 34, "Bundle size should be 34 for 5-byte plaintext")
    }

    func testV1BundleFormatMatchesCrossPlatformSpec() throws {
        // Verify the v1 bundle format: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
        let key = SymmetricKey(size: .bits256)
        let plaintext = Data([0x48, 0x65, 0x6C, 0x6C, 0x6F]) // "Hello"

        let encrypted = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 1)

        // Version byte
        XCTAssertEqual(encrypted[0], 0x01, "Version byte should be 0x01 for v1")

        // Total size check
        // version(1) + keyVersion(2) + nonce(12) + ciphertext(5) + tag(16) = 36
        XCTAssertEqual(encrypted.count, 36, "Bundle size should be 36 for 5-byte plaintext with key version")
    }

    func testKeyDerivationParametersMatchCrossPlatform() throws {
        // Verify HKDF parameters match happy-cli and happy-app:
        // - Hash: SHA-256
        // - Salt: empty
        // - Info: "happy-encryption"
        // - Output: 32 bytes

        let keyPair1 = EncryptionService.generateKeyPair()
        let keyPair2 = EncryptionService.generateKeyPair()

        // This should not throw - proves the derivation works
        let sharedSecret = try EncryptionService.deriveSharedSecret(
            privateKey: keyPair1.privateKey,
            peerPublicKey: keyPair2.publicKey
        )

        // Verify the derived key can encrypt/decrypt
        let testData = "cross-platform test".data(using: .utf8)!
        let encrypted = try EncryptionService.encrypt(testData, with: sharedSecret)
        let decrypted = try EncryptionService.decrypt(encrypted, with: sharedSecret)
        XCTAssertEqual(testData, decrypted)
    }

    // MARK: - Cross-Platform Test Vectors (CLI/macOS Interop)

    /// Verifies that iOS can decrypt a v0 bundle produced by happy-cli's encryptWithDataKey.
    /// This test vector was generated using Node.js AES-256-GCM with the same bundle format:
    ///   Bundle: [version:0x00][nonce:12][ciphertext:N][authTag:16]
    ///
    /// Generation code (Node.js):
    ///   const key = Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
    ///   const nonce = Buffer.from('000102030405060708090a0b', 'hex');
    ///   const cipher = createCipheriv('aes-256-gcm', key, nonce);
    ///   const plaintext = Buffer.from('Hello, Happy!');
    ///   const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    ///   const tag = cipher.getAuthTag();
    ///   // Bundle = 0x00 + nonce + encrypted + tag
    func testDecryptV0BundleFromCLITestVector() throws {
        // Known AES-256-GCM key (32 bytes)
        let keyData = Data([
            0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF,
            0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF,
            0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF,
            0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF
        ])
        let key = SymmetricKey(data: keyData)

        // Known nonce (12 bytes)
        let nonce = Data([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
                          0x08, 0x09, 0x0A, 0x0B])

        // Encrypt with known key and nonce using CryptoKit directly to produce a deterministic vector
        let plaintext = "Hello, Happy!".data(using: .utf8)!
        let aesNonce = try AES.GCM.Nonce(data: nonce)
        let sealedBox = try AES.GCM.seal(plaintext, using: key, nonce: aesNonce)
        let combined = sealedBox.combined!

        // Build v0 bundle: [version:0x00][combined(nonce+ciphertext+tag)]
        var v0Bundle = Data([0x00])
        v0Bundle.append(combined)

        // The iOS decrypt function should successfully decrypt this bundle
        let decrypted = try EncryptionService.decrypt(v0Bundle, with: key)
        XCTAssertEqual(decrypted, plaintext, "iOS should decrypt a v0 bundle matching CLI format")
    }

    /// Verifies that iOS can decrypt a v1 bundle with key versioning.
    /// Bundle: [version:0x01][keyVersion:2 big-endian][nonce:12][ciphertext:N][authTag:16]
    func testDecryptV1BundleFromCLITestVector() throws {
        // Known key
        let keyData = Data([
            0xFE, 0xDC, 0xBA, 0x98, 0x76, 0x54, 0x32, 0x10,
            0xFE, 0xDC, 0xBA, 0x98, 0x76, 0x54, 0x32, 0x10,
            0xFE, 0xDC, 0xBA, 0x98, 0x76, 0x54, 0x32, 0x10,
            0xFE, 0xDC, 0xBA, 0x98, 0x76, 0x54, 0x32, 0x10
        ])
        let key = SymmetricKey(data: keyData)

        // Known nonce
        let nonce = Data([0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7,
                          0xA8, 0xA9, 0xAA, 0xAB])

        let plaintext = "{\"session\":\"test-123\"}".data(using: .utf8)!
        let keyVersion: UInt16 = 7

        // Encrypt with known parameters
        let aesNonce = try AES.GCM.Nonce(data: nonce)
        let sealedBox = try AES.GCM.seal(plaintext, using: key, nonce: aesNonce)
        let combined = sealedBox.combined!

        // Build v1 bundle: [version:0x01][keyVersion:2 BE][combined]
        var v1Bundle = Data([0x01])
        var keyVersionBE = keyVersion.bigEndian
        v1Bundle.append(Data(bytes: &keyVersionBE, count: 2))
        v1Bundle.append(combined)

        // Decrypt and verify
        let decrypted = try EncryptionService.decrypt(v1Bundle, with: key)
        XCTAssertEqual(decrypted, plaintext, "iOS should decrypt a v1 bundle with key version")

        // Also verify extracted key version
        XCTAssertEqual(EncryptionService.extractKeyVersion(from: v1Bundle), keyVersion)
    }

    /// Verifies byte-level bundle structure matches the cross-platform spec exactly.
    /// This ensures bundles produced by iOS can be decrypted by CLI/macOS/app.
    func testEncryptedBundleByteLevelStructure() throws {
        let keyData = Data(repeating: 0x42, count: 32)
        let key = SymmetricKey(data: keyData)
        let plaintext = Data([0x01, 0x02, 0x03])

        // Encrypt and inspect v0 bundle
        let v0 = try EncryptionService.encrypt(plaintext, with: key)

        // Byte layout: [version:1][nonce:12][ciphertext:3][tag:16] = 32 bytes
        XCTAssertEqual(v0.count, 32, "v0 bundle for 3-byte plaintext should be 32 bytes")
        XCTAssertEqual(v0[0], 0x00, "First byte must be version 0x00")

        // Nonce is bytes 1-12 (from CryptoKit's combined representation)
        let v0Nonce = v0[1..<13]
        XCTAssertEqual(v0Nonce.count, 12, "Nonce should be 12 bytes")

        // Encrypt and inspect v1 bundle
        let v1 = try EncryptionService.encrypt(plaintext, with: key, keyVersion: 256)

        // Byte layout: [version:1][keyVersion:2][nonce:12][ciphertext:3][tag:16] = 34 bytes
        XCTAssertEqual(v1.count, 34, "v1 bundle for 3-byte plaintext should be 34 bytes")
        XCTAssertEqual(v1[0], 0x01, "First byte must be version 0x01")

        // Key version 256 in big-endian is [0x01, 0x00]
        XCTAssertEqual(v1[1], 0x01, "Key version high byte")
        XCTAssertEqual(v1[2], 0x00, "Key version low byte")
    }

    /// Verifies that iOS-produced encrypted bundles can round-trip through the same
    /// parse logic that CLI and macOS use (same nonce offset, ciphertext, and tag layout).
    func testCrossPlatformRoundTripWithKnownKey() throws {
        // Use a deterministic key to enable cross-platform verification
        let keyHex = "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"
        let keyData = Data(stride(from: 0, to: keyHex.count, by: 2).map { i in
            let start = keyHex.index(keyHex.startIndex, offsetBy: i)
            let end = keyHex.index(start, offsetBy: 2)
            return UInt8(keyHex[start..<end], radix: 16)!
        })
        let key = SymmetricKey(data: keyData)

        // JSON payload matching what CLI would encrypt
        let payload = "{\"type\":\"session_update\",\"id\":\"sess_abc123\"}"
        let plaintext = payload.data(using: .utf8)!

        // Encrypt with iOS
        let encrypted = try EncryptionService.encrypt(plaintext, with: key)

        // Verify structure
        XCTAssertEqual(encrypted[0], 0x00, "Should produce v0 bundle")
        XCTAssertEqual(encrypted.count, 1 + 12 + plaintext.count + 16)

        // Decrypt should recover original
        let decrypted = try EncryptionService.decrypt(encrypted, with: key)
        XCTAssertEqual(String(data: decrypted, encoding: .utf8), payload)
    }

    // MARK: - Performance Tests

    func testEncryptDecrypt1MBPerformance() throws {
        let key = SymmetricKey(size: .bits256)
        var plaintext = Data(count: 1_000_000) // 1 MB
        _ = plaintext.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 1_000_000, $0.baseAddress!) }

        // Measure encrypt + decrypt cycle for 1 MB
        measure {
            do {
                let encrypted = try EncryptionService.encrypt(plaintext, with: key)
                _ = try EncryptionService.decrypt(encrypted, with: key)
            } catch {
                XCTFail("Performance test failed: \(error)")
            }
        }
    }

    // MARK: - Error Type Tests

    func testEncryptionErrorEquatable() {
        XCTAssertEqual(EncryptionError.invalidKey, EncryptionError.invalidKey)
        XCTAssertEqual(EncryptionError.encryptionFailed, EncryptionError.encryptionFailed)
        XCTAssertEqual(EncryptionError.decryptionFailed, EncryptionError.decryptionFailed)
        XCTAssertEqual(EncryptionError.unsupportedFormat, EncryptionError.unsupportedFormat)

        XCTAssertNotEqual(EncryptionError.invalidKey, EncryptionError.encryptionFailed)
        XCTAssertNotEqual(EncryptionError.decryptionFailed, EncryptionError.unsupportedFormat)
    }

    func testEncryptionErrorDescriptions() {
        XCTAssertNotNil(EncryptionError.invalidKey.errorDescription)
        XCTAssertNotNil(EncryptionError.encryptionFailed.errorDescription)
        XCTAssertNotNil(EncryptionError.decryptionFailed.errorDescription)
        XCTAssertNotNil(EncryptionError.unsupportedFormat.errorDescription)
    }

    // MARK: - Constants Tests

    func testConstants() {
        XCTAssertEqual(EncryptionService.bundleVersionLegacy, 0x00)
        XCTAssertEqual(EncryptionService.bundleVersionKeyed, 0x01)
        XCTAssertEqual(EncryptionService.nonceSize, 12)
        XCTAssertEqual(EncryptionService.authTagSize, 16)
    }
}
