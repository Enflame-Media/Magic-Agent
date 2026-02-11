//
//  ArtifactCacheService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  HAP-874: Offline Artifact Caching
//
//  Provides offline caching for artifacts using FileManager for persistent storage
//  and NSCache for in-memory access. Enables viewing previously loaded artifacts
//  when disconnected from the server.
//

import Foundation
import CryptoKit

// MARK: - Cached Artifact Model

/// Cached artifact record stored on disk.
///
/// Contains decrypted header data and optionally the body content.
/// The cachedAt timestamp is used for LRU eviction.
struct CachedArtifact: Codable {
    /// Unique artifact ID (primary key)
    let id: String
    /// Decrypted artifact header
    let header: CachedArtifactHeader
    /// Decrypted body content (null if not cached)
    let body: String?
    /// Header version for cache invalidation
    let headerVersion: Int
    /// Body version for cache invalidation
    let bodyVersion: Int?
    /// File type category
    let fileType: String
    /// Programming language for syntax highlighting
    let language: String?
    /// Sequence number for ordering
    let seq: Int
    /// Creation timestamp from server
    let createdAt: Date
    /// Last update timestamp from server
    let updatedAt: Date
    /// Timestamp when this entry was cached
    let cachedAt: Date
    /// Timestamp when the body was cached (null if body not cached)
    let bodyCachedAt: Date?
    /// Approximate size in bytes (for cache management)
    let sizeBytes: Int
}

/// Cached artifact header structure
struct CachedArtifactHeader: Codable {
    let title: String?
    let mimeType: String?
    let filePath: String?
    let language: String?
    let sessions: [String]?
}

// MARK: - Cache Statistics

/// Cache statistics for monitoring and UI display.
struct ArtifactCacheStats {
    /// Total number of cached artifacts
    let totalArtifacts: Int
    /// Number of artifacts with cached body
    let artifactsWithBody: Int
    /// Total cache size in bytes
    let totalSizeBytes: Int
    /// Maximum allowed cache size in bytes
    let maxSizeBytes: Int
    /// Oldest cached item timestamp
    let oldestCachedAt: Date?
    /// Newest cached item timestamp
    let newestCachedAt: Date?
}

// MARK: - Cache Configuration

/// Cache configuration options.
struct ArtifactCacheConfig {
    /// Maximum cache size in bytes (default: 50MB)
    var maxSizeBytes: Int = 50 * 1024 * 1024
    /// Maximum number of artifact bodies to cache (default: 100)
    var maxBodiesCount: Int = 100
    /// Whether caching is enabled (default: true)
    var enabled: Bool = true
}

// MARK: - Artifact Cache Service

