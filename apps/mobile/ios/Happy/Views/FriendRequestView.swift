//
//  FriendRequestView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View for managing pending friend requests.
///
/// Displays incoming requests (with accept/decline actions) and outgoing
/// requests (with cancel option) in separate sections.
struct FriendRequestView: View {

    @ObservedObject var viewModel: FriendsViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if viewModel.incomingRequests.isEmpty && viewModel.outgoingRequests.isEmpty {
                emptyState
            } else {
                requestList
            }
        }
        .navigationTitle("friendRequests.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("common.done".localized) {
                    dismiss()
                }
            }
        }
        .alert("common.error".localized, isPresented: $viewModel.showError) {
            Button("common.ok".localized) {
                viewModel.dismissError()
            }
        } message: {
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.crop.circle.badge.questionmark")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("friendRequests.noRequests".localized)
                .font(.title3)
                .fontWeight(.semibold)

            Text("friendRequests.noRequestsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Request List

    private var requestList: some View {
        List {
            // Incoming requests
            if !viewModel.incomingRequests.isEmpty {
                Section {
                    ForEach(viewModel.incomingRequests) { request in
                        IncomingRequestRow(
                            request: request,
                            onAccept: {
                                Task {
                                    await viewModel.acceptRequest(request)
                                }
                            },
                            onDecline: {
                                Task {
                                    await viewModel.declineRequest(request)
                                }
                            }
                        )
                    }
                } header: {
                    Label(
                        "friendRequests.incoming".localized + " (\(viewModel.incomingRequests.count))",
                        systemImage: "arrow.down.circle"
                    )
                }
            }

            // Outgoing requests
            if !viewModel.outgoingRequests.isEmpty {
                Section {
                    ForEach(viewModel.outgoingRequests) { request in
                        OutgoingRequestRow(request: request)
                    }
                } header: {
                    Label(
                        "friendRequests.outgoing".localized + " (\(viewModel.outgoingRequests.count))",
                        systemImage: "arrow.up.circle"
                    )
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Incoming Request Row

/// A row for displaying an incoming friend request with accept/decline actions.
private struct IncomingRequestRow: View {
    let request: FriendRequest
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 12) {
                // Avatar
                ZStack {
                    Circle()
                        .fill(Color.purple.opacity(0.15))
                        .frame(width: 40, height: 40)

                    Text(request.fromDisplayName.prefix(1).uppercased())
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundColor(.purple)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(request.fromDisplayName)
                        .font(.body)
                        .fontWeight(.medium)

                    if let email = request.fromEmail {
                        Text(email)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    Text(request.createdAt, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        + Text(" ago")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }

            // Message, if present
            if let message = request.message {
                Text("\"\(message)\"")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .italic()
                    .padding(.leading, 52)
            }

            // Action buttons
            HStack(spacing: 12) {
                Button {
                    onAccept()
                } label: {
                    Label("friendRequests.accept".localized, systemImage: "checkmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .controlSize(.small)

                Button {
                    onDecline()
                } label: {
                    Label("friendRequests.decline".localized, systemImage: "xmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .tint(.red)
                .controlSize(.small)
            }
            .padding(.leading, 52)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Outgoing Request Row

/// A row for displaying an outgoing friend request with its status.
private struct OutgoingRequestRow: View {
    let request: FriendRequest

    var body: some View {
        HStack(spacing: 12) {
            // Avatar placeholder
            ZStack {
                Circle()
                    .fill(Color.orange.opacity(0.15))
                    .frame(width: 40, height: 40)

                Image(systemName: "arrow.up.right")
                    .font(.subheadline)
                    .foregroundStyle(.orange)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Sent to user")
                    .font(.body)
                    .fontWeight(.medium)

                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption2)
                    Text("friendRequests.pending".localized)
                        .font(.caption)
                        .foregroundColor(.orange)

                    Text("- \(request.createdAt, style: .relative) ago")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        FriendRequestView(viewModel: FriendsViewModel())
    }
}
