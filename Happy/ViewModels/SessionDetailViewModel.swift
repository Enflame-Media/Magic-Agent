//
//  SessionDetailViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for the session detail view.
///
/// Manages message display, scrolling, and interactions for a single session.
@Observable
final class SessionDetailViewModel {
    // MARK: - State

    /// The session being displayed.
    var session: Session

    /// Messages in this session (decrypted).
    var messages: [Message] = []

    /// Whether messages are loading.
    var isLoading = false

    /// Error message if decryption or loading fails.
    var errorMessage: String?

    /// Whether auto-scroll to bottom is enabled.
    var autoScrollEnabled = true

    /// The currently streaming message ID, if any.
    var streamingMessageId: String?

    // MARK: - Computed Properties

    /// Whether the session is currently active.
    var isActive: Bool {
        session.isActive
    }

    /// Total cost for this session.
    var totalCost: Double {
        messages.compactMap { $0.cost?.totalCostUSD }.reduce(0, +)
    }

    /// Formatted total cost string.
    var formattedTotalCost: String {
        String(format: "$%.4f", totalCost)
    }

    /// Total input tokens.
    var totalInputTokens: Int {
        messages.compactMap { $0.cost?.inputTokens }.reduce(0, +)
    }

    /// Total output tokens.
    var totalOutputTokens: Int {
        messages.compactMap { $0.cost?.outputTokens }.reduce(0, +)
    }

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()
    private let syncService: SyncService
    private let authService: AuthService

    // MARK: - Initialization

    init(
        session: Session,
        syncService: SyncService = .shared,
        authService: AuthService = .shared
    ) {
        self.session = session
        self.syncService = syncService
        self.authService = authService

        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Load and decrypt messages for this session.
    func loadMessages() async {
        isLoading = true
        errorMessage = nil

        do {
            // Subscribe to updates for this session
            try await syncService.subscribe(to: session.id)

            // TODO: Fetch initial messages from API
            // Messages will be pushed via WebSocket after subscription

            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
        }
    }

    /// Unsubscribe from session updates.
    func unsubscribe() async {
        do {
            try await syncService.unsubscribe(from: session.id)
        } catch {
            // Ignore unsubscribe errors
        }
    }

    /// Scroll to a specific message.
    /// - Parameter id: The message ID to scroll to.
    func scrollToMessage(id: String) {
        // Handled by the view via ScrollViewReader
    }

    /// Toggle auto-scroll behavior.
    func toggleAutoScroll() {
        autoScrollEnabled.toggle()
    }

    // MARK: - Private Methods

    private func setupSubscriptions() {
        // Listen for updates to our session
        syncService.sessionUpdates
            .receive(on: DispatchQueue.main)
            .filter { [weak self] s in s.id == self?.session.id }
            .sink { [weak self] updatedSession in
                self?.session = updatedSession
            }
            .store(in: &cancellables)
    }

    /// Decrypt and add a message.
    private func addMessage(_ encryptedData: Data) {
        do {
            let key = try authService.getEncryptionKey()
            let decryptedData = try EncryptionService.decrypt(encryptedData, with: key)
            let message = try JSONDecoder().decode(Message.self, from: decryptedData)

            if let index = messages.firstIndex(where: { $0.id == message.id }) {
                // Update existing message
                messages[index] = message
            } else {
                // Add new message
                messages.append(message)
            }

            // Track streaming
            if message.isStreaming {
                streamingMessageId = message.id
            } else if streamingMessageId == message.id {
                streamingMessageId = nil
            }
        } catch {
            errorMessage = "Failed to decrypt message: \(error.localizedDescription)"
        }
    }
}
