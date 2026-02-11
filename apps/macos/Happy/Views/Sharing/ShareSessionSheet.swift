//
//  ShareSessionSheet.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Sheet for managing session sharing with friends, email invitations, and URL sharing.
///
/// This sheet presents a form-based interface for:
/// - Viewing and managing current shares
/// - Adding new shares to friends
/// - Sending email invitations to non-users
/// - Configuring URL-based sharing
///
/// Usage:
/// ```swift
/// .sheet(isPresented: $showingShareSheet) {
///     ShareSessionSheet(sessionId: session.id)
/// }
/// ```
struct ShareSessionSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var viewModel: ShareSessionViewModel

    let sessionId: String

    init(sessionId: String) {
        self.sessionId = sessionId
        _viewModel = State(initialValue: ShareSessionViewModel(sessionId: sessionId))
    }

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.shares.isEmpty {
                    loadingView
                } else {
                    contentView
                }
            }
            .navigationTitle("Share Session")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .keyboardShortcut(.escape)
                }
            }
        }
        .frame(minWidth: 450, idealWidth: 500, minHeight: 550, idealHeight: 600)
        .task {
            await viewModel.loadSharing()
        }
        .alert("Error", isPresented: $viewModel.showingError) {
            Button("OK") {
                viewModel.dismissError()
            }
        } message: {
            if let error = viewModel.errorMessage {
                Text(error)
            }
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var contentView: some View {
        Form {
            // Current shares section
            if !viewModel.shares.isEmpty {
                ShareListSection(
                    shares: viewModel.shares,
                    onUpdatePermission: { share, permission in
                        Task { await viewModel.updateShare(share, permission: permission) }
                    },
                    onRemove: { share in
                        Task { await viewModel.removeShare(share) }
                    }
                )
            }

            // Pending invitations section
            if !viewModel.pendingInvitations.isEmpty {
                InvitationsSection(
                    invitations: viewModel.pendingInvitations,
                    onRevoke: { invitation in
                        Task { await viewModel.revokeInvitation(invitation) }
                    }
                )
            }

            // URL sharing section
            UrlSharingSection(viewModel: viewModel)

            // Add people section
            AddPeopleSection(viewModel: viewModel)
        }
        .formStyle(.grouped)
        .disabled(viewModel.isSaving)
        .overlay {
            if viewModel.isSaving {
                savingOverlay
            }
        }
    }

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading share settings...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var savingOverlay: some View {
        ZStack {
            Color.black.opacity(0.1)
            ProgressView()
                .scaleEffect(0.8)
        }
        .ignoresSafeArea()
    }
}

// MARK: - Share List Section

/// Section displaying current shares with context menus for management.
struct ShareListSection: View {
    let shares: [Share]
    let onUpdatePermission: (Share, SessionSharePermission) -> Void
    let onRemove: (Share) -> Void

    var body: some View {
        Section {
            ForEach(shares, id: \.id) { share in
                ShareRowView(share: share)
                    .contextMenu {
                        permissionMenu(for: share)
                        Divider()
                        Button(role: .destructive) {
                            onRemove(share)
                        } label: {
                            Label("Remove Access", systemImage: "person.badge.minus")
                        }
                    }
            }
        } header: {
            HStack {
                Label("Shared With", systemImage: "person.2")
                Spacer()
                Text("\(shares.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.secondary.opacity(0.2))
                    .clipShape(Capsule())
            }
        }
    }

    @ViewBuilder
    private func permissionMenu(for share: Share) -> some View {
        Menu {
            Button {
                onUpdatePermission(share, .viewOnly)
            } label: {
                HStack {
                    Text("View Only")
                    if share.permission == .viewOnly {
                        Image(systemName: "checkmark")
                    }
                }
            }

            Button {
                onUpdatePermission(share, .viewAndChat)
            } label: {
                HStack {
                    Text("View & Chat")
                    if share.permission == .viewAndChat {
                        Image(systemName: "checkmark")
                    }
                }
            }
        } label: {
            Label("Change Permission", systemImage: "slider.horizontal.3")
        }
    }
}

// MARK: - Share Row View

/// A single row displaying a share recipient.
struct ShareRowView: View {
    let share: Share

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            avatarView

            // Name and permission
            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    if let username = share.userProfile?.username {
                        Text("@\(username)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text("*")
                        .foregroundStyle(.tertiary)

                    Text(permissionLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Shared date
            Text(sharedDateText)
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private var avatarView: some View {
        if let avatarUrl = share.userProfile?.avatar?.url,
           let url = URL(string: avatarUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    placeholderAvatar
                }
            }
            .frame(width: 32, height: 32)
            .clipShape(Circle())
        } else {
            placeholderAvatar
        }
    }

    @ViewBuilder
    private var placeholderAvatar: some View {
        ZStack {
            Circle()
                .fill(.secondary.opacity(0.2))
            Text(initials)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
        }
        .frame(width: 32, height: 32)
    }

    private var displayName: String {
        guard let profile = share.userProfile else { return "Unknown User" }
        if let lastName = profile.lastName, !lastName.isEmpty {
            return "\(profile.firstName) \(lastName)"
        }
        return profile.firstName
    }

    private var initials: String {
        guard let profile = share.userProfile else { return "?" }
        let first = profile.firstName.first.map(String.init) ?? ""
        let last = profile.lastName?.first.map(String.init) ?? ""
        return "\(first)\(last)".uppercased()
    }

    private var permissionLabel: String {
        switch share.permission {
        case .viewOnly: return "View Only"
        case .viewAndChat: return "View & Chat"
        }
    }

    private var sharedDateText: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: share.sharedAt, relativeTo: Date())
    }
}

// MARK: - Invitations Section

/// Section displaying pending email invitations.
struct InvitationsSection: View {
    let invitations: [Invitation]
    let onRevoke: (Invitation) -> Void

    var body: some View {
        Section {
            ForEach(invitations, id: \.id) { invitation in
                HStack(spacing: 12) {
                    // Email icon
                    ZStack {
                        Circle()
                            .fill(.orange.opacity(0.2))
                        Image(systemName: "envelope")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                    .frame(width: 32, height: 32)

                    // Email and status
                    VStack(alignment: .leading, spacing: 2) {
                        Text(invitation.email)
                            .fontWeight(.medium)
                            .lineLimit(1)

                        Text("Pending * \(permissionLabel(invitation.permission))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // Revoke button
                    Button {
                        onRevoke(invitation)
                    } label: {
                        Text("Revoke")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.vertical, 4)
            }
        } header: {
            Label("Pending Invitations", systemImage: "envelope.badge.shield.half.filled")
        }
    }

    private func permissionLabel(_ permission: SessionSharePermission) -> String {
        switch permission {
        case .viewOnly: return "View Only"
        case .viewAndChat: return "View & Chat"
        }
    }
}

// MARK: - Preview

#Preview {
    ShareSessionSheet(sessionId: "preview-session-123")
}
