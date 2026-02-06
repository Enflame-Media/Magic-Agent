//
//  AuthenticationViewModelTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
import CryptoKit
@testable import Happy

@MainActor
final class AuthenticationViewModelTests: XCTestCase {

    override func tearDownWithError() throws {
        try? KeychainHelper.deleteAll()
    }

    // MARK: - Initial State

    func testInitialStateIsUnauthenticated() {
        try? KeychainHelper.deleteAll()
        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)

        XCTAssertEqual(viewModel.authState, .unauthenticated)
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertFalse(viewModel.isPairing)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    // MARK: - Check Existing Auth

    func testCheckExistingAuthWithNoCredentials() async {
        try? KeychainHelper.deleteAll()
        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)

        await viewModel.checkExistingAuth()

        XCTAssertEqual(viewModel.authState, .unauthenticated)
        XCTAssertFalse(viewModel.isAuthenticated)
    }

    func testCheckExistingAuthWithStoredCredentials() async throws {
        try KeychainHelper.deleteAll()

        // Set up valid credentials
        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(privateKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)
        try KeychainHelper.save("account-123", for: .accountId)
        try KeychainHelper.save("machine-456", for: .machineId)
        try KeychainHelper.save("https://api.example.com", for: .serverUrl)

        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)

        // The AuthService loads stored credentials on init, setting state to .authenticated
        XCTAssertTrue(viewModel.isAuthenticated)
        XCTAssertEqual(viewModel.authState, .authenticated)
    }

    // MARK: - Logout

    func testLogoutClearsState() throws {
        try KeychainHelper.deleteAll()

        // Set up authenticated state
        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(privateKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)

        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)
        XCTAssertTrue(viewModel.isAuthenticated)

        viewModel.logout()

        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertEqual(viewModel.authState, .unauthenticated)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    // MARK: - Error Handling

    func testDismissErrorClearsState() {
        try? KeychainHelper.deleteAll()
        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)

        viewModel.errorMessage = "Test error"
        viewModel.showError = true

        viewModel.dismissError()

        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    // MARK: - Machine and Server Info

    func testMachineNameAndServerUrl() throws {
        try KeychainHelper.deleteAll()

        let privateKey = Curve25519.KeyAgreement.PrivateKey()
        try KeychainHelper.save(privateKey.rawRepresentation, for: .privateKey)
        try KeychainHelper.save(privateKey.publicKey.rawRepresentation, for: .peerPublicKey)
        try KeychainHelper.save("test-token", for: .authToken)
        try KeychainHelper.save("machine-123", for: .machineId)
        try KeychainHelper.save("https://api.example.com", for: .serverUrl)

        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)

        XCTAssertEqual(viewModel.machineName, "CLI")
        XCTAssertEqual(viewModel.connectedServerUrl, "https://api.example.com")
    }

    func testMachineNameNilWhenNoMachine() {
        try? KeychainHelper.deleteAll()
        let authService = AuthService()
        let viewModel = AuthenticationViewModel(authService: authService)

        XCTAssertNil(viewModel.machineName)
        XCTAssertNil(viewModel.connectedServerUrl)
    }
}
