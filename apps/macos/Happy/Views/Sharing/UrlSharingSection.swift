//
//  UrlSharingSection.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Section for configuring URL-based session sharing.
///
/// Provides controls for:
/// - Enabling/disabling URL sharing
/// - Setting an optional password
/// - Choosing permission level
/// - Copying or sharing the URL
struct UrlSharingSection: View {
    @Bindable var viewModel: ShareSessionViewModel

    var body: some View {
        Section {
            // Enable toggle
            Toggle("Enable URL Sharing", isOn: $viewModel.urlEnabled)
                .onChange(of: viewModel.urlEnabled) { _, _ in
                    Task { await viewModel.saveUrlSettings() }
                }

            if viewModel.urlEnabled {
                // Permission picker
                Picker("Permission", selection: $viewModel.urlPermission) {
                    Text("View Only").tag(SessionSharePermission.viewOnly)
                    Text("View & Chat").tag(SessionSharePermission.viewAndChat)
                }
                .pickerStyle(.segmented)
                .onChange(of: viewModel.urlPermission) { _, _ in
                    Task { await viewModel.saveUrlSettings() }
                }

                // Password field
                passwordField

                Divider()

                // URL display and actions
                if let shareUrl = viewModel.shareUrl {
                    urlDisplay(shareUrl)
                }
            }
        } header: {
            Label("Link Sharing", systemImage: "link")
        } footer: {
            if viewModel.urlEnabled {
                Text("Anyone with this link can access the session with the selected permission level.")
            }
        }
    }

    // MARK: - Password Field

    @ViewBuilder
    private var passwordField: some View {
        HStack {
            SecureField("Password (optional)", text: $viewModel.urlPassword)
                .textFieldStyle(.plain)
                .frame(maxWidth: .infinity)

            if !viewModel.urlPassword.isEmpty {
                Button {
                    Task { await viewModel.saveUrlSettings() }
                } label: {
                    Text("Save")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - URL Display

    @ViewBuilder
    private func urlDisplay(_ url: URL) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            // URL text
            HStack {
                Text(url.absoluteString)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)

                Spacer()

                // Copy feedback
                if let feedback = viewModel.copyFeedback {
                    Text(feedback)
                        .font(.caption)
                        .foregroundStyle(.green)
                        .transition(.opacity)
                }
            }

            // Action buttons
            HStack(spacing: 12) {
                Button {
                    viewModel.copyUrlToClipboard()
                } label: {
                    Label("Copy Link", systemImage: "doc.on.doc")
                }
                .buttonStyle(.bordered)
                .keyboardShortcut("c", modifiers: [.command])

                Button {
                    viewModel.shareUrlNatively()
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                }
                .buttonStyle(.bordered)

                Spacer()

                // Regenerate button
                Button {
                    Task { await viewModel.regenerateUrl() }
                } label: {
                    Label("New Link", systemImage: "arrow.triangle.2.circlepath")
                        .font(.caption)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.secondary)
                .help("Generate a new share link (invalidates the current one)")
            }
        }
    }
}

// MARK: - Preview

#Preview {
    Form {
        UrlSharingSection(viewModel: ShareSessionViewModel(sessionId: "preview-123"))
    }
    .formStyle(.grouped)
    .frame(width: 450, height: 300)
}
