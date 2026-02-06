//
//  SessionViewModelTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
import Combine
@testable import Happy

// MARK: - Mock API Service

/// Mock API service for testing session ViewModels.
actor MockSessionAPIService: APIServiceProtocol {

    var sessionsToReturn: [Session] = []
    var messagesToReturn: [Message] = []
    var sessionToReturn: Session?
    var errorToThrow: Error?
    var fetchSessionsCallCount = 0
    var fetchMessagesCallCount = 0
    var fetchSessionCallCount = 0

    func setSessionsToReturn(_ sessions: [Session]) {
        sessionsToReturn = sessions
    }

    func setMessagesToReturn(_ messages: [Message]) {
        messagesToReturn = messages
    }

    func setSessionToReturn(_ session: Session) {
        sessionToReturn = session
    }

    func setErrorToThrow(_ error: Error?) {
        errorToThrow = error
    }

    func fetchSessions() async throws -> [Session] {
        fetchSessionsCallCount += 1
        if let error = errorToThrow { throw error }
        return sessionsToReturn
    }

    func fetchSession(id: String) async throws -> Session {
        fetchSessionCallCount += 1
        if let error = errorToThrow { throw error }
        return sessionToReturn ?? .empty
    }

    func fetchMessages(sessionId: String) async throws -> [Message] {
        fetchMessagesCallCount += 1
        if let error = errorToThrow { throw error }
        return messagesToReturn
    }
}

// MARK: - SessionListViewModel Tests

final class SessionListViewModelTests: XCTestCase {

    var mockAPI: MockSessionAPIService!
    var viewModel: SessionListViewModel!
    var cancellables: Set<AnyCancellable>!

