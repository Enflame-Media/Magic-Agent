//
//  FriendsViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import UIKit
import CoreImage
import Combine

/// Protocol for the friends API operations, enabling dependency injection and testing.
protocol FriendsAPIServiceProtocol {
    func fetchFriends() async throws -> [Friend]
    func fetchFriendRequests() async throws -> [FriendRequest]
    func sendFriendRequest(toUsername: String, message: String?) async throws -> FriendRequest
    func sendFriendRequestByQR(userId: String, publicKey: String) async throws -> FriendRequest
    func acceptFriendRequest(requestId: String) async throws -> Friend
    func declineFriendRequest(requestId: String) async throws
    func removeFriend(friendId: String) async throws
}

/// ViewModel for the friends list and social features.
///
/// Manages fetching, filtering, and real-time updates of the friend list,
/// pending friend requests, friend request operations, session sharing,
/// privacy settings, and QR code generation.
/// Uses `ObservableObject` for iOS 16 compatibility.
final class FriendsViewModel: ObservableObject {

    // MARK: - Published Properties

    /// All friends fetched from the server, sorted by online status then name.
    @Published private(set) var friends: [Friend] = []

    /// Pending friend requests (both incoming and outgoing).
    @Published private(set) var friendRequests: [FriendRequest] = []

    /// Whether a network request is in progress.
    @Published private(set) var isLoading: Bool = false

    /// Whether the initial load has completed.
    @Published private(set) var hasLoaded: Bool = false

    /// The current error message, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// Text entered in the search bar.
    @Published var searchText: String = ""

    /// The current filter for the friends list.
    @Published var statusFilter: FriendStatusFilter = .all

    /// Whether a friend request is being sent.
    @Published private(set) var isSendingRequest: Bool = false

    /// Confirmation message after a successful action.
    @Published var confirmationMessage: String?

    /// Whether to show the confirmation alert.
    @Published var showConfirmation: Bool = false

    // MARK: - Session Sharing Properties

    /// Sessions shared between the current user and a specific friend.
    @Published private(set) var sharedSessions: [SharedSession] = []

    /// Whether shared sessions are being loaded.
    @Published private(set) var isLoadingSharedSessions: Bool = false

    // MARK: - Privacy Properties

    /// The user's privacy settings for social features.
    @Published var privacySettings: PrivacySettings = .default

    // MARK: - Computed Properties

