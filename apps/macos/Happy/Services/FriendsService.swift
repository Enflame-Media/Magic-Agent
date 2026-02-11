//
//  FriendsService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

// MARK: - Friends Response

/// Response from the /v1/friends endpoint.
struct FriendsResponse: Codable {
    let friends: [UserProfile]
}

/// Response from friend action endpoints.
struct FriendActionResponse: Codable {
    let success: Bool
    let message: String?
}

/// Request body for adding a friend.
struct AddFriendRequest: Codable {
    let uid: String
}

/// Request body for removing a friend.
struct RemoveFriendRequest: Codable {
    let uid: String
}

// MARK: - Friends Service

/// Service for managing friend relationships.
///
/// This ObservableObject provides reactive state for the friends list,
/// with methods for loading, adding, and removing friends.
///
/// Usage:
/// ```swift
/// @StateObject private var friendsService = FriendsService.shared
///
/// // Load friends on appear
/// .task { await friendsService.loadFriends() }
///
/// // Access friend lists
/// ForEach(friendsService.acceptedFriends) { friend in
///     FriendRow(friend: friend)
/// }
/// ```
class FriendsService: ObservableObject {
    // MARK: - Singleton

    /// Shared instance for app-wide friend management.
    static let shared = FriendsService()

    // MARK: - Published Properties

    /// All friends and friend-related users (pending, requested).
    @Published var friends: [UserProfile] = []

    /// Whether a network operation is in progress.
    @Published var isLoading = false

    /// Error message from the last failed operation.
    @Published var error: String?

    // MARK: - Private Properties

    /// API service for network requests.
    private let apiService: APIService

    /// Presence service for online status.
    private let presenceService: PresenceService

    // MARK: - Computed Properties

    /// Friends with accepted status.
    var acceptedFriends: [UserProfile] {
        friends.filter { $0.status == .friend }
    }

    /// Online friends (sorted by name).
    var onlineFriends: [UserProfile] {
        acceptedFriends
            .filter { presenceService.isOnline($0.id) }
            .sorted { $0.firstName < $1.firstName }
    }

    /// Offline friends (sorted by last seen, then name).
    var offlineFriends: [UserProfile] {
        acceptedFriends
            .filter { !presenceService.isOnline($0.id) }
            .sorted { friend1, friend2 in
                // Sort by last seen (most recent first), then by name
                if let lastSeen1 = presenceService.lastSeenDate(friend1.id),
                   let lastSeen2 = presenceService.lastSeenDate(friend2.id) {
                    return lastSeen1 > lastSeen2
                }
                return friend1.firstName < friend2.firstName
            }
    }

    /// Pending friend requests (awaiting our response).
    var pendingRequests: [UserProfile] {
        friends.filter { $0.status == .pending }
    }

    /// Sent friend requests (awaiting their response).
    var sentRequests: [UserProfile] {
        friends.filter { $0.status == .requested }
    }

    /// Total count of pending requests (for badge display).
    var pendingCount: Int {
        pendingRequests.count
    }

    // MARK: - Initialization

    /// Initialize with dependencies.
    /// - Parameters:
    ///   - apiService: API service for network requests. Defaults to shared instance.
    ///   - presenceService: Presence service for online status. Defaults to shared instance.
    init(apiService: APIService = .shared, presenceService: PresenceService = .shared) {
        self.apiService = apiService
        self.presenceService = presenceService
    }

    // MARK: - Public Methods

    /// Load the friends list from the server.
    ///
    /// This fetches all friends including pending requests and updates
    /// the published properties accordingly.
    @MainActor
    func loadFriends() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            let response: FriendsResponse = try await apiService.fetch("/v1/friends")
            friends = response.friends
        } catch {
            self.error = error.localizedDescription
            print("[FriendsService] Failed to load friends: \(error)")
        }
    }

    /// Send a friend request to a user.
    /// - Parameter userId: The user ID to send a request to.
    @MainActor
    func addFriend(_ userId: String) async throws {
        let request = AddFriendRequest(uid: userId)
        let _: FriendActionResponse = try await apiService.post("/v1/friends/add", body: request)
        await loadFriends()
    }

    /// Accept a pending friend request.
    /// - Parameter userId: The user ID of the request to accept.
    @MainActor
    func acceptRequest(_ userId: String) async throws {
        // Accepting uses the same endpoint as adding
        try await addFriend(userId)
    }

    /// Remove a friend or reject/cancel a friend request.
    /// - Parameter userId: The user ID to remove or reject.
    @MainActor
    func removeFriend(_ userId: String) async throws {
        let request = RemoveFriendRequest(uid: userId)
        let _: FriendActionResponse = try await apiService.post("/v1/friends/remove", body: request)
        await loadFriends()
    }

    /// Block a user.
    /// - Parameter userId: The user ID to block.
    @MainActor
    func blockUser(_ userId: String) async throws {
        let request = RemoveFriendRequest(uid: userId)
        let _: FriendActionResponse = try await apiService.post("/v1/friends/block", body: request)
        await loadFriends()
    }

    /// Check if a specific friend is online.
    /// - Parameter userId: The user ID to check.
    /// - Returns: `true` if the user is online.
    func isOnline(_ userId: String) -> Bool {
        presenceService.isOnline(userId)
    }

    /// Get the last seen text for a friend.
    /// - Parameter userId: The user ID.
    /// - Returns: Formatted relative time string, or `nil` if unknown.
    func lastSeenText(_ userId: String) -> String? {
        presenceService.lastSeenText(userId)
    }
}
