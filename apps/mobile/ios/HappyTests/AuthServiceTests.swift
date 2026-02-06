//
//  AuthServiceTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
import CryptoKit
@testable import Happy

final class AuthServiceTests: XCTestCase {

    override func tearDownWithError() throws {
        try? KeychainHelper.deleteAll()
    }

    // MARK: - Initial State

    func testInitialStateIsUnauthenticated() {
        try? KeychainHelper.deleteAll()
        let service = AuthService()
        XCTAssertEqual(service.state, .unauthenticated)
        XCTAssertNil(service.account)
        XCTAssertNil(service.machine)
        XCTAssertFalse(service.isAuthenticated)
    }

    // MARK: - Keypair Generation

    func testGenerateKeypairReturnsBase64PublicKey() throws {
        try KeychainHelper.deleteAll()
        let service = AuthService()
        let publicKey = try service.generateKeypair()

        let keyData = Data(base64Encoded: publicKey)
        XCTAssertNotNil(keyData)
        XCTAssertEqual(keyData?.count, 32) // Curve25519 key size
    }

    func testGenerateKeypairStoresInKeychain() throws {
        try KeychainHelper.deleteAll()
        let service = AuthService()
        _ = try service.generateKeypair()

        XCTAssertTrue(KeychainHelper.exists(.privateKey))
        XCTAssertTrue(KeychainHelper.exists(.publicKey))
    }

    func testGenerateKeypairProducesDifferentKeys() throws {
        try KeychainHelper.deleteAll()
        let service = AuthService()
        let key1 = try service.generateKeypair()
        let key2 = try service.generateKeypair()
        XCTAssertNotEqual(key1, key2)
    }

    // MARK: - Stored Credentials

    func testHasStoredCredentialsFalseWhenEmpty() {
        try? KeychainHelper.deleteAll()
        let service = AuthService()
        XCTAssertFalse(service.hasStoredCredentials())
    }

    func testHasStoredCredentialsTrueWhenAllPresent() throws {
        try KeychainHelper.deleteAll()
        try KeychainHelper.save("test-token", for: .authToken)
        try KeychainHelper.save(Data(repeating: 0x42, count: 32), for: .privateKey)
        try KeychainHelper.save(Data(repeating: 0x43, count: 32), for: .peerPublicKey)

        let service = AuthService()
        XCTAssertTrue(service.hasStoredCredentials())
    }

    func testHasStoredCredentialsFalseWhenPartial() throws {
        try KeychainHelper.deleteAll()
        try KeychainHelper.save("test-token", for: .authToken)
        let service = AuthService()
        XCTAssertFalse(service.hasStoredCredentials())
    }

    // MARK: - Credential Loading

    func testLoadStoredCredentialsSetsAuthenticated() throws {
        try KeychainHelper.deleteAll()

        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(privateKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)
        try KeychainHelper.save("machine-123", for: .machineId)
        try KeychainHelper.save("account-456", for: .accountId)
        try KeychainHelper.save("https://api.example.com", for: .serverUrl)

        let service = AuthService()
        XCTAssertEqual(service.state, .authenticated)
        XCTAssertEqual(service.machine?.id, "machine-123")
        XCTAssertEqual(service.account?.id, "account-456")
        XCTAssertEqual(service.serverUrl, "https://api.example.com")
    }

    // MARK: - Encryption Key

    func testGetEncryptionKeyWithStoredKeys() throws {
        try KeychainHelper.deleteAll()

        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        let peerKey = Curve25519.KeyAgreement.PrivateKey()

        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(peerKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)

        let service = AuthService()
        let encryptionKey = try service.getEncryptionKey()

        // Verify key works for encryption round-trip
        let testData = "Hello, Happy!".data(using: .utf8)!
        let encrypted = try AES.GCM.seal(testData, using: encryptionKey)
        let decrypted = try AES.GCM.open(encrypted, using: encryptionKey)
        XCTAssertEqual(decrypted, testData)
    }

    func testGetEncryptionKeyThrowsWhenNoKeys() throws {
        try KeychainHelper.deleteAll()
        let service = AuthService()
        XCTAssertThrowsError(try service.getEncryptionKey()) { error in
            XCTAssertEqual(error as? AuthError, .noEncryptionKey)
        }
    }

    func testGetEncryptionKeyConsistentDerivation() throws {
        try KeychainHelper.deleteAll()

        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        let peerKey = Curve25519.KeyAgreement.PrivateKey()

        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(peerKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)

        let service1 = AuthService()
        let service2 = AuthService()
        let key1 = try service1.getEncryptionKey()
        let key2 = try service2.getEncryptionKey()

        let testData = "test".data(using: .utf8)!
        let sealed = try AES.GCM.seal(testData, using: key1)
        let decrypted = try AES.GCM.open(sealed, using: key2)
        XCTAssertEqual(decrypted, testData)
    }

    // MARK: - Logout

    @MainActor
    func testLogoutClearsAllState() throws {
        try KeychainHelper.deleteAll()

        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(privateKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)

        let service = AuthService()
        XCTAssertEqual(service.state, .authenticated)

        service.logout()

        XCTAssertEqual(service.state, .unauthenticated)
        XCTAssertNil(service.account)
        XCTAssertNil(service.machine)
        XCTAssertFalse(service.isAuthenticated)
        XCTAssertFalse(KeychainHelper.exists(.authToken))
        XCTAssertFalse(KeychainHelper.exists(.privateKey))
    }

    // MARK: - Auth Token

    func testGetAuthTokenReturnsStoredToken() throws {
        try KeychainHelper.deleteAll()
        try KeychainHelper.save("my-token-123", for: .authToken)
        try KeychainHelper.save(Data(repeating: 0x42, count: 32), for: .privateKey)
        try KeychainHelper.save(Data(repeating: 0x43, count: 32), for: .peerPublicKey)

        let service = AuthService()
        XCTAssertEqual(service.getAuthToken(), "my-token-123")
    }

    func testGetAuthTokenReturnsNilWhenNone() {
        try? KeychainHelper.deleteAll()
        let service = AuthService()
        XCTAssertNil(service.getAuthToken())
    }

    // MARK: - AuthState Equatable

    func testAuthStateEquatable() {
        XCTAssertEqual(AuthState.unauthenticated, AuthState.unauthenticated)
        XCTAssertEqual(AuthState.authenticated, AuthState.authenticated)
        XCTAssertEqual(AuthState.error("test"), AuthState.error("test"))
        XCTAssertNotEqual(AuthState.error("a"), AuthState.error("b"))
        XCTAssertNotEqual(AuthState.unauthenticated, AuthState.authenticated)
    }

    // MARK: - AuthError

    func testAuthErrorEquatable() {
        XCTAssertEqual(AuthError.noPrivateKey, AuthError.noPrivateKey)
        XCTAssertEqual(AuthError.noToken, AuthError.noToken)
        XCTAssertEqual(AuthError.pairingFailed("x"), AuthError.pairingFailed("x"))
        XCTAssertNotEqual(AuthError.pairingFailed("x"), AuthError.pairingFailed("y"))
    }

    func testAuthErrorDescriptions() {
        let errors: [AuthError] = [
            .noPrivateKey, .noToken, .invalidPublicKey, .noEncryptionKey,
            .pairingFailed("r"), .tokenValidationFailed, .challengeFailed("r"),
            .networkError("r"), .serverError("r")
        ]
        for error in errors {
            XCTAssertNotNil(error.errorDescription)
        }
    }
}
