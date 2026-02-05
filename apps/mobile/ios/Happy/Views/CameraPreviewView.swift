//
//  CameraPreviewView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI
import AVFoundation

/// A SwiftUI wrapper around `AVCaptureSession` that provides a live camera preview
/// with QR code metadata detection.
///
/// This uses `UIViewControllerRepresentable` because AVFoundation's camera APIs
/// are UIKit-based and cannot be used directly in SwiftUI. The coordinator pattern
/// handles `AVCaptureMetadataOutputObjectsDelegate` callbacks.
struct CameraPreviewView: UIViewControllerRepresentable {

    /// Called when a QR code is detected in the camera feed.
    let onQRCodeDetected: (String) -> Void

    /// Whether the camera should be actively scanning.
    let isScanning: Bool

    func makeUIViewController(context: Context) -> CameraPreviewViewController {
        let controller = CameraPreviewViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: CameraPreviewViewController, context: Context) {
        if isScanning {
            uiViewController.startScanning()
        } else {
            uiViewController.stopScanning()
        }
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(onQRCodeDetected: onQRCodeDetected)
    }

    // MARK: - Coordinator

    /// Handles AVFoundation metadata output delegate callbacks.
    final class Coordinator: NSObject, CameraPreviewViewControllerDelegate {
        let onQRCodeDetected: (String) -> Void

        init(onQRCodeDetected: @escaping (String) -> Void) {
            self.onQRCodeDetected = onQRCodeDetected
        }

        func cameraPreview(_ controller: CameraPreviewViewController, didDetectQRCode value: String) {
            onQRCodeDetected(value)
        }
    }
}

// MARK: - Delegate Protocol

/// Delegate protocol for `CameraPreviewViewController` to communicate QR detections.
protocol CameraPreviewViewControllerDelegate: AnyObject {
    func cameraPreview(_ controller: CameraPreviewViewController, didDetectQRCode value: String)
}

// MARK: - UIViewController

/// A UIKit view controller that manages the AVFoundation capture session for QR scanning.
///
/// This controller sets up:
/// - `AVCaptureSession` with video input from the back camera
/// - `AVCaptureMetadataOutput` configured for QR code detection
/// - `AVCaptureVideoPreviewLayer` for the live camera preview
///
/// It supports both iPhone and iPad with proper orientation handling.
final class CameraPreviewViewController: UIViewController {

    // MARK: - Properties

    weak var delegate: CameraPreviewViewControllerDelegate?

    private let captureSession = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let metadataOutput = AVCaptureMetadataOutput()
    private let sessionQueue = DispatchQueue(label: "media.enflame.happy.ios.camera-session")

    /// Tracks whether the session has been configured to avoid redundant setup.
    private var isSessionConfigured = false

    /// Prevents duplicate QR code processing within a short time window.
    private var lastDetectedValue: String?
    private var lastDetectionTime: Date?

    /// Minimum interval between processing the same QR code value.
    private let deduplicationInterval: TimeInterval = 2.0

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configureSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillTransition(
        to size: CGSize,
        with coordinator: UIViewControllerTransitionCoordinator
    ) {
        super.viewWillTransition(to: size, with: coordinator)

        coordinator.animate { [weak self] _ in
            self?.updatePreviewOrientation()
        }
    }

    // MARK: - Public Methods

    /// Starts the capture session on a background queue.
    func startScanning() {
        sessionQueue.async { [weak self] in
            guard let self, !self.captureSession.isRunning else { return }
            self.captureSession.startRunning()
        }
    }

    /// Stops the capture session on a background queue.
    func stopScanning() {
        sessionQueue.async { [weak self] in
            guard let self, self.captureSession.isRunning else { return }
            self.captureSession.stopRunning()
        }
    }

    // MARK: - Private Methods

    private func configureSession() {
        guard !isSessionConfigured else { return }

        sessionQueue.async { [weak self] in
            guard let self else { return }
            self.setupCaptureSession()
        }
    }

    private func setupCaptureSession() {
        captureSession.beginConfiguration()
        defer { captureSession.commitConfiguration() }

        // Set session preset for QR code scanning
        if captureSession.canSetSessionPreset(.high) {
            captureSession.sessionPreset = .high
        }

        // Add video input (back camera)
        guard let videoDevice = AVCaptureDevice.default(
            .builtInWideAngleCamera,
            for: .video,
            position: .back
        ) else {
            #if DEBUG
            print("[CameraPreview] No back camera available")
            #endif
            return
        }

        do {
            let videoInput = try AVCaptureDeviceInput(device: videoDevice)

            guard captureSession.canAddInput(videoInput) else {
                #if DEBUG
                print("[CameraPreview] Cannot add video input to session")
                #endif
                return
            }

            captureSession.addInput(videoInput)
        } catch {
            #if DEBUG
            print("[CameraPreview] Failed to create video input: \(error)")
            #endif
            return
        }

        // Add metadata output for QR code detection
        guard captureSession.canAddOutput(metadataOutput) else {
            #if DEBUG
            print("[CameraPreview] Cannot add metadata output to session")
            #endif
            return
        }

        captureSession.addOutput(metadataOutput)
        metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)

        // Configure for QR code detection only
        if metadataOutput.availableMetadataObjectTypes.contains(.qr) {
            metadataOutput.metadataObjectTypes = [.qr]
        }

        isSessionConfigured = true

        // Set up preview layer on the main thread
        DispatchQueue.main.async { [weak self] in
            self?.setupPreviewLayer()
        }
    }

    private func setupPreviewLayer() {
        let layer = AVCaptureVideoPreviewLayer(session: captureSession)
        layer.videoGravity = .resizeAspectFill
        layer.frame = view.bounds
        view.layer.addSublayer(layer)
        previewLayer = layer

        updatePreviewOrientation()
    }

    private func updatePreviewOrientation() {
        guard let connection = previewLayer?.connection, connection.isVideoOrientationSupported else {
            return
        }

        let interfaceOrientation = view.window?.windowScene?.interfaceOrientation ?? .portrait

        switch interfaceOrientation {
        case .portrait:
            connection.videoOrientation = .portrait
        case .landscapeRight:
            connection.videoOrientation = .landscapeRight
        case .landscapeLeft:
            connection.videoOrientation = .landscapeLeft
        case .portraitUpsideDown:
            connection.videoOrientation = .portraitUpsideDown
        default:
            connection.videoOrientation = .portrait
        }
    }
}

// MARK: - AVCaptureMetadataOutputObjectsDelegate

extension CameraPreviewViewController: AVCaptureMetadataOutputObjectsDelegate {

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        // Find the first QR code in the detected objects
        guard let metadataObject = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              metadataObject.type == .qr,
              let stringValue = metadataObject.stringValue else {
            return
        }

        // Deduplicate rapid-fire detections of the same QR code
        let now = Date()
        if let lastValue = lastDetectedValue,
           let lastTime = lastDetectionTime,
           lastValue == stringValue,
           now.timeIntervalSince(lastTime) < deduplicationInterval {
            return
        }

        lastDetectedValue = stringValue
        lastDetectionTime = now

        // Provide haptic feedback on detection
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()

        delegate?.cameraPreview(self, didDetectQRCode: stringValue)
    }
}
