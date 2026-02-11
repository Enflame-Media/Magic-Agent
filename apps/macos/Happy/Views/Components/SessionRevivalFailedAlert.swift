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

// MARK: - Revival Cooldown Banner (HAP-868)

/// A banner view that displays when session revival is temporarily paused
/// due to the circuit breaker cooldown.
///
/// Shows a countdown timer and provides visual feedback that revival
/// attempts are being delayed.
///
/// Usage:
/// ```swift
/// SessionRevivalCooldownBanner()
///     .environmentObject(SessionRevivalManager.shared)
/// ```
///
/// @see HAP-868 - Handle session-revival-paused WebSocket event
struct SessionRevivalCooldownBanner: View {
    @Environment(SessionRevivalManager.self) private var revivalManager

    var body: some View {
        if revivalManager.showingCooldownBanner {
            bannerContent
        }
    }

    // MARK: - Banner Content

    @ViewBuilder
    private var bannerContent: some View {
        HStack(spacing: 12) {
            // Warning icon with animation
            Image(systemName: "clock.badge.exclamationmark")
                .font(.system(size: 20))
                .foregroundStyle(.orange)
                .symbolRenderingMode(.hierarchical)
                .accessibilityHidden(true)

            // Message and countdown
            VStack(alignment: .leading, spacing: 2) {
                Text("Revival Paused")
                    .font(.subheadline)
                    .fontWeight(.medium)

                Text(countdownText)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .contentTransition(.numericText())
            }

            Spacer()

            // Countdown timer badge
            countdownBadge
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(bannerBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
        .padding(.horizontal)
        .padding(.vertical, 8)
        .transition(.asymmetric(
            insertion: .move(edge: .top).combined(with: .opacity),
            removal: .move(edge: .top).combined(with: .opacity)
        ))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Session revival paused. \(countdownText)")
    }

    // MARK: - Countdown Badge

    @ViewBuilder
    private var countdownBadge: some View {
        let seconds = revivalManager.remainingCooldownSeconds

        HStack(spacing: 4) {
            Image(systemName: "timer")
                .font(.caption)

            Text(formatCountdown(seconds))
                .font(.system(.caption, design: .monospaced))
                .fontWeight(.medium)
                .contentTransition(.numericText())
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(
            RoundedRectangle(cornerRadius: 6)
                .fill(.orange.gradient)
        )
        .accessibilityLabel("Resuming in \(seconds) seconds")
    }

    // MARK: - Background

    @ViewBuilder
    private var bannerBackground: some View {
        ZStack {
            Color(nsColor: .windowBackgroundColor)

            // Subtle warning gradient
            LinearGradient(
                colors: [.orange.opacity(0.1), .clear],
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }

    // MARK: - Helpers

    private var countdownText: String {
        let seconds = revivalManager.remainingCooldownSeconds
        if seconds <= 0 {
            return "Resuming soon..."
        } else if seconds == 1 {
            return "Resuming in 1 second..."
        } else {
            return "Resuming in \(seconds) seconds..."
        }
    }

    /// Format the countdown for the badge display.
    private func formatCountdown(_ seconds: Int) -> String {
        let minutes = seconds / 60
        let remainingSeconds = seconds % 60

        if minutes > 0 {
            return String(format: "%d:%02d", minutes, remainingSeconds)
        } else {
            return String(format: "0:%02d", seconds)
        }
    }
}

// MARK: - View Modifier

/// A view modifier that adds session revival alert and cooldown handling.
///
/// Usage:
/// ```swift
/// ContentView()
///     .sessionRevivalAlert()
/// ```
///
/// @see HAP-737 - Session revival error handling
/// @see HAP-868 - Circuit breaker cooldown UI
struct SessionRevivalAlertModifier: ViewModifier {
    @Environment(SessionRevivalManager.self) private var revivalManager

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .top) {
                // Cooldown banner (HAP-868)
                SessionRevivalCooldownBanner()
            }
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
            .animation(.spring(duration: 0.3), value: revivalManager.showingCooldownBanner)
    }
}

extension View {
    /// Adds session revival alert and cooldown handling to this view.
    ///
    /// When a session revival fails, an alert will be shown with options
    /// to copy the session ID, archive the session, or dismiss.
    ///
    /// When the circuit breaker cooldown is active, a banner will be shown
    /// with a countdown timer (HAP-868).
    ///
    /// - Returns: A view with session revival alert and cooldown handling.
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

#Preview("Cooldown Banner") {
    VStack {
        SessionRevivalCooldownBanner()

        Spacer()

        Text("Content below banner")
            .padding()
    }
    .frame(width: 500, height: 300)
    .environment(SessionRevivalManager.shared)
}
