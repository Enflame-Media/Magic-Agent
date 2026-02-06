//
//  CameraPermissionDeniedView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view shown when the user has denied camera permission.
///
/// This view explains why camera access is needed and provides a button
/// to open the system Settings app where the user can grant permission.
struct CameraPermissionDeniedView: View {

    /// Environment dismiss action for navigating back.
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Icon
            Image(systemName: "camera.fill")
                .font(.system(size: 64))
                .foregroundStyle(.secondary)

            // Explanation
            VStack(spacing: 12) {
                Text("camera.accessRequired".localized)
                    .font(.title2)
                    .fontWeight(.bold)

                Text("camera.accessDescription".localized)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
            }

            Spacer()

            // Actions
            VStack(spacing: 16) {
                Button {
                    openSettings()
                } label: {
                    Label("camera.openSettings".localized, systemImage: "gear")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .accessibilityIdentifier("openSettingsButton")

                Button("common.goBack".localized) {
                    dismiss()
                }
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 40)

            Spacer()
        }
        .padding()
        .accessibilityIdentifier("cameraPermissionDeniedView")
        .navigationTitle("camera.navigationTitle".localized)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Private Methods

    /// Opens the app's Settings page where the user can enable camera access.
    private func openSettings() {
        guard let settingsUrl = URL(string: UIApplication.openSettingsURLString) else {
            return
        }

        if UIApplication.shared.canOpenURL(settingsUrl) {
            UIApplication.shared.open(settingsUrl)
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        CameraPermissionDeniedView()
    }
}
