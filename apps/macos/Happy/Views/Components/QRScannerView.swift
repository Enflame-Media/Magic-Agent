//
//  QRScannerView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI
import AVFoundation
import Vision

/// A view for scanning QR codes from the camera or screen.
///
/// On macOS, this provides both camera scanning and the ability
/// to paste a QR code image or text.
struct QRScannerView: View {
    @Environment(\.dismiss) private var dismiss

    @State private var scannedCode: String?
    @State private var isProcessing = false
    @State private var errorMessage: String?
    @State private var manualInput = ""

    let onScan: (String) -> Void

    var body: some View {
        VStack(spacing: 24) {
            // Header
            header

            // Camera preview or placeholder
            cameraSection

            // Manual input section
            manualInputSection

            // Actions
            actionButtons
        }
        .padding(24)
        .frame(width: 400, height: 500)
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        VStack(spacing: 8) {
            Image(systemName: "qrcode.viewfinder")
                .font(.system(size: 48))
                .foregroundStyle(.blue)

            Text("Scan QR Code")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Point your camera at the QR code displayed by Claude Code CLI")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Camera Section

    @ViewBuilder
    private var cameraSection: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 16)
                .fill(.quaternary)
                .frame(height: 200)

            if isProcessing {
                ProgressView("Processing...")
            } else if let error = errorMessage {
                VStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .font(.title)
                        .foregroundStyle(.orange)
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
            } else {
                VStack(spacing: 12) {
                    Image(systemName: "camera")
                        .font(.system(size: 36))
                        .foregroundStyle(.secondary)

                    Text("Camera access required")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Button("Open Camera") {
                        requestCameraAccess()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
        }
    }

    // MARK: - Manual Input

    @ViewBuilder
    private var manualInputSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Or paste QR code data:")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                TextField("Paste QR code content", text: $manualInput)
                    .textFieldStyle(.roundedBorder)

                Button("Paste") {
                    if let clipboard = NSPasteboard.general.string(forType: .string) {
                        manualInput = clipboard
                    }
                }
                .buttonStyle(.bordered)
            }
        }
    }

    // MARK: - Actions

    @ViewBuilder
    private var actionButtons: some View {
        HStack {
            Button("Cancel") {
                dismiss()
            }
            .keyboardShortcut(.cancelAction)

            Spacer()

            Button("Connect") {
                if !manualInput.isEmpty {
                    processQRCode(manualInput)
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(manualInput.isEmpty && scannedCode == nil)
            .keyboardShortcut(.defaultAction)
        }
    }

    // MARK: - Camera Access

    private func requestCameraAccess() {
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                if granted {
                    startCameraCapture()
                } else {
                    errorMessage = "Camera access denied. Please enable it in System Settings > Privacy & Security > Camera."
                }
            }
        }
    }

    private func startCameraCapture() {
        // Note: Full camera implementation requires NSViewRepresentable
        // For now, we rely on manual input
        errorMessage = "Camera scanning not yet implemented. Please paste the QR code data."
    }

    // MARK: - QR Processing

    private func processQRCode(_ content: String) {
        isProcessing = true
        errorMessage = nil

        // Validate it looks like our pairing data
        if content.contains("publicKey") || content.hasPrefix("{") {
            scannedCode = content
            isProcessing = false
            onScan(content)
            dismiss()
        } else {
            isProcessing = false
            errorMessage = "Invalid QR code format. Please scan the code from Claude Code CLI."
        }
    }

    /// Process an image containing a QR code.
    private func processImage(_ image: NSImage) {
        guard let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
            errorMessage = "Could not process image"
            return
        }

        isProcessing = true

        let request = VNDetectBarcodesRequest { request, error in
            DispatchQueue.main.async {
                self.isProcessing = false

                if let error = error {
                    self.errorMessage = error.localizedDescription
                    return
                }

                guard let results = request.results as? [VNBarcodeObservation],
                      let firstCode = results.first(where: { $0.symbology == .qr }),
                      let payload = firstCode.payloadStringValue else {
                    self.errorMessage = "No QR code found in image"
                    return
                }

                self.processQRCode(payload)
            }
        }

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
    }
}

// MARK: - Preview

#Preview {
    QRScannerView { code in
        print("Scanned: \(code)")
    }
}
