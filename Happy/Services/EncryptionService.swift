//
//  EncryptionService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import CryptoKit

/// Service for end-to-end encryption of all session data.
///
/// This service implements the same encryption protocol as other Happy clients
/// (happy-cli, happy-app) to ensure cross-platform interoperability.
///
/// ## Encryption Protocol
/// - Algorithm: AES-256-GCM (matches happy-cli and happy-app primary E2E encryption)
/// - Nonce: 12 bytes (hybrid: 4 random + 8 counter)
/// - Key exchange: X25519 ECDH with HKDF key derivation
/// - Bundle format: [version:1][nonce:12][ciphertext:N][authTag:16]
///
/// ## Bundle Format Versions
/// - 0x00: AES-256-GCM without key versioning (current)
/// - 0x01: AES-256-GCM with key versioning (for future key rotation support)
///
/// ## Important: Cross-Platform Compatibility
/// This implementation is compatible with:
/// - happy-cli: Uses AES-256-GCM as primary, TweetNaCl secretbox as legacy
/// - happy-app: Uses AES-256-GCM as primary, libsodium secretbox as legacy
///
/// The legacy secretbox format (XSalsa20-Poly1305) is NOT supported here as the
/// macOS app only needs to interoperate with modern encrypted data.
struct EncryptionService {
    // MARK: - Constants

    /// Bundle format version for AES-256-GCM without key versioning
    private static let bundleVersionLegacy: UInt8 = 0x00

    /// Bundle format version for AES-256-GCM with key versioning
    private static let bundleVersionKeyed: UInt8 = 0x01

    /// Nonce size for AES-256-GCM (12 bytes)
    private static let nonceSize = 12

    /// Authentication tag size for AES-256-GCM (16 bytes)
    private static let authTagSize = 16

    // MARK: - Nonce Counter

    /// Module-level counter for hybrid nonce generation.
    /// Combined with random bytes to eliminate theoretical nonce collision risk.
    private static var nonceCounter: UInt64 = 0
    private static let counterLock = NSLock()

    // MARK: - Key Management

    /// Generate a new key pair for encryption.
    /// - Returns: A tuple of (privateKey, publicKey) as Data.
    static func generateKeyPair() -> (privateKey: Data, publicKey: Data) {
        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        let publicKey = privateKey.publicKey

        return (
            privateKey: privateKey.rawRepresentation,
            publicKey: publicKey.rawRepresentation
        )
    }

