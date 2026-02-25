//
//  AcpSessionViewModel.swift
//  Happy
//
//  ViewModel for ACP session state management.
//  Uses Combine (ObservableObject + @Published) for iOS 16 compatibility.
//

import Foundation
import Combine

/// Event wrapper for ACP session updates from SyncService.
struct AcpSessionUpdateEvent {
    let sessionId: String
    let update: AcpSessionUpdate
}

/// Event wrapper for ACP permission requests from SyncService.
struct AcpPermissionRequestEvent {
    let sessionId: String
    let requestId: String
    let request: AcpWirePermissionRequest
    let timeoutMs: Int?
}

// MARK: - AcpSessionViewModel

/// ViewModel managing ACP session state for one or more sessions.
///
/// Subscribes to SyncService ACP publishers and maintains per-session state.
/// Views observe this ViewModel for real-time ACP session display.
final class AcpSessionViewModel: ObservableObject {
    // MARK: - Published State

    /// Per-session ACP state, keyed by session ID.
    @Published private(set) var sessions: [String: AcpSessionState] = [:]

    /// Per-session agent registry state, keyed by session ID.
    @Published private(set) var agentRegistries: [String: AcpAgentRegistryState] = [:]

    /// Whether there are any pending permission requests across all sessions.
    @Published private(set) var hasPendingPermissions: Bool = false

    // MARK: - Private

    private var cancellables = Set<AnyCancellable>()

    // MARK: - Init

    init() {
        setupSubscriptions()
    }

    // MARK: - Public API

    /// Get or create the ACP state for a session.
    func state(for sessionId: String) -> AcpSessionState {
        sessions[sessionId] ?? AcpSessionState()
    }

    /// Get or create the agent registry for a session.
    func agentRegistry(for sessionId: String) -> AcpAgentRegistryState {
        agentRegistries[sessionId] ?? .empty()
    }

    /// Get the next pending permission request across all sessions.
    func nextPendingPermission() -> (sessionId: String, request: AcpPermissionRequestState)? {
        for (sessionId, state) in sessions {
            if let request = state.nextPendingPermission() {
                return (sessionId, request)
            }
        }
        return nil
    }

    /// Apply an ACP session update for a given session.
    @MainActor
    func applyUpdate(sessionId: String, update: AcpSessionUpdate) {
        var state = sessions[sessionId] ?? AcpSessionState()
        state.applyUpdate(update)
        sessions[sessionId] = state
    }

    /// Handle an incoming permission request.
    @MainActor
    func handlePermissionRequest(_ event: AcpPermissionRequestEvent) {
        let toolCallInfo = AcpPermissionRequestState.AcpPermissionToolCallInfo(
            toolCallId: event.request.toolCall.toolCallId,
            title: event.request.toolCall.title ?? "Unknown Tool",
            kind: event.request.toolCall.kind?.rawValue,
            locations: event.request.toolCall.locations
        )

        let requestState = AcpPermissionRequestState(
            requestId: event.requestId,
            sessionId: event.sessionId,
            toolCall: toolCallInfo,
            options: event.request.options,
            receivedAt: Date().timeIntervalSince1970 * 1000,
            timeoutAt: event.timeoutMs.map { Date().timeIntervalSince1970 * 1000 + Double($0) }
        )

        var state = sessions[event.sessionId] ?? AcpSessionState()
        state.addPermissionRequest(requestState)
        sessions[event.sessionId] = state
        updatePendingPermissionsFlag()
    }

    /// Resolve a permission request with the user's decision.
    @MainActor
    func resolvePermission(
        sessionId: String,
        requestId: String,
        outcome: AcpPermissionOutcome,
        selectedOptionId: String? = nil
    ) {
        guard var state = sessions[sessionId] else { return }
        state.resolvePermissionRequest(
            requestId: requestId,
            outcome: outcome,
            selectedOptionId: selectedOptionId
        )
        sessions[sessionId] = state
        updatePendingPermissionsFlag()
    }

    /// Clear ACP state for a session.
    @MainActor
    func clearSession(_ sessionId: String) {
        sessions.removeValue(forKey: sessionId)
        agentRegistries.removeValue(forKey: sessionId)
        updatePendingPermissionsFlag()
    }

    // MARK: - Private

    private func setupSubscriptions() {
        // Subscribe to ACP session updates from SyncService
        SyncService.shared.acpSessionUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.applyUpdate(sessionId: event.sessionId, update: event.update)
            }
            .store(in: &cancellables)

        // Subscribe to ACP permission requests from SyncService
        SyncService.shared.acpPermissionRequests
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                self?.handlePermissionRequest(event)
            }
            .store(in: &cancellables)
    }

    private func updatePendingPermissionsFlag() {
        hasPendingPermissions = sessions.values.contains { state in
            state.permissionRequests.values.contains { $0.status == .pending }
        }
    }
}
