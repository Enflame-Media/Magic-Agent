//
//  AcpSessionViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import UserNotifications

/// ViewModel managing all ACP interactive features.
///
/// This is the central state manager for:
/// - Permission request queue and responses
/// - Session browsing (list, load, resume, fork)
/// - Agent registry and switching
/// - macOS notification integration for background permission alerts
///
/// All bidirectional messages are encrypted through the existing SyncService relay.
@Observable
final class AcpSessionViewModel {
    // MARK: - Singleton

    /// Shared instance for cross-view access.
    static let shared = AcpSessionViewModel()

    // MARK: - Permission State

    /// Queue of pending permission requests (oldest first).
    var pendingPermissions: [AcpPermissionRequest] = []

    /// History of resolved permission requests.
    var permissionHistory: [AcpPermissionHistoryEntry] = []

    /// The current (oldest pending) permission request, if any.
    var currentPermission: AcpPermissionRequest? {
        pendingPermissions.first { $0.status == .pending && !$0.isExpired }
    }

    /// Number of pending permission requests.
    var pendingPermissionCount: Int {
        pendingPermissions.filter { $0.status == .pending && !$0.isExpired }.count
    }

    /// Whether the permission sheet should be displayed.
    var showPermissionSheet = false

    // MARK: - Session Browser State

    /// Sessions available from the agent's session/list capability.
    var availableSessions: [AcpSessionInfo] = []

    /// Whether sessions are currently being fetched.
    var isLoadingSessions = false

    /// The currently active session ID.
    var activeSessionId: String?

    /// Error message from session operations.
    var sessionError: String?

    /// Whether a session action is in progress.
    var isPerformingSessionAction = false

    /// Whether the session switch confirmation alert is shown.
    var showSessionSwitchConfirmation = false

    /// The session action pending user confirmation.
    var pendingSessionAction: PendingSessionAction?

    // MARK: - Agent State

    /// Registered agents.
    var agents: [AcpAgent] = []

    /// The currently active agent.
    var activeAgent: AcpAgent? {
        agents.first { $0.id == activeAgentId }
    }

    /// ID of the currently active agent.
    var activeAgentId: String?

    /// Whether an agent switch is in progress.
    var isSwitchingAgent = false

    /// Error from the last agent switch attempt.
    var agentSwitchError: String?

    /// Whether the agent switch confirmation alert is shown.
    var showAgentSwitchConfirmation = false

    /// The agent ID pending switch confirmation.
    var pendingAgentSwitchId: String?

    // MARK: - Private

    private var cancellables = Set<AnyCancellable>()
    private let syncService: SyncService
    private var timeoutTimers: [String: Timer] = [:]

    // MARK: - Initialization

    init(syncService: SyncService = .shared) {
        self.syncService = syncService
        setupSubscriptions()
        requestNotificationPermission()
    }

    // MARK: - Permission Actions

    /// Handle an incoming permission request from the agent.
    ///
    /// Adds the request to the queue and fires a macOS notification
    /// if the app is not frontmost.
    func handlePermissionRequest(_ request: AcpPermissionRequest) {
        pendingPermissions.append(request)

        // Start timeout timer if applicable
        if let timeoutAt = request.timeoutAt {
            let delay = max(0, (Double(timeoutAt) - Date().timeIntervalSince1970 * 1000) / 1000)
            let timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
                self?.expirePermission(requestId: request.requestId)
            }
            timeoutTimers[request.requestId] = timer
        }

        // Show the permission sheet
        showPermissionSheet = true

