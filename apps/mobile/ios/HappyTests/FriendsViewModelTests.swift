//
//  FriendsViewModelTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

// MARK: - Mock Friends API Service

final class MockFriendsAPIService: FriendsAPIServiceProtocol {
    var mockFriends: [Friend] = []
    var mockFriendRequests: [FriendRequest] = []
    var mockSentRequest: FriendRequest?
    var mockAcceptedFriend: Friend?

    var fetchFriendsCallCount = 0
    var fetchRequestsCallCount = 0
    var sendRequestCallCount = 0
    var sendRequestByQRCallCount = 0
    var acceptRequestCallCount = 0
    var declineRequestCallCount = 0
    var removeFriendCallCount = 0

    var shouldThrowOnFetch = false
    var shouldThrowOnSend = false
    var shouldThrowOnAccept = false
    var shouldThrowOnDecline = false
    var shouldThrowOnRemove = false

    var lastSentUsername: String?
    var lastSentMessage: String?
    var lastAcceptedRequestId: String?
    var lastDeclinedRequestId: String?
    var lastRemovedFriendId: String?

    func fetchFriends() async throws -> [Friend] {
        fetchFriendsCallCount += 1
        if shouldThrowOnFetch {
            throw APIError.networkError(NSError(domain: "test", code: -1))
        }
        return mockFriends
    }

    func fetchFriendRequests() async throws -> [FriendRequest] {
        fetchRequestsCallCount += 1
        if shouldThrowOnFetch {
            throw APIError.networkError(NSError(domain: "test", code: -1))
        }
        return mockFriendRequests
    }

    func sendFriendRequest(toUsername: String, message: String?) async throws -> FriendRequest {
        sendRequestCallCount += 1
        lastSentUsername = toUsername
        lastSentMessage = message
        if shouldThrowOnSend {
            throw APIError.notFound
        }
        return mockSentRequest ?? FriendRequest(
            id: "req-new",
            fromUserId: "user-me",
            fromDisplayName: "Me",
            fromEmail: nil,
            fromAvatarUrl: nil,
            toUserId: "user-other",
            status: .pending,
            createdAt: Date(),
            updatedAt: Date(),
            message: message
        )
    }

    func sendFriendRequestByQR(userId: String, publicKey: String) async throws -> FriendRequest {
        sendRequestByQRCallCount += 1
        if shouldThrowOnSend {
            throw APIError.notFound
        }
        return mockSentRequest ?? FriendRequest(
            id: "req-qr",
            fromUserId: "user-me",
            fromDisplayName: "Me",
            fromEmail: nil,
            fromAvatarUrl: nil,
            toUserId: userId,
            status: .pending,
            createdAt: Date(),
            updatedAt: Date(),
            message: nil
        )
    }

    func acceptFriendRequest(requestId: String) async throws -> Friend {
        acceptRequestCallCount += 1
        lastAcceptedRequestId = requestId
        if shouldThrowOnAccept {
            throw APIError.serverError(statusCode: 500)
        }
        return mockAcceptedFriend ?? Friend(
            id: "friend-accepted",
            userId: "user-accepted",
            displayName: "Accepted Friend",
            email: nil,
            avatarUrl: nil,
            status: .online,
            friendsSince: Date(),
            lastSeenAt: nil,
            sharedSessionCount: 0
        )
    }

    func declineFriendRequest(requestId: String) async throws {
        declineRequestCallCount += 1
        lastDeclinedRequestId = requestId
        if shouldThrowOnDecline {
            throw APIError.serverError(statusCode: 500)
        }
    }

    func removeFriend(friendId: String) async throws {
        removeFriendCallCount += 1
        lastRemovedFriendId = friendId
        if shouldThrowOnRemove {
            throw APIError.serverError(statusCode: 500)
        }
    }
}

// MARK: - Tests

final class FriendsViewModelTests: XCTestCase {

    private var mockAPI: MockFriendsAPIService!
    private var viewModel: FriendsViewModel!

