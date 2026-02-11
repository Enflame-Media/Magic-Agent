//
//  FriendsViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for the FriendsView, managing state and business logic.
///
/// This class coordinates between the FriendsService, PresenceService,
/// and FriendNotificationService to provide a unified interface for
/// the friends UI.
@Observable
final class FriendsViewModel {
    // MARK: - Published Properties

    /// The selected friend, if any.
    var selectedFriend: UserProfile?

    /// Search query for filtering friends.
    var searchQuery = ""

    /// Whether the add friend sheet is showing.
    var showingAddFriend = false

    /// Error message to display, if any.
    var errorMessage: String?

    /// Whether an error alert should be shown.
    var showingError = false

    // MARK: - Private Properties

    /// Service for managing friends list.
    private let friendsService: FriendsService

    /// Service for friend notifications.
    private let notificationService: FriendNotificationService

    /// Subscriptions for Combine publishers.
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Computed Properties

    /// All friends from the service.
    var friends: [UserProfile] {
        friendsService.friends
    }

    /// Whether the service is loading.
    var isLoading: Bool {
        friendsService.isLoading
    }

    /// Accepted friends only.
    var acceptedFriends: [UserProfile] {
        friendsService.acceptedFriends
    }

    /// Online friends.
    var onlineFriends: [UserProfile] {
        friendsService.onlineFriends
    }

    /// Offline friends.
    var offlineFriends: [UserProfile] {
        friendsService.offlineFriends
    }

    /// Pending friend requests.
    var pendingRequests: [UserProfile] {
        friendsService.pendingRequests
    }

    /// Sent friend requests.
    var sentRequests: [UserProfile] {
        friendsService.sentRequests
    }

    /// Count of pending requests for badge.
    var pendingCount: Int {
        friendsService.pendingCount
    }

    /// Filtered online friends based on search query.
    var filteredOnlineFriends: [UserProfile] {
        guard !searchQuery.isEmpty else { return onlineFriends }
        return onlineFriends.filter { matchesSearch($0) }
    }

    /// Filtered offline friends based on search query.
    var filteredOfflineFriends: [UserProfile] {
        guard !searchQuery.isEmpty else { return offlineFriends }
        return offlineFriends.filter { matchesSearch($0) }
    }

    // MARK: - Initialization

    /// Initialize with dependencies.
    /// - Parameters:
    ///   - friendsService: Service for friends management.
    ///   - notificationService: Service for notifications.
    init(
        friendsService: FriendsService = .shared,
        notificationService: FriendNotificationService = .shared
    ) {
        self.friendsService = friendsService
        self.notificationService = notificationService

        setupNotificationHandlers()
    }

    // MARK: - Setup

    private func setupNotificationHandlers() {
        // Listen for menu commands
        NotificationCenter.default.publisher(for: .showFriends)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] notification in
                if let userId = notification.object as? String {
                    // Select the friend with this ID
                    self?.selectedFriend = self?.friends.first { $0.id == userId }
                }
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: .addFriend)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.showingAddFriend = true
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: .refreshFriends)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                Task {
                    await self?.loadFriends()
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Public Methods

    /// Load the friends list.
    @MainActor
    func loadFriends() async {
        await friendsService.loadFriends()

        if let error = friendsService.error {
            errorMessage = error
            showingError = true
        }
    }

    /// Accept a friend request.
    /// - Parameter userId: The user ID to accept.
    @MainActor
    func acceptRequest(_ userId: String) async {
        do {
            try await friendsService.acceptRequest(userId)
            // Clear notification for this request
            notificationService.removeFriendRequestNotification(for: userId)
        } catch {
            errorMessage = "Failed to accept friend request"
            showingError = true
        }
    }

    /// Decline or remove a friend.
    /// - Parameter userId: The user ID to remove.
    @MainActor
    func removeFriend(_ userId: String) async {
        do {
            try await friendsService.removeFriend(userId)
            // Clear notification for this request
            notificationService.removeFriendRequestNotification(for: userId)
        } catch {
            errorMessage = "Failed to remove friend"
            showingError = true
        }
    }

    /// Block a user.
    /// - Parameter userId: The user ID to block.
    @MainActor
    func blockUser(_ userId: String) async {
        do {
            try await friendsService.blockUser(userId)
        } catch {
            errorMessage = "Failed to block user"
            showingError = true
        }
    }

    /// Send a friend request.
    /// - Parameter userId: The user ID or username to add.
    @MainActor
    func addFriend(_ userId: String) async throws {
        try await friendsService.addFriend(userId)
    }

    /// Check if a user is online.
    /// - Parameter userId: The user ID to check.
    /// - Returns: `true` if online.
    func isOnline(_ userId: String) -> Bool {
        friendsService.isOnline(userId)
    }

    /// Get last seen text for a user.
    /// - Parameter userId: The user ID.
    /// - Returns: Formatted relative time string.
    func lastSeenText(_ userId: String) -> String? {
        friendsService.lastSeenText(userId)
    }

    /// Clear search query.
    func clearSearch() {
        searchQuery = ""
    }

    /// Dismiss error alert.
    func dismissError() {
        showingError = false
        errorMessage = nil
    }

    // MARK: - Private Methods

    private func matchesSearch(_ friend: UserProfile) -> Bool {
        friend.firstName.localizedCaseInsensitiveContains(searchQuery) ||
        friend.username.localizedCaseInsensitiveContains(searchQuery) ||
        (friend.lastName?.localizedCaseInsensitiveContains(searchQuery) ?? false)
    }
}
