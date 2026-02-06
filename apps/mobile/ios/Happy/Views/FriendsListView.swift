//
//  FriendsListView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// The main friends list view showing all connected friends with their online status.
///
/// Displays friends sorted by online status with search, filtering, and
/// pull-to-refresh. Provides navigation to friend profiles and pending requests.
struct FriendsListView: View {

    @StateObject private var viewModel: FriendsViewModel
    @State private var showAddFriend = false
    @State private var showFriendRequests = false
    @State private var showPrivacySettings = false

    init(viewModel: FriendsViewModel? = nil) {
        _viewModel = StateObject(wrappedValue: viewModel ?? FriendsViewModel())
    }

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                loadingView
            } else if viewModel.isEmptyState {
                emptyStateView
            } else {
                friendsListContent
            }
        }
        .navigationTitle("friends.title".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                privacySettingsButton
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    requestsBadgeButton
                    addFriendButton
                }
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "friends.searchPrompt".localized)
        .refreshable {
            await viewModel.refresh()
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
        .alert("friends.success".localized, isPresented: $viewModel.showConfirmation) {
            Button("common.ok".localized) {
                viewModel.dismissConfirmation()
            }
        } message: {
            if let message = viewModel.confirmationMessage {
                Text(message)
            }
        }
        .sheet(isPresented: $showAddFriend) {
            NavigationStack {
                AddFriendView(viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showFriendRequests) {
            NavigationStack {
                FriendRequestView(viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showPrivacySettings) {
            NavigationStack {
                PrivacySettingsView(viewModel: viewModel)
            }
        }
        .task {
            await viewModel.loadFriends()
            await viewModel.loadPrivacySettings()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("friends.loading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.2")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            if viewModel.searchText.isEmpty && viewModel.statusFilter == .all {
                Text("friends.noFriends".localized)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("friends.noFriendsDescription".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)

                Button {
                    showAddFriend = true
                } label: {
                    Label("friends.addFriend".localized, systemImage: "person.badge.plus")
                }
                .buttonStyle(.borderedProminent)
                .padding(.top, 8)
            } else {
                Text("friends.noMatching".localized)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("friends.noMatchingDescription".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Friends List Content

    private var friendsListContent: some View {
        VStack(spacing: 0) {
            // Filter picker
            Picker("common.filter".localized, selection: $viewModel.statusFilter) {
                ForEach(FriendStatusFilter.allCases) { filter in
                    Text(filter.rawValue).tag(filter)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            // Online count header
            if viewModel.onlineFriendCount > 0 {
                HStack {
                    Image(systemName: "circle.fill")
                        .font(.system(size: 8))
                        .foregroundStyle(.green)
                    Text(String(format: "friends.onlineCount".localized, viewModel.onlineFriendCount))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.bottom, 4)
            }

            // Friend list
            List {
                ForEach(viewModel.filteredFriends) { friend in
                    NavigationLink(value: friend) {
                        FriendRowView(friend: friend)
                    }
                }
                .onDelete { indexSet in
                    Task {
                        for index in indexSet {
                            let friend = viewModel.filteredFriends[index]
                            await viewModel.removeFriend(friend)
                        }
                    }
                }
            }
            .listStyle(.plain)
            .navigationDestination(for: Friend.self) { friend in
                FriendProfileView(friend: friend, viewModel: viewModel)
            }
        }
    }

    // MARK: - Toolbar Buttons

    private var requestsBadgeButton: some View {
        Button {
            showFriendRequests = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "person.2.badge.gearshape")
                    .font(.body)

                if viewModel.pendingRequestCount > 0 {
                    Text("\(viewModel.pendingRequestCount)")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(3)
                        .background(Color.red)
                        .clipShape(Circle())
                        .offset(x: 6, y: -6)
                }
            }
        }
    }

    private var addFriendButton: some View {
        Button {
            showAddFriend = true
        } label: {
            Image(systemName: "person.badge.plus")
        }
    }

    private var privacySettingsButton: some View {
        Button {
            showPrivacySettings = true
        } label: {
            Image(systemName: "lock.shield")
        }
    }
}

// MARK: - Friend Row View

/// A single row in the friends list showing the friend's name and online status.
struct FriendRowView: View {
    let friend: Friend

    var body: some View {
        HStack(spacing: 12) {
            // Avatar with image loading
            AvatarImageView(
                avatarUrl: friend.avatarUrl,
                displayName: friend.displayName,
                size: 44
            )
            .overlay(alignment: .bottomTrailing) {
                statusIndicator
            }

            // Name and status
            VStack(alignment: .leading, spacing: 2) {
                Text(friend.displayName)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    Text(friend.status.displayText)
                        .font(.caption)
                        .foregroundStyle(statusColor)

                    if let lastSeen = friend.lastSeenAt, friend.status == .offline {
                        Text("- \(lastSeen, style: .relative) ago")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            // Shared session count
            if friend.sharedSessionCount > 0 {
                HStack(spacing: 2) {
                    Image(systemName: "square.stack")
                        .font(.caption2)
                    Text("\(friend.sharedSessionCount)")
                        .font(.caption)
                }
                .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private var statusIndicator: some View {
        Circle()
            .fill(statusColor)
            .frame(width: 12, height: 12)
            .overlay(
                Circle()
                    .stroke(Color(.systemBackground), lineWidth: 2)
            )
    }

    private var statusColor: Color {
        switch friend.status {
        case .online: return .green
        case .away: return .orange
        case .inSession: return .blue
        case .offline: return .gray
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        FriendsListView()
    }
}
