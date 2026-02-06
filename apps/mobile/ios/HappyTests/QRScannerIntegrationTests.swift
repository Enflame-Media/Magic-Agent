//
//  QRScannerIntegrationTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
import CryptoKit
@testable import Happy

// MARK: - Mock Camera Permission Service

/// Mock implementation of `CameraPermissionProviding` for testing.
///
/// Allows tests to control camera permission state without
/// requiring actual camera hardware or system prompts.
final class MockCameraPermissionService: CameraPermissionProviding {
    var isAuthorized: Bool = false
    var isNotDetermined: Bool = true
    var isDenied: Bool = false

    /// The result to return from `requestPermission()`.
    var grantPermission: Bool = true

    /// Tracks whether permission was requested.
    private(set) var requestPermissionCallCount: Int = 0

    @MainActor
    func requestPermission() async -> Bool {
        requestPermissionCallCount += 1
        return grantPermission
    }
}

// MARK: - Mock URL Protocol

/// Intercepts network requests in `URLSession` for testing.
///
/// Allows tests to return canned HTTP responses without making
/// real network calls, enabling deterministic auth flow testing.
final class MockURLProtocol: URLProtocol {

    /// Map of URL path to handler returning (response data, HTTP status code).
    nonisolated(unsafe) static var requestHandlers: [String: (URLRequest) throws -> (Data, Int)] = [:]

    /// Captured requests for verification.
    nonisolated(unsafe) static var capturedRequests: [URLRequest] = []

    /// Resets all handlers and captured state.
    static func reset() {
        requestHandlers = [:]
        capturedRequests = []
    }

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        MockURLProtocol.capturedRequests.append(request)

        guard let url = request.url,
              let handler = MockURLProtocol.requestHandlers[url.path] else {
            let error = NSError(domain: "MockURLProtocol", code: -1,
                                userInfo: [NSLocalizedDescriptionKey: "No handler for \(request.url?.path ?? "nil")"])
            client?.urlProtocol(self, didFailWithError: error)
            return
        }