    @MainActor
    override func setUp() {
        super.setUp()
        mockAPI = MockFriendsAPIService()
        viewModel = FriendsViewModel(
            apiService: mockAPI,
            currentUserId: "user-me"
        )
    }

    override func tearDown() {
        mockAPI = nil
        viewModel = nil
        super.tearDown()
    }

    // MARK: - Load Friends Tests

    @MainActor
    func testLoadFriendsSuccess() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = FriendRequest.samples

        // Act
        await viewModel.loadFriends()

        // Assert
        XCTAssertTrue(viewModel.hasLoaded)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertEqual(viewModel.friends.count, 3)
        XCTAssertEqual(viewModel.friendRequests.count, 2)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(mockAPI.fetchFriendsCallCount, 1)
        XCTAssertEqual(mockAPI.fetchRequestsCallCount, 1)
    }

    @MainActor
    func testLoadFriendsFailure() async {
        // Arrange
        mockAPI.shouldThrowOnFetch = true

        // Act
        await viewModel.loadFriends()

        // Assert
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertTrue(viewModel.showError)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.friends.count, 0)
    }

    @MainActor
    func testLoadFriendsSortsOnlineFirst() async {
        // Arrange
        let offlineFriend = Friend(
            id: "f1", userId: "u1", displayName: "Alice",
            status: .offline, friendsSince: Date(), sharedSessionCount: 0
        )
        let onlineFriend = Friend(
            id: "f2", userId: "u2", displayName: "Bob",
            status: .online, friendsSince: Date(), sharedSessionCount: 0
        )
        let inSessionFriend = Friend(
            id: "f3", userId: "u3", displayName: "Carol",
            status: .inSession, friendsSince: Date(), sharedSessionCount: 0
        )
        mockAPI.mockFriends = [offlineFriend, onlineFriend, inSessionFriend]
        mockAPI.mockFriendRequests = []

        // Act
        await viewModel.loadFriends()

        // Assert - should be sorted: inSession, online, offline
        XCTAssertEqual(viewModel.friends[0].id, "f3") // Carol - in session
        XCTAssertEqual(viewModel.friends[1].id, "f2") // Bob - online
        XCTAssertEqual(viewModel.friends[2].id, "f1") // Alice - offline
    }

    // MARK: - Filter Tests

    @MainActor
    func testFilterByOnline() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Act
        viewModel.statusFilter = .online

        // Assert - online and inSession friends only
        let filtered = viewModel.filteredFriends
        XCTAssertTrue(filtered.allSatisfy { $0.status == .online || $0.status == .inSession })
    }

    @MainActor
    func testFilterByOffline() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Act
        viewModel.statusFilter = .offline

        // Assert
        let filtered = viewModel.filteredFriends
        XCTAssertTrue(filtered.allSatisfy { $0.status == .offline })
    }

    @MainActor
    func testSearchFilter() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Act
        viewModel.searchText = "Alice"

        // Assert
        let filtered = viewModel.filteredFriends
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered.first?.displayName, "Alice Developer")
    }

    @MainActor
    func testSearchFilterByEmail() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Act
        viewModel.searchText = "bob@example"

        // Assert
        let filtered = viewModel.filteredFriends
        XCTAssertEqual(filtered.count, 1)
        XCTAssertEqual(filtered.first?.displayName, "Bob Engineer")
    }

    // MARK: - Computed Properties Tests

    @MainActor
    func testOnlineFriendCount() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Assert - "Alice Developer" is online, "Carol Coder" is in session
        XCTAssertEqual(viewModel.onlineFriendCount, 2)
    }

    @MainActor
    func testPendingRequestCount() async {
        // Arrange
        mockAPI.mockFriends = []
        mockAPI.mockFriendRequests = [FriendRequest.sampleIncoming]
        await viewModel.loadFriends()

        // Assert
        XCTAssertEqual(viewModel.pendingRequestCount, 1)
        XCTAssertEqual(viewModel.incomingRequests.count, 1)
    }

    @MainActor
    func testOutgoingRequests() async {
        // Arrange
        mockAPI.mockFriends = []
        mockAPI.mockFriendRequests = [FriendRequest.sampleOutgoing]
        await viewModel.loadFriends()

        // Assert
        XCTAssertEqual(viewModel.outgoingRequests.count, 1)
        XCTAssertEqual(viewModel.incomingRequests.count, 0)
    }

    @MainActor
    func testEmptyState() async {
        // Arrange
        mockAPI.mockFriends = []
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Assert
        XCTAssertTrue(viewModel.isEmptyState)
    }

    // MARK: - Send Friend Request Tests

    @MainActor
    func testSendFriendRequestSuccess() async {
        // Act
        await viewModel.sendFriendRequest(toUsername: "alice", message: "Hello!")

        // Assert
        XCTAssertFalse(viewModel.isSendingRequest)
        XCTAssertEqual(mockAPI.sendRequestCallCount, 1)
        XCTAssertEqual(mockAPI.lastSentUsername, "alice")
        XCTAssertEqual(mockAPI.lastSentMessage, "Hello!")
        XCTAssertEqual(viewModel.friendRequests.count, 1)
        XCTAssertTrue(viewModel.showConfirmation)
        XCTAssertNotNil(viewModel.confirmationMessage)
    }

    @MainActor
    func testSendFriendRequestFailure() async {
        // Arrange
        mockAPI.shouldThrowOnSend = true

        // Act
        await viewModel.sendFriendRequest(toUsername: "nonexistent")

        // Assert
        XCTAssertFalse(viewModel.isSendingRequest)
        XCTAssertTrue(viewModel.showError)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.friendRequests.count, 0)
    }

    @MainActor
    func testSendFriendRequestByQR() async {
        // Act
        await viewModel.sendFriendRequestByQR(userId: "user-123", publicKey: "key-abc")

        // Assert
        XCTAssertFalse(viewModel.isSendingRequest)
        XCTAssertEqual(mockAPI.sendRequestByQRCallCount, 1)
        XCTAssertEqual(viewModel.friendRequests.count, 1)
        XCTAssertTrue(viewModel.showConfirmation)
    }

    // MARK: - Accept/Decline Request Tests

    @MainActor
    func testAcceptRequestSuccess() async {
        // Arrange
        let request = FriendRequest.sampleIncoming
        mockAPI.mockFriendRequests = [request]
        await viewModel.loadFriends()

        // Act
        await viewModel.acceptRequest(request)

        // Assert
        XCTAssertEqual(mockAPI.acceptRequestCallCount, 1)
        XCTAssertEqual(mockAPI.lastAcceptedRequestId, request.id)
        XCTAssertEqual(viewModel.friends.count, 1) // New friend added
        XCTAssertTrue(viewModel.friendRequests.isEmpty) // Request removed
        XCTAssertTrue(viewModel.showConfirmation)
    }

    @MainActor
    func testAcceptRequestFailure() async {
        // Arrange
        mockAPI.shouldThrowOnAccept = true
        let request = FriendRequest.sampleIncoming

        // Act
        await viewModel.acceptRequest(request)

        // Assert
        XCTAssertTrue(viewModel.showError)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    @MainActor
    func testDeclineRequestSuccess() async {
        // Arrange
        let request = FriendRequest.sampleIncoming
        mockAPI.mockFriendRequests = [request]
        await viewModel.loadFriends()

        // Act
        await viewModel.declineRequest(request)

        // Assert
        XCTAssertEqual(mockAPI.declineRequestCallCount, 1)
        XCTAssertEqual(mockAPI.lastDeclinedRequestId, request.id)
        XCTAssertTrue(viewModel.friendRequests.isEmpty) // Request removed
    }

    // MARK: - Remove Friend Tests

    @MainActor
    func testRemoveFriendSuccess() async {
        // Arrange
        mockAPI.mockFriends = [Friend.sample]
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Act
        await viewModel.removeFriend(Friend.sample)

        // Assert
        XCTAssertEqual(mockAPI.removeFriendCallCount, 1)
        XCTAssertEqual(mockAPI.lastRemovedFriendId, Friend.sample.id)
        XCTAssertTrue(viewModel.friends.isEmpty)
    }

    @MainActor
    func testRemoveFriendFailure() async {
        // Arrange
        mockAPI.shouldThrowOnRemove = true
        mockAPI.mockFriends = [Friend.sample]
        mockAPI.mockFriendRequests = []
        await viewModel.loadFriends()

        // Act
        await viewModel.removeFriend(Friend.sample)

        // Assert
        XCTAssertTrue(viewModel.showError)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.friends.count, 1) // Friend not removed on failure
    }

    // MARK: - Dismiss Tests

    @MainActor
    func testDismissError() {
        // Arrange
        viewModel.errorMessage = "Test error"
        viewModel.showError = true

        // Act
        viewModel.dismissError()

        // Assert
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    @MainActor
    func testDismissConfirmation() {
        // Arrange
        viewModel.confirmationMessage = "Test confirmation"
        viewModel.showConfirmation = true

        // Act
        viewModel.dismissConfirmation()

        // Assert
        XCTAssertNil(viewModel.confirmationMessage)
        XCTAssertFalse(viewModel.showConfirmation)
    }

    // MARK: - Refresh Tests

    @MainActor
    func testRefreshCallsLoadFriends() async {
        // Arrange
        mockAPI.mockFriends = Friend.samples
        mockAPI.mockFriendRequests = []

        // Act
        await viewModel.refresh()

        // Assert
        XCTAssertEqual(mockAPI.fetchFriendsCallCount, 1)
        XCTAssertTrue(viewModel.hasLoaded)
    }
}

