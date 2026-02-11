//
//  FriendProfileView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// A sheet view displaying detailed information about a friend.
///
/// Shows the friend's profile information including avatar, name, online status,
/// and provides quick actions like sharing sessions, removing, or blocking.
///
/// ## Usage
/// ```swift
/// .sheet(item: $selectedFriend) { friend in
///     FriendProfileView(friend: friend)
/// }
/// ```
struct FriendProfileView: View {
    let friend: UserProfile

    @Environment(\.dismiss) private var dismiss
    @StateObject private var friendsService = FriendsService.shared

    @State private var showingRemoveConfirmation = false
    @State private var showingBlockConfirmation = false
    @State private var isProcessing = false
    @State private var showingNoSessionAlert = false

    /// Access the shared sessions view model for session selection state.
    private var sessionsViewModel: SessionsViewModel { SessionsViewModel.shared }

    var body: some View {
        VStack(spacing: 0) {
            // Header with close button
            header

            Divider()

            // Profile content
            ScrollView {
                VStack(spacing: 24) {
                    // Avatar section
                    avatarSection

                    // Info section
                    infoSection

                    Divider()
                        .padding(.horizontal)

                    // Actions section
                    actionsSection
                }
                .padding(24)
            }
        }
        .frame(width: 320, height: 420)
        .confirmationDialog(
            "Remove Friend",
            isPresented: $showingRemoveConfirmation,
            titleVisibility: .visible
        ) {
            Button("Remove Friend", role: .destructive) {
                removeFriend()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to remove \(displayName) as a friend? You can add them back later.")
        }
        .confirmationDialog(
            "Block User",
            isPresented: $showingBlockConfirmation,
            titleVisibility: .visible
        ) {
            Button("Block User", role: .destructive) {
                blockUser()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to block \(displayName)? They won't be able to send you friend requests or share sessions with you.")
        }
        .alert(
            "No Session Selected",
            isPresented: $showingNoSessionAlert
        ) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Please select a session from the Sessions tab first, then return here to share it with \(displayName).")
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        HStack {
            Text("Profile")
                .font(.headline)

            Spacer()

            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
        .padding()
    }

    // MARK: - Avatar Section

    @ViewBuilder
    private var avatarSection: some View {
        VStack(spacing: 12) {
            // Large avatar with online indicator
            ZStack(alignment: .bottomTrailing) {
                avatarImage

                // Online status indicator
                Circle()
                    .fill(isOnline ? .green : .secondary)
                    .frame(width: 16, height: 16)
                    .overlay(
                        Circle()
                            .stroke(.white, lineWidth: 3)
                    )
                    .offset(x: 4, y: 4)
            }

            // Name
            Text(displayName)
                .font(.title2)
                .fontWeight(.semibold)

            // Username
            Text("@\(friend.username)")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

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
            .frame(width: 80, height: 80)
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
            Image(systemName: "person.fill")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
        }
        .frame(width: 80, height: 80)
    }

    // MARK: - Info Section

    @ViewBuilder
    private var infoSection: some View {
        VStack(spacing: 12) {
            // Online status row
            HStack {
                Image(systemName: isOnline ? "circle.fill" : "circle")
                    .font(.caption)
                    .foregroundStyle(isOnline ? .green : .secondary)

                Text(statusText)
                    .font(.subheadline)

                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            // Friendship date row (only for friends)
            if let friendshipDate = friend.friendshipDate,
               let date = ISO8601DateFormatter().date(from: friendshipDate) {
                HStack {
                    Image(systemName: "person.2")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(friendsSinceText(date))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(.quaternary)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // Bio if available
            if let bio = friend.bio, !bio.isEmpty {
                Text(bio)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
        }
    }

    // MARK: - Actions Section

    @ViewBuilder
    private var actionsSection: some View {
        VStack(spacing: 12) {
            // Share Session button
            Button {
                if sessionsViewModel.hasSelectedSession {
                    shareSession()
                } else {
                    showingNoSessionAlert = true
                }
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share Session")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(isProcessing || !sessionsViewModel.hasSelectedSession)
            .help(sessionsViewModel.hasSelectedSession
                  ? "Share the selected session with \(displayName)"
                  : "Select a session first to share")

            // Remove Friend button
            Button(role: .destructive) {
                showingRemoveConfirmation = true
            } label: {
                HStack {
                    Image(systemName: "person.badge.minus")
                    Text("Remove Friend")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .disabled(isProcessing)

            // Block User button
            Button(role: .destructive) {
                showingBlockConfirmation = true
            } label: {
                HStack {
                    Image(systemName: "hand.raised")
                    Text("Block User")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .disabled(isProcessing)
        }
    }

    // MARK: - Computed Properties

    private var displayName: String {
        if let lastName = friend.lastName, !lastName.isEmpty {
            return "\(friend.firstName) \(lastName)"
        }
        return friend.firstName
    }

    private var isOnline: Bool {
        friendsService.isOnline(friend.id)
    }

    private var statusText: String {
        if isOnline {
            return "Online"
        } else if let lastSeen = friendsService.lastSeenText(friend.id) {
            return "Last seen \(lastSeen)"
        } else {
            return "Offline"
        }
    }

    /// Formats the friendship date as "Friends since [Month Year]" for dates older than 30 days,
    /// or as a relative time string for more recent friendships.
    private func friendsSinceText(_ date: Date) -> String {
        let calendar = Calendar.current
        let now = Date()
        let daysSince = calendar.dateComponents([.day], from: date, to: now).day ?? 0

        if daysSince < 1 {
            return "Friends since today"
        } else if daysSince < 7 {
            let formatter = RelativeDateTimeFormatter()
            formatter.unitsStyle = .full
            return "Friends since \(formatter.localizedString(for: date, relativeTo: now))"
        } else {
            let formatter = DateFormatter()
            formatter.dateFormat = "MMMM yyyy"
            return "Friends since \(formatter.string(from: date))"
        }
    }

    // MARK: - Actions

    private func shareSession() {
        guard let sessionId = sessionsViewModel.selectedSessionId else {
            showingNoSessionAlert = true
            return
        }

        let shareURL = URL(string: "happy://session/\(sessionId)?share=\(friend.id)")!

        if let window = NSApp.keyWindow,
           let contentView = window.contentView {
            let picker = NSSharingServicePicker(items: [shareURL])
            picker.show(relativeTo: .zero, of: contentView, preferredEdge: .minY)
        }
    }

    private func removeFriend() {
        isProcessing = true
        Task {
            do {
                try await friendsService.removeFriend(friend.id)
                dismiss()
            } catch {
                print("[FriendProfileView] Failed to remove friend: \(error)")
            }
            isProcessing = false
        }
    }

    private func blockUser() {
        isProcessing = true
        Task {
            do {
                try await friendsService.blockUser(friend.id)
                dismiss()
            } catch {
                print("[FriendProfileView] Failed to block user: \(error)")
            }
            isProcessing = false
        }
    }
}

// MARK: - Preview

#Preview {
    FriendProfileView(
        friend: UserProfile(
            avatar: nil,
            bio: "Swift developer and coffee enthusiast",
            firstName: "Alice",
            friendshipDate: "2025-06-15T10:30:00Z",
            id: "1",
            lastName: "Smith",
            status: .friend,
            username: "alice_dev"
        )
    )
}
