//
//  QRScannerViewModelTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

// MARK: - Mock Camera Permission Service

/// Mock camera permission service for testing QRScannerViewModel without hardware.
private final class MockCameraPermission: CameraPermissionProviding {
    var isAuthorized: Bool = false
    var isNotDetermined: Bool = true
    var isDenied: Bool = false
    var grantPermission: Bool = true

    @MainActor
    func requestPermission() async -> Bool {
        return grantPermission
    }
}

@MainActor
final class QRScannerViewModelTests: XCTestCase {

    // MARK: - Initial State

    func testInitialState() {
        let viewModel = QRScannerViewModel()

        XCTAssertEqual(viewModel.state, .checkingPermission)
        XCTAssertFalse(viewModel.isScanning)
        XCTAssertNil(viewModel.scannedPayload)
        XCTAssertFalse(viewModel.showPairingConfirmation)
        XCTAssertFalse(viewModel.isPairingComplete)
    }

    // MARK: - Camera Permission

    func testStartScanningWithAuthorizedPermission() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = true
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertTrue(viewModel.isScanning)
    }

    func testStartScanningWithGrantedPermission() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = false
        mockPermission.isNotDetermined = true
        mockPermission.grantPermission = true
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertTrue(viewModel.isScanning)
    }

    func testStartScanningWithDeniedPermission() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = false
        mockPermission.isNotDetermined = true
        mockPermission.grantPermission = false
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .permissionDenied)
        XCTAssertFalse(viewModel.isScanning)
    }

    func testStartScanningWithPreviouslyDeniedPermission() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = false
        mockPermission.isNotDetermined = false
        mockPermission.isDenied = true
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()

        XCTAssertEqual(viewModel.state, .permissionDenied)
    }

    // MARK: - Handle Scanned Code

    func testHandleValidQRCodeTransitionsToScanned() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = true
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()
        XCTAssertEqual(viewModel.state, .scanning)

        let json = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com"}
        """
        viewModel.handleScannedCode(json)

        XCTAssertNotNil(viewModel.scannedPayload)
        XCTAssertTrue(viewModel.showPairingConfirmation)
        XCTAssertFalse(viewModel.isScanning)

        if case .scanned(let payload) = viewModel.state {
            XCTAssertEqual(payload.serverUrl, "https://api.happy.example.com")
            XCTAssertEqual(payload.publicKey, "dGVzdHB1YmxpY2tleQ==")
        } else {
            XCTFail("Expected .scanned state")
        }
    }

    func testHandleCodeIgnoredWhenNotScanning() {
        let viewModel = QRScannerViewModel()

        let json = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com"}
        """
        // State is .checkingPermission, so code should be ignored
        viewModel.handleScannedCode(json)
        XCTAssertNil(viewModel.scannedPayload)
    }

    func testHandleInvalidQRCodeIsIgnored() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = true
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()

        viewModel.handleScannedCode("not a valid QR code")

        XCTAssertNil(viewModel.scannedPayload)
        XCTAssertFalse(viewModel.showPairingConfirmation)
        XCTAssertEqual(viewModel.state, .scanning) // Stays in scanning state
    }

    // MARK: - Reset Scanner

    func testResetScannerClearsPayload() {
        let viewModel = QRScannerViewModel()

        viewModel.resetScanner()

        XCTAssertNil(viewModel.scannedPayload)
        XCTAssertFalse(viewModel.showPairingConfirmation)
        XCTAssertFalse(viewModel.isPairingComplete)
        XCTAssertEqual(viewModel.state, .scanning)
        XCTAssertTrue(viewModel.isScanning)
    }

    func testResetScannerClearsPairingComplete() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = true
        let viewModel = QRScannerViewModel(cameraPermissionService: mockPermission)

        await viewModel.startScanning()
        // Scan a code
        let json = """
        {"publicKey":"dGVzdHB1YmxpY2tleQ==","serverUrl":"https://api.happy.example.com"}
        """
        viewModel.handleScannedCode(json)
        XCTAssertNotNil(viewModel.scannedPayload)

        // Reset
        viewModel.resetScanner()
        XCTAssertNil(viewModel.scannedPayload)
        XCTAssertFalse(viewModel.isPairingComplete)
        XCTAssertEqual(viewModel.state, .scanning)
    }

    // MARK: - Confirm Pairing Integration

    func testConfirmPairingTransitionsToPairingState() async {
        let mockPermission = MockCameraPermission()
        mockPermission.isAuthorized = true
        let authService = AuthService()
        let viewModel = QRScannerViewModel(
            cameraPermissionService: mockPermission,
            authService: authService
        )

        let payload = QRCodePayload(
            publicKey: "dGVzdA==",
            serverUrl: "https://invalid.server.example.com",
            machineId: "test-machine"
        )

        // Pairing will fail because the server is unreachable,
        // but we can verify state transitions
        await viewModel.confirmPairing(with: payload)

        // Should have transitioned to pairingFailed since the server is unreachable
        if case .pairingFailed(let message) = viewModel.state {
            XCTAssertFalse(message.isEmpty)
        } else {
            XCTFail("Expected .pairingFailed state, got \(viewModel.state)")
        }

        XCTAssertFalse(viewModel.isPairingComplete)
    }

    func testRetryPairingWithNoPayloadResetsScanner() async {
        let viewModel = QRScannerViewModel()

        // No scannedPayload set
        await viewModel.retryPairing()

        XCTAssertNil(viewModel.scannedPayload)
        XCTAssertEqual(viewModel.state, .scanning)
    }

    // MARK: - State Equatable

    func testScannerStateEquatable() {
        XCTAssertEqual(QRScannerState.checkingPermission, QRScannerState.checkingPermission)
        XCTAssertEqual(QRScannerState.scanning, QRScannerState.scanning)
        XCTAssertEqual(QRScannerState.permissionDenied, QRScannerState.permissionDenied)
        XCTAssertEqual(QRScannerState.requestingPermission, QRScannerState.requestingPermission)
        XCTAssertEqual(QRScannerState.paired, QRScannerState.paired)

        let payload = QRCodePayload(
            publicKey: "dGVzdA==",
            serverUrl: "https://example.com",
            machineId: nil
        )
        XCTAssertEqual(
            QRScannerState.scanned(payload),
            QRScannerState.scanned(payload)
        )
        XCTAssertEqual(
            QRScannerState.pairing(payload),
            QRScannerState.pairing(payload)
        )
        XCTAssertEqual(
            QRScannerState.error("test"),
            QRScannerState.error("test")
        )
        XCTAssertEqual(
            QRScannerState.pairingFailed("fail"),
            QRScannerState.pairingFailed("fail")
        )

        XCTAssertNotEqual(QRScannerState.scanning, QRScannerState.permissionDenied)
        XCTAssertNotEqual(QRScannerState.error("a"), QRScannerState.error("b"))
        XCTAssertNotEqual(QRScannerState.pairingFailed("a"), QRScannerState.pairingFailed("b"))
        XCTAssertNotEqual(QRScannerState.paired, QRScannerState.scanning)
    }

    // MARK: - New States

    func testPairingStateHoldsPayload() {
        let payload = QRCodePayload(
            publicKey: "dGVzdA==",
            serverUrl: "https://example.com",
            machineId: "machine-1"
        )

        let state = QRScannerState.pairing(payload)
        if case .pairing(let storedPayload) = state {
            XCTAssertEqual(storedPayload.serverUrl, "https://example.com")
            XCTAssertEqual(storedPayload.machineId, "machine-1")
        } else {
            XCTFail("Expected .pairing state")
        }
    }

    func testPairingFailedStateHoldsMessage() {
        let state = QRScannerState.pairingFailed("Network error")
        if case .pairingFailed(let message) = state {
            XCTAssertEqual(message, "Network error")
        } else {
            XCTFail("Expected .pairingFailed state")
        }
    }
}
