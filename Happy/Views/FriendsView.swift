//
//  FriendsView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// The friends list view showing online/offline friends and pending requests.
///
/// Displays friends in sections grouped by status (pending requests, online, offline)
/// with context menus for friend actions and share functionality.
struct FriendsView: View {
    @StateObject private var friendsService = FriendsService.shared
    @State private var selectedFriend: UserProfile?
    @State private var showingAddFriend = false
    @State private var searchQuery = ""
    @State private var selectedFriendForProfile: UserProfile?

    var body: some View {
        VStack(spacing: 0) {
            // Search bar
            searchBar

            Divider()

            // Friends list
            if friendsService.isLoading && friendsService.friends.isEmpty {
                loadingView
            } else if filteredFriends.isEmpty && friendsService.pendingRequests.isEmpty {
                emptyView
            } else {
                friendsList
            }
        }
        .navigationTitle("Friends")
        .toolbar {
            ToolbarItemGroup {
                addFriendButton
                refreshButton
            }
        }
        .task {
            await friendsService.loadFriends()
        }
        .sheet(isPresented: $showingAddFriend) {
            AddFriendSheet()
        }
        .sheet(item: $selectedFriendForProfile) { friend in
            FriendProfileView(friend: friend)
        }
    }

    // MARK: - Search Bar

