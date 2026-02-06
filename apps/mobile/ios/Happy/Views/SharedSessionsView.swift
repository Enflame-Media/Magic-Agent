//
//  SharedSessionsView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View displaying sessions shared between the current user and a friend.
///
/// Shows a list of shared sessions with their title, status, and permission level.
/// Allows the user to revoke shared sessions they initiated.
struct SharedSessionsView: View {

    let friend: Friend
    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.isLoadingSharedSessions {
                loadingView
            } else if viewModel.sharedSessions.isEmpty {
                emptyState
            } else {
                sessionList
            }
        }
        .navigationTitle("sharing.sharedWith".localized + " " + friend.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .alert("common.error".localized, isPresented: $viewModel.showError) {
            Button("common.ok".localized) {
                viewModel.dismissError()
            }
        } message: {
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
            }
        }
        .task {
            await viewModel.loadSharedSessions(friendId: friend.id)
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("sharing.loading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "square.stack.3d.up.slash")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("sharing.noSharedSessions".localized)
                .font(.title3)
                .fontWeight(.semibold)

            Text("sharing.noSharedSessionsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Session List

    private var sessionList: some View {
        List {
            ForEach(viewModel.sharedSessions) { session in
                SharedSessionRow(
                    session: session,
                    currentUserId: viewModel.currentUserIdValue,
                    onRevoke: {
                        Task {
                            await viewModel.revokeSharedSession(session)
                        }
                    }
                )
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Shared Session Row

/// A single row displaying a shared session's details.
private struct SharedSessionRow: View {
    let session: SharedSession
    let currentUserId: String
    let onRevoke: () -> Void

    @State private var showRevokeConfirmation = false

    /// Whether the current user is the one who shared the session.
    private var isSharedByMe: Bool {
        session.sharedByUserId == currentUserId
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Session title and status
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(session.sessionTitle)
                        .font(.body)
                        .fontWeight(.medium)
                        .lineLimit(2)

                    HStack(spacing: 8) {
                        // Status badge
                        statusBadge

                        // Permission badge
                        Label(session.permission.displayText, systemImage: session.permission.systemImageName)
                            .font(.caption2)
                            .foregroundStyle(.secondary)

                        // Message count
                        Label("\(session.messageCount)", systemImage: "bubble.left")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Direction indicator
                if isSharedByMe {
                    Image(systemName: "arrow.up.right.circle")
                        .foregroundStyle(.blue)
                        .font(.title3)
                } else {
                    Image(systemName: "arrow.down.left.circle")
                        .foregroundStyle(.green)
                        .font(.title3)
                }
            }

            // Shared date and direction
            HStack(spacing: 4) {
                if isSharedByMe {
                    Text("sharing.sharedByYou".localized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("sharing.sharedByFriend".localized + " " + session.sharedByDisplayName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Text("-")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(session.sharedAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
                + Text(" ago")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Revoke button (only for sessions shared by the current user)
            if isSharedByMe {
                Button(role: .destructive) {
                    showRevokeConfirmation = true
                } label: {
                    Label("sharing.revoke".localized, systemImage: "xmark.circle")
                        .font(.caption)
                }
                .buttonStyle(.bordered)
                .controlSize(.mini)
                .tint(.red)
            }
        }
        .padding(.vertical, 4)
        .confirmationDialog(
            "sharing.revokeConfirmTitle".localized,
            isPresented: $showRevokeConfirmation,
            titleVisibility: .visible
        ) {
            Button("sharing.revokeConfirm".localized, role: .destructive) {
                onRevoke()
            }
            Button("common.cancel".localized, role: .cancel) {}
        } message: {
            Text("sharing.revokeConfirmMessage".localized)
        }
    }

    private var statusBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 6, height: 6)
            Text(session.sessionStatus.rawValue.capitalized)
                .font(.caption2)
                .foregroundStyle(statusColor)
        }
    }

    private var statusColor: Color {
        switch session.sessionStatus {
        case .active: return .green
        case .paused: return .orange
        case .completed: return .blue
        case .error: return .red
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SharedSessionsView(friend: .sample, viewModel: FriendsViewModel())
    }
}
