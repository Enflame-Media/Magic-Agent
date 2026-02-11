//
//  FriendRow.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// A row displaying a friend in the friends list.
///
/// Shows the friend's avatar with an online indicator, their name,
/// username, and optional last seen text for offline friends.
struct FriendRow: View {
    let friend: UserProfile
    let isOnline: Bool
    var lastSeenText: String?

    var body: some View {
        HStack(spacing: 12) {
            // Avatar with online indicator
            ZStack(alignment: .bottomTrailing) {
                avatarImage

                if isOnline {
                    Circle()
                        .fill(.green)
                        .frame(width: 10, height: 10)
                        .overlay(
                            Circle()
                                .stroke(.white, lineWidth: 2)
                        )
                        .offset(x: 2, y: 2)
                }
            }

            VStack(alignment: .leading, spacing: 2) {
                // Name
                Text(displayName)
                    .fontWeight(.medium)
                    .lineLimit(1)

                // Username and status
                HStack(spacing: 4) {
                    Text("@\(friend.username)")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if !isOnline, let lastSeenText {
                        Text("•")
                            .foregroundStyle(.tertiary)
                        Text(lastSeenText)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    // MARK: - Avatar

    @ViewBuilder
    private var avatarImage: some View {
        if let avatarURL = friend.avatar?.url,
           let url = URL(string: avatarURL) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty:
                    placeholderAvatar
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    placeholderAvatar
                @unknown default:
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

    // MARK: - Helpers

    private var displayName: String {
        if let lastName = friend.lastName, !lastName.isEmpty {
            return "\(friend.firstName) \(lastName)"
        }
        return friend.firstName
    }

    private var initials: String {
        let first = friend.firstName.first.map(String.init) ?? ""
        let last = friend.lastName?.first.map(String.init) ?? ""
        return "\(first)\(last)".uppercased()
    }
}

// MARK: - Friend Request Row

/// A row for displaying a pending friend request with accept/reject buttons.
struct FriendRequestRow: View {
    let friend: UserProfile
    let onAccept: () -> Void
    let onReject: () -> Void

    @State private var isProcessing = false

    var body: some View {
        HStack(spacing: 12) {
            // Avatar
            avatarImage

            VStack(alignment: .leading, spacing: 2) {
                Text(displayName)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text("@\(friend.username)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Action buttons
            HStack(spacing: 8) {
                Button {
                    isProcessing = true
                    onReject()
                } label: {
                    Image(systemName: "xmark")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .disabled(isProcessing)
                .help("Decline")

                Button {
                    isProcessing = true
                    onAccept()
                } label: {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.green)
                }
                .buttonStyle(.plain)
                .disabled(isProcessing)
                .help("Accept")
            }
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }

    // MARK: - Avatar

    @ViewBuilder
    private var avatarImage: some View {
        if let avatarURL = friend.avatar?.url,
           let url = URL(string: avatarURL) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .empty, .failure:
                    placeholderAvatar
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                @unknown default:
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
                .fill(.blue.opacity(0.2))
            Text(initials)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.blue)
        }
        .frame(width: 32, height: 32)
    }

    // MARK: - Helpers

    private var displayName: String {
        if let lastName = friend.lastName, !lastName.isEmpty {
            return "\(friend.firstName) \(lastName)"
        }
        return friend.firstName
    }

    private var initials: String {
        let first = friend.firstName.first.map(String.init) ?? ""
        let last = friend.lastName?.first.map(String.init) ?? ""
        return "\(first)\(last)".uppercased()
    }
}

// MARK: - Identifiable Conformance

extension UserProfile: Identifiable {}

// MARK: - Preview

#Preview("Friend Rows") {
    List {
        Section("Online") {
            FriendRow(
                friend: UserProfile(
                    avatar: nil,
                    bio: nil,
                    firstName: "Alice",
                    id: "1",
                    lastName: "Smith",
                    status: .friend,
                    username: "alice"
                ),
                isOnline: true
            )

            FriendRow(
                friend: UserProfile(
                    avatar: nil,
                    bio: nil,
                    firstName: "Bob",
                    id: "2",
                    lastName: nil,
                    status: .friend,
                    username: "bob_dev"
                ),
                isOnline: true
            )
        }

        Section("Offline") {
            FriendRow(
                friend: UserProfile(
                    avatar: nil,
                    bio: nil,
                    firstName: "Charlie",
                    id: "3",
                    lastName: "Brown",
                    status: .friend,
                    username: "charlie"
                ),
                isOnline: false,
                lastSeenText: "2 hr ago"
            )
        }

        Section("Friend Requests") {
            FriendRequestRow(
                friend: UserProfile(
                    avatar: nil,
                    bio: nil,
                    firstName: "David",
                    id: "4",
                    lastName: nil,
                    status: .pending,
                    username: "david_new"
                ),
                onAccept: {},
                onReject: {}
            )
        }
    }
    .listStyle(.sidebar)
    .frame(width: 300, height: 400)
}
