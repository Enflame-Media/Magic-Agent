//
//  QRScannerViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// The possible states of the QR scanner.
enum QRScannerState: Equatable {
    /// Initial state, checking camera permission.
    case checkingPermission

    /// Camera permission has not been determined yet.
    case requestingPermission

    /// Camera is active and scanning for QR codes.
    case scanning

    /// A QR code was successfully scanned and parsed.
    case scanned(QRCodePayload)

    /// Pairing is in progress with the server.
    case pairing(QRCodePayload)

    /// Pairing completed successfully.
    case paired

    /// Pairing failed with an error.
    case pairingFailed(String)

    /// Camera permission was denied by the user.
    case permissionDenied

    /// An error occurred during scanning or parsing.
    case error(String)
}

/// ViewModel for the QR code scanner screen.
///
/// Manages the scanner lifecycle including camera permissions, QR code
/// detection callbacks, pairing handshake via `AuthService`, and navigation
/// to the authenticated state.
///
/// Uses `ObservableObject` for iOS 16 compatibility (not `@Observable`
/// which requires iOS 17).
final class QRScannerViewModel: ObservableObject {

    // MARK: - Published Properties

    /// The current state of the scanner.
    @Published private(set) var state: QRScannerState = .checkingPermission

    /// Whether the scanner should be actively detecting QR codes.
    @Published private(set) var isScanning: Bool = false

    /// The most recently scanned payload, used for navigation.
    @Published private(set) var scannedPayload: QRCodePayload?

    /// Whether to show the pairing confirmation screen.
    @Published var showPairingConfirmation: Bool = false

    /// Whether pairing completed successfully and the app should navigate away.
    @Published private(set) var isPairingComplete: Bool = false

    // MARK: - Dependencies

    private let cameraPermissionService: CameraPermissionProviding
    private let authService: AuthService

    // MARK: - Initialization

    /// Creates a new QR scanner view model.
    ///
    /// - Parameters:
    ///   - cameraPermissionService: The service used to manage camera permissions.
    ///     Defaults to a new instance.
    ///   - authService: The authentication service used for the pairing handshake.
    ///     Defaults to the shared singleton.
    init(
        cameraPermissionService: CameraPermissionProviding = CameraPermissionService(),
        authService: AuthService = .shared
    ) {
        self.cameraPermissionService = cameraPermissionService
        self.authService = authService
    }

    // MARK: - Public Methods

    /// Checks and requests camera permission, then starts scanning if granted.
    ///
    /// This should be called when the scanner view appears.
    @MainActor
    func startScanning() async {
        state = .checkingPermission

        if cameraPermissionService.isAuthorized {
            activateScanning()
            return
        }

        if cameraPermissionService.isNotDetermined {
            state = .requestingPermission
            let granted = await cameraPermissionService.requestPermission()
            if granted {
                activateScanning()
            } else {
                state = .permissionDenied
            }
            return
        }

        // Permission was previously denied or restricted
        state = .permissionDenied
    }

    /// Handles a QR code string detected by the camera.
    ///
    /// Parses the raw string into a `QRCodePayload` and transitions to
    /// the scanned state if valid. Invalid QR codes are silently ignored
    /// to avoid disrupting the scanning experience with non-Happy QR codes.
    ///
    /// - Parameter rawValue: The raw string content detected from the QR code.
    @MainActor
    func handleScannedCode(_ rawValue: String) {
        // Prevent processing if already scanned
        guard state == .scanning else { return }

        do {
            let payload = try QRCodePayload.parse(from: rawValue)
            isScanning = false
            scannedPayload = payload
            state = .scanned(payload)
            showPairingConfirmation = true
        } catch {
            // Silently ignore non-Happy QR codes - the user may scan
            // random QR codes in the environment before finding the CLI's code.
            // Only log in debug builds for development convenience.
            #if DEBUG
            print("[QRScanner] Ignored QR code: \(error.localizedDescription)")
            #endif
        }
    }

    /// Resets the scanner to resume scanning after dismissing a result.
    @MainActor
    func resetScanner() {
        scannedPayload = nil
        showPairingConfirmation = false
        isPairingComplete = false
        activateScanning()
    }

    /// Confirms the pairing with the scanned payload.
    ///
    /// Performs the full authentication handshake:
    /// 1. Generates a local keypair
    /// 2. Sends pairing request to the server
    /// 3. Completes challenge-response authentication
    /// 4. Stores credentials securely in Keychain
    ///
    /// On success, sets `isPairingComplete` to `true` to trigger navigation
    /// to the authenticated state.
    ///
    /// - Parameter payload: The QR code payload to confirm pairing with.
    @MainActor
    func confirmPairing(with payload: QRCodePayload) async {
        state = .pairing(payload)

        do {
            try await authService.startPairing(with: payload)
            state = .paired
            isPairingComplete = true
            showPairingConfirmation = false
        } catch {
            let message = error.localizedDescription
            state = .pairingFailed(message)

            #if DEBUG
            print("[QRScanner] Pairing failed: \(message)")
            #endif
        }
    }

    /// Retries pairing after a failure using the previously scanned payload.
    ///
    /// If no payload is available, resets the scanner to scan again.
    @MainActor
    func retryPairing() async {
        guard let payload = scannedPayload else {
            resetScanner()
            return
        }
        await confirmPairing(with: payload)
    }

    // MARK: - Private Methods

    @MainActor
    private func activateScanning() {
        isScanning = true
        state = .scanning
    }
}
