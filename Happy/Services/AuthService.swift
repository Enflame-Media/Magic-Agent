//
//  AuthService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import CryptoKit

/// Service for handling authentication with the Happy server.
///
/// This actor manages the complete authentication flow including:
/// - Generating encryption keypairs
/// - Creating QR code data for CLI pairing
/// - Validating connection tokens
/// - Managing authentication state
@Observable
final class AuthService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = AuthService()

    // MARK: - Published State

    /// Current authentication state.
    var state: AuthState = .unauthenticated

    /// The authenticated account, if any.
    var account: AuthenticatedAccount?

    /// Current machine connection, if paired.
    var machine: ConnectedMachine?

    // MARK: - Private Properties

    private var privateKey: Curve25519.KeyAgreement.PrivateKey?
    private var sharedSecret: SymmetricKey?

    // MARK: - Initialization

    init() {
        // Check for existing credentials on init
        loadStoredCredentials()
    }

    // MARK: - Public Methods

    /// Generate a new keypair and prepare for pairing.
    /// - Returns: QR code data containing public key and pairing info.
    func generatePairingData() -> PairingData {
        // Generate new keypair
        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        self.privateKey = privateKey

        // Store private key securely
        try? KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)

        // Create pairing data
        let pairingData = PairingData(
            publicKey: privateKey.publicKey.rawRepresentation.base64EncodedString(),
            deviceName: Host.current().localizedName ?? "Mac",
            platform: "macos",
            appVersion: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0"
        )

        state = .awaitingPairing

        return pairingData
    }

    /// Complete pairing with the CLI after QR scan.
    /// - Parameters:
    ///   - peerPublicKey: The CLI's public key.
    ///   - token: The authentication token from the server.
    ///   - machineId: The ID of the connected machine.
    func completePairing(peerPublicKey: String, token: String, machineId: String) async throws {
        guard let privateKey = privateKey else {
            throw AuthError.noPrivateKey
        }

        // Decode peer public key
        guard let peerKeyData = Data(base64Encoded: peerPublicKey) else {
            throw AuthError.invalidPublicKey
        }

        let peerKey = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerKeyData)

        // Derive shared secret for E2E encryption
        let sharedSecret = try privateKey.sharedSecretFromKeyAgreement(with: peerKey)
        self.sharedSecret = sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )

        // Store credentials
        try KeychainHelper.save(peerKeyData, for: .peerPublicKey)
        try KeychainHelper.save(token, for: .authToken)
        try KeychainHelper.save(machineId, for: .machineId)

        // Update state
        machine = ConnectedMachine(
            id: machineId,
            name: "CLI",
            connectedAt: Date()
        )

        state = .authenticated
    }

    /// Validate the current authentication token with the server.
    func validateToken() async throws {
        guard let token = KeychainHelper.readString(.authToken) else {
            throw AuthError.noToken
        }

        // TODO: Call API to validate token
        // For now, assume valid if token exists
        state = .authenticated
    }

    /// Log out and clear all stored credentials.
    func logout() {
        try? KeychainHelper.deleteAll()
        privateKey = nil
        sharedSecret = nil
        account = nil
        machine = nil
        state = .unauthenticated
    }

    /// Get the shared encryption key for E2E communication.
    /// - Returns: The symmetric key for encryption.
    func getEncryptionKey() throws -> SymmetricKey {
        if let key = sharedSecret {
            return key
        }

        // Try to restore from Keychain
        guard let privateKeyData = KeychainHelper.read(.privateKey),
              let peerKeyData = KeychainHelper.read(.peerPublicKey) else {
            throw AuthError.noEncryptionKey
        }

        let privateKey = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: privateKeyData)
        let peerKey = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerKeyData)

        let sharedSecret = try privateKey.sharedSecretFromKeyAgreement(with: peerKey)
        let symmetricKey = sharedSecret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )

        self.sharedSecret = symmetricKey
        return symmetricKey
    }

    // MARK: - Private Methods

    private func loadStoredCredentials() {
        // Check if we have stored credentials
        guard KeychainHelper.exists(.authToken),
              KeychainHelper.exists(.privateKey),
              KeychainHelper.exists(.peerPublicKey) else {
            state = .unauthenticated
            return
        }

        // Restore private key
        if let privateKeyData = KeychainHelper.read(.privateKey) {
            privateKey = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: privateKeyData)
        }

        // Restore machine info
        if let machineId = KeychainHelper.readString(.machineId) {
            machine = ConnectedMachine(
                id: machineId,
                name: "CLI",
                connectedAt: Date() // We don't store this, so use now
            )
        }

        state = .authenticated
    }
}

// MARK: - Supporting Types

/// Authentication state machine.
enum AuthState: Equatable {
    case unauthenticated
    case awaitingPairing
    case authenticated
    case error(String)
}

/// Data encoded in the QR code for pairing.
struct PairingData: Codable {
    let publicKey: String
    let deviceName: String
    let platform: String
    let appVersion: String

    /// Generate the QR code string.
    var qrCodeString: String {
        guard let data = try? JSONEncoder().encode(self),
              let string = String(data: data, encoding: .utf8) else {
            return ""
        }
        return string
    }
}

/// Represents an authenticated account.
struct AuthenticatedAccount: Identifiable, Codable {
    let id: String
    let email: String?
    let name: String?
    let createdAt: Date
}

/// Represents a connected CLI machine.
struct ConnectedMachine: Identifiable {
    let id: String
    let name: String
    let connectedAt: Date
}

// MARK: - Errors

/// Errors that can occur during authentication.
enum AuthError: LocalizedError {
    case noPrivateKey
    case noToken
    case invalidPublicKey
    case noEncryptionKey
    case pairingFailed(String)
    case tokenValidationFailed

    var errorDescription: String? {
        switch self {
        case .noPrivateKey:
            return "No private key available. Please start pairing again."
        case .noToken:
            return "No authentication token found. Please pair with CLI."
        case .invalidPublicKey:
            return "Invalid public key received from CLI."
        case .noEncryptionKey:
            return "No encryption key available. Please re-pair."
        case .pairingFailed(let reason):
            return "Pairing failed: \(reason)"
        case .tokenValidationFailed:
            return "Failed to validate authentication token."
        }
    }
}
