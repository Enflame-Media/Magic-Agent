//
//  ArtifactViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import UIKit
import Combine

/// ViewModel for loading and managing artifacts for a session.
///
/// Handles fetching artifacts from the API, filtering, and sorting.
/// Uses `ObservableObject` for iOS 16 compatibility.
final class ArtifactViewModel: ObservableObject {

    // MARK: - Published Properties

    /// All artifacts for the session.
    @Published private(set) var artifacts: [Artifact] = []

    /// Whether a network request is in progress.
    @Published private(set) var isLoading: Bool = false

    /// Whether the initial load has completed.
    @Published private(set) var hasLoaded: Bool = false

    /// The current error message, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// The current type filter.
    @Published var typeFilter: ArtifactTypeFilter = .all

    /// The current search text.
    @Published var searchText: String = ""

    /// The currently selected artifact for detail view.
    @Published var selectedArtifact: Artifact?

    // MARK: - Computed Properties

    /// Artifacts filtered by the current type filter and search text.
    var filteredArtifacts: [Artifact] {
        var result = artifacts

        // Apply type filter
        switch typeFilter {
        case .all:
            break
        case .code:
            result = result.filter { $0.type == .code }
        case .document:
            result = result.filter { $0.type == .document }
        case .config:
            result = result.filter { $0.type == .config }
        case .image:
            result = result.filter { $0.type == .image }
        }

        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.displayName.localizedCaseInsensitiveContains(searchText) ||
                ($0.filePath?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return result
    }

    /// Whether the artifact list is empty after filtering.
    var isEmptyState: Bool {
        hasLoaded && filteredArtifacts.isEmpty
    }

    /// Total count of artifacts.
    var totalCount: Int {
        artifacts.count
    }

    /// Count of code artifacts.
    var codeCount: Int {
        artifacts.filter { $0.type == .code }.count
    }

    /// Count of document artifacts.
    var documentCount: Int {
        artifacts.filter { $0.type == .document }.count
    }

    // MARK: - Dependencies

    private let sessionId: String
    private let apiService: any APIServiceProtocol

    // MARK: - Initialization

    /// Creates a new artifact view model.
    ///
    /// - Parameters:
    ///   - sessionId: The ID of the session whose artifacts to load.
    ///   - apiService: The API service for fetching artifacts. Defaults to the shared instance.
    init(sessionId: String, apiService: any APIServiceProtocol = APIService.shared) {
        self.sessionId = sessionId
        self.apiService = apiService
    }

    // MARK: - Public Methods

    /// Fetches artifacts for the session from the server.
    ///
    /// Sets `isLoading` during the request and updates `artifacts` on success.
    /// On failure, sets `errorMessage` and `showError`.
    @MainActor
    func loadArtifacts() async {
        isLoading = true
        errorMessage = nil

        do {
            let fetchedArtifacts = try await apiService.fetchArtifacts(sessionId: sessionId)
            artifacts = fetchedArtifacts.sorted { $0.updatedAt > $1.updatedAt }
            hasLoaded = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    /// Refreshes artifacts (pull-to-refresh).
    @MainActor
    func refresh() async {
        await loadArtifacts()
    }

    /// Dismisses the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    /// Selects an artifact for detail viewing.
    ///
    /// - Parameter artifact: The artifact to select.
    @MainActor
    func selectArtifact(_ artifact: Artifact) {
        selectedArtifact = artifact
    }

    /// Copies artifact content to the clipboard.
    ///
    /// - Parameter artifact: The artifact whose content to copy.
    @MainActor
    func copyContent(of artifact: Artifact) {
        UIPasteboard.general.string = artifact.content
    }
}

// MARK: - ArtifactTypeFilter

/// Filter options for the artifact list.
enum ArtifactTypeFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case code = "Code"
    case document = "Documents"
    case config = "Config"
    case image = "Images"

    var id: String { rawValue }
}

// MARK: - APIServiceProtocol Extension

/// Extension to add artifact fetching to the API service protocol.
extension APIServiceProtocol {
    func fetchArtifacts(sessionId: String) async throws -> [Artifact] {
        // Default implementation for protocol conformance
        return []
    }
}

/// Extension to add artifact fetching to the concrete API service.
extension APIService {
    func fetchArtifacts(sessionId: String) async throws -> [Artifact] {
        struct ArtifactsResponse: Decodable {
            let artifacts: [Artifact]
        }
        let response: ArtifactsResponse = try await fetch("/v1/sessions/\(sessionId)/artifacts")
        return response.artifacts
    }
}