    @MainActor
    override func setUp() {
        super.setUp()
        mockAPI = MockSessionAPIService()
        viewModel = SessionListViewModel(apiService: mockAPI)
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() {
        cancellables = nil
        viewModel = nil
        mockAPI = nil
        super.tearDown()
    }

    // MARK: - Initial State

    @MainActor
    func testInitialState() {
        XCTAssertTrue(viewModel.sessions.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.hasLoaded)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
        XCTAssertEqual(viewModel.filter, .all)
        XCTAssertTrue(viewModel.searchText.isEmpty)
    }

    // MARK: - Load Sessions

    @MainActor
    func testLoadSessionsSuccess() async {
        let sessions = [
            Session(
                id: "s1", title: "Session 1", status: .active,
                machineId: "m1", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s2", title: "Session 2", status: .completed,
                machineId: "m2", createdAt: Date(),
                updatedAt: Date().addingTimeInterval(-3600)
            ),
        ]
        await mockAPI.setSessionsToReturn(sessions)

        await viewModel.loadSessions()

        XCTAssertEqual(viewModel.sessions.count, 2)
        XCTAssertTrue(viewModel.hasLoaded)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        // Most recent first
        XCTAssertEqual(viewModel.sessions.first?.id, "s1")
    }

    @MainActor
    func testLoadSessionsFailure() async {
        await mockAPI.setErrorToThrow(APIError.networkError(
            NSError(domain: "test", code: -1)
        ))

        await viewModel.loadSessions()

        XCTAssertTrue(viewModel.sessions.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.showError)
    }

    // MARK: - Filtering

    @MainActor
    func testFilterByActive() async {
        let sessions = [
            Session(
                id: "s1", title: "Active", status: .active,
                machineId: "m1", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s2", title: "Completed", status: .completed,
                machineId: "m2", createdAt: Date(), updatedAt: Date()
            ),
        ]
        await mockAPI.setSessionsToReturn(sessions)
        await viewModel.loadSessions()

        viewModel.filter = .active

        XCTAssertEqual(viewModel.filteredSessions.count, 1)
        XCTAssertEqual(viewModel.filteredSessions.first?.id, "s1")
    }

    @MainActor
    func testFilterByCompleted() async {
        let sessions = [
            Session(
                id: "s1", title: "Active", status: .active,
                machineId: "m1", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s2", title: "Completed", status: .completed,
                machineId: "m2", createdAt: Date(), updatedAt: Date()
            ),
        ]
        await mockAPI.setSessionsToReturn(sessions)
        await viewModel.loadSessions()

        viewModel.filter = .completed

        XCTAssertEqual(viewModel.filteredSessions.count, 1)
        XCTAssertEqual(viewModel.filteredSessions.first?.id, "s2")
    }

    @MainActor
    func testSearchFilter() async {
        let sessions = [
            Session(
                id: "s1", title: "Fix authentication", status: .active,
                machineId: "m1", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s2", title: "Update database", status: .active,
                machineId: "m2", createdAt: Date(), updatedAt: Date()
            ),
        ]
        await mockAPI.setSessionsToReturn(sessions)
        await viewModel.loadSessions()

        viewModel.searchText = "auth"

        XCTAssertEqual(viewModel.filteredSessions.count, 1)
        XCTAssertEqual(viewModel.filteredSessions.first?.id, "s1")
    }

    @MainActor
    func testSearchWithFilterCombined() async {
        let sessions = [
            Session(
                id: "s1", title: "Fix auth", status: .active,
                machineId: "m1", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s2", title: "Fix auth (old)", status: .completed,
                machineId: "m2", createdAt: Date(), updatedAt: Date()
            ),
        ]
        await mockAPI.setSessionsToReturn(sessions)
        await viewModel.loadSessions()

        viewModel.filter = .active
        viewModel.searchText = "auth"

        XCTAssertEqual(viewModel.filteredSessions.count, 1)
        XCTAssertEqual(viewModel.filteredSessions.first?.id, "s1")
    }

    // MARK: - Active Session Count

    @MainActor
    func testActiveSessionCount() async {
        let sessions = [
            Session(
                id: "s1", title: "Active 1", status: .active,
                machineId: "m1", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s2", title: "Active 2", status: .active,
                machineId: "m2", createdAt: Date(), updatedAt: Date()
            ),
            Session(
                id: "s3", title: "Done", status: .completed,
                machineId: "m3", createdAt: Date(), updatedAt: Date()
            ),
        ]
        await mockAPI.setSessionsToReturn(sessions)
        await viewModel.loadSessions()

        XCTAssertEqual(viewModel.activeSessionCount, 2)
    }

    // MARK: - Empty State

    @MainActor
    func testEmptyStateAfterLoad() async {
        await mockAPI.setSessionsToReturn([])
        await viewModel.loadSessions()

        XCTAssertTrue(viewModel.isEmptyState)
    }

    @MainActor
    func testNotEmptyStateBeforeLoad() {
        XCTAssertFalse(viewModel.isEmptyState)
    }

    // MARK: - Error Dismissal

    @MainActor
    func testDismissError() async {
        await mockAPI.setErrorToThrow(APIError.unauthorized)
        await viewModel.loadSessions()

        XCTAssertTrue(viewModel.showError)

        viewModel.dismissError()

        XCTAssertFalse(viewModel.showError)
        XCTAssertNil(viewModel.errorMessage)
    }
}

// MARK: - SessionDetailViewModel Tests

final class SessionDetailViewModelTests: XCTestCase {

    var mockAPI: MockSessionAPIService!
    var viewModel: SessionDetailViewModel!
    var cancellables: Set<AnyCancellable>!