        do {
            let (data, statusCode) = try handler(request)
            let response = HTTPURLResponse(
                url: url,
                statusCode: statusCode,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "application/json"]
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

// MARK: - QR Scanner Integration Tests

/// Integration tests verifying the full QR scan -> parse -> validate -> pairing flow.
///
/// These tests exercise the interaction between `QRScannerViewModel`,
/// `QRCodePayload`, `CameraPermissionService`, `AuthService`, and
/// `AuthenticationViewModel` as an integrated system, using mock
/// services for network and camera hardware dependencies.
@MainActor
final class QRScannerIntegrationTests: XCTestCase {

    private var mockCameraService: MockCameraPermissionService!
    private var mockSession: URLSession!

    override func setUp() {
        super.setUp()
        mockCameraService = MockCameraPermissionService()

        // Configure a URLSession that uses our mock protocol
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        mockSession = URLSession(configuration: config)

        MockURLProtocol.reset()
        try? KeychainHelper.deleteAll()
    }

    override func tearDown() {
        MockURLProtocol.reset()
        try? KeychainHelper.deleteAll()
        mockCameraService = nil
        mockSession = nil
        super.tearDown()
    }

    // MARK: - Helpers

    /// Creates a `QRScannerViewModel` with mock dependencies.
    private func makeScannerViewModel(authService: AuthService? = nil) -> QRScannerViewModel {
        let auth = authService ?? AuthService(urlSession: mockSession)
        return QRScannerViewModel(
            cameraPermissionService: mockCameraService,
            authService: auth
        )
    }

    /// Creates a valid QR JSON string using a real Curve25519 keypair.
    private func makeValidQRJSON(
        serverUrl: String = "https://api.happy.example.com",
        machineId: String? = "MacBook-Pro-2024"
    ) -> (json: String, peerKey: Curve25519.KeyAgreement.PrivateKey) {
        let peerKey = Curve25519.KeyAgreement.PrivateKey()
        let publicKeyBase64 = peerKey.publicKey.rawRepresentation.base64EncodedString()
        var json: String
        if let machineId = machineId {
            json = """
            {"publicKey":"\(publicKeyBase64)","serverUrl":"\(serverUrl)","machineId":"\(machineId)"}
            """
        } else {
            json = """
            {"publicKey":"\(publicKeyBase64)","serverUrl":"\(serverUrl)"}
            """
        }
        return (json, peerKey)
    }

    /// Sets up mock network handlers that simulate a successful auth flow.
    private func setupSuccessfulAuthHandlers() {
        MockURLProtocol.requestHandlers["/v1/auth/pair"] = { _ in
            let challenge = ChallengeResponse(
                challenge: Data("test-challenge-data".utf8).base64EncodedString(),
                machineId: "machine-123",
                token: "temp-token"
            )
            let data = try! JSONEncoder().encode(challenge)
            return (data, 200)
        }

        MockURLProtocol.requestHandlers["/v1/auth/verify"] = { _ in
            let authResponse = AuthResponse(
                token: "auth-token-abc123",
                refreshToken: "refresh-token-xyz789",
                accountId: "account-456",
                machineId: "machine-123"
            )
            let data = try! JSONEncoder().encode(authResponse)
            return (data, 200)
        }
    }

    // MARK: - Full Scan -> Parse -> Validate -> Confirm Pairing Flow

    /// Tests the complete happy path: camera granted -> scan QR -> parse payload ->
    /// show confirmation -> confirm pairing -> paired state.
    func testFullScanToPairingFlowSuccess() async throws {
        // Step 1: Start scanning with camera permission granted
        mockCameraService.isAuthorized = false
        mockCameraService.isNotDetermined = true
        mockCameraService.grantPermission = true

        setupSuccessfulAuthHandlers()

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .scanning,
                       "Scanner should be in scanning state after permission granted")
        XCTAssertTrue(viewModel.isScanning)
        XCTAssertEqual(mockCameraService.requestPermissionCallCount, 1)

        // Step 2: Simulate scanning a valid QR code
        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        // Step 3: Verify payload was parsed and state transitions occurred
        XCTAssertNotNil(viewModel.scannedPayload)
        XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://api.happy.example.com")
        XCTAssertEqual(viewModel.scannedPayload?.machineId, "MacBook-Pro-2024")
        XCTAssertFalse(viewModel.isScanning, "Scanning should stop after valid scan")
        XCTAssertTrue(viewModel.showPairingConfirmation, "Should show pairing confirmation")

        guard case .scanned(let payload) = viewModel.state else {
            XCTFail("Expected .scanned state, got \(viewModel.state)")
            return
        }
        XCTAssertEqual(payload.serverUrl, "https://api.happy.example.com")

        // Step 4: Confirm pairing via the ViewModel (which calls AuthService internally)
        await viewModel.confirmPairing(with: payload)

        // Step 5: Verify final state
        XCTAssertEqual(viewModel.state, .paired, "Should be in paired state")
        XCTAssertTrue(viewModel.isPairingComplete, "Pairing should be marked complete")
        XCTAssertFalse(viewModel.showPairingConfirmation, "Confirmation sheet should dismiss")
    }

    /// Tests the flow where scanning and pairing happen end-to-end with a real keypair.
    func testScanAndPairEndToEnd() async throws {
        mockCameraService.isAuthorized = true
        setupSuccessfulAuthHandlers()

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()
        XCTAssertEqual(viewModel.state, .scanning)

        let (json, _) = makeValidQRJSON(machineId: nil)
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected a scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)

        XCTAssertEqual(viewModel.state, .paired)
        XCTAssertTrue(viewModel.isPairingComplete)
    }

    // MARK: - Camera Permission Integration

    /// Tests that the scanner correctly handles pre-authorized camera state.
    func testScannerWithPreAuthorizedCamera() async {
        mockCameraService.isAuthorized = true
        mockCameraService.isNotDetermined = false

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertTrue(viewModel.isScanning)
        XCTAssertEqual(mockCameraService.requestPermissionCallCount, 0,
                       "Should not request permission when already authorized")
    }

