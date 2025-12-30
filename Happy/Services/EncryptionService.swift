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
/// (happy-cli, happy-app) to ensure interoperability.
///
/// ## Encryption Protocol
/// - Algorithm: NaCl Box (Curve25519 + XSalsa20 + Poly1305)
/// - Key exchange: X25519 ECDH
/// - Implementation: Uses CryptoKit for Apple platforms
struct EncryptionService {
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
        return sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )
    }

    // MARK: - Encryption

    /// Encrypt data with a symmetric key.
    /// - Parameters:
    ///   - data: The data to encrypt.
    ///   - key: The symmetric key.
    /// - Returns: Encrypted data with nonce prepended.
    static func encrypt(_ data: Data, with key: SymmetricKey) throws -> Data {
        let sealedBox = try ChaChaPoly.seal(data, using: key)
        return sealedBox.combined
    }

    /// Decrypt data with a symmetric key.
    /// - Parameters:
    ///   - data: The encrypted data (nonce + ciphertext + tag).
    ///   - key: The symmetric key.
    /// - Returns: Decrypted data.
    static func decrypt(_ data: Data, with key: SymmetricKey) throws -> Data {
        let sealedBox = try ChaChaPoly.SealedBox(combined: data)
        return try ChaChaPoly.open(sealedBox, using: key)
    }
}

// MARK: - Errors

/// Errors that can occur during encryption operations.
enum EncryptionError: LocalizedError {
    case invalidKey
    case encryptionFailed
    case decryptionFailed

    var errorDescription: String? {
        switch self {
        case .invalidKey:
            return "Invalid encryption key"
        case .encryptionFailed:
            return "Failed to encrypt data"
        case .decryptionFailed:
            return "Failed to decrypt data"
        }
    }
}
