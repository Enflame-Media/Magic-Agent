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

/// Manager for handling session revival errors, cooldowns, and user feedback.
///
/// This class detects when a session fails to revive after a "Method not found" error,
/// handles circuit breaker cooldown events from the CLI, shows appropriate UI feedback,
/// and provides actions for the user to take.
///
/// Usage:
/// ```swift
/// let manager = SessionRevivalManager.shared
/// manager.handleError(someError) // Call when RPC errors occur
/// manager.handleRevivalPaused(event) // Call when CLI sends cooldown event
/// ```
///
/// @see HAP-868 - Handle session-revival-paused WebSocket event for circuit breaker cooldown UI
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

    // MARK: - Cooldown State (HAP-868)

    /// The current cooldown state, if any.
    /// When set, shows the cooldown banner UI with countdown.
    private(set) var cooldownState: RevivalCooldownState?

    /// Whether the cooldown banner should be shown.
    var showingCooldownBanner: Bool {
        cooldownState != nil && !cooldownState!.isExpired
    }

    /// Remaining seconds in cooldown, or 0 if no cooldown is active.
    var remainingCooldownSeconds: Int {
        guard let state = cooldownState, !state.isExpired else { return 0 }
        return max(0, Int(ceil(state.resumesAt.timeIntervalSinceNow)))
    }

    /// Timer for updating cooldown countdown display.
    private var cooldownTimer: Timer?

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

    // MARK: - Cooldown Methods (HAP-868)

    /// Handle a session-revival-paused event from the WebSocket.
    ///
    /// This is called when the CLI's circuit breaker cooldown is active.
    /// The UI should display a countdown banner and disable retry actions.
    ///
    /// - Parameter event: The event payload from the WebSocket.
    func handleRevivalPaused(_ event: SessionRevivalPausedEvent) {
        let resumesAt = Date(timeIntervalSince1970: TimeInterval(event.resumesAt) / 1000.0)

        // Only update if this is a new or later cooldown
        if let existing = cooldownState, existing.resumesAt >= resumesAt {
            return
        }

        cooldownState = RevivalCooldownState(
            reason: event.reason,
            resumesAt: resumesAt,
            machineId: event.machineId
        )

        startCooldownTimer()
    }

    /// Clear the cooldown state.
    ///
    /// Called when:
    /// - Cooldown timer expires
    /// - A session-revived event is received
    /// - User manually dismisses (if allowed)
    func clearCooldown() {
        stopCooldownTimer()
        cooldownState = nil
    }

    /// Start the countdown timer for cooldown UI updates.
    private func startCooldownTimer() {
        stopCooldownTimer()

        // Update every second for countdown display
        cooldownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                self?.updateCooldownState()
            }
        }

        // Also add to run loop for menu bar visibility
        if let timer = cooldownTimer {
            RunLoop.main.add(timer, forMode: .common)
        }
    }

    /// Stop the cooldown timer.
    private func stopCooldownTimer() {
        cooldownTimer?.invalidate()
        cooldownTimer = nil
    }

    /// Check if cooldown has expired and clear if so.
    private func updateCooldownState() {
        guard let state = cooldownState else {
            stopCooldownTimer()
            return
        }

        if state.isExpired {
            clearCooldown()
        }
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

        // Subscribe to session revival paused events (HAP-868)
        SyncService.shared.sessionRevivalPaused
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handleRevivalPaused(event)
            }
            .store(in: &cancellables)

        // Subscribe to session revived events (HAP-733)
        // This clears the cooldown UI when revival succeeds
        SyncService.shared.sessionRevived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.clearCooldown()
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

// MARK: - Session Revival Paused Event (HAP-868)

/// Event payload for session-revival-paused WebSocket event.
///
/// Sent by the CLI when the circuit breaker cooldown is active and
/// session revival requests are being rejected.
///
/// @see HAP-784 - CLI-side event emission
/// @see HAP-868 - macOS app handling
struct SessionRevivalPausedEvent: Decodable {
    /// Reason for the cooldown (currently only "circuit_breaker").
    let reason: String

    /// Remaining time until cooldown expires (milliseconds).
    let remainingMs: Int

    /// Timestamp when cooldown will expire (Date.now() + remainingMs).
    /// Note: This is a JavaScript timestamp (milliseconds since epoch).
    let resumesAt: Int64

    /// Machine ID this event originated from.
    let machineId: String
}

// MARK: - Revival Cooldown State (HAP-868)

/// Represents an active revival cooldown period.
///
/// The cooldown is triggered by the circuit breaker when too many
/// revival failures occur in a short period.
struct RevivalCooldownState: Identifiable, Equatable {
    /// Unique identifier for this cooldown instance.
    let id = UUID()

    /// Reason for the cooldown.
    let reason: String

    /// When the cooldown will expire.
    let resumesAt: Date

    /// Machine ID this cooldown is for.
    let machineId: String

    /// When the cooldown started being tracked locally.
    let startedAt = Date()

    /// Whether the cooldown has expired.
    var isExpired: Bool {
        resumesAt <= Date()
    }

    /// Remaining seconds until cooldown expires.
    var remainingSeconds: Int {
        max(0, Int(ceil(resumesAt.timeIntervalSinceNow)))
    }

    static func == (lhs: RevivalCooldownState, rhs: RevivalCooldownState) -> Bool {
        lhs.id == rhs.id
    }
}
