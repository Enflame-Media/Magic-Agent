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
/// handling routing between different screens based on app state.
struct ContentView: View {
    var body: some View {
        NavigationStack {
            WelcomeView()
        }
    }
}

/// The welcome view shown when the app first launches.
///
/// This view provides onboarding instructions and a way to
/// connect to a Claude Code CLI instance via QR code scanning.
struct WelcomeView: View {
    var body: some View {
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
                        description: "View and manage sessions from your iPhone"
                    )
                }
                .frame(maxWidth: 350)
            }

            Spacer()

            // Connect button
            Button {
                // TODO: Implement QR scanner
            } label: {
                Label("Scan QR Code", systemImage: "qrcode.viewfinder")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 40)

            Spacer()
        }
        .padding()
        .navigationTitle("Welcome")
        .navigationBarTitleDisplayMode(.inline)
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