    /// Tests the flow when camera permission is denied during scanning.
    func testScannerWithCameraPermissionDenied() async {
        mockCameraService.isAuthorized = false
        mockCameraService.isNotDetermined = true
        mockCameraService.grantPermission = false

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .permissionDenied)
        XCTAssertFalse(viewModel.isScanning)
        XCTAssertEqual(mockCameraService.requestPermissionCallCount, 1)
    }

    /// Tests the flow when camera permission was previously denied.
    func testScannerWithPreviouslyDeniedPermission() async {
        mockCameraService.isAuthorized = false
        mockCameraService.isNotDetermined = false
        mockCameraService.isDenied = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .permissionDenied)
        XCTAssertFalse(viewModel.isScanning)
        XCTAssertEqual(mockCameraService.requestPermissionCallCount, 0,
                       "Should not re-request when previously denied")
    }

    /// Tests that granting permission transitions through requesting -> scanning.
    func testPermissionRequestStateTransition() async {
        mockCameraService.isAuthorized = false
        mockCameraService.isNotDetermined = true
        mockCameraService.grantPermission = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertTrue(viewModel.isScanning)
        XCTAssertEqual(mockCameraService.requestPermissionCallCount, 1)
    }

    // MARK: - Error Handling: Invalid QR Codes

    /// Tests that invalid QR codes are silently ignored without state changes.
    func testInvalidQRCodeDuringScanning() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()
        XCTAssertEqual(viewModel.state, .scanning)

        let invalidCodes = [
            "not json at all",
            "{}",
            "{\"publicKey\":\"\",\"serverUrl\":\"https://example.com\"}",
            "{\"serverUrl\":\"https://example.com\"}",
            "{\"publicKey\":\"not-base64!!!\",\"serverUrl\":\"https://example.com\"}",
            "https://random-website.com",
            "<html>not a qr code</html>",
        ]

        for invalidCode in invalidCodes {
            viewModel.handleScannedCode(invalidCode)

            XCTAssertEqual(viewModel.state, .scanning,
                           "Scanner should remain in scanning state for invalid code: \(invalidCode)")
            XCTAssertNil(viewModel.scannedPayload,
                         "No payload should be set for invalid code: \(invalidCode)")
            XCTAssertFalse(viewModel.showPairingConfirmation,
                           "Confirmation should not show for invalid code: \(invalidCode)")
        }
    }

    /// Tests that scanning is ignored when not in .scanning state.
    func testScanIgnoredWhenNotInScanningState() async {
        let viewModel = makeScannerViewModel()

        // State is .checkingPermission initially
        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        XCTAssertNil(viewModel.scannedPayload,
                     "Should ignore valid QR code when not scanning")
        XCTAssertEqual(viewModel.state, .checkingPermission)
    }

    /// Tests that a second scan is ignored after a successful scan (prevents double-processing).
    func testDuplicateScanPrevention() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let json1 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://server1.example.com"}
        """
        viewModel.handleScannedCode(json1)
        XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://server1.example.com")

        // Try scanning a second code while in .scanned state
        let json2 = """
        {"publicKey":"ZGlmZmVyZW50a2V5","serverUrl":"https://server2.example.com"}
        """
        viewModel.handleScannedCode(json2)

        XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://server1.example.com",
                       "Payload should not change after second scan in non-scanning state")
    }

    // MARK: - Error Handling: Network Failures

    /// Tests that network errors during pairing are surfaced through scanner state.
    func testPairingNetworkFailure() async throws {
        mockCameraService.isAuthorized = true

        // Set up mock to simulate network failure
        MockURLProtocol.requestHandlers["/v1/auth/pair"] = { _ in
            throw NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet,
                          userInfo: [NSLocalizedDescriptionKey: "No internet connection"])
        }

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)

        // Verify failure state
        guard case .pairingFailed = viewModel.state else {
            XCTFail("Expected .pairingFailed state, got \(viewModel.state)")
            return
        }
        XCTAssertFalse(viewModel.isPairingComplete, "Should not be complete on failure")
    }

    /// Tests that server errors (5xx) during pairing are properly handled.
    func testPairingServerError() async throws {
        mockCameraService.isAuthorized = true

        MockURLProtocol.requestHandlers["/v1/auth/pair"] = { _ in
            let body = try! JSONSerialization.data(withJSONObject: ["error": "Internal server error"])
            return (body, 500)
        }

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)

        guard case .pairingFailed = viewModel.state else {
            XCTFail("Expected .pairingFailed state, got \(viewModel.state)")
            return
        }
        XCTAssertFalse(viewModel.isPairingComplete)
    }

    /// Tests that a 401 response during challenge verification is handled.
    func testPairingChallengeVerificationFailure() async throws {
        mockCameraService.isAuthorized = true

        // Pair request succeeds, but verify fails
        MockURLProtocol.requestHandlers["/v1/auth/pair"] = { _ in
            let challenge = ChallengeResponse(
                challenge: Data("test-challenge".utf8).base64EncodedString(),
                machineId: "machine-1",
                token: "temp-token"
            )
            let data = try! JSONEncoder().encode(challenge)
            return (data, 200)
        }

        MockURLProtocol.requestHandlers["/v1/auth/verify"] = { _ in
            let body = try! JSONSerialization.data(withJSONObject: ["error": "Challenge verification failed"])
            return (body, 401)
        }

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)

        guard case .pairingFailed = viewModel.state else {
            XCTFail("Expected .pairingFailed state, got \(viewModel.state)")
            return
        }
        XCTAssertFalse(viewModel.isPairingComplete)
    }

    // MARK: - Error Handling: Auth Failures

    /// Tests that an invalid public key in the QR payload causes a pairing failure.
    func testPairingWithInvalidPublicKey() async throws {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        // Use a valid base64 string but invalid Curve25519 key (wrong size)
        let invalidPayload = QRCodePayload(
            publicKey: "aW52YWxpZC1rZXk=", // "invalid-key" in base64, not 32 bytes
            serverUrl: "https://api.happy.example.com",
            machineId: nil
        )

        await viewModel.confirmPairing(with: invalidPayload)

        guard case .pairingFailed = viewModel.state else {
            XCTFail("Expected .pairingFailed state, got \(viewModel.state)")
            return
        }
        XCTAssertFalse(viewModel.isPairingComplete)
    }

    /// Tests error state through AuthenticationViewModel after a failed pairing attempt.
    func testAuthenticationViewModelErrorHandling() async throws {
        let authService = AuthService(urlSession: mockSession)
        let authViewModel = AuthenticationViewModel(authService: authService)

        // Create a payload that will fail during pairing
        let payload = QRCodePayload(
            publicKey: "aW52YWxpZA==",
            serverUrl: "https://api.happy.example.com",
            machineId: nil
        )

        await authViewModel.startPairing(with: payload)

        XCTAssertTrue(authViewModel.showError)
        XCTAssertNotNil(authViewModel.errorMessage)
        XCTAssertFalse(authViewModel.isAuthenticated)

        // Dismiss the error
        authViewModel.dismissError()

        XCTAssertFalse(authViewModel.showError)
        XCTAssertNil(authViewModel.errorMessage)
    }

    // MARK: - State Transitions Through Complete Flow

    /// Tests that QRScannerViewModel transitions through all expected states during
    /// a successful scan-to-pairing flow.
    func testScannerStateTransitionsDuringSuccessfulPairing() async throws {
        mockCameraService.isAuthorized = false
        mockCameraService.isNotDetermined = true
        mockCameraService.grantPermission = true
        setupSuccessfulAuthHandlers()

        let viewModel = makeScannerViewModel()

        // State 1: checkingPermission (initial)
        XCTAssertEqual(viewModel.state, .checkingPermission)

        // State 2 -> 3: requestingPermission -> scanning
        await viewModel.startScanning()
        XCTAssertEqual(viewModel.state, .scanning)

        // State 4: scanned
        let (json, _) = makeValidQRJSON(machineId: "test-machine")
        viewModel.handleScannedCode(json)

        guard case .scanned(let payload) = viewModel.state else {
            XCTFail("Expected .scanned state")
            return
        }

        // State 5: pairing -> paired
        await viewModel.confirmPairing(with: payload)
        XCTAssertEqual(viewModel.state, .paired)
        XCTAssertTrue(viewModel.isPairingComplete)
    }

    /// Tests state transitions during a failed pairing.
    func testScannerStateTransitionsDuringFailedPairing() async throws {
        mockCameraService.isAuthorized = true

        MockURLProtocol.requestHandlers["/v1/auth/pair"] = { _ in
            throw NSError(domain: NSURLErrorDomain, code: NSURLErrorTimedOut,
                          userInfo: [NSLocalizedDescriptionKey: "Request timed out"])
        }

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()
        XCTAssertEqual(viewModel.state, .scanning)

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard case .scanned(let payload) = viewModel.state else {
            XCTFail("Expected .scanned state")
            return
        }

        // Confirm pairing should transition to .pairing then .pairingFailed
        await viewModel.confirmPairing(with: payload)

        guard case .pairingFailed(let message) = viewModel.state else {
            XCTFail("Expected .pairingFailed state, got \(viewModel.state)")
            return
        }
        XCTAssertFalse(message.isEmpty, "Error message should not be empty")
        XCTAssertFalse(viewModel.isPairingComplete)
    }

    /// Tests AuthenticationViewModel state transitions during successful pairing.
    func testAuthViewModelStateTransitions() async throws {
        let peerKey = Curve25519.KeyAgreement.PrivateKey()
        let peerPublicKeyBase64 = peerKey.publicKey.rawRepresentation.base64EncodedString()
        let payload = QRCodePayload(
            publicKey: peerPublicKeyBase64,
            serverUrl: "https://api.happy.example.com",
            machineId: "test-machine"
        )

        setupSuccessfulAuthHandlers()

        let authService = AuthService(urlSession: mockSession)
        let authViewModel = AuthenticationViewModel(authService: authService)

        // Initial state
        XCTAssertEqual(authViewModel.authState, .unauthenticated)
        XCTAssertFalse(authViewModel.isPairing)
        XCTAssertFalse(authViewModel.isAuthenticated)

        await authViewModel.startPairing(with: payload)

        // Final state
        XCTAssertEqual(authViewModel.authState, .authenticated)
        XCTAssertTrue(authViewModel.isAuthenticated)
        XCTAssertFalse(authViewModel.isPairing, "isPairing should be false after completion")
        XCTAssertNil(authViewModel.errorMessage)
        XCTAssertFalse(authViewModel.showError)
    }

    // MARK: - Navigation Flow Verification

    /// Tests the scanner reset flow for scanning again after dismissing confirmation.
    func testResetScannerResumesScanning() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let json = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com"}
        """
        viewModel.handleScannedCode(json)

        XCTAssertTrue(viewModel.showPairingConfirmation)
        XCTAssertNotNil(viewModel.scannedPayload)
        XCTAssertFalse(viewModel.isScanning)

        // User dismisses the confirmation sheet (reset scanner)
        viewModel.resetScanner()

        XCTAssertNil(viewModel.scannedPayload, "Payload should be cleared")
        XCTAssertFalse(viewModel.showPairingConfirmation, "Confirmation flag should be cleared")
        XCTAssertFalse(viewModel.isPairingComplete, "Pairing complete flag should be cleared")
        XCTAssertTrue(viewModel.isScanning, "Scanner should resume scanning")
        XCTAssertEqual(viewModel.state, .scanning, "State should return to scanning")
    }

    /// Tests that scanning a new code after reset works correctly.
    func testScanAfterResetSucceeds() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let json1 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://server1.example.com"}
        """
        viewModel.handleScannedCode(json1)
        XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://server1.example.com")

        viewModel.resetScanner()

        let json2 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://server2.example.com"}
        """
        viewModel.handleScannedCode(json2)

        XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://server2.example.com",
                       "Should accept new scan after reset")
        XCTAssertTrue(viewModel.showPairingConfirmation)
    }

    /// Tests multiple scan-reset cycles to verify scanner stability.
    func testMultipleScanResetCycles() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        for i in 1...5 {
            let json = """
            {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://server\(i).example.com"}
            """
            viewModel.handleScannedCode(json)
            XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://server\(i).example.com")
            XCTAssertTrue(viewModel.showPairingConfirmation)

            viewModel.resetScanner()
            XCTAssertEqual(viewModel.state, .scanning)
            XCTAssertNil(viewModel.scannedPayload)
        }
    }

    /// Tests retry after a failed pairing attempt.
    func testRetryPairingAfterFailure() async throws {
        mockCameraService.isAuthorized = true

        // First attempt fails
        MockURLProtocol.requestHandlers["/v1/auth/pair"] = { _ in
            throw NSError(domain: NSURLErrorDomain, code: NSURLErrorNotConnectedToInternet,
                          userInfo: [NSLocalizedDescriptionKey: "No internet"])
        }

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)

        guard case .pairingFailed = viewModel.state else {
            XCTFail("Expected .pairingFailed state")
            return
        }

        // Fix the network and retry
        setupSuccessfulAuthHandlers()
        await viewModel.retryPairing()

        XCTAssertEqual(viewModel.state, .paired)
        XCTAssertTrue(viewModel.isPairingComplete)
    }

    /// Tests that retryPairing resets scanner when no payload is stored.
    func testRetryPairingWithNoPayloadResetsScanner() async {
        let viewModel = makeScannerViewModel()
        // No payload scanned, retryPairing should fall back to resetScanner
        await viewModel.retryPairing()

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertTrue(viewModel.isScanning)
        XCTAssertNil(viewModel.scannedPayload)
    }

    /// Tests reset after a successful pairing clears all scanner state.
    func testResetAfterSuccessfulPairing() async throws {
        mockCameraService.isAuthorized = true
        setupSuccessfulAuthHandlers()

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)
        XCTAssertEqual(viewModel.state, .paired)

        // Reset should go back to scanning
        viewModel.resetScanner()

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertNil(viewModel.scannedPayload)
        XCTAssertFalse(viewModel.isPairingComplete)
        XCTAssertFalse(viewModel.showPairingConfirmation)
    }

    /// Tests logout after a successful pairing clears all auth state.
    func testLogoutAfterSuccessfulPairing() async throws {
        setupSuccessfulAuthHandlers()

        let authService = AuthService(urlSession: mockSession)
        let viewModel = QRScannerViewModel(
            cameraPermissionService: mockCameraService,
            authService: authService
        )
        let authViewModel = AuthenticationViewModel(authService: authService)

        mockCameraService.isAuthorized = true
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        // Pair via ViewModel
        await viewModel.confirmPairing(with: payload)
        XCTAssertEqual(viewModel.state, .paired)

        // Verify AuthService state through AuthenticationViewModel
        // Re-sync from authService state
        XCTAssertEqual(authService.state, .authenticated)

        // Logout
        authViewModel.logout()

        XCTAssertFalse(authViewModel.isAuthenticated)
        XCTAssertEqual(authViewModel.authState, .unauthenticated)
    }

    // MARK: - QR Payload Validation in Integration Context

    /// Tests that various QR payload formats are correctly handled through the full scanner flow.
    func testPayloadVariationsInScannerFlow() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        // Valid payload with all fields
        let json1 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com","machineId":"MacBook"}
        """
        viewModel.handleScannedCode(json1)
        XCTAssertEqual(viewModel.scannedPayload?.machineId, "MacBook")
        viewModel.resetScanner()

        // Valid payload without optional machineId
        let json2 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com"}
        """
        viewModel.handleScannedCode(json2)
        XCTAssertNil(viewModel.scannedPayload?.machineId)
        viewModel.resetScanner()

        // Valid payload with null machineId
        let json3 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com","machineId":null}
        """
        viewModel.handleScannedCode(json3)
        XCTAssertNil(viewModel.scannedPayload?.machineId)
    }

    /// Tests that the scanner correctly rejects payloads with empty server URL.
    func testEmptyServerUrlRejectedInFlow() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let json = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":""}
        """
        viewModel.handleScannedCode(json)

        XCTAssertEqual(viewModel.state, .scanning,
                       "Should remain scanning after invalid payload")
        XCTAssertNil(viewModel.scannedPayload)
    }

    /// Tests that the scanner correctly rejects payloads with empty public key.
    func testEmptyPublicKeyRejectedInFlow() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let json = """
        {"publicKey":"","serverUrl":"https://api.happy.example.com"}
        """
        viewModel.handleScannedCode(json)

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertNil(viewModel.scannedPayload)
    }

    // MARK: - Keychain Integration

    /// Tests that successful pairing stores credentials in the Keychain.
    func testPairingStoresCredentialsInKeychain() async throws {
        mockCameraService.isAuthorized = true
        setupSuccessfulAuthHandlers()

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, _) = makeValidQRJSON(machineId: "test-machine")
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)
        XCTAssertEqual(viewModel.state, .paired)

        // Verify Keychain contains auth data
        XCTAssertTrue(KeychainHelper.exists(.authToken), "Auth token should be stored")
        XCTAssertTrue(KeychainHelper.exists(.privateKey), "Private key should be stored")
        XCTAssertTrue(KeychainHelper.exists(.publicKey), "Public key should be stored")
        XCTAssertTrue(KeychainHelper.exists(.peerPublicKey), "Peer public key should be stored")
        XCTAssertTrue(KeychainHelper.exists(.machineId), "Machine ID should be stored")
        XCTAssertTrue(KeychainHelper.exists(.accountId), "Account ID should be stored")
        XCTAssertTrue(KeychainHelper.exists(.serverUrl), "Server URL should be stored")
    }

    /// Tests that failed pairing does not leave auth token in Keychain.
    func testFailedPairingDoesNotStoreAuthToken() async throws {
        try KeychainHelper.deleteAll()
        mockCameraService.isAuthorized = true

        let invalidPayload = QRCodePayload(
            publicKey: "aW52YWxpZA==", // Not a valid Curve25519 key
            serverUrl: "https://api.happy.example.com",
            machineId: nil
        )

        let viewModel = makeScannerViewModel()
        await viewModel.confirmPairing(with: invalidPayload)

        guard case .pairingFailed = viewModel.state else {
            XCTFail("Expected .pairingFailed state")
            return
        }

        // Auth token should not be stored since pairing failed
        XCTAssertFalse(KeychainHelper.exists(.authToken),
                       "Auth token should not be stored on failure")
    }

    // MARK: - Network Request Verification

    /// Tests that the pairing request includes correct headers and body.
    func testPairingRequestFormat() async throws {
        mockCameraService.isAuthorized = true
        setupSuccessfulAuthHandlers()

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        let (json, peerKey) = makeValidQRJSON(machineId: "test-machine")
        let peerPublicKeyBase64 = peerKey.publicKey.rawRepresentation.base64EncodedString()
        viewModel.handleScannedCode(json)

        guard let payload = viewModel.scannedPayload else {
            XCTFail("Expected scanned payload")
            return
        }

        await viewModel.confirmPairing(with: payload)

        // Verify the pair request was made
        let pairRequests = MockURLProtocol.capturedRequests.filter {
            $0.url?.path == "/v1/auth/pair"
        }
        XCTAssertEqual(pairRequests.count, 1, "Should make exactly one pair request")

        if let pairRequest = pairRequests.first {
            XCTAssertEqual(pairRequest.httpMethod, "POST")
            XCTAssertEqual(pairRequest.value(forHTTPHeaderField: "Content-Type"), "application/json")

            if let bodyData = pairRequest.httpBody,
               let body = try? JSONSerialization.jsonObject(with: bodyData) as? [String: Any] {
                XCTAssertNotNil(body["publicKey"], "Body should contain our public key")
                XCTAssertEqual(body["peerPublicKey"] as? String, peerPublicKeyBase64)
                XCTAssertEqual(body["platform"] as? String, "ios")
                XCTAssertEqual(body["machineId"] as? String, "test-machine")
            } else {
                XCTFail("Failed to parse pair request body")
            }
        }

        // Verify the verify request was also made
        let verifyRequests = MockURLProtocol.capturedRequests.filter {
            $0.url?.path == "/v1/auth/verify"
        }
        XCTAssertEqual(verifyRequests.count, 1, "Should make exactly one verify request")

        if let verifyRequest = verifyRequests.first {
            XCTAssertEqual(verifyRequest.httpMethod, "POST")
            XCTAssertEqual(verifyRequest.value(forHTTPHeaderField: "Content-Type"), "application/json")
        }
    }

    // MARK: - Concurrent State Safety

    /// Tests that the scanner handles rapid sequential scans correctly.
    func testRapidSequentialScansOnlyProcessFirst() async {
        mockCameraService.isAuthorized = true

        let viewModel = makeScannerViewModel()
        await viewModel.startScanning()

        // Simulate rapid scanning of multiple codes
        let json1 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://first.example.com"}
        """
        let json2 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://second.example.com"}
        """
        let json3 = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://third.example.com"}
        """

        viewModel.handleScannedCode(json1)
        viewModel.handleScannedCode(json2)
        viewModel.handleScannedCode(json3)

        // Only the first should be processed since state transitions to .scanned
        XCTAssertEqual(viewModel.scannedPayload?.serverUrl, "https://first.example.com",
                       "Only the first scan should be processed")
    }
}
