//
//  EncryptionService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import CryptoKit

/// Service for end-to-end encryption of all session data.
///
/// This service implements the same encryption protocol as other Happy clients
/// (happy-cli, happy-app, happy-macos) to ensure cross-platform interoperability.
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
/// - happy-macos: Uses AES-256-GCM via CryptoKit (identical implementation)
///
/// The legacy secretbox format (XSalsa20-Poly1305) is NOT supported here as the
/// iOS app only needs to interoperate with modern encrypted data.
struct EncryptionService {
    // MARK: - Constants

    /// Bundle format version for AES-256-GCM without key versioning
    static let bundleVersionLegacy: UInt8 = 0x00

    /// Bundle format version for AES-256-GCM with key versioning
    static let bundleVersionKeyed: UInt8 = 0x01

    /// Nonce size for AES-256-GCM (12 bytes)
    static let nonceSize = 12

    /// Authentication tag size for AES-256-GCM (16 bytes)
    static let authTagSize = 16

    /// Version byte size (1 byte)
    private static let versionSize = 1

    /// Key version size for v1 bundles (2 bytes)
    private static let keyVersionSize = 2

    /// Minimum bundle size for v0: version(1) + nonce(12) + ciphertext(0) + tag(16) = 29
    private static let minBundleSizeV0 = 29

    /// Minimum bundle size for v1: version(1) + keyVersion(2) + nonce(12) + ciphertext(0) + tag(16) = 31
    private static let minBundleSizeV1 = 31

    // MARK: - Nonce Counter

    /// Module-level counter for hybrid nonce generation.
    /// Combined with random bytes to eliminate theoretical nonce collision risk.
    private static var nonceCounter: UInt64 = 0
    private static let counterLock = NSLock()

    // MARK: - Key Management

    /// Generate a new X25519 key pair for key exchange.
    ///
    /// Uses Curve25519 Diffie-Hellman key agreement, the same algorithm used
    /// by happy-cli and happy-app for establishing shared secrets.
    ///
    /// - Returns: A tuple of (privateKey, publicKey) as raw Data representations.
    static func generateKeyPair() -> (privateKey: Data, publicKey: Data) {
        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        let publicKey = privateKey.publicKey

        return (
            privateKey: privateKey.rawRepresentation,
            publicKey: publicKey.rawRepresentation
        )
    }

    /// Derive a shared symmetric key from a private key and a peer's public key.
    ///
    /// Uses X25519 ECDH key agreement followed by HKDF-SHA256 key derivation,
    /// with the same parameters as happy-cli and happy-app for cross-platform compatibility.
    ///
    /// - Parameters:
    ///   - privateKey: Our X25519 private key (32 bytes).
    ///   - peerPublicKey: The peer's X25519 public key (32 bytes).
    /// - Returns: A 256-bit symmetric key suitable for AES-256-GCM encryption.
    /// - Throws: `EncryptionError.invalidKey` if the key data is malformed.
    static func deriveSharedSecret(
        privateKey: Data,
        peerPublicKey: Data
    ) throws -> SymmetricKey {
        let privateKeyObj: Curve25519.KeyAgreement.PrivateKey
        let publicKeyObj: Curve25519.KeyAgreement.PublicKey

        do {
            privateKeyObj = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: privateKey)
        } catch {
            throw EncryptionError.invalidKey
        }