    /// Derive a shared secret from a private key and peer's public key.
    /// - Parameters:
    ///   - privateKey: Our private key.
    ///   - peerPublicKey: The peer's public key.
    /// - Returns: A symmetric key for encryption.
    static func deriveSharedSecret(
        privateKey: Data,
        peerPublicKey: Data
    ) throws -> SymmetricKey {
        let privateKeyObj = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: privateKey)
        let publicKeyObj = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerPublicKey)

        let sharedSecret = try privateKeyObj.sharedSecretFromKeyAgreement(with: publicKeyObj)

        // Derive a symmetric key from the shared secret
        // Uses same parameters as happy-cli and happy-app for compatibility
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )
    }

    // MARK: - Nonce Generation

    /// Generate a hybrid nonce combining random bytes with a monotonic counter.
    /// This eliminates theoretical collision risk in high-throughput scenarios
    /// while maintaining cryptographic randomness.
    ///
    /// Structure: [random bytes (4)][8-byte counter (big-endian)]
    /// Total: 12 bytes for AES-GCM
    ///
    /// - Returns: 12-byte hybrid nonce
    private static func generateHybridNonce() -> Data {
        counterLock.lock()
        let currentCounter = nonceCounter
        nonceCounter += 1
        counterLock.unlock()

        // 4 random bytes + 8 counter bytes = 12 bytes
        var nonce = Data(count: nonceSize)

        // Random prefix (4 bytes)
        var randomBytes = [UInt8](repeating: 0, count: 4)
        _ = SecRandomCopyBytes(kSecRandomDefault, 4, &randomBytes)
        nonce[0..<4] = Data(randomBytes)[0..<4]

        // Counter suffix (8 bytes, big-endian)
        var counterBigEndian = currentCounter.bigEndian
        nonce[4..<12] = Data(bytes: &counterBigEndian, count: 8)[0..<8]

        return nonce
    }

    // MARK: - Encryption

    /// Encrypt data with a symmetric key using AES-256-GCM.
    ///
    /// Output format: [version:1][nonce:12][ciphertext:N][authTag:16]
    /// This format is compatible with happy-cli's `encryptWithDataKey` and
    /// happy-app's `AES256Encryption.encrypt`.
    ///
    /// - Parameters:
    ///   - data: The data to encrypt.
    ///   - key: The 32-byte symmetric key.
    /// - Returns: Encrypted bundle with version prefix, nonce, ciphertext, and auth tag.
    static func encrypt(_ data: Data, with key: SymmetricKey) throws -> Data {
        let nonce = generateHybridNonce()

        // Create AES-GCM nonce from our hybrid nonce
        let aesNonce = try AES.GCM.Nonce(data: nonce)

        // Encrypt using AES-256-GCM
        let sealedBox = try AES.GCM.seal(data, using: key, nonce: aesNonce)

        // Get the combined representation (nonce + ciphertext + tag)
        guard let combined = sealedBox.combined else {
            throw EncryptionError.encryptionFailed
        }

        // Build the bundle: [version:1][nonce:12][ciphertext:N][authTag:16]
        var bundle = Data(capacity: 1 + combined.count)
        bundle.append(bundleVersionLegacy)
        bundle.append(combined)

        return bundle
    }

    /// Decrypt data with a symmetric key using AES-256-GCM.
    ///
    /// Supports the following bundle formats:
    /// - Version 0x00: [version:1][nonce:12][ciphertext:N][authTag:16]
    /// - Version 0x01: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
    ///
    /// - Parameters:
    ///   - data: The encrypted bundle.
    ///   - key: The 32-byte symmetric key.
    /// - Returns: Decrypted data.
    static func decrypt(_ data: Data, with key: SymmetricKey) throws -> Data {
        guard data.count >= 1 else {
            throw EncryptionError.decryptionFailed
        }

        let formatVersion = data[0]

        switch formatVersion {
        case bundleVersionLegacy:
            // Version 0x00: [version:1][nonce:12][ciphertext:N][authTag:16]
            // Minimum length: 1 + 12 + 0 + 16 = 29 bytes
            guard data.count >= 29 else {
                throw EncryptionError.decryptionFailed
            }

            // The combined representation starts after the version byte
            let combined = data.dropFirst(1)

            let sealedBox = try AES.GCM.SealedBox(combined: combined)
            return try AES.GCM.open(sealedBox, using: key)

        case bundleVersionKeyed:
            // Version 0x01: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
            // Minimum length: 1 + 2 + 12 + 0 + 16 = 31 bytes
            guard data.count >= 31 else {
                throw EncryptionError.decryptionFailed
            }

            // Skip version byte (1) and key version (2) to get the combined representation
            let combined = data.dropFirst(3)

            let sealedBox = try AES.GCM.SealedBox(combined: combined)
            return try AES.GCM.open(sealedBox, using: key)

        default:
            // Unknown format version
            throw EncryptionError.decryptionFailed
        }
    }
}

// MARK: - Errors

/// Errors that can occur during encryption operations.
enum EncryptionError: LocalizedError {
    case invalidKey
    case encryptionFailed
    case decryptionFailed
    case unsupportedFormat

    var errorDescription: String? {
        switch self {
        case .invalidKey:
            return "Invalid encryption key"
        case .encryptionFailed:
            return "Failed to encrypt data"
        case .decryptionFailed:
            return "Failed to decrypt data"
        case .unsupportedFormat:
            return "Unsupported encryption format"
        }
    }
}