    @MainActor
    override func setUp() {
        super.setUp()
        mockAPI = MockSessionAPIService()
        let session = Session(
            id: "test-session",
            title: "Test Session",
            status: .active,
            machineId: "test-machine",
            createdAt: Date(),
            updatedAt: Date()
        )
        viewModel = SessionDetailViewModel(session: session, apiService: mockAPI)
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() {
        cancellables = nil
        viewModel = nil
        mockAPI = nil
        super.tearDown()
    }

    // MARK: - Initial State

    @MainActor
    func testInitialState() {
        XCTAssertEqual(viewModel.session.id, "test-session")
        XCTAssertTrue(viewModel.messages.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.hasLoaded)
        XCTAssertFalse(viewModel.isStreaming)
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Load Messages

    @MainActor
    func testLoadMessagesSuccess() async {
        let messages = [
            Message(
                id: "m1", role: .user,
                content: "Hello", createdAt: Date(),
                cost: nil, isStreaming: false, toolUses: nil
            ),
            Message(
                id: "m2", role: .assistant,
                content: "Hi there!", createdAt: Date().addingTimeInterval(1),
                cost: MessageCost(inputTokens: 10, outputTokens: 20, totalCostUSD: 0.001),
                isStreaming: false, toolUses: nil
            ),
        ]
        await mockAPI.setMessagesToReturn(messages)

        await viewModel.loadMessages()

        XCTAssertEqual(viewModel.messages.count, 2)
        XCTAssertTrue(viewModel.hasLoaded)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertFalse(viewModel.isStreaming)
        // Oldest first
        XCTAssertEqual(viewModel.messages.first?.id, "m1")
    }

    @MainActor
    func testLoadMessagesFailure() async {
        await mockAPI.setErrorToThrow(APIError.notFound)

        await viewModel.loadMessages()

        XCTAssertTrue(viewModel.messages.isEmpty)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.showError)
    }

    // MARK: - Streaming Detection

    @MainActor
    func testStreamingDetection() async {
        let messages = [
            Message(
                id: "m1", role: .user,
                content: "Help me", createdAt: Date(),
                cost: nil, isStreaming: false, toolUses: nil
            ),
            Message(
                id: "m2", role: .assistant,
                content: "Working on it...", createdAt: Date(),
                cost: nil, isStreaming: true, toolUses: nil
            ),
        ]
        await mockAPI.setMessagesToReturn(messages)

        await viewModel.loadMessages()

        XCTAssertTrue(viewModel.isStreaming)
    }

    // MARK: - Cost Calculation

    @MainActor
    func testTotalCostCalculation() async {
        let messages = [
            Message(
                id: "m1", role: .assistant,
                content: "Response 1", createdAt: Date(),
                cost: MessageCost(inputTokens: 100, outputTokens: 200, totalCostUSD: 0.005),
                isStreaming: false, toolUses: nil
            ),
            Message(
                id: "m2", role: .assistant,
                content: "Response 2", createdAt: Date(),
                cost: MessageCost(inputTokens: 150, outputTokens: 300, totalCostUSD: 0.008),
                isStreaming: false, toolUses: nil
            ),
        ]
        await mockAPI.setMessagesToReturn(messages)

        await viewModel.loadMessages()

        XCTAssertEqual(viewModel.totalCost, 0.013, accuracy: 0.0001)
        XCTAssertEqual(viewModel.totalInputTokens, 250)
        XCTAssertEqual(viewModel.totalOutputTokens, 500)
        XCTAssertEqual(viewModel.formattedTotalCost, "$0.0130")
    }

    @MainActor
    func testZeroCostFormatting() {
        XCTAssertEqual(viewModel.formattedTotalCost, "-")
    }

    // MARK: - Has Messages

    @MainActor
    func testHasMessagesTrue() async {
        let messages = [
            Message(
                id: "m1", role: .user,
                content: "Hello", createdAt: Date(),
                cost: nil, isStreaming: false, toolUses: nil
            ),
        ]
        await mockAPI.setMessagesToReturn(messages)

        await viewModel.loadMessages()

        XCTAssertTrue(viewModel.hasMessages)
    }

    @MainActor
    func testHasMessagesFalse() {
        XCTAssertFalse(viewModel.hasMessages)
    }

    // MARK: - Error Dismissal

    @MainActor
    func testDismissError() async {
        await mockAPI.setErrorToThrow(APIError.unauthorized)
        await viewModel.loadMessages()

        XCTAssertTrue(viewModel.showError)

        viewModel.dismissError()

        XCTAssertFalse(viewModel.showError)
        XCTAssertNil(viewModel.errorMessage)
    }
}

// MARK: - SessionFilter Tests

final class SessionFilterTests: XCTestCase {

    func testAllFilterCases() {
        XCTAssertEqual(SessionFilter.allCases.count, 3)
        XCTAssertEqual(SessionFilter.all.rawValue, "All")
        XCTAssertEqual(SessionFilter.active.rawValue, "Active")
        XCTAssertEqual(SessionFilter.completed.rawValue, "Completed")
    }

    func testFilterIdentifiable() {
        XCTAssertEqual(SessionFilter.all.id, "All")
        XCTAssertEqual(SessionFilter.active.id, "Active")
        XCTAssertEqual(SessionFilter.completed.id, "Completed")
    }
}
