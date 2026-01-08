//
//  SessionRevivalFailedAlert.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view that displays a session revival failure alert.
///
/// This view provides a native macOS-style alert when a session fails to revive,
/// showing the session ID and providing options to copy, archive, or dismiss.
///
/// The view supports:
/// - Keyboard navigation (Tab, Enter, Escape)
/// - VoiceOver accessibility
/// - Native macOS styling
///
/// Usage:
/// ```swift
/// SessionRevivalFailedAlert()
///     .environmentObject(SessionRevivalManager.shared)
/// ```
struct SessionRevivalFailedAlert: View {
    @Environment(SessionRevivalManager.self) private var revivalManager

    /// Whether the archive action is in progress.
    @State private var isArchiving = false

    /// Whether to show copy confirmation.
    @State private var showCopyConfirmation = false

    var body: some View {
        if let failure = revivalManager.revivalFailed {
            alertContent(for: failure)
        }
    }

    // MARK: - Alert Content

    @ViewBuilder
    private func alertContent(for failure: SessionRevivalFailure) -> some View {
        VStack(spacing: 16) {
            // Icon
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 40))
                .foregroundStyle(.red)
                .accessibilityHidden(true)

            // Title
            Text("Session Could Not Be Restored")
                .font(.headline)
                .accessibilityAddTraits(.isHeader)

            // Description
            Text("The session stopped and could not be revived automatically.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            // Session ID display
            sessionIdRow(failure.sessionId)

            // Error details (if available)
            if !failure.error.isEmpty {
                Text(failure.error)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            // Action buttons
            actionButtons
        }
        .padding(24)
        .frame(width: 400)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.15), radius: 20, x: 0, y: 10)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Session revival failed alert")
    }

    // MARK: - Session ID Row

    @ViewBuilder
    private func sessionIdRow(_ sessionId: String) -> some View {
        HStack(spacing: 8) {
            Text(sessionId)
                .font(.system(.caption, design: .monospaced))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .truncationMode(.middle)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(nsColor: .windowBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .accessibilityLabel("Session ID: \(sessionId)")

            Button {
                copySessionId()
            } label: {
                Image(systemName: showCopyConfirmation ? "checkmark" : "doc.on.doc")
                    .foregroundStyle(showCopyConfirmation ? .green : .secondary)
                    .contentTransition(.symbolEffect(.replace))
            }
            .buttonStyle(.borderless)
            .help("Copy session ID")
            .accessibilityLabel(showCopyConfirmation ? "Copied" : "Copy session ID")
            .keyboardShortcut("c", modifiers: .command)
        }
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private var actionButtons: some View {
        HStack(spacing: 12) {
            // Dismiss button
            Button("Dismiss") {
                revivalManager.dismissAlert()
            }
            .buttonStyle(.bordered)
            .keyboardShortcut(.cancelAction)
            .accessibilityHint("Closes this alert without archiving")

            // Archive button
            Button {
                archiveSession()
            } label: {
                if isArchiving {
                    ProgressView()
                        .controlSize(.small)
                        .frame(width: 16, height: 16)
                } else {
                    Text("Archive Session")
                }
            }
            .buttonStyle(.borderedProminent)
            .disabled(isArchiving)
            .keyboardShortcut(.defaultAction)
            .accessibilityHint("Archives the session and removes it from the active list")
        }
    }

    // MARK: - Actions

    private func copySessionId() {
        revivalManager.copySessionId()

        // Show confirmation
        withAnimation(.easeInOut(duration: 0.2)) {
            showCopyConfirmation = true
        }

        // Reset after delay
        Task {
            try? await Task.sleep(for: .seconds(2))
            await MainActor.run {
                withAnimation(.easeInOut(duration: 0.2)) {
                    showCopyConfirmation = false
                }
            }
        }
    }

    private func archiveSession() {
        isArchiving = true

        Task {
            await revivalManager.archiveFailedSession()
            await MainActor.run {
                isArchiving = false
            }
        }
    }
}

// MARK: - Revival Progress Overlay

/// A view that shows a progress indicator during session revival.
///
/// Display this overlay when a revival attempt is in progress.
struct SessionRevivalProgressOverlay: View {
    @Environment(SessionRevivalManager.self) private var revivalManager

    var body: some View {
        if revivalManager.isReviving {
            ZStack {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()

                VStack(spacing: 16) {
                    ProgressView()
                        .controlSize(.large)

                    Text("Restoring Session...")
                        .font(.headline)
                        .foregroundStyle(.white)

                    Text("Please wait while we attempt to reconnect")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                }
                .padding(32)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            }
            .transition(.opacity)
        }
    }
}

// MARK: - View Modifier

/// A view modifier that adds session revival alert handling.
///
/// Usage:
/// ```swift
/// ContentView()
///     .sessionRevivalAlert()
/// ```
struct SessionRevivalAlertModifier: ViewModifier {
    @Environment(SessionRevivalManager.self) private var revivalManager

    func body(content: Content) -> some View {
        content
            .overlay {
                // Progress overlay
                SessionRevivalProgressOverlay()

                // Failure alert
                if revivalManager.showingRevivalAlert {
                    ZStack {
                        Color.black.opacity(0.3)
                            .ignoresSafeArea()
                            .onTapGesture {
                                // Don't dismiss on tap outside
                            }

                        SessionRevivalFailedAlert()
                    }
                    .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: revivalManager.showingRevivalAlert)
            .animation(.easeInOut(duration: 0.2), value: revivalManager.isReviving)
    }
}

extension View {
    /// Adds session revival alert handling to this view.
    ///
    /// When a session revival fails, an alert will be shown with options
    /// to copy the session ID, archive the session, or dismiss.
    ///
    /// - Returns: A view with session revival alert handling.
    func sessionRevivalAlert() -> some View {
        modifier(SessionRevivalAlertModifier())
    }
}

// MARK: - Preview

#Preview("Revival Failed Alert") {
    Color.clear
        .frame(width: 600, height: 400)
        .overlay {
            SessionRevivalFailedAlert()
        }
        .environment(SessionRevivalManager.shared)
}

#Preview("Revival Progress") {
    Color.clear
        .frame(width: 600, height: 400)
        .overlay {
            SessionRevivalProgressOverlay()
        }
        .environment(SessionRevivalManager.shared)
}
