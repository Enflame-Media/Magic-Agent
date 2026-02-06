//
//  AuthService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import CryptoKit
import UIKit

// MARK: - Types

enum AuthState: Equatable {
    case unauthenticated
    case awaitingPairing
    case authenticating
    case authenticated
    case error(String)
}

struct ConnectedMachine: Identifiable, Equatable {
    let id: String
    let name: String
    let connectedAt: Date
}

struct AuthenticatedAccount: Identifiable, Codable, Equatable {
    let id: String
    let email: String?
    let name: String?
    let createdAt: Date
    var token: String?
}

struct ChallengeResponse: Codable {
    let challenge: String
    let machineId: String
    let token: String
}

struct ChallengeAnswer: Codable {
    let challengeResponse: String
    let publicKey: String
    let deviceName: String
    let platform: String
}

struct AuthResponse: Codable {
    let token: String
    let refreshToken: String?
    let accountId: String
    let machineId: String
}

// MARK: - Errors

enum AuthError: LocalizedError, Equatable {
    case noPrivateKey
    case noToken
    case invalidPublicKey
    case noEncryptionKey
    case pairingFailed(String)
    case tokenValidationFailed
    case challengeFailed(String)
    case networkError(String)
    case serverError(String)

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
        case .challengeFailed(let reason):
            return "Challenge-response failed: \(reason)"
        case .networkError(let reason):
            return "Network error: \(reason)"
        case .serverError(let reason):
            return "Server error: \(reason)"
        }
    }
}

// MARK: - AuthService

/// Service for authentication with the Happy server using challenge-response flow.
///
/// Uses `ObservableObject` for iOS 16 compatibility.
final class AuthService: ObservableObject {

    static let shared = AuthService()

    @Published private(set) var state: AuthState = .unauthenticated
    @Published private(set) var account: AuthenticatedAccount?
    @Published private(set) var machine: ConnectedMachine?
    @Published private(set) var serverUrl: String?

    private var privateKey: Curve25519.KeyAgreement.PrivateKey?
    private var sharedSecret: SymmetricKey?
    private let urlSession: URLSession

    init(urlSession: URLSession = .shared) {
        self.urlSession = urlSession
        loadStoredCredentials()
    }

    // MARK: - Keypair Generation

    func generateKeypair() throws -> String {
        let newPrivateKey = Curve25519.KeyAgreement.PrivateKey()
        self.privateKey = newPrivateKey

        try KeychainHelper.save(newPrivateKey.rawRepresentation, for: .privateKey)

        let publicKeyData = newPrivateKey.publicKey.rawRepresentation
        try KeychainHelper.save(publicKeyData, for: .publicKey)

        return publicKeyData.base64EncodedString()
    }

    // MARK: - Pairing Flow

    @MainActor
    func startPairing(with payload: QRCodePayload) async throws {
        state = .awaitingPairing
        serverUrl = payload.serverUrl

        try KeychainHelper.save(payload.serverUrl, for: .serverUrl)

        guard let peerKeyData = Data(base64Encoded: payload.publicKey) else {
            state = .error("Invalid public key from QR code")
            throw AuthError.invalidPublicKey
        }
        try KeychainHelper.save(peerKeyData, for: .peerPublicKey)

        let ourPublicKey: String
        do {
            ourPublicKey = try generateKeypair()
        } catch {
            state = .error("Failed to generate keypair")
            throw AuthError.pairingFailed("Keypair generation failed: \(error.localizedDescription)")
        }

        state = .authenticating

        do {
            let authResponse = try await performChallengeResponse(
                serverUrl: payload.serverUrl,
                peerPublicKey: payload.publicKey,
                ourPublicKey: ourPublicKey,
                machineId: payload.machineId
            )

            try deriveSharedSecret(peerPublicKeyBase64: payload.publicKey)

            try KeychainHelper.save(authResponse.token, for: .authToken)
            if let refreshToken = authResponse.refreshToken {
                try KeychainHelper.save(refreshToken, for: .refreshToken)
            }
            try KeychainHelper.save(authResponse.accountId, for: .accountId)
            try KeychainHelper.save(authResponse.machineId, for: .machineId)

            account = AuthenticatedAccount(
                id: authResponse.accountId, email: nil, name: nil,
                createdAt: Date(), token: authResponse.token
            )
            machine = ConnectedMachine(
                id: authResponse.machineId, name: "CLI", connectedAt: Date()
            )
            state = .authenticated
        } catch let error as AuthError {
            state = .error(error.localizedDescription)
            throw error
        } catch {
            let authError = AuthError.pairingFailed(error.localizedDescription)
            state = .error(authError.localizedDescription)
            throw authError
        }
    }

