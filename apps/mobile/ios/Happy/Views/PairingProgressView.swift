//
//  PairingProgressView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view displayed during the pairing handshake with the server.
///
/// Shows a progress indicator with the server URL and provides
/// a cancel option. This view is presented when the authentication
/// challenge-response flow is in progress.
struct PairingProgressView: View {

    /// The server URL being connected to (for display).
    let serverUrl: String

    /// Called when the user cancels the pairing attempt.
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Progress indicator
            VStack(spacing: 24) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(.white)

                Text("pairing.connecting".localized)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text("pairing.connectingDescription".localized)
                    .font(.body)
                    .foregroundStyle(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
            }

            // Server info
            VStack(spacing: 8) {
                Text("pairing.serverLabel".localized)
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))

                Text(displayServerUrl)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.white.opacity(0.8))
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.white.opacity(0.1))
            )

            // Steps indicator
            VStack(alignment: .leading, spacing: 12) {
                PairingStepRow(
                    icon: "key.fill",
                    text: NSLocalizedString("pairing.stepGeneratingKeys", comment: ""),
                    isComplete: true
                )
                PairingStepRow(
                    icon: "arrow.left.arrow.right",
                    text: NSLocalizedString("pairing.stepChallengeResponse", comment: ""),
                    isComplete: false,
                    isActive: true
                )
                PairingStepRow(
                    icon: "lock.fill",
                    text: NSLocalizedString("pairing.stepSecuring", comment: ""),
                    isComplete: false
                )
            }
            .padding()

            Spacer()

            // Cancel button
            Button("common.cancel".localized) {
                onCancel()
            }
            .foregroundStyle(.white.opacity(0.6))
            .padding(.bottom, 32)
        }
        .padding()
    }

    // MARK: - Computed Properties

    /// Strips the protocol prefix from the server URL for cleaner display.
    private var displayServerUrl: String {
        var url = serverUrl
        if url.hasPrefix("https://") {
            url = String(url.dropFirst(8))
        } else if url.hasPrefix("http://") {
            url = String(url.dropFirst(7))
        }
        return url
    }
}

// MARK: - Pairing Step Row

/// A row displaying a step in the pairing process with status indicators.
private struct PairingStepRow: View {
    let icon: String
    let text: String
    var isComplete: Bool = false
    var isActive: Bool = false

    var body: some View {
        HStack(spacing: 12) {
            if isComplete {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .frame(width: 20)
            } else if isActive {
                ProgressView()
                    .scaleEffect(0.7)
                    .frame(width: 20)
                    .tint(.white)
            } else {
                Image(systemName: "circle")
                    .foregroundStyle(.white.opacity(0.3))
                    .frame(width: 20)
            }

            Image(systemName: icon)
                .foregroundStyle(isActive ? .white : .white.opacity(0.5))
                .frame(width: 20)

            Text(text)
                .font(.subheadline)
                .foregroundStyle(isActive ? .white : .white.opacity(0.5))
        }
    }
}

// MARK: - Preview

#Preview {
    ZStack {
        Color.black.ignoresSafeArea()
        PairingProgressView(
            serverUrl: "https://api.happy.example.com",
            onCancel: {}
        )
    }
}