        // Fire macOS notification if app is in background
        if !NSApp.isActive {
            sendPermissionNotification(for: request)
        }
    }

    /// Select a permission option and send the response through the encrypted relay.
    ///
    /// - Parameters:
    ///   - requestId: The permission request ID.
    ///   - optionId: The selected option ID.
    func selectPermissionOption(requestId: String, optionId: String) {
        guard let index = pendingPermissions.firstIndex(where: { $0.requestId == requestId }) else {
            return
        }

        let request = pendingPermissions[index]
        guard let option = request.options.first(where: { $0.optionId == optionId }) else {
            return
        }

        // Update local state
        pendingPermissions[index].status = option.isAllow ? .approved : .rejected

        // Cancel timeout timer
        timeoutTimers[requestId]?.invalidate()
        timeoutTimers.removeValue(forKey: requestId)

        // Add to history
        let historyEntry = AcpPermissionHistoryEntry(
            id: requestId,
            toolTitle: request.toolCall.title,
            toolKind: request.toolCall.kind,
            selectedOption: option.name,
            wasAllowed: option.isAllow,
            timestamp: Date()
        )
        permissionHistory.insert(historyEntry, at: 0)

        // Send response through encrypted relay
        let response = AcpPermissionResponse(
            requestId: requestId,
            outcome: .selected(optionId: optionId)
        )
        Task {
            await sendEncryptedMessage(response)
        }

        // Close sheet if no more pending permissions
        if currentPermission == nil {
            showPermissionSheet = false
        }
    }

    /// Cancel a permission request (e.g., when the sheet is dismissed).
    func cancelPermission(requestId: String) {
        guard let index = pendingPermissions.firstIndex(where: { $0.requestId == requestId }) else {
            return
        }

        pendingPermissions[index].status = .cancelled

        // Cancel timeout timer
        timeoutTimers[requestId]?.invalidate()
        timeoutTimers.removeValue(forKey: requestId)

        // Send cancellation through relay
        let response = AcpPermissionResponse(
            requestId: requestId,
            outcome: .cancelled
        )
        Task {
            await sendEncryptedMessage(response)
        }
    }

    /// Mark a permission as expired (called by timeout timer).
    private func expirePermission(requestId: String) {
        guard let index = pendingPermissions.firstIndex(where: { $0.requestId == requestId }) else {
            return
        }

        pendingPermissions[index].status = .expired
        timeoutTimers.removeValue(forKey: requestId)

        // Move to next pending permission if available
        if currentPermission == nil {
            showPermissionSheet = false
        }
    }

    // MARK: - Session Browser Actions

    /// Refresh the list of available sessions from the agent.
    func refreshSessions() async {
        guard let agent = activeAgent, agent.capabilities.listSessions else {
            return
        }

        isLoadingSessions = true
        sessionError = nil

        let request = AcpSessionListRequest()
        await sendEncryptedMessage(request)

        // The response will be handled via the subscription
        // Set a timeout to stop loading indicator
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            self?.isLoadingSessions = false
        }
    }

    /// Request to perform a session action with confirmation.
    ///
    /// - Parameters:
    ///   - action: The action to perform (load, resume, fork).
    ///   - sessionId: The target session ID.
    func requestSessionAction(_ action: AcpSessionAction, sessionId: String) {
        pendingSessionAction = PendingSessionAction(action: action, sessionId: sessionId)
        showSessionSwitchConfirmation = true
    }

    /// Confirm and execute the pending session action.
    func confirmSessionAction() {
        guard let pending = pendingSessionAction else { return }

        showSessionSwitchConfirmation = false
        isPerformingSessionAction = true
        sessionError = nil

        let request = AcpSessionActionRequest(
            action: pending.action,
            sessionId: pending.sessionId
        )

        Task {
            await sendEncryptedMessage(request)
        }

        pendingSessionAction = nil

        // Timeout for the action
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            self?.isPerformingSessionAction = false
        }
    }

    /// Cancel the pending session action.
    func cancelSessionAction() {
        showSessionSwitchConfirmation = false
        pendingSessionAction = nil
    }

    // MARK: - Agent Actions

    /// Request to switch to a different agent with confirmation.
    ///
    /// - Parameter agentId: The agent ID to switch to.
    func requestAgentSwitch(agentId: String) {
        guard agentId != activeAgentId else { return }
        pendingAgentSwitchId = agentId
        showAgentSwitchConfirmation = true
    }

    /// Confirm and execute the pending agent switch.
    func confirmAgentSwitch() {
        guard let agentId = pendingAgentSwitchId else { return }

        showAgentSwitchConfirmation = false
        isSwitchingAgent = true
        agentSwitchError = nil

        let request = AcpAgentSwitchRequest(agentId: agentId)

        Task {
            await sendEncryptedMessage(request)
        }

        // Timeout for the switch
        DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
            if self?.isSwitchingAgent == true {
                self?.isSwitchingAgent = false
                self?.agentSwitchError = "Agent switch timed out."
            }
        }
    }

    /// Cancel the pending agent switch.
    func cancelAgentSwitch() {
        showAgentSwitchConfirmation = false
        pendingAgentSwitchId = nil
    }

    /// Handle the response from an agent switch attempt.
    func handleAgentSwitchResponse(_ response: AcpAgentSwitchResponse) {
        isSwitchingAgent = false

        if response.success {
            if let agentId = pendingAgentSwitchId {
                activeAgentId = agentId
            }
            agentSwitchError = nil
        } else {
            agentSwitchError = response.error ?? "Failed to switch agent."
        }

        pendingAgentSwitchId = nil
    }

    /// Handle the response from a session action.
    func handleSessionActionResponse(_ response: AcpSessionActionResponse) {
        isPerformingSessionAction = false

        if response.success {
            if let newSessionId = response.newSessionId {
                activeSessionId = newSessionId
            }
            sessionError = nil
        } else {
            sessionError = response.error ?? "Session action failed."
        }
    }

    /// Handle an updated sessions list from the agent.
    func handleSessionsList(_ sessions: [AcpSessionInfo]) {
        isLoadingSessions = false
        availableSessions = sessions
    }

    // MARK: - Private Methods

    /// Set up subscriptions to SyncService publishers.
    private func setupSubscriptions() {
        // Subscribe to ACP permission requests via SyncService
        syncService.acpPermissionRequests
            .receive(on: DispatchQueue.main)
            .sink { [weak self] request in
                self?.handlePermissionRequest(request)
            }
            .store(in: &cancellables)

        // Subscribe to ACP agent updates
        syncService.acpAgentUpdates
            .receive(on: DispatchQueue.main)
            .sink { [weak self] agents in
                self?.agents = agents
            }
            .store(in: &cancellables)

        // Subscribe to ACP session list responses
        syncService.acpSessionListResponse
            .receive(on: DispatchQueue.main)
            .sink { [weak self] sessions in
                self?.handleSessionsList(sessions)
            }
            .store(in: &cancellables)

        // Subscribe to ACP agent switch responses
        syncService.acpAgentSwitchResponse
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.handleAgentSwitchResponse(response)
            }
            .store(in: &cancellables)

        // Subscribe to ACP session action responses
        syncService.acpSessionActionResponse
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.handleSessionActionResponse(response)
            }
            .store(in: &cancellables)
    }

    /// Send an encrypted message through the SyncService relay.
    private func sendEncryptedMessage<T: Encodable>(_ message: T) async {
        do {
            try await syncService.sendAcpMessage(message)
        } catch {
            print("[AcpSessionViewModel] Failed to send message: \(error.localizedDescription)")
        }
    }

    // MARK: - macOS Notifications

    /// Request permission to send user notifications.
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            if let error = error {
                print("[AcpSessionViewModel] Notification permission error: \(error.localizedDescription)")
            }
            if granted {
                print("[AcpSessionViewModel] Notification permission granted")
            }
        }
    }

    /// Send a macOS notification for a permission request when app is in background.
    private func sendPermissionNotification(for request: AcpPermissionRequest) {
        let content = UNMutableNotificationContent()
        content.title = "Permission Request"
        content.body = request.toolCall.title
        content.sound = .default
        content.categoryIdentifier = "ACP_PERMISSION"
        content.userInfo = ["requestId": request.requestId]

        let notificationRequest = UNNotificationRequest(
            identifier: "permission-\(request.requestId)",
            content: content,
            trigger: nil  // Deliver immediately
        )

        UNUserNotificationCenter.current().add(notificationRequest) { error in
            if let error = error {
                print("[AcpSessionViewModel] Failed to send notification: \(error.localizedDescription)")
            }
        }
    }

    /// Handle a notification action (when user clicks the notification).
    func handleNotificationAction(requestId: String) {
        // Bring app to front
        NSApp.activate(ignoringOtherApps: true)

        // Show the permission sheet
        showPermissionSheet = true
    }
}

// MARK: - Pending Session Action

/// A session action pending user confirmation.
struct PendingSessionAction: Identifiable {
    let id = UUID()
    let action: AcpSessionAction
    let sessionId: String
}

// MARK: - Session List Request

/// Request to list available sessions from the agent.
private struct AcpSessionListRequest: Codable {
    let type: String
    let cursor: String?

    init(cursor: String? = nil) {
        self.type = "acp-session-list"
        self.cursor = cursor
    }
}