// MARK: - Friend Model Tests

final class FriendModelTests: XCTestCase {

    func testFriendIsOnline() {
        let friend = Friend(
            id: "f1", userId: "u1", displayName: "Test",
            status: .online, friendsSince: Date(), sharedSessionCount: 0
        )
        XCTAssertTrue(friend.isOnline)
    }

    func testFriendIsNotOnlineWhenOffline() {
        let friend = Friend(
            id: "f1", userId: "u1", displayName: "Test",
            status: .offline, friendsSince: Date(), sharedSessionCount: 0
        )
        XCTAssertFalse(friend.isOnline)
    }

    func testFriendIsNotOnlineWhenInSession() {
        let friend = Friend(
            id: "f1", userId: "u1", displayName: "Test",
            status: .inSession, friendsSince: Date(), sharedSessionCount: 0
        )
        XCTAssertFalse(friend.isOnline)
    }

    func testFriendStatusDisplayText() {
        XCTAssertEqual(FriendStatus.online.displayText, "Online")
        XCTAssertEqual(FriendStatus.away.displayText, "Away")
        XCTAssertEqual(FriendStatus.inSession.displayText, "In Session")
        XCTAssertEqual(FriendStatus.offline.displayText, "Offline")
    }

    func testFriendCodableRoundTrip() throws {
        let friend = Friend.sample
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(friend)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(Friend.self, from: data)

        XCTAssertEqual(friend.id, decoded.id)
        XCTAssertEqual(friend.userId, decoded.userId)
        XCTAssertEqual(friend.displayName, decoded.displayName)
        XCTAssertEqual(friend.status, decoded.status)
    }
}

// MARK: - Friend Request Model Tests

final class FriendRequestModelTests: XCTestCase {

    func testRequestDirectionSent() {
        let request = FriendRequest.sampleOutgoing
        let direction = request.direction(for: "user-me")
        XCTAssertEqual(direction, .sent)
    }

    func testRequestDirectionReceived() {
        let request = FriendRequest.sampleIncoming
        let direction = request.direction(for: "user-me")
        XCTAssertEqual(direction, .received)
    }

    func testRequestCodableRoundTrip() throws {
        let request = FriendRequest.sampleIncoming
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(request)

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let decoded = try decoder.decode(FriendRequest.self, from: data)

        XCTAssertEqual(request.id, decoded.id)
        XCTAssertEqual(request.fromUserId, decoded.fromUserId)
        XCTAssertEqual(request.status, decoded.status)
    }
}
