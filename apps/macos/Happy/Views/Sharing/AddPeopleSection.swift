//
//  AddPeopleSection.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Section for adding new shares and sending invitations.
///
/// Provides:
/// - Friend search with filtered results
/// - Email invitation input
/// - Permission selection for new shares
struct AddPeopleSection: View {
    @Bindable var viewModel: ShareSessionViewModel

    @FocusState private var friendSearchFocused: Bool
    @FocusState private var emailFieldFocused: Bool

    @State private var showingConfirmation = false
    @State private var pendingFriend: UserProfile?
    @State private var showingEmailConfirmation = false

    var body: some View {
        Section {
            // Permission picker for new shares
            Picker("Permission for new shares", selection: $viewModel.selectedPermission) {
                Text("View Only").tag(SessionSharePermission.viewOnly)
                Text("View & Chat").tag(SessionSharePermission.viewAndChat)
            }
            .pickerStyle(.menu)

            Divider()

            // Friend search
            friendSearchField

            // Filtered friends list
            if !viewModel.friendSearchQuery.isEmpty {
                filteredFriendsList
            }

            Divider()

            // Email invitation
            emailInvitationField
        } header: {
            Label("Add People", systemImage: "person.badge.plus")
        } footer: {
            Text("Share with friends or invite others by email.")
        }
        .confirmationDialog(
            "Share with \(pendingFriend?.firstName ?? "this person")?",
            isPresented: $showingConfirmation,
            titleVisibility: .visible
        ) {
            if let friend = pendingFriend {
                Button("Share") {
                    Task {
                        await viewModel.addShare(
                            userId: friend.id,
                            permission: viewModel.selectedPermission
                        )
                    }
                }
                Button("Cancel", role: .cancel) {}
            }
        } message: {
            Text("They will receive \(permissionDescription) access to this session.")
        }
        .confirmationDialog(
            "Send invitation to \(viewModel.inviteEmail)?",
            isPresented: $showingEmailConfirmation,
            titleVisibility: .visible
        ) {
            Button("Send Invitation") {
                Task { await viewModel.sendInvitation() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("They will receive an email invitation with \(permissionDescription) access.")
        }
    }

    // MARK: - Friend Search

    @ViewBuilder
    private var friendSearchField: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Search friends", text: $viewModel.friendSearchQuery)
                .textFieldStyle(.plain)
                .focused($friendSearchFocused)

            if !viewModel.friendSearchQuery.isEmpty {
                Button {
                    viewModel.friendSearchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .background(.quaternary)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    @ViewBuilder
    private var filteredFriendsList: some View {
        if viewModel.filteredFriends.isEmpty {
            HStack {
                Spacer()
                Text("No matching friends")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.vertical, 8)
        } else {
            ScrollView {
                LazyVStack(spacing: 4) {
                    ForEach(viewModel.filteredFriends) { friend in
                        friendButton(friend)
                    }
                }
            }
            .frame(maxHeight: 150)
        }
    }

    @ViewBuilder
    private func friendButton(_ friend: UserProfile) -> some View {
        Button {
            pendingFriend = friend
            showingConfirmation = true
        } label: {
            HStack(spacing: 12) {
                // Avatar
                avatarView(for: friend)

                // Name
                VStack(alignment: .leading, spacing: 2) {
                    Text(displayName(for: friend))
                        .fontWeight(.medium)
                        .lineLimit(1)

                    Text("@\(friend.username)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Add indicator
                Image(systemName: "plus.circle")
                    .foregroundStyle(.blue)
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 8)
            .background(.quaternary.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func avatarView(for friend: UserProfile) -> some View {
        if let avatarUrl = friend.avatar?.url,
           let url = URL(string: avatarUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    placeholderAvatar(for: friend)
                }
            }
            .frame(width: 28, height: 28)
            .clipShape(Circle())
        } else {
            placeholderAvatar(for: friend)
        }
    }

    @ViewBuilder
    private func placeholderAvatar(for friend: UserProfile) -> some View {
        ZStack {
            Circle()
                .fill(.blue.opacity(0.2))
            Text(initials(for: friend))
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.blue)
        }
        .frame(width: 28, height: 28)
    }

    private func displayName(for friend: UserProfile) -> String {
        if let lastName = friend.lastName, !lastName.isEmpty {
            return "\(friend.firstName) \(lastName)"
        }
        return friend.firstName
    }

    private func initials(for friend: UserProfile) -> String {
        let first = friend.firstName.first.map(String.init) ?? ""
        let last = friend.lastName?.first.map(String.init) ?? ""
        return "\(first)\(last)".uppercased()
    }

    // MARK: - Email Invitation

    @ViewBuilder
    private var emailInvitationField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Invite by Email")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                TextField("email@example.com", text: $viewModel.inviteEmail)
                    .textFieldStyle(.plain)
                    .focused($emailFieldFocused)
                    .textContentType(.emailAddress)
                    .onSubmit {
                        if viewModel.isEmailValid {
                            showingEmailConfirmation = true
                        }
                    }

                Button {
                    showingEmailConfirmation = true
                } label: {
                    Text("Send")
                }
                .buttonStyle(.borderedProminent)
                .disabled(!viewModel.isEmailValid)
            }
            .padding(8)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }

    // MARK: - Helpers

    private var permissionDescription: String {
        switch viewModel.selectedPermission {
        case .viewOnly: return "View Only"
        case .viewAndChat: return "View & Chat"
        }
    }
}

// MARK: - Preview

#Preview {
    Form {
        AddPeopleSection(viewModel: ShareSessionViewModel(sessionId: "preview-123"))
    }
    .formStyle(.grouped)
    .frame(width: 450, height: 400)
}
