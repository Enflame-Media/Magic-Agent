//
//  AcpSessionViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for ACP (Agent Control Protocol) session management.
///
/// Manages the state for ACP sessions, including real-time content block
/// streaming, permission request handling, agent registry, and session
/// browsing. Uses Combine publishers from `SyncService` for real-time updates.
///
/// This ViewModel is instantiated once at the authenticated root of the view
/// hierarchy and shared via `@ObservedObject` or `.environmentObject()`.
///
/// Uses `ObservableObject` for iOS 16 compatibility.
final class AcpSessionViewModel: ObservableObject {

    // MARK: - Published Properties

    /// The currently active ACP session, if any.
    @Published private(set) var currentSession: AcpSession?

    /// All known ACP sessions, sorted by most recent first.
    @Published private(set) var sessions: [AcpSession] = []

    /// Available agents in the registry.
    @Published private(set) var agents: [AcpAgent] = []

    /// The currently selected/active agent.
    @Published private(set) var activeAgent: AcpAgent?

    /// Pending permission requests across all sessions.
    @Published private(set) var pendingPermissions: [AcpPermissionRequest] = []

    /// Permission history (resolved permissions).
    @Published private(set) var permissionHistory: [AcpPermissionRequest] = []

    /// Whether ACP data is currently loading.
    @Published private(set) var isLoading: Bool = false

    /// Whether the initial load has completed.
    @Published private(set) var hasLoaded: Bool = false

    /// Current error message, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// Whether a permission request sheet should be presented.
    @Published var showPermissionRequest: Bool = false

    /// The permission request to present in the sheet.
    @Published var activePermissionRequest: AcpPermissionRequest?

    /// Whether the agent picker sheet should be presented.
    @Published var showAgentPicker: Bool = false

    /// ACP session configuration.
    @Published var config: AcpConfig = AcpConfig(
        mode: .supervised,
        autoApprove: [],
        maxTurns: nil,
        model: nil,
        systemPrompt: nil
    )

    // MARK: - Computed Properties

    /// Whether there is an active ACP session.
    var hasActiveSession: Bool {
        currentSession?.isActive ?? false
    }

    /// Number of pending permissions across all sessions.
    var pendingPermissionCount: Int {
        pendingPermissions.count
    }

    /// Content blocks for the current session.
    var currentContentBlocks: [AcpContentBlock] {
        currentSession?.contentBlocks ?? []
    }

    /// Usage data for the current session.
    var currentUsage: AcpUsage? {
        currentSession?.usage
    }

    // MARK: - Dependencies

