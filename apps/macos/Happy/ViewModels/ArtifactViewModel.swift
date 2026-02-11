//
//  ArtifactViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import CryptoKit
import UniformTypeIdentifiers

/// ViewModel for managing artifacts in the artifact browser.
///
/// This view model handles:
/// - Fetching and caching artifacts
/// - Decrypting artifact headers and bodies
/// - Building and maintaining the file tree
/// - Managing selection and loading states
/// - Offline caching for disconnected viewing (HAP-874)
///
/// @see HAP-874 - Offline Artifact Caching
@Observable
final class ArtifactViewModel {
    // MARK: - State

    /// All decrypted artifacts indexed by ID.
    private(set) var artifactsMap: [String: Artifact] = [:]

    /// Currently selected artifact ID.
    var selectedArtifactId: String?

    /// IDs of artifacts currently loading their body content.
    private(set) var loadingBodyIds: Set<String> = []

    /// Whether artifacts are being fetched.
    var isLoading = false

    /// Error message if loading or decryption fails.
    var errorMessage: String?

    /// Search query for filtering artifacts.
    var searchQuery = ""

    /// Whether to show only code files.
    var showCodeOnly = false

    /// Whether artifacts are loaded from cache (HAP-874).
    var isOfflineMode = false

    /// Cache statistics for UI display (HAP-874).
    var cacheStats: ArtifactCacheStats?

    // MARK: - Computed Properties

    /// All artifacts as a sorted array.
    var artifacts: [Artifact] {
        var list = Array(artifactsMap.values)

        // Apply filters
        if showCodeOnly {
            list = list.filter { $0.fileType == .code }
        }

        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            list = list.filter { artifact in
                artifact.displayName.lowercased().contains(query) ||
                (artifact.filePath?.lowercased().contains(query) ?? false) ||
                (artifact.language?.lowercased().contains(query) ?? false)
            }
        }