/// Service for caching artifacts offline using FileManager and NSCache.
///
/// This actor manages persistent artifact storage using the caches directory
/// and provides an in-memory NSCache layer for fast access.
actor ArtifactCacheService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = ArtifactCacheService()

    // MARK: - Properties

    /// In-memory cache for fast access
    private let memoryCache = NSCache<NSString, NSData>()

    /// Cache configuration
    private var config = ArtifactCacheConfig()

    /// Whether the cache has been initialized
    private var isInitialized = false

    /// Cache directory URL
    private var cacheDirectory: URL?

    /// Index of cached artifacts (id -> metadata)
    private var cacheIndex: [String: CachedArtifactMetadata] = [:]

    // MARK: - Initialization

    init() {
        memoryCache.countLimit = 100
        memoryCache.totalCostLimit = 10 * 1024 * 1024 // 10MB in-memory limit
    }

    /// Initialize the cache service.
    /// Creates the cache directory and loads the index.
    func initialize() async throws {
        guard !isInitialized else { return }

        // Get caches directory
        guard let cachesURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else {
            throw ArtifactCacheError.directoryNotFound
        }

        let artifactsCacheURL = cachesURL.appendingPathComponent("HappyArtifacts", isDirectory: true)

        // Create directory if needed
        if !FileManager.default.fileExists(atPath: artifactsCacheURL.path) {
            try FileManager.default.createDirectory(at: artifactsCacheURL, withIntermediateDirectories: true)
        }

        cacheDirectory = artifactsCacheURL

        // Load index
        await loadIndex()

        isInitialized = true
        print("[cache] Artifact cache initialized at \(artifactsCacheURL.path)")
    }

    // MARK: - Configuration

    /// Update cache configuration.
    func setConfig(_ newConfig: ArtifactCacheConfig) {
        config = newConfig
        UserDefaults.standard.set(config.enabled, forKey: "artifact_cache_enabled")
        UserDefaults.standard.set(config.maxSizeBytes, forKey: "artifact_cache_max_size")
        UserDefaults.standard.set(config.maxBodiesCount, forKey: "artifact_cache_max_bodies")
    }

    /// Get current cache configuration.
    func getConfig() -> ArtifactCacheConfig {
        return config
    }

    // MARK: - Caching Operations

    /// Cache an artifact.
    ///
    /// - Parameters:
    ///   - artifact: The artifact to cache
    ///   - includeBody: Whether to cache the body content
    func cacheArtifact(_ artifact: Artifact, includeBody: Bool = true) async throws {
        guard config.enabled else { return }

        if !isInitialized {
            try await initialize()
        }

        guard let directory = cacheDirectory else {
            throw ArtifactCacheError.directoryNotFound
        }

        let body = includeBody && artifact.isBodyLoaded ? artifact.body : nil

        // Calculate size
        let headerSize = estimateHeaderSize(artifact)
        let bodySize = body?.utf8.count ?? 0
        let sizeBytes = headerSize + bodySize

        let cached = CachedArtifact(
            id: artifact.id,
            header: CachedArtifactHeader(
                title: artifact.title,
                mimeType: artifact.mimeType,
                filePath: artifact.filePath,
                language: artifact.language,
                sessions: artifact.sessions
            ),
            body: body,
            headerVersion: artifact.headerVersion,
            bodyVersion: artifact.bodyVersion,
            fileType: artifact.fileType.rawValue,
            language: artifact.language,
            seq: artifact.seq,
            createdAt: artifact.createdAt,
            updatedAt: artifact.updatedAt,
            cachedAt: Date(),
            bodyCachedAt: body != nil ? Date() : nil,
            sizeBytes: sizeBytes
        )

        // Encode and save
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(cached)

        let fileURL = directory.appendingPathComponent("\(artifact.id).json")
        try data.write(to: fileURL)

        // Update in-memory cache
        memoryCache.setObject(data as NSData, forKey: artifact.id as NSString, cost: sizeBytes)

        // Update index
        cacheIndex[artifact.id] = CachedArtifactMetadata(
            id: artifact.id,
            cachedAt: cached.cachedAt,
            sizeBytes: sizeBytes,
            hasBody: body != nil
        )

        // Save index
        await saveIndex()

        // Run eviction if needed
        await runEviction()

        print("[cache] Cached artifact \(artifact.id)")
    }

    /// Cache artifact body content only.
    ///
    /// - Parameters:
    ///   - id: Artifact ID
    ///   - body: Body content to cache
    func cacheBody(id: String, body: String?) async throws {
        guard config.enabled else { return }

        if !isInitialized {
            try await initialize()
        }

        // Load existing cached artifact
        guard var cached = try await loadCachedArtifact(id: id) else {
            return
        }

        guard let directory = cacheDirectory else {
            throw ArtifactCacheError.directoryNotFound
        }

        // Update body
        let bodySize = body?.utf8.count ?? 0
        let headerSize = cached.sizeBytes - (cached.body?.utf8.count ?? 0)
        let newSizeBytes = headerSize + bodySize

        let updated = CachedArtifact(
            id: cached.id,
            header: cached.header,
            body: body,
            headerVersion: cached.headerVersion,
            bodyVersion: cached.bodyVersion,
            fileType: cached.fileType,
            language: cached.language,
            seq: cached.seq,
            createdAt: cached.createdAt,
            updatedAt: cached.updatedAt,
            cachedAt: cached.cachedAt,
            bodyCachedAt: body != nil ? Date() : nil,
            sizeBytes: newSizeBytes
        )

        // Save
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(updated)

        let fileURL = directory.appendingPathComponent("\(id).json")
        try data.write(to: fileURL)

        // Update in-memory cache
        memoryCache.setObject(data as NSData, forKey: id as NSString, cost: newSizeBytes)

        // Update index
        if var metadata = cacheIndex[id] {
            metadata.sizeBytes = newSizeBytes
            metadata.hasBody = body != nil
            cacheIndex[id] = metadata
            await saveIndex()
        }

        await runEviction()

        print("[cache] Cached body for artifact \(id)")
    }

    // MARK: - Retrieval Operations

    /// Load all cached artifacts.
    func loadCachedArtifacts() async throws -> [Artifact] {
        guard config.enabled else { return [] }

        if !isInitialized {
            try await initialize()
        }

        var artifacts: [Artifact] = []

        for (id, _) in cacheIndex {
            if let cached = try? await loadCachedArtifact(id: id) {
                artifacts.append(toArtifact(cached))
            }
        }

        return artifacts.sorted { $0.updatedAt > $1.updatedAt }
    }

    /// Get a single cached artifact by ID.
    ///
    /// - Parameter id: Artifact ID
    /// - Returns: Cached artifact or nil if not found
    func getCachedArtifact(id: String) async throws -> Artifact? {
        guard config.enabled else { return nil }

        if !isInitialized {
            try await initialize()
        }

        guard let cached = try await loadCachedArtifact(id: id) else {
            return nil
        }

        // Update access time
        if var metadata = cacheIndex[id] {
            metadata.cachedAt = Date()
            cacheIndex[id] = metadata
        }

        return toArtifact(cached)
    }

    /// Get cached artifacts for a specific session.
    ///
    /// - Parameter sessionId: Session ID
    /// - Returns: Array of cached artifacts for the session
    func getCachedForSession(sessionId: String) async throws -> [Artifact] {
        guard config.enabled else { return [] }

        if !isInitialized {
            try await initialize()
        }

        var artifacts: [Artifact] = []

        for (id, _) in cacheIndex {
            if let cached = try? await loadCachedArtifact(id: id),
               cached.header.sessions?.contains(sessionId) == true {
                artifacts.append(toArtifact(cached))
            }
        }

        return artifacts.sorted { $0.seq < $1.seq }
    }

    // MARK: - Cache Invalidation

    /// Check if a cached artifact is stale.
    ///
    /// - Parameters:
    ///   - id: Artifact ID
    ///   - headerVersion: Current header version from server
    ///   - bodyVersion: Current body version from server
    /// - Returns: True if cached version is older than server version
    func isStale(id: String, headerVersion: Int, bodyVersion: Int?) async throws -> Bool {
        guard config.enabled else { return true }

        if !isInitialized {
            try await initialize()
        }

        guard let cached = try await loadCachedArtifact(id: id) else {
            return true
        }

        // Check header version
        if cached.headerVersion < headerVersion {
            return true
        }

        // Check body version if applicable
        if let serverBodyVersion = bodyVersion,
           let cachedBodyVersion = cached.bodyVersion,
           cachedBodyVersion < serverBodyVersion {
            return true
        }

        return false
    }

    /// Remove a cached artifact.
    ///
    /// - Parameter id: Artifact ID
    func removeCached(id: String) async throws {
        guard let directory = cacheDirectory else { return }

        let fileURL = directory.appendingPathComponent("\(id).json")

        if FileManager.default.fileExists(atPath: fileURL.path) {
            try FileManager.default.removeItem(at: fileURL)
        }

        memoryCache.removeObject(forKey: id as NSString)
        cacheIndex.removeValue(forKey: id)
        await saveIndex()

        print("[cache] Removed cached artifact \(id)")
    }

    /// Clear all cached artifacts.
    func clearCache() async throws {
        guard let directory = cacheDirectory else { return }

        // Remove all files
        let contents = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)
        for fileURL in contents {
            try FileManager.default.removeItem(at: fileURL)
        }

        // Clear memory cache
        memoryCache.removeAllObjects()

        // Clear index
        cacheIndex.removeAll()

        print("[cache] Cleared all cached artifacts")
    }

    // MARK: - Cache Statistics

    /// Get cache statistics.
    func getStats() async throws -> ArtifactCacheStats {
        if !isInitialized {
            try await initialize()
        }

        let totalArtifacts = cacheIndex.count
        let artifactsWithBody = cacheIndex.values.filter { $0.hasBody }.count
        let totalSizeBytes = cacheIndex.values.reduce(0) { $0 + $1.sizeBytes }

        let cachedDates = cacheIndex.values.map { $0.cachedAt }
        let oldestCachedAt = cachedDates.min()
        let newestCachedAt = cachedDates.max()

        return ArtifactCacheStats(
            totalArtifacts: totalArtifacts,
            artifactsWithBody: artifactsWithBody,
            totalSizeBytes: totalSizeBytes,
            maxSizeBytes: config.maxSizeBytes,
            oldestCachedAt: oldestCachedAt,
            newestCachedAt: newestCachedAt
        )
    }

    // MARK: - Private Methods

    /// Load cached artifact from disk or memory.
    private func loadCachedArtifact(id: String) throws -> CachedArtifact? {
        // Try memory cache first
        if let data = memoryCache.object(forKey: id as NSString) {
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(CachedArtifact.self, from: data as Data)
        }

        // Load from disk
        guard let directory = cacheDirectory else { return nil }
        let fileURL = directory.appendingPathComponent("\(id).json")

        guard FileManager.default.fileExists(atPath: fileURL.path) else { return nil }

        let data = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let cached = try decoder.decode(CachedArtifact.self, from: data)

        // Store in memory cache
        memoryCache.setObject(data as NSData, forKey: id as NSString, cost: cached.sizeBytes)

        return cached
    }

    /// Convert CachedArtifact to Artifact.
    private func toArtifact(_ cached: CachedArtifact) -> Artifact {
        return Artifact(
            id: cached.id,
            title: cached.header.title,
            filePath: cached.header.filePath,
            mimeType: cached.header.mimeType,
            language: cached.language,
            sessions: cached.header.sessions ?? [],
            body: cached.body,
            fileType: ArtifactFileType(rawValue: cached.fileType) ?? .unknown,
            headerVersion: cached.headerVersion,
            bodyVersion: cached.bodyVersion,
            seq: cached.seq,
            createdAt: cached.createdAt,
            updatedAt: cached.updatedAt,
            isDecrypted: true,
            isBodyLoaded: cached.body != nil
        )
    }

    /// Estimate header size for an artifact.
    private func estimateHeaderSize(_ artifact: Artifact) -> Int {
        var size = 0
        size += artifact.title?.utf8.count ?? 0
        size += artifact.filePath?.utf8.count ?? 0
        size += artifact.mimeType?.utf8.count ?? 0
        size += artifact.language?.utf8.count ?? 0
        size += artifact.sessions.joined().utf8.count
        size += 200 // Overhead for JSON encoding
        return size
    }

    /// Load cache index from disk.
    private func loadIndex() async {
        guard let directory = cacheDirectory else { return }
        let indexURL = directory.appendingPathComponent("_index.json")

        guard FileManager.default.fileExists(atPath: indexURL.path) else {
            // Build index from existing files
            await rebuildIndex()
            return
        }

        do {
            let data = try Data(contentsOf: indexURL)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            cacheIndex = try decoder.decode([String: CachedArtifactMetadata].self, from: data)
        } catch {
            print("[cache] Failed to load index, rebuilding: \(error)")
            await rebuildIndex()
        }
    }

    /// Save cache index to disk.
    private func saveIndex() async {
        guard let directory = cacheDirectory else { return }
        let indexURL = directory.appendingPathComponent("_index.json")

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(cacheIndex)
            try data.write(to: indexURL)
        } catch {
            print("[cache] Failed to save index: \(error)")
        }
    }

    /// Rebuild index from cached files.
    private func rebuildIndex() async {
        guard let directory = cacheDirectory else { return }

        cacheIndex.removeAll()

        do {
            let contents = try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil)

            for fileURL in contents {
                guard fileURL.pathExtension == "json",
                      fileURL.lastPathComponent != "_index.json" else { continue }

                let id = fileURL.deletingPathExtension().lastPathComponent

                do {
                    let data = try Data(contentsOf: fileURL)
                    let decoder = JSONDecoder()
                    decoder.dateDecodingStrategy = .iso8601
                    let cached = try decoder.decode(CachedArtifact.self, from: data)

                    cacheIndex[id] = CachedArtifactMetadata(
                        id: id,
                        cachedAt: cached.cachedAt,
                        sizeBytes: cached.sizeBytes,
                        hasBody: cached.body != nil
                    )
                } catch {
                    print("[cache] Failed to load cached artifact \(id): \(error)")
                }
            }

            await saveIndex()
            print("[cache] Rebuilt index with \(cacheIndex.count) artifacts")
        } catch {
            print("[cache] Failed to rebuild index: \(error)")
        }
    }

    /// Run LRU eviction to keep cache within size limits.
    private func runEviction() async {
        do {
            let stats = try await getStats()

            // Check if eviction is needed
            guard stats.totalSizeBytes > config.maxSizeBytes ||
                  stats.artifactsWithBody > config.maxBodiesCount else { return }

            print("[cache] Running cache eviction...")

            // First, evict bodies from least recently used artifacts
            if stats.artifactsWithBody > config.maxBodiesCount {
                let sortedByTime = cacheIndex.values.filter { $0.hasBody }.sorted { $0.cachedAt < $1.cachedAt }
                let toEvictCount = stats.artifactsWithBody - config.maxBodiesCount

                for metadata in sortedByTime.prefix(toEvictCount) {
                    try await cacheBody(id: metadata.id, body: nil)
                }

                print("[cache] Evicted \(toEvictCount) artifact bodies")
            }

            // Check if still over size limit
            let newStats = try await getStats()
            if newStats.totalSizeBytes > config.maxSizeBytes {
                let sortedByTime = cacheIndex.values.sorted { $0.cachedAt < $1.cachedAt }
                var currentSize = newStats.totalSizeBytes

                for metadata in sortedByTime {
                    guard currentSize > config.maxSizeBytes else { break }

                    try await removeCached(id: metadata.id)
                    currentSize -= metadata.sizeBytes
                    print("[cache] Evicted artifact \(metadata.id)")
                }
            }
        } catch {
            print("[cache] Failed to run eviction: \(error)")
        }
    }
}

// MARK: - Supporting Types

/// Lightweight metadata for cache index.
private struct CachedArtifactMetadata: Codable {
    let id: String
    var cachedAt: Date
    var sizeBytes: Int
    var hasBody: Bool
}

// MARK: - Errors

/// Errors that can occur during artifact cache operations.
enum ArtifactCacheError: LocalizedError {
    case directoryNotFound
    case encodingFailed
    case decodingFailed
    case fileNotFound(String)

    var errorDescription: String? {
        switch self {
        case .directoryNotFound:
            return "Cache directory not found"
        case .encodingFailed:
            return "Failed to encode artifact"
        case .decodingFailed:
            return "Failed to decode artifact"
        case .fileNotFound(let id):
            return "Cached artifact not found: \(id)"
        }
    }
}
