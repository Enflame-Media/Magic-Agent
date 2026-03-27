//
//  AcpPermissionRequestView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View for reviewing and acting on an ACP permission request.
///
/// Presented as a sheet or full-screen cover when an agent requests
/// permission for a tool use (file edit, command execution, etc.).
/// The user can approve or deny the request.
struct AcpPermissionRequestView: View {

    let permission: AcpPermissionRequest
    @ObservedObject var viewModel: AcpSessionViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                permissionHeader
                    .padding()

                Divider()

                // Details
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        // Tool info
                        detailSection(
                            title: "acp.tool".localized,
                            icon: "wrench.fill",
                            content: permission.toolName
                        )

                        // Description
                        detailSection(
                            title: "acp.description".localized,
                            icon: "text.alignleft",
                            content: permission.description
                        )

                        // File path
                        if let filePath = permission.filePath {
                            detailSection(
                                title: "acp.filePath".localized,
                                icon: "doc.fill",
                                content: filePath
                            )
                        }

                        // Command
                        if let command = permission.command {
                            detailSection(
                                title: "acp.command".localized,
                                icon: "terminal.fill",
                                content: command
                            )
                        }

                        // Timestamp
                        HStack {
                            Image(systemName: "clock")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text(permission.createdAt, style: .relative)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("acp.ago".localized)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(.horizontal)
                    }
                    .padding(.vertical)
                }

                Divider()

                // Action buttons
                actionButtons
                    .padding()
            }
            .navigationTitle("acp.permissionRequest".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    // MARK: - Header

    private var permissionHeader: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.shield.fill")
                .font(.system(size: 44))
                .foregroundStyle(.orange)

            Text("acp.permissionRequired".localized)
                .font(.title2)
                .fontWeight(.bold)

            Text(String(format: NSLocalizedString("acp.agentWantsTo", comment: ""),
                        viewModel.activeAgent?.name ?? "Agent",
                        permission.toolName))
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - Detail Section

    private func detailSection(title: String, icon: String, content: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(title, systemImage: icon)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)

            Text(content)
                .font(.body)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color(.systemGray6))
                .cornerRadius(8)
        }
        .padding(.horizontal)
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 16) {
            // Deny button
            Button(role: .destructive) {
                Task {
                    await viewModel.denyPermission(permission)
                    dismiss()
                }
            } label: {
                Label("acp.deny".localized, systemImage: "xmark")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)

            // Approve button
            Button {
                Task {
                    await viewModel.approvePermission(permission)
                    dismiss()
                }
            } label: {
                Label("acp.approve".localized, systemImage: "checkmark")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }
}

// MARK: - Preview

#Preview {
    AcpPermissionRequestView(
        permission: .sample,
        viewModel: AcpSessionViewModel()
    )
}
