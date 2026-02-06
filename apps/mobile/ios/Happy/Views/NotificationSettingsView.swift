//
//  NotificationSettingsView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View for managing push notification settings and preferences.
///
/// Displays the current notification authorization status, provides
/// controls for enabling/disabling notification categories, and
/// offers access to system notification settings.
struct NotificationSettingsView: View {

    /// The view model managing notification state and preferences.
    @StateObject private var viewModel = NotificationSettingsViewModel()

    var body: some View {
        List {
            // Status section
            Section {
                notificationStatusRow
            } header: {
                Text("notifications.pushNotifications".localized)
            } footer: {
                Text("notifications.description".localized)
            }

            // Notification categories section
            if viewModel.isEnabled {
                Section {
                    Toggle("notifications.sessionUpdates".localized, isOn: $viewModel.sessionUpdatesEnabled)
                    Toggle("notifications.messages".localized, isOn: $viewModel.messagesEnabled)
                    Toggle("notifications.pairingRequests".localized, isOn: $viewModel.pairingEnabled)
                    Toggle("notifications.toolApproval".localized, isOn: $viewModel.toolApprovalEnabled)
                } header: {
                    Text("notifications.notificationTypes".localized)
                } footer: {
                    Text("notifications.typesDescription".localized)
                }
            }

            // Device token section (debug only)
            #if DEBUG
            if let token = viewModel.deviceToken {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("notifications.deviceToken".localized)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(token)
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("notifications.debugInfo".localized)
                }
            }
            #endif
        }
        .navigationTitle("notifications.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await viewModel.loadStatus()
        }
    }

    // MARK: - Subviews

    /// The row displaying notification status and enable/disable controls.
    @ViewBuilder
    private var notificationStatusRow: some View {
        if viewModel.isNotDetermined {
            // Permission not yet requested
            Button {
                Task {
                    await viewModel.requestPermission()
                }
            } label: {
                HStack {
                    Label("notifications.enable".localized, systemImage: "bell.badge")
                    Spacer()
                    if viewModel.isRequestingPermission {
                        ProgressView()
                    } else {
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .disabled(viewModel.isRequestingPermission)
        } else if viewModel.isEnabled {
            // Permission granted
            HStack {
                Label("notifications.title".localized, systemImage: "bell.badge.fill")
                Spacer()
                Text("common.enabled".localized)
                    .foregroundStyle(.green)
            }
        } else {
            // Permission denied
            Button {
                viewModel.openSystemSettings()
            } label: {
                HStack {
                    Label("notifications.title".localized, systemImage: "bell.slash")
                    Spacer()
                    Text("common.disabled".localized)
                        .foregroundStyle(.red)
                    Image(systemName: "arrow.up.forward.app")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        NotificationSettingsView()
    }
}