        // Sort by updatedAt (most recent first)
        return list.sorted { $0.updatedAt > $1.updatedAt }
    }

    /// The currently selected artifact.
    var selectedArtifact: Artifact? {
        guard let id = selectedArtifactId else { return nil }
        return artifactsMap[id]
    }

    /// Total number of artifacts.
    var count: Int {
        artifactsMap.count
    }

    /// File tree built from all artifacts.
    var fileTree: [FileTreeNode] {
        Array(artifactsMap.values).buildFileTree()
    }

    /// Artifacts grouped by file type.
    var artifactsByType: [ArtifactFileType: [Artifact]] {
        var grouped: [ArtifactFileType: [Artifact]] = [:]
        for type in ArtifactFileType.allCases {
            grouped[type] = []
        }

        for artifact in artifactsMap.values {
            grouped[artifact.fileType, default: []].append(artifact)
        }

        return grouped
    }

    // MARK: - Private Properties

    private let authService: AuthService
    private let apiService: APIService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init(
        authService: AuthService = .shared,
        apiService: APIService = .shared
    ) {
        self.authService = authService
        self.apiService = apiService
    }

    // MARK: - Public Methods

    /// Load all artifacts for a session.
    /// - Parameter sessionId: The session ID to fetch artifacts for.
    func loadArtifacts(for sessionId: String) async {
        isLoading = true
        errorMessage = nil
        isOfflineMode = false // Clear offline mode since we're fetching live data

        do {
            // Fetch artifacts from API
            let response = try await apiService.fetchArtifacts(sessionId: sessionId)

            // Decrypt headers and build artifact objects
            let encryptionKey = try authService.getEncryptionKey()

            for apiArtifact in response.artifacts {
                let artifact = try decryptArtifact(apiArtifact, with: encryptionKey)
                artifactsMap[artifact.id] = artifact

                // HAP-874: Cache decrypted artifact for offline access
                Task {
                    await cacheArtifact(artifact)
                }
            }

            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Failed to load artifacts: \(error.localizedDescription)"
        }
    }

    /// Load all artifacts for the current user (across all sessions).
    func loadAllArtifacts() async {
        isLoading = true
        errorMessage = nil
        isOfflineMode = false // Clear offline mode since we're fetching live data

        do {
            let response = try await apiService.fetchAllArtifacts()
            let encryptionKey = try authService.getEncryptionKey()

            for apiArtifact in response.artifacts {
                let artifact = try decryptArtifact(apiArtifact, with: encryptionKey)
                artifactsMap[artifact.id] = artifact

                // HAP-874: Cache decrypted artifact for offline access
                Task {
                    await cacheArtifact(artifact)
                }
            }

            isLoading = false
        } catch {
            isLoading = false
            errorMessage = "Failed to load artifacts: \(error.localizedDescription)"
        }
    }

    /// Load the body content for an artifact.
    /// - Parameter id: The artifact ID.
    func loadBody(for id: String) async {
        guard let artifact = artifactsMap[id], !artifact.isBodyLoaded else {
            return
        }

        loadingBodyIds.insert(id)

        do {
            // Fetch encrypted body from API
            let response = try await apiService.fetchArtifactBody(artifactId: id)
            let encryptionKey = try authService.getEncryptionKey()

            // Decrypt body
            guard let bodyData = Data(base64Encoded: response.encryptedBody) else {
                throw ArtifactError.invalidBodyData
            }

            let decryptedData = try EncryptionService.decrypt(bodyData, with: encryptionKey)
            let body = String(data: decryptedData, encoding: .utf8)

            // Update artifact
            var updatedArtifact = artifact
            updatedArtifact.body = body
            updatedArtifact.isBodyLoaded = true
            artifactsMap[id] = updatedArtifact

            loadingBodyIds.remove(id)

            // HAP-874: Cache the body content for offline access
            Task {
                await cacheBody(id: id, body: body)
            }
        } catch {
            loadingBodyIds.remove(id)
            // Don't set error message for body load failures, just log
            print("Failed to load artifact body: \(error.localizedDescription)")
        }
    }

    /// Select an artifact by ID.
    /// - Parameter id: The artifact ID to select, or nil to clear selection.
    func selectArtifact(_ id: String?) {
        selectedArtifactId = id

        // Auto-load body when selected
        if let id = id {
            Task {
                await loadBody(for: id)
            }
        }
    }

    /// Select an artifact from a file tree node.
    /// - Parameter node: The file tree node (must be a file, not directory).
    func selectFromNode(_ node: FileTreeNode) {
        guard !node.isDirectory, let artifactId = node.artifactId else {
            return
        }
        selectArtifact(artifactId)
    }

    /// Get artifacts for a specific session.
    /// - Parameter sessionId: The session ID.
    /// - Returns: Artifacts associated with the session, sorted by sequence.
    func artifactsForSession(_ sessionId: String) -> [Artifact] {
        artifactsMap.values
            .filter { $0.sessions.contains(sessionId) }
            .sorted { $0.seq < $1.seq }
    }

    /// Check if an artifact body is currently loading.
    /// - Parameter id: The artifact ID.
    /// - Returns: True if body is loading.
    func isBodyLoading(_ id: String) -> Bool {
        loadingBodyIds.contains(id)
    }

    /// Save an artifact to a temporary file for QuickLook or drag-and-drop.
    /// - Parameter artifact: The artifact to save.
    /// - Returns: URL of the temporary file.
    func saveToTemporaryFile(_ artifact: Artifact) throws -> URL {
        guard let body = artifact.body else {
            throw ArtifactError.noBodyContent
        }

        let tempDirectory = FileManager.default.temporaryDirectory
        let fileName = artifact.displayName
        let fileURL = tempDirectory.appendingPathComponent(fileName)

        // Write content to file
        if let data = body.data(using: .utf8) {
            try data.write(to: fileURL)
        } else if let mimeType = artifact.mimeType,
                  mimeType.hasPrefix("image/"),
                  let imageData = Data(base64Encoded: body) {
            // Handle base64-encoded images
            try imageData.write(to: fileURL)
        } else {
            throw ArtifactError.invalidBodyData
        }

        return fileURL
    }

    /// Save an artifact to a user-chosen location.
    /// - Parameters:
    ///   - artifact: The artifact to save.
    ///   - url: The destination URL.
    func saveToFile(_ artifact: Artifact, at url: URL) throws {
        guard let body = artifact.body else {
            throw ArtifactError.noBodyContent
        }

        if let data = body.data(using: .utf8) {
            try data.write(to: url)
        } else if let imageData = Data(base64Encoded: body) {
            try imageData.write(to: url)
        } else {
            throw ArtifactError.invalidBodyData
        }
    }

    /// Clear all artifacts.
    func clearArtifacts() {
        artifactsMap.removeAll()
        selectedArtifactId = nil
        loadingBodyIds.removeAll()
        errorMessage = nil
        isOfflineMode = false
    }

    // MARK: - Cache Operations (HAP-874)

    /// Load cached artifacts for offline viewing.
    func loadFromCache() async {
        isLoading = true
        errorMessage = nil

        do {
            try await ArtifactCacheService.shared.initialize()
            let cachedArtifacts = try await ArtifactCacheService.shared.loadCachedArtifacts()

            if !cachedArtifacts.isEmpty {
                for artifact in cachedArtifacts {
                    artifactsMap[artifact.id] = artifact
                }
                isOfflineMode = true
                print("[artifacts] Loaded \(cachedArtifacts.count) artifacts from cache")
            }

            isLoading = false
        } catch {
            isLoading = false
            print("[artifacts] Failed to load from cache: \(error.localizedDescription)")
        }
    }

    /// Load cached artifacts for a specific session.
    /// - Parameter sessionId: Session ID
    func loadCachedForSession(_ sessionId: String) async {
        isLoading = true
        errorMessage = nil

        do {
            try await ArtifactCacheService.shared.initialize()
            let cachedArtifacts = try await ArtifactCacheService.shared.getCachedForSession(sessionId: sessionId)

            if !cachedArtifacts.isEmpty {
                for artifact in cachedArtifacts {
                    artifactsMap[artifact.id] = artifact
                }
                isOfflineMode = true
                print("[artifacts] Loaded \(cachedArtifacts.count) cached artifacts for session \(sessionId)")
            }

            isLoading = false
        } catch {
            isLoading = false
            print("[artifacts] Failed to load cached artifacts for session \(sessionId): \(error.localizedDescription)")
        }
    }

    /// Cache an artifact after decryption.
    /// - Parameter artifact: Artifact to cache
    func cacheArtifact(_ artifact: Artifact) async {
        do {
            try await ArtifactCacheService.shared.cacheArtifact(artifact)
        } catch {
            print("[artifacts] Failed to cache artifact \(artifact.id): \(error.localizedDescription)")
        }
    }

    /// Cache artifact body content.
    /// - Parameters:
    ///   - id: Artifact ID
    ///   - body: Body content to cache
    func cacheBody(id: String, body: String?) async {
        do {
            try await ArtifactCacheService.shared.cacheBody(id: id, body: body)
        } catch {
            print("[artifacts] Failed to cache body for \(id): \(error.localizedDescription)")
        }
    }

    /// Clear the artifact cache.
    func clearCache() async {
        do {
            try await ArtifactCacheService.shared.clearCache()
            await refreshCacheStats()
            print("[artifacts] Cache cleared")
        } catch {
            print("[artifacts] Failed to clear cache: \(error.localizedDescription)")
        }
    }

    /// Refresh cache statistics.
    func refreshCacheStats() async {
        do {
            cacheStats = try await ArtifactCacheService.shared.getStats()
        } catch {
            print("[artifacts] Failed to get cache stats: \(error.localizedDescription)")
        }
    }

    /// Clear offline mode flag.
    func clearOfflineMode() {
        isOfflineMode = false
    }

    // MARK: - Private Methods

    /// Decrypt an API artifact into a local Artifact model.
    private func decryptArtifact(_ apiArtifact: ApiArtifact, with key: SymmetricKey) throws -> Artifact {
        // Decode and decrypt header
        guard let headerData = Data(base64Encoded: apiArtifact.encryptedHeader) else {
            throw ArtifactError.invalidHeaderData
        }

        let decryptedHeaderData = try EncryptionService.decrypt(headerData, with: key)
        let header = try JSONDecoder().decode(ArtifactHeader.self, from: decryptedHeaderData)

        // Build artifact with decrypted header
        let filePath = header.filePath
        let fileType = ArtifactFileType.infer(mimeType: header.mimeType, filePath: filePath)
        let language = header.language ?? Artifact.inferLanguage(from: filePath)

        return Artifact(
            id: apiArtifact.artifactId,
            title: header.title,
            filePath: filePath,
            mimeType: header.mimeType,
            language: language,
            sessions: header.sessions ?? [],
            body: nil,
            fileType: fileType,
            headerVersion: apiArtifact.headerVersion,
            bodyVersion: apiArtifact.bodyVersion,
            seq: apiArtifact.seq,
            createdAt: apiArtifact.createdAt,
            updatedAt: apiArtifact.updatedAt,
            isDecrypted: true,
            isBodyLoaded: false
        )
    }
}

// MARK: - Errors

/// Errors that can occur during artifact operations.
enum ArtifactError: LocalizedError {
    case invalidHeaderData
    case invalidBodyData
    case noBodyContent
    case decryptionFailed
    case saveFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidHeaderData:
            return "Invalid artifact header data"
        case .invalidBodyData:
            return "Invalid artifact body data"
        case .noBodyContent:
            return "Artifact has no body content loaded"
        case .decryptionFailed:
            return "Failed to decrypt artifact content"
        case .saveFailed(let reason):
            return "Failed to save artifact: \(reason)"
        }
    }
}
