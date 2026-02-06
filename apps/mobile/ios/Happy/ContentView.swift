//
//  ContentView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// The root view of the Happy iOS application.
///
/// This view provides the main navigation structure for the app,
/// handling routing between different screens based on authentication state.
/// When unauthenticated, shows the welcome/pairing flow.
/// When authenticated, shows the session list (placeholder for now).
struct ContentView: View {

    @StateObject private var authViewModel = AuthenticationViewModel()

    var body: some View {
        Group {
            if authViewModel.isAuthenticated {
                NavigationStack {
                    SessionListView(authViewModel: authViewModel)
                }
            } else {
                NavigationStack {
                    WelcomeView(authViewModel: authViewModel)
                }
            }
        }
        .task {
            await authViewModel.checkExistingAuth()
        }
    }
}

/// The welcome view shown when the app first launches or after logout.
///
/// This view provides onboarding instructions and a way to
/// connect to a Claude Code CLI instance via QR code scanning.
struct WelcomeView: View {

    @ObservedObject var authViewModel: AuthenticationViewModel

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // App icon and title
            VStack(spacing: 16) {
                Image(systemName: "sparkles")
                    .font(.system(size: 72))
                    .foregroundStyle(.blue.gradient)

                Text("welcome.title".localized)
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("welcome.subtitle".localized)
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Setup instructions
            VStack(spacing: 24) {
                Text("welcome.getStarted".localized)
                    .font(.headline)

                VStack(alignment: .leading, spacing: 16) {
                    InstructionRow(
                        number: 1,
                        title: NSLocalizedString("welcome.instruction1.title", comment: ""),
                        description: NSLocalizedString("welcome.instruction1.description", comment: "")
                    )

                    InstructionRow(
                        number: 2,
                        title: NSLocalizedString("welcome.instruction2.title", comment: ""),
                        description: NSLocalizedString("welcome.instruction2.description", comment: "")
                    )

                    InstructionRow(
                        number: 3,
                        title: NSLocalizedString("welcome.instruction3.title", comment: ""),
                        description: NSLocalizedString("welcome.instruction3.description", comment: "")
                    )
                }
                .frame(maxWidth: 350)
            }

            Spacer()

            // Connect button - navigates to QR scanner
            NavigationLink(destination: QRScannerView(authViewModel: authViewModel)) {
                Label("scanner.scanButton".localized, systemImage: "qrcode.viewfinder")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 40)
            .accessibilityIdentifier("welcomeScanButton")

            Spacer()
        }
        .padding()
        .accessibilityIdentifier("welcomeView")
        .navigationTitle("welcome.navigationTitle".localized)
        .navigationBarTitleDisplayMode(.inline)
        .alert("common.error".localized, isPresented: $authViewModel.showError) {
            Button("common.ok".localized) {
                authViewModel.dismissError()
            }
        } message: {
            Text(authViewModel.errorMessage ?? "error.unknown".localized)
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
}
