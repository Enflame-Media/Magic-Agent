//
//  AcpPermissionHistoryView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View displaying the history of resolved ACP permission requests.
///
/// Shows approved, denied, and expired permissions with timestamps
/// and details. Accessible from the session detail or settings.
struct AcpPermissionHistoryView: View {

    @ObservedObject var viewModel: AcpSessionViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.permissionHistory.isEmpty && viewModel.pendingPermissions.isEmpty {
                emptyStateView
            } else {
                historyList
            }
        }
        .navigationTitle("acp.permissionHistory".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("common.done".localized) {
                    dismiss()
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "shield")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("acp.noPermissions".localized)
                .font(.title2)
                .fontWeight(.semibold)

            Text("acp.noPermissionsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - History List

    private var historyList: some View {
        List {
            // Pending section
            if !viewModel.pendingPermissions.isEmpty {
                Section("acp.pending".localized) {
                    ForEach(viewModel.pendingPermissions) { permission in
                        permissionRow(permission)
                    }
                }
            }

            // Resolved section
            if !viewModel.permissionHistory.isEmpty {
                Section("acp.resolved".localized) {
                    ForEach(viewModel.permissionHistory) { permission in
                        permissionRow(permission)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }

    // MARK: - Permission Row

    private func permissionRow(_ permission: AcpPermissionRequest) -> some View {
        HStack(spacing: 12) {
            // Status icon
            statusIcon(for: permission.status)

            // Details
            VStack(alignment: .leading, spacing: 4) {
                Text(permission.toolName)
                    .font(.body)
                    .fontWeight(.medium)

                Text(permission.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                if let filePath = permission.filePath {
                    Text(filePath)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Timestamp
            VStack(alignment: .trailing, spacing: 2) {
                Text(permission.status.rawValue.capitalized)
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(statusColor(for: permission.status))

                Text(permission.createdAt, style: .relative)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func statusIcon(for status: AcpPermissionStatus) -> some View {
        ZStack {
            Circle()
                .fill(statusColor(for: status).opacity(0.15))
                .frame(width: 32, height: 32)

            Image(systemName: statusImageName(for: status))
                .font(.system(size: 14))
                .foregroundStyle(statusColor(for: status))
        }
    }

    private func statusColor(for status: AcpPermissionStatus) -> Color {
        switch status {
        case .pending: return .orange
        case .approved: return .green
        case .denied: return .red
        case .expired: return .gray
        }
    }

    private func statusImageName(for status: AcpPermissionStatus) -> String {
        switch status {
        case .pending: return "hourglass"
        case .approved: return "checkmark"
        case .denied: return "xmark"
        case .expired: return "clock"
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AcpPermissionHistoryView(viewModel: AcpSessionViewModel())
    }
}