    private let syncService: SyncService
    private let apiService: any APIServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    /// Creates a new ACP session view model.
    ///
    /// - Parameters:
    ///   - syncService: The sync service for real-time updates. Defaults to the shared instance.
    ///   - apiService: The API service for REST calls. Defaults to the shared instance.
    init(
        syncService: SyncService = .shared,
        apiService: any APIServiceProtocol = APIService.shared
    ) {
        self.syncService = syncService
        self.apiService = apiService
        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Load ACP session data for a given session ID.
    ///
    /// Maps an existing `Session.id` to the corresponding ACP session data.
    /// The session IDs are the same between the regular session model and ACP.
    ///
    /// - Parameter sessionId: The session ID to load ACP data for.
    @MainActor
    func loadSession(for sessionId: String) async {
        isLoading = true
        errorMessage = nil

        // Check if we already have this session cached
        if let existing = sessions.first(where: { $0.id == sessionId }) {
            currentSession = existing
            isLoading = false
            hasLoaded = true
            return
        }

        // Create a placeholder session that will be populated via sync updates
        let placeholder = AcpSession(
            id: sessionId,
            title: "",
            status: .idle,
            agentId: activeAgent?.id,
            agentName: activeAgent?.name,
            mode: config.mode,
            createdAt: Date(),
            updatedAt: Date(),
            contentBlocks: [],
            pendingPermissions: [],
            usage: nil
        )
        currentSession = placeholder

        if !sessions.contains(where: { $0.id == sessionId }) {
            sessions.insert(placeholder, at: 0)
        }

        isLoading = false
        hasLoaded = true
    }

    /// Load all ACP sessions.
    @MainActor
    func loadSessions() async {
        isLoading = true
        hasLoaded = true
        isLoading = false
    }

    /// Refresh ACP data.
    @MainActor
    func refresh() async {
        await loadSessions()
    }

    /// Select a session by ID.
    ///
    /// - Parameter sessionId: The session ID to select.
    @MainActor
    func selectSession(_ sessionId: String) {
        currentSession = sessions.first(where: { $0.id == sessionId })
    }

    /// Approve a permission request.
    ///
    /// - Parameter permission: The permission request to approve.
    @MainActor
    func approvePermission(_ permission: AcpPermissionRequest) async {
        var updated = permission
        updated.status = .approved
        updated.resolvedAt = Date()
        updated.resolvedBy = "user"

        // Move from pending to history
        pendingPermissions.removeAll { $0.id == permission.id }
        permissionHistory.insert(updated, at: 0)

        // Update in session
        if var session = currentSession {
            session.pendingPermissions.removeAll { $0.id == permission.id }
            currentSession = session
        }

        // Dismiss the permission sheet
        showPermissionRequest = false
        activePermissionRequest = nil
    }

    /// Deny a permission request.
    ///
    /// - Parameter permission: The permission request to deny.
    @MainActor
    func denyPermission(_ permission: AcpPermissionRequest) async {
        var updated = permission
        updated.status = .denied
        updated.resolvedAt = Date()
        updated.resolvedBy = "user"

        // Move from pending to history
        pendingPermissions.removeAll { $0.id == permission.id }
        permissionHistory.insert(updated, at: 0)

        // Update in session
        if var session = currentSession {
            session.pendingPermissions.removeAll { $0.id == permission.id }
            currentSession = session
        }

        // Dismiss the permission sheet
        showPermissionRequest = false
        activePermissionRequest = nil
    }

    /// Select an agent from the registry.
    ///
    /// - Parameter agent: The agent to select.
    @MainActor
    func selectAgent(_ agent: AcpAgent) {
        activeAgent = agent
        showAgentPicker = false
    }

    /// Update the ACP mode configuration.
    ///
    /// - Parameter mode: The new ACP mode.
    @MainActor
    func updateMode(_ mode: AcpMode) {
        config.mode = mode
    }

    /// Dismiss the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    /// Present the next pending permission request.
    @MainActor
    func presentNextPermission() {
        guard let next = pendingPermissions.first else { return }
        activePermissionRequest = next
        showPermissionRequest = true
    }

    // MARK: - Private Methods

    /// Sets up Combine subscriptions for real-time ACP updates.
    private func setupSubscriptions() {
        // Subscribe to session updates and check for ACP data
        syncService.sessionUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] session in
                Task { @MainActor in
                    self?.handleSessionUpdate(session)
                }
            }
            .store(in: &cancellables)

        // Subscribe to message updates for ACP content blocks
        syncService.messageUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                Task { @MainActor in
                    self?.handleMessageUpdate(message)
                }
            }
            .store(in: &cancellables)
    }

    /// Handle a session update from the sync service.
    @MainActor
    private func handleSessionUpdate(_ session: Session) {
        // Update existing ACP session if we're tracking it
        if let index = sessions.firstIndex(where: { $0.id == session.id }) {
            sessions[index].title = session.title
            sessions[index].updatedAt = session.updatedAt

            // Map session status to ACP status
            switch session.status {
            case .active:
                sessions[index].status = .running
            case .completed:
                sessions[index].status = .completed
            case .paused:
                sessions[index].status = .paused
            case .error:
                sessions[index].status = .error
            }

            if currentSession?.id == session.id {
                currentSession = sessions[index]
            }
        }
    }

    /// Handle a message update from the sync service.
    @MainActor
    private func handleMessageUpdate(_ message: Message) {
        // Convert messages to ACP content blocks for the current session
        guard let session = currentSession else { return }

        let block = AcpContentBlock(
            id: message.id,
            type: message.role == .assistant ? .text : (message.role == .tool ? .toolCall : .text),
            content: message.content,
            status: message.isStreaming ? .streaming : .completed,
            createdAt: message.createdAt,
            metadata: nil
        )

        if let index = currentSession?.contentBlocks.firstIndex(where: { $0.id == block.id }) {
            currentSession?.contentBlocks[index] = block
        } else {
            currentSession?.contentBlocks.append(block)
        }

        // Update in sessions array
        if let sessionIndex = sessions.firstIndex(where: { $0.id == session.id }) {
            sessions[sessionIndex] = currentSession!
        }
    }
}
