//
//  CameraPermissionService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import AVFoundation

/// Manages camera permission requests and status checking.
///
/// This service wraps `AVCaptureDevice` authorization APIs to provide
/// a clean async interface for camera permission management. It is used
/// by the QR scanner to ensure camera access before starting the capture session.
final class CameraPermissionService {

    /// The current authorization status for the camera.
    var authorizationStatus: AVAuthorizationStatus {
        AVCaptureDevice.authorizationStatus(for: .video)
    }

    /// Whether camera access has been granted.
    var isAuthorized: Bool {
        authorizationStatus == .authorized
    }

    /// Whether the user has not yet been asked for camera permission.
    var isNotDetermined: Bool {
        authorizationStatus == .notDetermined
    }

    /// Whether camera access has been denied or restricted.
    var isDenied: Bool {
        let status = authorizationStatus
        return status == .denied || status == .restricted
    }

    /// Requests camera permission from the user.
    ///
    /// If the user has already granted or denied permission, this returns
    /// the existing status without showing a prompt.
    ///
    /// - Returns: `true` if camera access was granted, `false` otherwise.
    @MainActor
    func requestPermission() async -> Bool {
        let status = authorizationStatus

        switch status {
        case .authorized:
            return true
        case .notDetermined:
            return await AVCaptureDevice.requestAccess(for: .video)
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }
}
