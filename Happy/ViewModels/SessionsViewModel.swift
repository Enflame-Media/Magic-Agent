//
//  SessionsViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for the sessions list view.
///
/// Manages the list of sessions and handles selection, filtering,
/// and sync status updates.
@Observable
final class SessionsViewModel {
    // MARK: - Published State

    /// All sessions from the sync service.
    var sessions: [Session] = []

    /// Currently selected session.
    var selectedSession: Session?

    /// Current sync connection status.
    var syncStatus: SyncConnectionStatus = .disconnected

    /// Whether sessions are currently loading.
    var isLoading = false

    /// Error message if something went wrong.
    var errorMessage: String?

    /// Search query for filtering sessions.
    var searchQuery = ""

    // MARK: - Computed Properties

    /// Filtered sessions based on search query.
    var filteredSessions: [Session] {
        guard !searchQuery.isEmpty else { return sessions }
        return sessions.filter { session in
            session.title.localizedCaseInsensitiveContains(searchQuery)
        }
    }

    /// Active sessions only.
    var activeSessions: [Session] {
        sessions.filter { $0.isActive }
    }

    /// Sessions grouped by status.
    var groupedSessions: [SessionStatus: [Session]] {
        Dictionary(grouping: filteredSessions) { $0.status }
    }

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()
    private let syncService: SyncService

    // MARK: - Initialization

    init(syncService: SyncService = .shared) {
        self.syncService = syncService
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Connect to the sync service and start receiving updates.
    func connect() async {
        isLoading = true
        errorMessage = nil

        do {
            try await syncService.connect()
            isLoading = false
        } catch {
            isLoading = false
            errorMessage = error.localizedDescription
        }
    }

    /// Disconnect from the sync service.
    func disconnect() async {
        await syncService.disconnect()
    }

    /// Refresh the sessions list.
    func refresh() async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch sessions from the API
            let fetchedSessions = try await APIService.shared.fetchSessions()
            sessions = fetchedSessions.sorted { $0.updatedAt > $1.updatedAt }
        } catch let error as APIError {
            errorMessage = error.localizedDescription
        } catch {
            errorMessage = "Failed to load sessions: \(error.localizedDescription)"
        }

        isLoading = false
    }

    /// Select a session by ID.
    /// - Parameter id: The session ID to select.
    func selectSession(id: String) {
        selectedSession = sessions.first { $0.id == id }
    }

    /// Clear the current selection.
    func clearSelection() {
        selectedSession = nil
    }

    // MARK: - Private Methods

    private func setupSubscriptions() {
        // Subscribe to session updates
        syncService.sessionUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] session in
                self?.handleSessionUpdate(session)
            }
            .store(in: &cancellables)

        // Subscribe to connection status
        syncService.connectionStatus
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                self?.syncStatus = status
            }
            .store(in: &cancellables)
    }

    private func handleSessionUpdate(_ session: Session) {
        if let index = sessions.firstIndex(where: { $0.id == session.id }) {
            // Update existing session
            sessions[index] = session

            // Also update selected if it's the same
            if selectedSession?.id == session.id {
                selectedSession = session
            }
        } else {
            // Add new session
            sessions.insert(session, at: 0)
        }
    }
}
