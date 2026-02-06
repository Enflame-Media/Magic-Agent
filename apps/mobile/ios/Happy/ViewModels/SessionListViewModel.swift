//
//  SessionListViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for the session list screen.
///
/// Manages fetching, filtering, and real-time updates of Claude Code sessions.
/// Uses `ObservableObject` for iOS 16 compatibility.
final class SessionListViewModel: ObservableObject {

    // MARK: - Published Properties

    /// All sessions fetched from the server, sorted by most recent first.
    @Published private(set) var sessions: [Session] = []

    /// Whether a network request is in progress.
    @Published private(set) var isLoading: Bool = false

    /// Whether the initial load has completed (used to distinguish empty state from loading).
    @Published private(set) var hasLoaded: Bool = false

    /// The current error message, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// The current filter applied to the session list.
    @Published var filter: SessionFilter = .all

    /// Text entered in the search bar.
    @Published var searchText: String = ""

    /// WebSocket connection status.
    @Published private(set) var connectionStatus: SyncConnectionStatus = .disconnected

    // MARK: - Computed Properties

    /// Sessions filtered by the current filter and search text.
    var filteredSessions: [Session] {
        var result = sessions

        // Apply status filter
        switch filter {
        case .all:
            break
        case .active:
            result = result.filter { $0.status == .active }
        case .completed:
            result = result.filter { $0.status == .completed }
        }

        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText)
            }
        }

        return result
    }

    /// Active sessions count for badge display.
    var activeSessionCount: Int {
        sessions.filter { $0.isActive }.count
    }

    /// Whether the session list is empty after filtering.
    var isEmptyState: Bool {
        hasLoaded && filteredSessions.isEmpty
    }

    // MARK: - Dependencies

    private let apiService: any APIServiceProtocol
    private let syncService: SyncService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    /// Creates a new session list view model.
    ///
    /// - Parameters:
    ///   - apiService: The API service for fetching sessions. Defaults to the shared instance.
    ///   - syncService: The sync service for real-time updates. Defaults to the shared instance.
    init(apiService: any APIServiceProtocol = APIService.shared, syncService: SyncService = .shared) {
        self.apiService = apiService
        self.syncService = syncService
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Fetches the session list from the server.
    ///
    /// Sets `isLoading` during the request and updates `sessions` on success.
    /// On failure, sets `errorMessage` and `showError`.
    @MainActor
    func loadSessions() async {
        isLoading = true
        errorMessage = nil

        do {
            let fetchedSessions = try await apiService.fetchSessions()
            sessions = fetchedSessions.sorted { $0.updatedAt > $1.updatedAt }
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    /// Refreshes the session list (pull-to-refresh).
    @MainActor
    func refresh() async {
        await loadSessions()
    }

    /// Connects to the WebSocket sync service for real-time updates.
    @MainActor
    func connectSync() async {
        do {
            try await syncService.connect()
        } catch {
            #if DEBUG
            print("[SessionListViewModel] Failed to connect sync: \(error)")
            #endif
        }
    }

    /// Disconnects from the WebSocket sync service.
    func disconnectSync() async {
        await syncService.disconnect()
    }

    /// Dismisses the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    // MARK: - Private Methods

    /// Sets up Combine subscriptions for real-time session updates.
    private func setupSubscriptions() {
        // Subscribe to session updates from the sync service
        syncService.sessionUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] updatedSession in
                Task { @MainActor in
                    self?.handleSessionUpdate(updatedSession)
                }
            }
            .store(in: &cancellables)

        // Subscribe to connection status changes
        syncService.connectionStatus
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                Task { @MainActor in
                    self?.connectionStatus = status
                }
            }
            .store(in: &cancellables)
    }

    /// Handles a real-time session update from the sync service.
    ///
    /// If the session already exists in the list, it is updated in place.
    /// Otherwise, the new session is inserted at the top.
    ///
    /// - Parameter updatedSession: The session update received from the server.
    @MainActor
    private func handleSessionUpdate(_ updatedSession: Session) {
        if let index = sessions.firstIndex(where: { $0.id == updatedSession.id }) {
            sessions[index] = updatedSession
        } else {
            sessions.insert(updatedSession, at: 0)
        }

        // Re-sort by most recent
        sessions.sort { $0.updatedAt > $1.updatedAt }
    }
}

// MARK: - Session Filter

/// Filter options for the session list.
enum SessionFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case active = "Active"
    case completed = "Completed"

    var id: String { rawValue }
}
