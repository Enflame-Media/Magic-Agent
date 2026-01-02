//
//  PresenceService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

// MARK: - Friend Status Event

/// Represents a friend's online/offline status update.
///
/// Received via WebSocket ephemeral events when a friend's presence changes.
/// - SeeAlso: HAP-716 - Implement real-time friend online status
struct FriendStatusEvent: Codable {
    /// Type discriminator for ephemeral events.
    let type: String

    /// The user ID of the friend whose status changed.
    let userId: String

    /// Whether the friend is currently online.
    let isOnline: Bool

    /// ISO-8601 timestamp of when the user was last seen.
    /// Only present when `isOnline` is false.
    let lastSeen: String?
}

// MARK: - Presence Service

/// Service for tracking friend online/offline presence.
///
/// This ObservableObject maintains reactive state for friend presence,
/// updating the UI automatically when status changes are received via WebSocket.
///
/// Usage:
/// ```swift
/// @StateObject private var presenceService = PresenceService.shared
///
/// // Check if a friend is online
/// if presenceService.isOnline(friendId) {
///     Image(systemName: "circle.fill").foregroundColor(.green)
/// } else {
///     Text(presenceService.lastSeenText(friendId) ?? "Offline")
/// }
/// ```
///
/// - SeeAlso: HAP-716 - Implement real-time friend online status
class PresenceService: ObservableObject {
    // MARK: - Singleton

    /// Shared instance for app-wide presence tracking.
    static let shared = PresenceService()

    // MARK: - Published Properties

    /// Dictionary mapping userId to online status.
    /// Reactively updates the UI when a friend's status changes.
    @Published var onlineStatus: [String: Bool] = [:]

    /// Dictionary mapping userId to last seen date.
    /// Only contains entries for users who are currently offline.
    @Published var lastSeen: [String: Date] = [:]

    // MARK: - Private Properties

    /// Subscriptions for Combine publishers.
    private var cancellables = Set<AnyCancellable>()

    /// ISO8601 date formatter for parsing lastSeen timestamps.
    private let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    /// Relative date formatter for "last seen" display text.
    private let relativeFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter
    }()

    // MARK: - Initialization

    /// Initialize the presence service.
    ///
    /// Optionally accepts a SyncService to subscribe to for status updates.
    /// If not provided, you must call `handleStatusUpdate(_:)` manually.
    ///
    /// - Parameter syncService: Optional SyncService to subscribe to.
    init(syncService: SyncService? = nil) {
        // Future: Subscribe to SyncService ephemeral events
        // For now, status updates are handled via handleStatusUpdate(_:)
    }

    // MARK: - Status Update Handling

    /// Process a friend status update event.
    ///
    /// Call this method when receiving a `friend-status` ephemeral event
    /// from the WebSocket connection.
    ///
    /// - Parameter event: The friend status event to process.
    func handleStatusUpdate(_ event: FriendStatusEvent) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            self.onlineStatus[event.userId] = event.isOnline

            if let lastSeenStr = event.lastSeen {
                // Try parsing with fractional seconds first
                if let date = self.isoFormatter.date(from: lastSeenStr) {
                    self.lastSeen[event.userId] = date
                } else {
                    // Fallback: try without fractional seconds
                    let fallbackFormatter = ISO8601DateFormatter()
                    if let date = fallbackFormatter.date(from: lastSeenStr) {
                        self.lastSeen[event.userId] = date
                    }
                }
            } else if event.isOnline {
                // Remove lastSeen when user comes online
                self.lastSeen.removeValue(forKey: event.userId)
            }
        }
    }

    /// Process friend status update from raw JSON data.
    ///
    /// - Parameter data: JSON data containing a FriendStatusEvent.
    func handleStatusUpdate(from data: Data) {
        do {
            let event = try JSONDecoder().decode(FriendStatusEvent.self, from: data)
            handleStatusUpdate(event)
        } catch {
            print("[PresenceService] Failed to decode friend status event: \(error)")
        }
    }

    // MARK: - Status Queries

    /// Check if a user is currently online.
    ///
    /// - Parameter userId: The user ID to check.
    /// - Returns: `true` if the user is online, `false` otherwise.
    func isOnline(_ userId: String) -> Bool {
        onlineStatus[userId] ?? false
    }

    /// Get the last seen date for a user.
    ///
    /// - Parameter userId: The user ID.
    /// - Returns: The date when the user was last online, or `nil` if unknown.
    func lastSeenDate(_ userId: String) -> Date? {
        lastSeen[userId]
    }

    /// Get human-readable "last seen" text for a user.
    ///
    /// Returns relative time strings like "5 min ago", "2 hr ago", "3 days ago".
    ///
    /// - Parameter userId: The user ID.
    /// - Returns: Formatted relative time string, or `nil` if unknown.
    func lastSeenText(_ userId: String) -> String? {
        guard let date = lastSeen[userId] else { return nil }
        return relativeFormatter.localizedString(for: date, relativeTo: Date())
    }

    // MARK: - Bulk Status Setting

    /// Set status for multiple users at once.
    ///
    /// Useful for initializing friend list with presence data from API.
    ///
    /// - Parameter statuses: Array of tuples containing (userId, isOnline, lastSeen).
    func setBulkStatus(_ statuses: [(userId: String, isOnline: Bool, lastSeen: Date?)]) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            for status in statuses {
                self.onlineStatus[status.userId] = status.isOnline
                if let lastSeenDate = status.lastSeen {
                    self.lastSeen[status.userId] = lastSeenDate
                }
            }
        }
    }

    /// Clear all presence data.
    ///
    /// Call when logging out or resetting state.
    func clear() {
        DispatchQueue.main.async { [weak self] in
            self?.onlineStatus.removeAll()
            self?.lastSeen.removeAll()
        }
    }
}
