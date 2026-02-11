//
//  ContentView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// The root view of the Happy application.
///
/// This view handles routing between authentication and main app views
/// based on the current auth state.
struct ContentView: View {
    @Environment(AuthService.self) private var authService
    @State private var showingQRScanner = false

    var body: some View {
        Group {
            switch authService.state {
            case .unauthenticated:
                welcomeView
            case .awaitingPairing:
                pairingView
            case .authenticated:
                MainView()
            case .error(let message):
                errorView(message)
            }
        }
        .animation(.default, value: authService.state)
    }

    // MARK: - Welcome View

    @ViewBuilder
    private var welcomeView: some View {
        VStack(spacing: 32) {
            Spacer()

            // App icon and title
            VStack(spacing: 16) {
                Image(systemName: "sparkles")
                    .font(.system(size: 72))
                    .foregroundStyle(.blue.gradient)

                Text("Happy")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Remote control for Claude Code")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Setup instructions
            VStack(spacing: 24) {
                Text("Get Started")
                    .font(.headline)

                VStack(alignment: .leading, spacing: 16) {
                    InstructionRow(
                        number: 1,
                        title: "Start Claude Code CLI",
                        description: "Run 'happy' in your terminal"
                    )

                    InstructionRow(
                        number: 2,
                        title: "Scan QR Code",
                        description: "Use the button below to connect"
                    )

                    InstructionRow(
                        number: 3,
                        title: "Control Remotely",
                        description: "View and manage sessions from this Mac"
                    )
                }
                .frame(maxWidth: 350)
            }

            Spacer()

            // Connect button
            Button {
                showingQRScanner = true
            } label: {
                Label("Scan QR Code", systemImage: "qrcode.viewfinder")
                    .frame(minWidth: 200)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .keyboardShortcut(.defaultAction)

            Spacer()
        }
        .padding(40)
        .frame(minWidth: 500, minHeight: 500)
        .sheet(isPresented: $showingQRScanner) {
            QRScannerView { qrData in
                handleQRScan(qrData)
            }
        }
    }

    // MARK: - Pairing View

    @ViewBuilder
    private var pairingView: some View {
        VStack(spacing: 24) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Awaiting Connection")
                .font(.headline)

            Text("Scan the QR code from Claude Code CLI to complete pairing")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Cancel") {
                authService.logout()
            }
            .buttonStyle(.bordered)
        }
        .padding(40)
        .frame(minWidth: 400, minHeight: 300)
    }

    // MARK: - Error View

    @ViewBuilder
    private func errorView(_ message: String) -> some View {
        VStack(spacing: 24) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.orange)

            Text("Connection Error")
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Try Again") {
                authService.logout()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding(40)
        .frame(minWidth: 400, minHeight: 300)
    }

    // MARK: - QR Handling

    private func handleQRScan(_ qrData: String) {
        guard let data = qrData.data(using: .utf8),
              let pairingInfo = try? JSONDecoder().decode(CLIPairingInfo.self, from: data) else {
            return
        }

        Task {
            try? await authService.completePairing(
                peerPublicKey: pairingInfo.publicKey,
                token: pairingInfo.token,
                machineId: pairingInfo.machineId
            )
        }
    }
}

/// A row in the setup instructions.
struct InstructionRow: View {
    let number: Int
    let title: String
    let description: String

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Circle()
                    .fill(.blue)
                    .frame(width: 28, height: 28)
                Text("\(number)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .environment(AuthService.shared)
}