    // MARK: - Challenge-Response

    private func performChallengeResponse(
        serverUrl: String,
        peerPublicKey: String,
        ourPublicKey: String,
        machineId: String?
    ) async throws -> AuthResponse {
        // Step 1: Request challenge
        guard let pairURL = URL(string: "\(serverUrl)/v1/auth/pair") else {
            throw AuthError.networkError("Invalid server URL")
        }

        let deviceName = await UIDevice.current.name
        let pairBody: [String: Any] = [
            "publicKey": ourPublicKey,
            "peerPublicKey": peerPublicKey,
            "deviceName": deviceName,
            "platform": "ios",
            "machineId": machineId ?? ""
        ]

        var pairRequest = URLRequest(url: pairURL)
        pairRequest.httpMethod = "POST"
        pairRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        pairRequest.httpBody = try JSONSerialization.data(withJSONObject: pairBody)
        pairRequest.timeoutInterval = 30

        let (pairData, pairResponse) = try await urlSession.data(for: pairRequest)

        guard let httpResponse = pairResponse as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let body = String(data: pairData, encoding: .utf8) ?? "Unknown error"
            throw AuthError.serverError("Pairing request failed: \(body)")
        }

        let challengeResponse = try JSONDecoder().decode(ChallengeResponse.self, from: pairData)

        // Step 2: Sign challenge
        let signedChallenge = try signChallenge(challengeResponse.challenge)

        // Step 3: Verify with server
        guard let verifyURL = URL(string: "\(serverUrl)/v1/auth/verify") else {
            throw AuthError.networkError("Invalid verify URL")
        }

        let answer = ChallengeAnswer(
            challengeResponse: signedChallenge,
            publicKey: ourPublicKey,
            deviceName: deviceName,
            platform: "ios"
        )

        var verifyRequest = URLRequest(url: verifyURL)
        verifyRequest.httpMethod = "POST"
        verifyRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        verifyRequest.httpBody = try JSONEncoder().encode(answer)
        verifyRequest.timeoutInterval = 30

        let (verifyData, verifyResponse) = try await urlSession.data(for: verifyRequest)

        guard let verifyHttpResponse = verifyResponse as? HTTPURLResponse,
              (200...299).contains(verifyHttpResponse.statusCode) else {
            let body = String(data: verifyData, encoding: .utf8) ?? "Unknown error"
            throw AuthError.challengeFailed("Verification failed: \(body)")
        }

