//
//  SessionDetailViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for the session detail screen.
///
/// Manages fetching messages, subscribing to real-time updates for a specific
/// session, and handling session state changes.
/// Uses `ObservableObject` for iOS 16 compatibility.
final class SessionDetailViewModel: ObservableObject {

    // MARK: - Published Properties

    /// The session being viewed.
    @Published private(set) var session: Session

    /// Messages in the session, ordered chronologically (oldest first).
    @Published private(set) var messages: [Message] = []

    /// Whether a network request is in progress.
    @Published private(set) var isLoading: Bool = false

    /// Whether the initial load has completed.
    @Published private(set) var hasLoaded: Bool = false

    /// The current error message, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// Whether the session is currently streaming a response.
    @Published private(set) var isStreaming: Bool = false

    // MARK: - Computed Properties

    /// Total cost of the session across all messages.
    var totalCost: Double {
        messages.compactMap { $0.cost?.totalCostUSD }.reduce(0, +)
    }

    /// Formatted total cost string.
    var formattedTotalCost: String {
        if totalCost > 0 {
            return String(format: "$%.4f", totalCost)
        }
        return "-"
    }

    /// Total input tokens across all messages.
    var totalInputTokens: Int {
        messages.compactMap { $0.cost?.inputTokens }.reduce(0, +)
    }

    /// Total output tokens across all messages.
    var totalOutputTokens: Int {
        messages.compactMap { $0.cost?.outputTokens }.reduce(0, +)
    }

    /// Whether there are any messages to display.
    var hasMessages: Bool {
        !messages.isEmpty
    }

    // MARK: - Dependencies

    private let apiService: any APIServiceProtocol
    private let syncService: SyncService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    /// Creates a new session detail view model.
    ///
    /// - Parameters:
    ///   - session: The session to display.
    ///   - apiService: The API service for fetching messages. Defaults to the shared instance.
    ///   - syncService: The sync service for real-time updates. Defaults to the shared instance.
    init(
        session: Session,
        apiService: any APIServiceProtocol = APIService.shared,
        syncService: SyncService = .shared
    ) {
        self.session = session
        self.apiService = apiService
        self.syncService = syncService
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Fetches messages for the session from the server.
    ///
    /// Sets `isLoading` during the request and updates `messages` on success.
    /// On failure, sets `errorMessage` and `showError`.
    @MainActor
    func loadMessages() async {
        isLoading = true
        errorMessage = nil

        do {
            let fetchedMessages = try await apiService.fetchMessages(sessionId: session.id)
            messages = fetchedMessages.sorted { $0.createdAt < $1.createdAt }
            hasLoaded = true

            // Check if any message is currently streaming
            isStreaming = messages.contains { $0.isStreaming }
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    /// Refreshes messages (pull-to-refresh).
    @MainActor
    func refresh() async {
        await loadMessages()
    }

    /// Subscribes to real-time updates for this session.
    @MainActor
    func subscribeToUpdates() async {
        do {
            try await syncService.subscribe(to: session.id)
        } catch {
            #if DEBUG
            print("[SessionDetailViewModel] Failed to subscribe: \(error)")
            #endif
        }
    }

    /// Unsubscribes from real-time updates for this session.
    func unsubscribeFromUpdates() async {
        do {
            try await syncService.unsubscribe(from: session.id)
        } catch {
            #if DEBUG
            print("[SessionDetailViewModel] Failed to unsubscribe: \(error)")
            #endif
        }
    }

    /// Refreshes the session metadata from the server.
    @MainActor
    func refreshSession() async {
        do {
            let updatedSession = try await apiService.fetchSession(id: session.id)
            session = updatedSession
        } catch {
            #if DEBUG
            print("[SessionDetailViewModel] Failed to refresh session: \(error)")
            #endif
        }
    }

    /// Dismisses the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    // MARK: - Private Methods

    /// Sets up Combine subscriptions for real-time updates.
    private func setupSubscriptions() {
        // Subscribe to message updates for this session
        syncService.messageUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                Task { @MainActor in
                    self?.handleMessageUpdate(message)
                }
            }
            .store(in: &cancellables)

        // Subscribe to session updates (status changes, etc.)
        syncService.sessionUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updatedSession in
                Task { @MainActor in
                    guard let self = self else { return }
                    if updatedSession.id == self.session.id {
                        self.session = updatedSession
                    }
                }
            }
            .store(in: &cancellables)
    }

    /// Handles a real-time message update.
    ///
    /// If the message already exists, it is updated in place (supporting streaming).
    /// Otherwise, the new message is appended.
    ///
    /// - Parameter message: The message update received from the server.
    @MainActor
    private func handleMessageUpdate(_ message: Message) {
        if let index = messages.firstIndex(where: { $0.id == message.id }) {
            messages[index] = message
        } else {
            messages.append(message)
        }

        // Update streaming state
        isStreaming = messages.contains { $0.isStreaming }
    }
}