    /// Friends filtered by the current search text and status filter.
    var filteredFriends: [Friend] {
        var result = friends

        // Apply status filter
        switch statusFilter {
        case .all:
            break
        case .online:
            result = result.filter { $0.status == .online || $0.status == .inSession }
        case .offline:
            result = result.filter { $0.status == .offline }
        }

        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter {
                $0.displayName.localizedCaseInsensitiveContains(searchText) ||
                ($0.email?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return result
    }

    /// Count of online friends for badge display.
    var onlineFriendCount: Int {
        friends.filter { $0.isOnline || $0.status == .inSession }.count
    }

    /// Pending incoming friend requests.
    var incomingRequests: [FriendRequest] {
        friendRequests.filter { $0.status == .pending && $0.direction(for: currentUserId) == .received }
    }

    /// Pending outgoing friend requests.
    var outgoingRequests: [FriendRequest] {
        friendRequests.filter { $0.status == .pending && $0.direction(for: currentUserId) == .sent }
    }

    /// Count of pending incoming requests for badge display.
    var pendingRequestCount: Int {
        incomingRequests.count
    }

    /// Whether the friends list is empty after filtering.
    var isEmptyState: Bool {
        hasLoaded && filteredFriends.isEmpty
    }

    // MARK: - Dependencies

    private let apiService: FriendsAPIServiceProtocol
    private let sharingService: SessionSharingServiceProtocol
    private let syncService: SyncService
    private let currentUserId: String
    private var cancellables = Set<AnyCancellable>()

    /// Exposes the current user ID for use in views (e.g., shared session direction).
    var currentUserIdValue: String { currentUserId }

    // MARK: - Initialization

    /// Creates a new friends view model.
    ///
    /// - Parameters:
    ///   - apiService: The API service for friend operations. Defaults to the shared adapter.
    ///   - sharingService: The service for session sharing operations. Defaults to the shared adapter.
    ///   - syncService: The sync service for real-time updates. Defaults to the shared instance.
    ///   - currentUserId: The current user's ID. Defaults to the stored account ID.
    init(
        apiService: FriendsAPIServiceProtocol? = nil,
        sharingService: SessionSharingServiceProtocol? = nil,
        syncService: SyncService = .shared,
        currentUserId: String? = nil
    ) {
        self.apiService = apiService ?? FriendsAPIServiceAdapter()
        self.sharingService = sharingService ?? SessionSharingService()
        self.syncService = syncService
        self.currentUserId = currentUserId ?? KeychainHelper.readString(.accountId) ?? ""
        loadCachedPrivacySettings()
    }

    // MARK: - Public Methods

    /// Fetches both the friend list and pending requests from the server.
    ///
    /// Sets `isLoading` during the request and updates the published properties on success.
    @MainActor
    func loadFriends() async {
        isLoading = true
        errorMessage = nil

        do {
            async let fetchedFriends = apiService.fetchFriends()
            async let fetchedRequests = apiService.fetchFriendRequests()

            let (friendsResult, requestsResult) = try await (fetchedFriends, fetchedRequests)
            friends = sortFriends(friendsResult)
            friendRequests = requestsResult.sorted { $0.createdAt > $1.createdAt }
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    /// Refreshes the friend list (pull-to-refresh).
    @MainActor
    func refresh() async {
        await loadFriends()
    }

    /// Sends a friend request to a user by username.
    ///
    /// - Parameters:
    ///   - username: The username to send the request to.
    ///   - message: An optional message to include with the request.
    @MainActor
    func sendFriendRequest(toUsername username: String, message: String? = nil) async {
        isSendingRequest = true
        errorMessage = nil

        do {
            let request = try await apiService.sendFriendRequest(toUsername: username, message: message)
            friendRequests.insert(request, at: 0)
            confirmationMessage = "Friend request sent to \(username)"
            showConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isSendingRequest = false
    }

    /// Sends a friend request via QR code scan data.
    ///
    /// - Parameters:
    ///   - userId: The target user's ID from the QR code.
    ///   - publicKey: The target user's public key from the QR code.
    @MainActor
    func sendFriendRequestByQR(userId: String, publicKey: String) async {
        isSendingRequest = true
        errorMessage = nil

        do {
            let request = try await apiService.sendFriendRequestByQR(userId: userId, publicKey: publicKey)
            friendRequests.insert(request, at: 0)
            confirmationMessage = "Friend request sent!"
            showConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isSendingRequest = false
    }

    /// Accepts a pending friend request.
    ///
    /// - Parameter request: The friend request to accept.
    @MainActor
    func acceptRequest(_ request: FriendRequest) async {
        do {
            let newFriend = try await apiService.acceptFriendRequest(requestId: request.id)
            // Add the new friend and remove the request
            friends = sortFriends(friends + [newFriend])
            friendRequests.removeAll { $0.id == request.id }
            confirmationMessage = "\(request.fromDisplayName) is now your friend"
            showConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Declines a pending friend request.
    ///
    /// - Parameter request: The friend request to decline.
    @MainActor
    func declineRequest(_ request: FriendRequest) async {
        do {
            try await apiService.declineFriendRequest(requestId: request.id)
            friendRequests.removeAll { $0.id == request.id }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Removes a friend from the friend list.
    ///
    /// - Parameter friend: The friend to remove.
    @MainActor
    func removeFriend(_ friend: Friend) async {
        do {
            try await apiService.removeFriend(friendId: friend.id)
            friends.removeAll { $0.id == friend.id }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Dismisses the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    /// Dismisses the confirmation message.
    @MainActor
    func dismissConfirmation() {
        confirmationMessage = nil
        showConfirmation = false
    }

    // MARK: - Session Sharing

    /// Shares a session with a friend.
    ///
    /// - Parameters:
    ///   - session: The session to share.
    ///   - friend: The friend to share with.
    ///   - permission: The permission level to grant.
    @MainActor
    func shareSession(_ session: Session, withFriend friend: Friend, permission: SharedSessionPermission) async {
        do {
            let shared = try await sharingService.shareSession(
                sessionId: session.id,
                withFriendId: friend.id,
                permission: permission
            )
            sharedSessions.insert(shared, at: 0)
            confirmationMessage = "Session shared with \(friend.displayName)"
            showConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Loads sessions shared between the current user and a specific friend.
    ///
    /// - Parameter friendId: The friend's ID to load shared sessions for.
    @MainActor
    func loadSharedSessions(friendId: String) async {
        isLoadingSharedSessions = true

        do {
            sharedSessions = try await sharingService.fetchSharedSessions(friendId: friendId)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoadingSharedSessions = false
    }

    /// Revokes a previously shared session.
    ///
    /// - Parameter session: The shared session to revoke.
    @MainActor
    func revokeSharedSession(_ session: SharedSession) async {
        do {
            try await sharingService.revokeSharedSession(sharedSessionId: session.id)
            sharedSessions.removeAll { $0.id == session.id }
            confirmationMessage = "Session sharing revoked"
            showConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    // MARK: - QR Code Generation

    /// Generates a QR code image for the current user's friend code.
    ///
    /// The QR code encodes a JSON payload with the user's ID and public key,
    /// which another user can scan to send a friend request.
    ///
    /// - Returns: A `UIImage` of the QR code, or nil if generation fails.
    func generateFriendQRCode() -> UIImage? {
        let userId = currentUserId
        let publicKey = KeychainHelper.readString(.publicKey) ?? ""

        guard !userId.isEmpty else { return nil }

        let payload: [String: Any] = [
            "userId": userId,
            "publicKey": publicKey,
            "type": "friend"
        ]

        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload),
              let jsonString = String(data: jsonData, encoding: .utf8) else {
            return nil
        }

        guard let filter = CIFilter(name: "CIQRCodeGenerator") else { return nil }
        filter.setValue(jsonString.data(using: .utf8), forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")

        guard let ciImage = filter.outputImage else { return nil }

        // Scale up the QR code for better resolution
        let scale = CGAffineTransform(scaleX: 10, y: 10)
        let scaledImage = ciImage.transformed(by: scale)

        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) else { return nil }

        return UIImage(cgImage: cgImage)
    }

    // MARK: - Privacy Settings

    /// Saves the current privacy settings to the server and local cache.
    @MainActor
    func savePrivacySettings() async {
        do {
            try await savePivacySettingsToServer(privacySettings)
            cachePrivacySettings(privacySettings)
            confirmationMessage = "Privacy settings saved"
            showConfirmation = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Loads privacy settings from the server.
    @MainActor
    func loadPrivacySettings() async {
        do {
            struct PrivacyResponse: Decodable {
                let settings: PrivacySettings
            }
            let response: PrivacyResponse = try await APIService.shared.fetch("/v1/account/privacy")
            privacySettings = response.settings
            cachePrivacySettings(privacySettings)
        } catch {
            // Fall back to cached settings (already loaded in init)
        }
    }

    // MARK: - Private Methods

    /// Saves privacy settings to the server.
    private func savePivacySettingsToServer(_ settings: PrivacySettings) async throws {
        struct PrivacyResponse: Decodable {
            let success: Bool
        }
        let _: PrivacyResponse = try await APIService.shared.post("/v1/account/privacy", body: settings)
    }

    /// Caches privacy settings to UserDefaults for offline access.
    private func cachePrivacySettings(_ settings: PrivacySettings) {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: "com.enflamemedia.happy.privacySettings")
        }
    }

    /// Loads cached privacy settings from UserDefaults.
    private func loadCachedPrivacySettings() {
        if let data = UserDefaults.standard.data(forKey: "com.enflamemedia.happy.privacySettings"),
           let settings = try? JSONDecoder().decode(PrivacySettings.self, from: data) {
            privacySettings = settings
        }
    }

    /// Sorts friends by online status (online first), then by display name.
    private func sortFriends(_ list: [Friend]) -> [Friend] {
        list.sorted { lhs, rhs in
            let lhsPriority = statusSortPriority(lhs.status)
            let rhsPriority = statusSortPriority(rhs.status)
            if lhsPriority != rhsPriority {
                return lhsPriority < rhsPriority
            }
            return lhs.displayName.localizedCaseInsensitiveCompare(rhs.displayName) == .orderedAscending
        }
    }

    /// Returns a numeric priority for sorting (lower = higher priority).
    private func statusSortPriority(_ status: FriendStatus) -> Int {
        switch status {
        case .inSession: return 0
        case .online: return 1
        case .away: return 2
        case .offline: return 3
        }
    }
}

// MARK: - Friend Status Filter

/// Filter options for the friends list.
enum FriendStatusFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case online = "Online"
    case offline = "Offline"

    var id: String { rawValue }
}

// MARK: - Friends API Adapter

/// Adapter that bridges `APIService` to `FriendsAPIServiceProtocol`.
///
/// Provides friend-specific endpoints using the existing actor-based `APIService`.
struct FriendsAPIServiceAdapter: FriendsAPIServiceProtocol {

    private let apiService: APIService

    init(apiService: APIService = .shared) {
        self.apiService = apiService
    }

    func fetchFriends() async throws -> [Friend] {
        struct FriendsResponse: Decodable {
            let friends: [Friend]
        }
        let response: FriendsResponse = try await apiService.fetch("/v1/friends")
        return response.friends
    }

    func fetchFriendRequests() async throws -> [FriendRequest] {
        struct RequestsResponse: Decodable {
            let requests: [FriendRequest]
        }
        let response: RequestsResponse = try await apiService.fetch("/v1/friends/requests")
        return response.requests
    }

    func sendFriendRequest(toUsername: String, message: String?) async throws -> FriendRequest {
        struct SendRequestBody: Encodable {
            let username: String
            let message: String?
        }
        let body = SendRequestBody(username: toUsername, message: message)
        return try await apiService.post("/v1/friends/requests", body: body)
    }

    func sendFriendRequestByQR(userId: String, publicKey: String) async throws -> FriendRequest {
        struct QRRequestBody: Encodable {
            let userId: String
            let publicKey: String
        }
        let body = QRRequestBody(userId: userId, publicKey: publicKey)
        return try await apiService.post("/v1/friends/requests/qr", body: body)
    }

    func acceptFriendRequest(requestId: String) async throws -> Friend {
        struct EmptyBody: Encodable {}
        return try await apiService.put("/v1/friends/requests/\(requestId)/accept", body: EmptyBody())
    }

    func declineFriendRequest(requestId: String) async throws {
        struct EmptyBody: Encodable {}
        struct EmptyResponse: Decodable {}
        let _: EmptyResponse = try await apiService.put("/v1/friends/requests/\(requestId)/decline", body: EmptyBody())
    }

    func removeFriend(friendId: String) async throws {
        struct EmptyBody: Encodable {}
        struct EmptyResponse: Decodable {}
        let _: EmptyResponse = try await apiService.put("/v1/friends/\(friendId)/remove", body: EmptyBody())
    }
}
