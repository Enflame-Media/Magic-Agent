//
//  SessionShareSheet.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Sheet for selecting a session to share with a friend.
///
/// Displays the user's active sessions and allows selecting one to share.
/// The user can also choose the permission level (view-only or collaborate).
struct SessionShareSheet: View {

    let friend: Friend
    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var sessions: [Session] = []
    @State private var isLoading = true
    @State private var selectedPermission: SharedSessionPermission = .viewOnly
    @State private var loadError: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    loadingView
                } else if sessions.isEmpty {
                    emptyState
                } else {
                    sessionSelectionList
                }
            }
            .navigationTitle("sharing.selectSession".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) {
                        dismiss()
                    }
                }
            }
            .alert("common.error".localized, isPresented: .constant(loadError != nil)) {
                Button("common.ok".localized) {
                    loadError = nil
                }
            } message: {
                if let error = loadError {
                    Text(error)
                }
            }
            .task {
                await loadSessions()
            }
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("sharing.loadingSessions".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "terminal")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("sharing.noActiveSessions".localized)
                .font(.title3)
                .fontWeight(.semibold)

            Text("sharing.noActiveSessionsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Session Selection

    private var sessionSelectionList: some View {
        List {
            // Permission picker
            Section {
                Picker("sharing.permission".localized, selection: $selectedPermission) {
                    Text(SharedSessionPermission.viewOnly.displayText)
                        .tag(SharedSessionPermission.viewOnly)
                    Text(SharedSessionPermission.collaborate.displayText)
                        .tag(SharedSessionPermission.collaborate)
                }
            } header: {
                Text("sharing.permissionHeader".localized)
            } footer: {
                Text("sharing.permissionFooter".localized)
            }

            // Session list
            Section {
                ForEach(sessions) { session in
                    Button {
                        Task {
                            await viewModel.shareSession(
                                session,
                                withFriend: friend,
                                permission: selectedPermission
                            )
                            dismiss()
                        }
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(session.title.isEmpty ? "sharing.untitled".localized : session.title)
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.primary)

                                HStack(spacing: 8) {
                                    sessionStatusBadge(session.status)

                                    Text(session.createdAt, style: .relative)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    + Text(" ago")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()

                            Image(systemName: "square.and.arrow.up")
                                .foregroundStyle(.blue)
                        }
                    }
                }
            } header: {
                Text("sharing.selectSessionHeader".localized)
            }
        }
        .listStyle(.insetGrouped)
    }

    private func sessionStatusBadge(_ status: SessionStatus) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor(status))
                .frame(width: 6, height: 6)
            Text(status.rawValue.capitalized)
                .font(.caption2)
                .foregroundStyle(statusColor(status))
        }
    }

    private func statusColor(_ status: SessionStatus) -> Color {
        switch status {
        case .active: return .green
        case .paused: return .orange
        case .completed: return .blue
        case .error: return .red
        }
    }

    // MARK: - Data Loading

    private func loadSessions() async {
        isLoading = true
        do {
            sessions = try await APIService.shared.fetchSessions()
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Preview

#Preview {
    SessionShareSheet(friend: .sample, viewModel: FriendsViewModel())
}