        return try JSONDecoder().decode(AuthResponse.self, from: verifyData)
    }

    private func signChallenge(_ challenge: String) throws -> String {
        guard let privateKey = privateKey else {
            throw AuthError.noPrivateKey
        }

        guard let challengeData = Data(base64Encoded: challenge) else {
            throw AuthError.challengeFailed("Invalid challenge encoding")
        }

        let signingKey = SymmetricKey(data: privateKey.rawRepresentation)
        let signature = HMAC<SHA256>.authenticationCode(for: challengeData, using: signingKey)

        return Data(signature).base64EncodedString()
    }

    // MARK: - Key Derivation

    private func deriveSharedSecret(peerPublicKeyBase64: String) throws {
        guard let privateKey = privateKey else { throw AuthError.noPrivateKey }
        guard let peerKeyData = Data(base64Encoded: peerPublicKeyBase64) else {
            throw AuthError.invalidPublicKey
        }

        let peerKey = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerKeyData)
        let secret = try privateKey.sharedSecretFromKeyAgreement(with: peerKey)

        self.sharedSecret = secret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )
    }

    // MARK: - Token Validation

    @MainActor
    func validateToken() async throws {
        guard let token = KeychainHelper.readString(.authToken) else {
            throw AuthError.noToken
        }

        guard let serverUrl = KeychainHelper.readString(.serverUrl),
              let url = URL(string: "\(serverUrl)/v1/auth/validate") else {
            if hasStoredCredentials() { state = .authenticated; return }
            throw AuthError.noToken
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 15

        do {
            let (_, response) = try await urlSession.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw AuthError.networkError("Invalid response")
            }

            if (200...299).contains(httpResponse.statusCode) {
                state = .authenticated
            } else if httpResponse.statusCode == 401 {
                try await refreshTokenIfNeeded()
            } else if hasStoredCredentials() {
                state = .authenticated
            } else {
                throw AuthError.tokenValidationFailed
            }
        } catch let error as AuthError {
            throw error
        } catch {
            if hasStoredCredentials() { state = .authenticated }
            else { throw AuthError.networkError(error.localizedDescription) }
        }
    }

    @MainActor
    private func refreshTokenIfNeeded() async throws {
        guard let refreshToken = KeychainHelper.readString(.refreshToken),
              let serverUrl = KeychainHelper.readString(.serverUrl),
              let url = URL(string: "\(serverUrl)/v1/auth/refresh") else {
            state = .unauthenticated
            throw AuthError.tokenValidationFailed
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["refreshToken": refreshToken])

        let (data, response) = try await urlSession.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            state = .unauthenticated
            throw AuthError.tokenValidationFailed
        }

        struct RefreshResponse: Codable {
            let token: String
            let refreshToken: String?
        }

        let refreshResponse = try JSONDecoder().decode(RefreshResponse.self, from: data)
        try KeychainHelper.save(refreshResponse.token, for: .authToken)
        if let newRefreshToken = refreshResponse.refreshToken {
            try KeychainHelper.save(newRefreshToken, for: .refreshToken)
        }
        state = .authenticated
    }

    // MARK: - Encryption Key Access

    func getEncryptionKey() throws -> SymmetricKey {
        if let key = sharedSecret { return key }

        guard let privateKeyData = KeychainHelper.read(.privateKey),
              let peerKeyData = KeychainHelper.read(.peerPublicKey) else {
            throw AuthError.noEncryptionKey
        }

        let restoredKey = try Curve25519.KeyAgreement.PrivateKey(rawRepresentation: privateKeyData)
        let peerKey = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: peerKeyData)
        let secret = try restoredKey.sharedSecretFromKeyAgreement(with: peerKey)

        let symmetricKey = secret.hkdfDerivedSymmetricKey(
            using: SHA256.self,
            salt: Data(),
            sharedInfo: "happy-encryption".data(using: .utf8)!,
            outputByteCount: 32
        )

        self.privateKey = restoredKey
        self.sharedSecret = symmetricKey
        return symmetricKey
    }

    func getAuthToken() -> String? {
        KeychainHelper.readString(.authToken)
    }

    // MARK: - Logout

    @MainActor
    func logout() {
        try? KeychainHelper.deleteAll()
        privateKey = nil
        sharedSecret = nil
        account = nil
        machine = nil
        serverUrl = nil
        state = .unauthenticated
    }

    // MARK: - State Queries

    var isAuthenticated: Bool { state == .authenticated }

    func hasStoredCredentials() -> Bool {
        KeychainHelper.exists(.authToken) &&
        KeychainHelper.exists(.privateKey) &&
        KeychainHelper.exists(.peerPublicKey)
    }

    // MARK: - Private

    private func loadStoredCredentials() {
        guard hasStoredCredentials() else { state = .unauthenticated; return }

        if let privateKeyData = KeychainHelper.read(.privateKey) {
            privateKey = try? Curve25519.KeyAgreement.PrivateKey(rawRepresentation: privateKeyData)
        }

        serverUrl = KeychainHelper.readString(.serverUrl)

        if let machineId = KeychainHelper.readString(.machineId) {
            machine = ConnectedMachine(id: machineId, name: "CLI", connectedAt: Date())
        }

        if let accountId = KeychainHelper.readString(.accountId) {
            account = AuthenticatedAccount(
                id: accountId, email: nil, name: nil,
                createdAt: Date(), token: KeychainHelper.readString(.authToken)
            )
        }

        state = .authenticated
    }
}