    @ViewBuilder
    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)
            TextField("Search friends", text: $searchQuery)
                .textFieldStyle(.plain)

            if !searchQuery.isEmpty {
                Button {
                    searchQuery = ""
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
        .padding()
    }

    // MARK: - Friends List

    @ViewBuilder
    private var friendsList: some View {
        List(selection: $selectedFriend) {
            // Pending Requests Section
            if !friendsService.pendingRequests.isEmpty {
                Section {
                    ForEach(friendsService.pendingRequests) { friend in
                        FriendRequestRow(friend: friend) {
                            Task { try? await friendsService.acceptRequest(friend.id) }
                        } onReject: {
                            Task { try? await friendsService.removeFriend(friend.id) }
                        }
                    }
                } header: {
                    HStack {
                        Text("Friend Requests")
                        Spacer()
                        Text("\(friendsService.pendingCount)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.blue.opacity(0.2))
                            .clipShape(Capsule())
                    }
                }
            }

            // Sent Requests Section
            if !friendsService.sentRequests.isEmpty && searchQuery.isEmpty {
                Section("Pending") {
                    ForEach(friendsService.sentRequests) { friend in
                        FriendRow(friend: friend, isOnline: false)
                            .contextMenu {
                                Button("Cancel Request", role: .destructive) {
                                    Task { try? await friendsService.removeFriend(friend.id) }
                                }
                            }
                    }
                }
            }

            // Online Friends Section
            let onlineFriends = filteredOnlineFriends
            if !onlineFriends.isEmpty {
                Section {
                    ForEach(onlineFriends) { friend in
                        FriendRow(friend: friend, isOnline: true)
                            .tag(friend)
                            .contextMenu {
                                friendContextMenu(for: friend)
                            }
                    }
                } header: {
                    HStack {
                        Circle()
                            .fill(.green)
                            .frame(width: 8, height: 8)
                        Text("Online")
                        Spacer()
                        Text("\(onlineFriends.count)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // Offline Friends Section
            let offlineFriends = filteredOfflineFriends
            if !offlineFriends.isEmpty {
                Section {
                    ForEach(offlineFriends) { friend in
                        FriendRow(
                            friend: friend,
                            isOnline: false,
                            lastSeenText: friendsService.lastSeenText(friend.id)
                        )
                        .tag(friend)
                        .contextMenu {
                            friendContextMenu(for: friend)
                        }
                    }
                } header: {
                    HStack {
                        Circle()
                            .fill(.secondary)
                            .frame(width: 8, height: 8)
                        Text("Offline")
                        Spacer()
                        Text("\(offlineFriends.count)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .listStyle(.sidebar)
    }

    // MARK: - Context Menu

    @ViewBuilder
    private func friendContextMenu(for friend: UserProfile) -> some View {
        Button {
            selectedFriendForProfile = friend
        } label: {
            Label("View Profile", systemImage: "person.circle")
        }

        Divider()

        Button {
            shareSessionWithFriend(friend)
        } label: {
            Label("Share Session...", systemImage: "square.and.arrow.up")
        }

        Divider()

        Button(role: .destructive) {
            Task { try? await friendsService.removeFriend(friend.id) }
        } label: {
            Label("Unfriend", systemImage: "person.badge.minus")
        }

        Button(role: .destructive) {
            Task { try? await friendsService.blockUser(friend.id) }
        } label: {
            Label("Block", systemImage: "hand.raised")
        }
    }

    // MARK: - Share Session

    private func shareSessionWithFriend(_ friend: UserProfile) {
        guard let sessionId = getSelectedSessionId() else { return }

        let shareURL = URL(string: "happy://session/\(sessionId)?share=\(friend.id)")!

        if let window = NSApp.keyWindow,
           let contentView = window.contentView {
            let picker = NSSharingServicePicker(items: [shareURL])
            picker.show(relativeTo: .zero, of: contentView, preferredEdge: .minY)
        }
    }

    /// Get the currently selected session ID from the app state.
    private func getSelectedSessionId() -> String? {
        // This would be connected to the session selection state
        // For now, return nil - will be integrated with session management
        nil
    }

    // MARK: - Filtered Friends

    private var filteredFriends: [UserProfile] {
        guard !searchQuery.isEmpty else { return friendsService.acceptedFriends }
        return friendsService.acceptedFriends.filter { friend in
            friend.firstName.localizedCaseInsensitiveContains(searchQuery) ||
            friend.username.localizedCaseInsensitiveContains(searchQuery) ||
            (friend.lastName?.localizedCaseInsensitiveContains(searchQuery) ?? false)
        }
    }

    private var filteredOnlineFriends: [UserProfile] {
        guard !searchQuery.isEmpty else { return friendsService.onlineFriends }
        return friendsService.onlineFriends.filter { friend in
            friend.firstName.localizedCaseInsensitiveContains(searchQuery) ||
            friend.username.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    private var filteredOfflineFriends: [UserProfile] {
        guard !searchQuery.isEmpty else { return friendsService.offlineFriends }
        return friendsService.offlineFriends.filter { friend in
            friend.firstName.localizedCaseInsensitiveContains(searchQuery) ||
            friend.username.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    // MARK: - States

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading friends...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No Friends Yet")
                .font(.headline)

            Text(searchQuery.isEmpty
                 ? "Add friends to share sessions and see their online status"
                 : "No friends match your search")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            if searchQuery.isEmpty {
                Button("Add Friend") {
                    showingAddFriend = true
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Toolbar Items

    @ViewBuilder
    private var addFriendButton: some View {
        Button {
            showingAddFriend = true
        } label: {
            Image(systemName: "person.badge.plus")
        }
        .keyboardShortcut("n", modifiers: [.command, .option])
        .help("Add Friend (⌘⌥N)")
    }

    @ViewBuilder
    private var refreshButton: some View {
        Button {
            Task {
                await friendsService.loadFriends()
            }
        } label: {
            Image(systemName: "arrow.clockwise")
        }
        .disabled(friendsService.isLoading)
        .help("Refresh friends list")
    }
}

// MARK: - Add Friend Sheet

/// Sheet for adding a new friend by username.
struct AddFriendSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var friendsService = FriendsService.shared
    @State private var username = ""
    @State private var isSearching = false
    @State private var error: String?

    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Text("Add Friend")
                    .font(.title2)
                    .fontWeight(.semibold)
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            // Username input
            VStack(alignment: .leading, spacing: 8) {
                Text("Username")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack {
                    Text("@")
                        .foregroundStyle(.secondary)
                    TextField("username", text: $username)
                        .textFieldStyle(.plain)
                }
                .padding(10)
                .background(.quaternary)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            // Error message
            if let error {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            Spacer()

            // Actions
            HStack {
                Button("Cancel") {
                    dismiss()
                }
                .keyboardShortcut(.escape)

                Spacer()

                Button("Send Request") {
                    sendRequest()
                }
                .buttonStyle(.borderedProminent)
                .disabled(username.isEmpty || isSearching)
                .keyboardShortcut(.return)
            }
        }
        .padding(24)
        .frame(width: 320, height: 200)
    }

    private func sendRequest() {
        guard !username.isEmpty else { return }

        isSearching = true
        error = nil

        Task {
            do {
                // Note: The API would need to look up by username
                // For now, we assume the username is the user ID
                try await friendsService.addFriend(username)
                dismiss()
            } catch {
                self.error = "Could not send friend request. Please check the username."
            }
            isSearching = false
        }
    }
}

// MARK: - Preview

#Preview {
    FriendsView()
        .frame(width: 300, height: 600)
}
