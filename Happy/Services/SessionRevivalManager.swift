//
//  SessionRevivalManager.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import AppKit

/// Manager for handling session revival errors and user feedback.
///
/// This class detects when a session fails to revive after a "Method not found" error,
/// shows appropriate UI feedback, and provides actions for the user to take.
///
/// Usage:
/// ```swift
/// let manager = SessionRevivalManager.shared
/// manager.handleError(someError) // Call when RPC errors occur
/// ```
@MainActor
@Observable
final class SessionRevivalManager {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = SessionRevivalManager()

    // MARK: - Published State

    /// Whether a revival attempt is currently in progress.
    private(set) var isReviving = false

    /// The current revival failure, if any.
    private(set) var revivalFailed: SessionRevivalFailure?

    /// Whether the revival alert should be shown.
    var showingRevivalAlert: Bool {
        revivalFailed != nil
    }

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    init() {
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Handle an error from RPC or sync operations.
    ///
    /// If the error indicates a session revival failure, this will update
    /// the `revivalFailed` state and trigger the alert UI.
    ///
    /// - Parameter error: The error to handle.
    func handleError(_ error: Error) {
        // Check for SyncError.sessionRevivalFailed
        if let syncError = error as? SyncError {
            switch syncError {
            case .sessionRevivalFailed(let sessionId, let reason):
                revivalFailed = SessionRevivalFailure(
                    sessionId: sessionId,
                    error: reason
                )
            default:
                break
            }
        }

        // Check for APIError cases that might indicate session issues
        if let apiError = error as? APIError {
            switch apiError {
            case .sessionRevivalFailed(let sessionId, let reason):
                revivalFailed = SessionRevivalFailure(
                    sessionId: sessionId,
                    error: reason
                )
            default:
                break
            }
        }
    }

    /// Handle an error message string with session context.
    ///
    /// - Parameters:
    ///   - message: The error message.
    ///   - sessionId: The session ID that failed.
    func handleRevivalError(message: String, sessionId: String) {
        revivalFailed = SessionRevivalFailure(
            sessionId: sessionId,
            error: message
        )
    }

    /// Start showing the reviving state.
    ///
    /// Call this when a revival attempt begins.
    func startReviving() {
        isReviving = true
    }

    /// Stop showing the reviving state.
    ///
    /// Call this when a revival attempt completes (success or failure).
    func stopReviving() {
        isReviving = false
    }

    /// Archive the failed session.
    ///
    /// This calls the server API to archive the session so it no longer
    /// appears in the active sessions list.
    func archiveFailedSession() async {
        guard let failure = revivalFailed else { return }

        do {
            try await APIService.shared.archiveSession(
                sessionId: failure.sessionId,
                reason: .revivalFailed
            )
            revivalFailed = nil
        } catch {
            // Show archive failure in a non-blocking way
            // Keep the alert open so user can try again or dismiss
            print("[SessionRevivalManager] Failed to archive session: \(error.localizedDescription)")
        }
    }

    /// Copy the session ID to the macOS clipboard.
    ///
    /// Uses NSPasteboard for native clipboard operations.
    func copySessionId() {
        guard let sessionId = revivalFailed?.sessionId else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(sessionId, forType: .string)
    }

    /// Dismiss the revival failure alert.
    func dismissAlert() {
        revivalFailed = nil
    }

    // MARK: - Private Methods

    private func setupSubscriptions() {
        // Subscribe to sync errors from SyncService
        SyncService.shared.syncErrors
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.handleSyncError(error)
            }
            .store(in: &cancellables)
    }

    private func handleSyncError(_ error: SyncError) {
        switch error {
        case .sessionRevivalFailed(let sessionId, let reason):
            revivalFailed = SessionRevivalFailure(
                sessionId: sessionId,
                error: reason
            )
        default:
            break
        }
    }
}

// MARK: - Session Revival Failure

/// Represents a failed session revival attempt.
struct SessionRevivalFailure: Identifiable, Equatable {
    /// Unique identifier for this failure instance.
    let id = UUID()

    /// The session ID that failed to revive.
    let sessionId: String

    /// The error message describing why revival failed.
    let error: String

    /// When the failure occurred.
    let occurredAt = Date()

    static func == (lhs: SessionRevivalFailure, rhs: SessionRevivalFailure) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Archive Reason

/// Reasons for archiving a session.
enum SessionArchiveReason: String, Codable {
    case revivalFailed = "revival_failed"
    case userRequested = "user_requested"
    case expired = "expired"
    case error = "error"
}
