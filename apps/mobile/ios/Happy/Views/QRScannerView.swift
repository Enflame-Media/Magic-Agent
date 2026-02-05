//
//  QRScannerView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// The main QR code scanner screen.
///
/// This view orchestrates the scanning flow:
/// 1. Checks/requests camera permission on appear
/// 2. Shows the live camera preview when scanning
/// 3. Displays a viewfinder overlay to guide the user
/// 4. Navigates to `PairingConfirmationView` on successful scan
/// 5. Shows `CameraPermissionDeniedView` if permission is denied
struct QRScannerView: View {

    @StateObject private var viewModel = QRScannerViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            // Background
            Color.black.ignoresSafeArea()

            switch viewModel.state {
            case .checkingPermission, .requestingPermission:
                ProgressView("Checking camera access...")
                    .foregroundStyle(.white)

            case .scanning:
                scannerContent

            case .scanned:
                // Handled via sheet presentation
                scannerContent

            case .permissionDenied:
                CameraPermissionDeniedView()

            case .error(let message):
                errorView(message: message)
            }
        }
        .navigationTitle("Scan QR Code")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if viewModel.state == .scanning {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(.white)
                }
            }
        }
        .sheet(isPresented: $viewModel.showPairingConfirmation) {
            // On dismiss, reset scanner to continue scanning
            viewModel.resetScanner()
        } content: {
            if let payload = viewModel.scannedPayload {
                NavigationStack {
                    PairingConfirmationView(
                        payload: payload,
                        onConfirm: {
                            viewModel.confirmPairing(with: payload)
                            viewModel.showPairingConfirmation = false
                        },
                        onCancel: {
                            viewModel.showPairingConfirmation = false
                        }
                    )
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button("Cancel") {
                                viewModel.showPairingConfirmation = false
                            }
                        }
                    }
                }
                .presentationDetents([.medium, .large])
            }
        }
        .task {
            await viewModel.startScanning()
        }
    }

    // MARK: - Scanner Content

    /// The camera preview with viewfinder overlay.
    private var scannerContent: some View {
        ZStack {
            CameraPreviewView(
                onQRCodeDetected: { value in
                    viewModel.handleScannedCode(value)
                },
                isScanning: viewModel.isScanning
            )
            .ignoresSafeArea()

            // Viewfinder overlay
            viewfinderOverlay
        }
    }

    /// A semi-transparent overlay with a centered viewfinder cutout.
    private var viewfinderOverlay: some View {
        GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height) * 0.65
            let rect = CGRect(
                x: (geometry.size.width - size) / 2,
                y: (geometry.size.height - size) / 2,
                width: size,
                height: size
            )

            ZStack {
                // Semi-transparent background
                Color.black.opacity(0.4)
                    .ignoresSafeArea()

                // Clear cutout for the viewfinder
                Rectangle()
                    .frame(width: size, height: size)
                    .blendMode(.destinationOut)

                // Viewfinder corners
                ViewfinderCorners(rect: rect)

                // Instruction text below the viewfinder
                VStack {
                    Spacer()
                        .frame(height: rect.maxY + 32)

                    Text("Point your camera at the QR code\ndisplayed in your terminal")
                        .font(.subheadline)
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .shadow(radius: 2)

                    Spacer()
                }
            }
            .compositingGroup()
        }
    }

    // MARK: - Error View

    /// Displays an error message with a retry option.
    private func errorView(message: String) -> some View {
        VStack(spacing: 24) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.yellow)

            Text("Scanner Error")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            Text(message)
                .font(.body)
                .foregroundStyle(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)

            Button("Try Again") {
                Task {
                    await viewModel.startScanning()
                }
            }
            .buttonStyle(.borderedProminent)
        }
    }
}

// MARK: - Viewfinder Corners

/// Draws corner brackets for the viewfinder overlay.
private struct ViewfinderCorners: View {
    let rect: CGRect

    private let cornerLength: CGFloat = 24
    private let lineWidth: CGFloat = 3

    var body: some View {
        Canvas { context, _ in
            let path = Path { p in
                // Top-left
                p.move(to: CGPoint(x: rect.minX, y: rect.minY + cornerLength))
                p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
                p.addLine(to: CGPoint(x: rect.minX + cornerLength, y: rect.minY))

                // Top-right
                p.move(to: CGPoint(x: rect.maxX - cornerLength, y: rect.minY))
                p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
                p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + cornerLength))

                // Bottom-right
                p.move(to: CGPoint(x: rect.maxX, y: rect.maxY - cornerLength))
                p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
                p.addLine(to: CGPoint(x: rect.maxX - cornerLength, y: rect.maxY))

                // Bottom-left
                p.move(to: CGPoint(x: rect.minX + cornerLength, y: rect.maxY))
                p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
                p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - cornerLength))
            }

            context.stroke(
                path,
                with: .color(.white),
                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
            )
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        QRScannerView()
    }
}
