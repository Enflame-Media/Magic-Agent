//
//  AcpSessionViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import os.log

/// ViewModel for managing ACP session state.
///
/// Uses Combine publishers for reactive UI updates. Subscribes to ACP
/// session update events from the SyncService and maintains accumulated state.
///
/// This follows the existing MVVM pattern established by `SessionDetailViewModel`.
@Observable
final class AcpSessionViewModel {
    // MARK: - Logger

    private static let logger = Logger(
        subsystem: "com.enflame.Happy",
        category: "AcpSessionViewModel"
    )

    // MARK: - State

    /// The accumulated ACP session state.
    private(set) var state: AcpSessionState = .initial()

    /// The agent registry state.
    private(set) var agentRegistry: AcpAgentRegistryState = .initial()

    /// Whether ACP mode is active (has received at least one ACP update).
    private(set) var isAcpActive: Bool = false

    /// Error message from last failed ACP operation.
    var errorMessage: String?

    // MARK: - Combine Publishers

    /// Publisher that emits whenever the ACP state changes.
    nonisolated let stateDidChange = PassthroughSubject<AcpSessionState, Never>()

    /// Publisher for permission request events that need immediate user attention.
    nonisolated let permissionRequestReceived = PassthroughSubject<AcpPermissionRequestState, Never>()

    // MARK: - Private Properties

    private var cancellables = Set<AnyCancellable>()
    private let syncService: SyncService

    // MARK: - Initialization

    init(syncService: SyncService = .shared) {
        self.syncService = syncService
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Apply a single ACP session update to the accumulated state.
    ///
    /// This is the primary state mutation method. All 11 ACP update kinds
    /// are handled by `AcpSessionState.applying(_:)`.
    func applyUpdate(_ update: AcpSessionUpdate) {
        state = state.applying(update)
        isAcpActive = true
        stateDidChange.send(state)
    }

    /// Add a permission request to the session state.
    ///
    /// Also emits on `permissionRequestReceived` for UI notification.
    func addPermissionRequest(_ request: AcpPermissionRequestState) {
        state = state.addingPermissionRequest(request)
        stateDidChange.send(state)
        permissionRequestReceived.send(request)
    }

    /// Resolve a permission request.
    func resolvePermissionRequest(
        requestId: String,
        outcome: AcpPermissionOutcome,
        selectedOptionId: String?
    ) {
        state = state.resolvingPermissionRequest(
            requestId: requestId,
            outcome: outcome,
            selectedOptionId: selectedOptionId
        )
        stateDidChange.send(state)
    }

    /// Update the agent registry state.
    func updateAgentRegistry(_ registry: AcpAgentRegistryState) {
        agentRegistry = registry
    }

    /// Reset the ACP session state to initial values.
    ///
    /// Called when starting a new prompt turn or switching sessions.
    func resetState() {
        state = .initial()
        isAcpActive = false
        stateDidChange.send(state)
    }

    /// Reset only the streaming content (messages, thoughts) while preserving
    /// tool calls, plan, config, and other persistent state.
    ///
    /// Called at the start of a new prompt turn within the same session.
    func resetStreamingContent() {
        state.agentMessage = ""
        state.userMessage = ""
        state.agentThought = ""
        stateDidChange.send(state)
    }

    // MARK: - Computed Properties

    /// The next pending permission request that needs user attention.
    var nextPendingPermission: AcpPermissionRequestState? {
        state.nextPendingPermission
    }

    /// Whether there are any pending permissions.
    var hasPendingPermissions: Bool {
        state.hasPendingPermissions
    }

    /// Number of active tool calls.
    var activeToolCallCount: Int {
        state.activeToolCallCount
    }

    // MARK: - Private Methods

    private func setupSubscriptions() {
        // Listen for ACP session updates from SyncService
        syncService.acpSessionUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] update in
                self?.applyUpdate(update)
            }
            .store(in: &cancellables)

        // Listen for ACP permission requests from SyncService
        syncService.acpPermissionRequests
            .receive(on: DispatchQueue.main)
            .sink { [weak self] request in
                self?.addPermissionRequest(request)
            }
            .store(in: &cancellables)
    }
}
