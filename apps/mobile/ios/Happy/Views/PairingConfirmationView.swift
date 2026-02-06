//
//  PairingConfirmationView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A confirmation screen shown after successfully scanning a QR code.
///
/// Displays the parsed pairing details and allows the user to confirm
/// or cancel the connection to the CLI instance.
struct PairingConfirmationView: View {

    /// The parsed QR code payload to confirm.
    let payload: QRCodePayload

    /// Called when the user confirms the pairing.
    let onConfirm: () -> Void

    /// Called when the user cancels and wants to scan again.
    let onCancel: () -> Void

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Success icon
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 72))
                .foregroundStyle(.green)

            // Title
            VStack(spacing: 8) {
                Text("pairing.title".localized)
                    .font(.title2)
                    .fontWeight(.bold)

                Text("pairing.subtitle".localized)
                    .font(.body)
                    .foregroundStyle(.secondary)
            }

            // Connection details
            VStack(alignment: .leading, spacing: 16) {
                DetailRow(
                    icon: "server.rack",
                    title: NSLocalizedString("pairing.serverLabel", comment: ""),
                    value: displayServerUrl
                )

                DetailRow(
                    icon: "key.fill",
                    title: NSLocalizedString("pairing.publicKeyLabel", comment: ""),
                    value: truncatedPublicKey
                )

                if let machineId = payload.machineId {
                    DetailRow(
                        icon: "desktopcomputer",
                        title: NSLocalizedString("pairing.machineLabel", comment: ""),
                        value: machineId
                    )
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray6))
            )
            .padding(.horizontal, 24)

            Spacer()

            // Actions
            VStack(spacing: 16) {
                Button {
                    onConfirm()
                } label: {
                    Label("common.connect".localized, systemImage: "link")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button("pairing.scanAgain".localized) {
                    onCancel()
                }
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 40)

            Spacer()
        }
        .padding()
        .navigationTitle("pairing.navigationTitle".localized)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Computed Properties

    /// Displays a user-friendly server URL (strips protocol prefix).
    private var displayServerUrl: String {
        var url = payload.serverUrl
        if url.hasPrefix("https://") {
            url = String(url.dropFirst(8))
        } else if url.hasPrefix("http://") {
            url = String(url.dropFirst(7))
        }
        return url
    }

    /// Truncates the public key for display (first 8 + last 4 characters).
    private var truncatedPublicKey: String {
        let key = payload.publicKey
        if key.count > 16 {
            let prefix = key.prefix(8)
            let suffix = key.suffix(4)
            return "\(prefix)...\(suffix)"
        }
        return key
    }
}

// MARK: - Detail Row

/// A row displaying a labeled detail with an icon.
private struct DetailRow: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.blue)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        PairingConfirmationView(
            payload: QRCodePayload(
                publicKey: "dGVzdHB1YmxpY2tleWJhc2U2NA==",
                serverUrl: "https://api.happy.example.com",
                machineId: "MacBook-Pro-2024"
            ),
            onConfirm: {},
            onCancel: {}
        )
    }
}
