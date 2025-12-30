//
//  SessionViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

/// View model for managing session list and selection.
///
/// This class follows the MVVM pattern, providing an observable
/// data source for session-related views.
@Observable
final class SessionViewModel {
    // MARK: - Published Properties

    /// All available sessions.
    var sessions: [Session] = []

    /// Currently selected session.
    var selectedSession: Session?

    /// Whether sessions are being loaded.
    var isLoading = false

    /// Error message if load failed.
    var errorMessage: String?

    // MARK: - Dependencies

    // private let apiService: APIService
    // private let syncService: SyncService

    // MARK: - Initialization

    init() {
        // Dependencies will be injected here
    }

    // MARK: - Public Methods

    /// Load all sessions from the server.
    func loadSessions() async {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        // TODO: Implement API call
        // do {
        //     sessions = try await apiService.fetchSessions()
        // } catch {
        //     errorMessage = error.localizedDescription
        // }

        // Placeholder data for development
        sessions = [Session.sample]
    }

    /// Refresh sessions from the server.
    func refresh() async {
        await loadSessions()
    }

    /// Select a session.
    /// - Parameter session: The session to select.
    func select(_ session: Session) {
        selectedSession = session
    }
}