        do {
            publicKeyObj = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerPublicKey)
        } catch {
            throw EncryptionError.invalidKey
        }

        let sharedSecret: SharedSecret
        do {
            sharedSecret = try privateKeyObj.sharedSecretFromKeyAgreement(with: publicKeyObj)
        } catch {
            throw EncryptionError.invalidKey
        }

        // Derive a symmetric key from the shared secret.
        // Uses same parameters as happy-cli and happy-app for compatibility:
        // - Hash: SHA-256
        // - Salt: empty
        // - Info: "happy-encryption"
        // - Output: 32 bytes (256 bits for AES-256)
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )
    }

    /// Create a symmetric key from raw key data.
    ///
    /// - Parameter data: Raw key bytes (must be exactly 32 bytes for AES-256).
    /// - Returns: A `SymmetricKey` for use with encryption/decryption.
    /// - Throws: `EncryptionError.invalidKey` if the data is not 32 bytes.
    static func symmetricKey(from data: Data) throws -> SymmetricKey {
        guard data.count == 32 else {
            throw EncryptionError.invalidKey
        }
        return SymmetricKey(data: data)
    }

    // MARK: - Nonce Generation

    /// Generate a hybrid nonce combining random bytes with a monotonic counter.
    ///
    /// This eliminates theoretical collision risk in high-throughput scenarios
    /// while maintaining cryptographic randomness. The same approach is used
    /// by happy-cli, happy-app, and happy-macos.
    ///
    /// Structure: [random bytes (4)][8-byte counter (big-endian)]
    /// Total: 12 bytes for AES-GCM
    ///
    /// - Returns: 12-byte hybrid nonce.
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
    /// Output format (v0): [version:1][nonce:12][ciphertext:N][authTag:16]
    ///
    /// This format is compatible with:
    /// - happy-cli's `encryptWithDataKey`
    /// - happy-app's `AES256Encryption.encrypt`
    /// - happy-macos's `EncryptionService.encrypt`
    ///
    /// - Parameters:
    ///   - data: The plaintext data to encrypt.
    ///   - key: The 256-bit symmetric key.
    /// - Returns: Encrypted bundle with version prefix, nonce, ciphertext, and auth tag.
    /// - Throws: `EncryptionError.encryptionFailed` if encryption fails.
    static func encrypt(_ data: Data, with key: SymmetricKey) throws -> Data {
        let nonce = generateHybridNonce()

        // Create AES-GCM nonce from our hybrid nonce
        let aesNonce: AES.GCM.Nonce
        do {
            aesNonce = try AES.GCM.Nonce(data: nonce)
        } catch {
            throw EncryptionError.encryptionFailed
        }

        // Encrypt using AES-256-GCM
        let sealedBox: AES.GCM.SealedBox
        do {
            sealedBox = try AES.GCM.seal(data, using: key, nonce: aesNonce)
        } catch {
            throw EncryptionError.encryptionFailed
        }

        // Get the combined representation (nonce + ciphertext + tag)
        guard let combined = sealedBox.combined else {
            throw EncryptionError.encryptionFailed
        }

        // Build the bundle: [version:1][nonce:12][ciphertext:N][authTag:16]
        var bundle = Data(capacity: versionSize + combined.count)
        bundle.append(bundleVersionLegacy)
        bundle.append(combined)

        return bundle
    }

    /// Encrypt data with a symmetric key and key version using AES-256-GCM.
    ///
    /// Output format (v1): [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
    ///
    /// This format supports key rotation and is compatible with happy-cli's
    /// `encryptWithKeyVersion` function.
    ///
    /// - Parameters:
    ///   - data: The plaintext data to encrypt.
    ///   - key: The 256-bit symmetric key.
    ///   - keyVersion: The key version identifier (0-65535).
    /// - Returns: Encrypted bundle with version prefix, key version, nonce, ciphertext, and auth tag.
    /// - Throws: `EncryptionError.encryptionFailed` if encryption fails.
    static func encrypt(_ data: Data, with key: SymmetricKey, keyVersion: UInt16) throws -> Data {
        let nonce = generateHybridNonce()

        // Create AES-GCM nonce from our hybrid nonce
        let aesNonce: AES.GCM.Nonce
        do {
            aesNonce = try AES.GCM.Nonce(data: nonce)
        } catch {
            throw EncryptionError.encryptionFailed
        }

        // Encrypt using AES-256-GCM
        let sealedBox: AES.GCM.SealedBox
        do {
            sealedBox = try AES.GCM.seal(data, using: key, nonce: aesNonce)
        } catch {
            throw EncryptionError.encryptionFailed
        }

        // Get the combined representation (nonce + ciphertext + tag)
        guard let combined = sealedBox.combined else {
            throw EncryptionError.encryptionFailed
        }

        // Build the bundle: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
        var bundle = Data(capacity: versionSize + keyVersionSize + combined.count)
        bundle.append(bundleVersionKeyed)

        // Key version as 2 bytes big-endian
        var keyVersionBigEndian = keyVersion.bigEndian
        bundle.append(Data(bytes: &keyVersionBigEndian, count: keyVersionSize))

        bundle.append(combined)

        return bundle
    }

    // MARK: - Decryption

    /// Decrypt data with a symmetric key using AES-256-GCM.
    ///
    /// Supports the following bundle formats:
    /// - Version 0x00: [version:1][nonce:12][ciphertext:N][authTag:16]
    /// - Version 0x01: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
    ///
    /// - Parameters:
    ///   - data: The encrypted bundle.
    ///   - key: The 256-bit symmetric key used for encryption.
    /// - Returns: Decrypted plaintext data.
    /// - Throws: `EncryptionError.decryptionFailed` if decryption fails,
    ///           `EncryptionError.unsupportedFormat` if the bundle format is not recognized.
    static func decrypt(_ data: Data, with key: SymmetricKey) throws -> Data {
        guard data.count >= 1 else {
            throw EncryptionError.decryptionFailed
        }

        let formatVersion = data[data.startIndex]

        switch formatVersion {
        case bundleVersionLegacy:
            // Version 0x00: [version:1][nonce:12][ciphertext:N][authTag:16]
            guard data.count >= minBundleSizeV0 else {
                throw EncryptionError.decryptionFailed
            }

            // The combined representation starts after the version byte
            let combined = data.dropFirst(versionSize)

            do {
                let sealedBox = try AES.GCM.SealedBox(combined: combined)
                return try AES.GCM.open(sealedBox, using: key)
            } catch {
                throw EncryptionError.decryptionFailed
            }

        case bundleVersionKeyed:
            // Version 0x01: [version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
            guard data.count >= minBundleSizeV1 else {
                throw EncryptionError.decryptionFailed
            }

            // Skip version byte (1) and key version (2) to get the combined representation
            let combined = data.dropFirst(versionSize + keyVersionSize)

            do {
                let sealedBox = try AES.GCM.SealedBox(combined: combined)
                return try AES.GCM.open(sealedBox, using: key)
            } catch {
                throw EncryptionError.decryptionFailed
            }

        default:
            // Unknown format version - not a supported AES-GCM bundle
            throw EncryptionError.unsupportedFormat
        }
    }

    // MARK: - Bundle Inspection

    /// Detect the bundle format version from encrypted data.
    ///
    /// - Parameter data: The encrypted bundle.
    /// - Returns: The format version string ("v0", "v1", or "unknown").
    static func detectBundleVersion(_ data: Data) -> String {
        guard data.count >= 1 else {
            return "unknown"
        }

        switch data[data.startIndex] {
        case bundleVersionLegacy:
            return "v0"
        case bundleVersionKeyed:
            return "v1"
        default:
            return "unknown"
        }
    }

    /// Extract the key version from a v1 encrypted bundle.
    ///
    /// - Parameter data: The encrypted bundle (must be v1 format).
    /// - Returns: The key version, or nil if the bundle is not v1 format.
    static func extractKeyVersion(from data: Data) -> UInt16? {
        guard data.count >= minBundleSizeV1 else {
            return nil
        }

        guard data[data.startIndex] == bundleVersionKeyed else {
            return nil
        }

        // Key version is stored as 2 bytes big-endian after the version byte
        let start = data.startIndex + versionSize
        let end = start + keyVersionSize
        let keyVersionBytes = data.subdata(in: start..<end)
        return keyVersionBytes.withUnsafeBytes { $0.load(as: UInt16.self).bigEndian }
    }

    // MARK: - String Convenience Methods

    /// Encrypt a UTF-8 string and return the result as a base64 string.
    ///
    /// - Parameters:
    ///   - string: The plaintext string to encrypt.
    ///   - key: The 256-bit symmetric key.
    /// - Returns: Base64-encoded encrypted bundle.
    /// - Throws: `EncryptionError` if encryption fails.
    static func encryptString(_ string: String, with key: SymmetricKey) throws -> String {
        guard let data = string.data(using: .utf8) else {
            throw EncryptionError.encryptionFailed
        }
        let encrypted = try encrypt(data, with: key)
        return encrypted.base64EncodedString()
    }

    /// Decrypt a base64-encoded bundle and return the result as a UTF-8 string.
    ///
    /// - Parameters:
    ///   - base64String: The base64-encoded encrypted bundle.
    ///   - key: The 256-bit symmetric key.
    /// - Returns: Decrypted plaintext string.
    /// - Throws: `EncryptionError` if decryption fails.
    static func decryptString(_ base64String: String, with key: SymmetricKey) throws -> String {
        guard let data = Data(base64Encoded: base64String) else {
            throw EncryptionError.decryptionFailed
        }
        let decrypted = try decrypt(data, with: key)
        guard let string = String(data: decrypted, encoding: .utf8) else {
            throw EncryptionError.decryptionFailed
        }
        return string
    }
}

// MARK: - Errors

/// Errors that can occur during encryption operations.
enum EncryptionError: LocalizedError, Equatable {
    /// The provided key data is invalid (wrong size or malformed).
    case invalidKey

    /// Encryption failed due to an internal error.
    case encryptionFailed

    /// Decryption failed - the data may be corrupted or the key may be wrong.
    case decryptionFailed

    /// The encrypted bundle uses an unsupported format version.
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
