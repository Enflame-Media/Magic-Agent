//
//  AcpSessionViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import UIKit

/// ViewModel for managing ACP permission requests in the iOS app.
///
/// Bridges the permission request UI (AcpPermissionRequestView) with the
/// SyncService WebSocket transport layer. When a user taps Allow/Reject,
/// this ViewModel:
/// 1. Updates local state (moves request to history)
/// 2. Sends the encrypted response via SyncService to the server relay
/// 3. Updates the app badge count to reflect remaining pending permissions
///
/// Also observes push notification actions (lock screen approve/reject)
/// and routes those through the same response pipeline.
///
/// ## Thread Safety
/// Uses a `Set<String>` to track in-flight responses, preventing duplicate
/// sends if the user taps the button at the same time a push notification
/// action fires for the same request.
///
/// @see HAP-1066 - Wire permission response relay through encrypted WebSocket
@MainActor
class AcpSessionViewModel: ObservableObject {

    // MARK: - Published State

    /// All pending permission requests, keyed by requestId.
    @Published private(set) var pendingRequests: [String: AcpPermissionRequestState] = [:]

    /// History of resolved permission decisions.
    @Published private(set) var permissionHistory: [AcpPermissionDecision] = []

    /// Whether a response is currently being sent.
    @Published private(set) var isSending: Bool = false

    /// Last error encountered when sending a response, if any.
    @Published private(set) var lastError: String?

    // MARK: - Private

    /// Set of request IDs currently being processed, to prevent duplicate responses.
    private var inFlightResponses: Set<String> = []

    /// Cancellables for Combine subscriptions.
    private var cancellables = Set<AnyCancellable>()

    /// Maximum number of decisions to keep in history.
    private let historyMaxCount = 50

    // MARK: - Initialization

    init() {
        observePushNotificationActions()
    }

    // MARK: - Permission Request Management

    /// Add a new permission request received from the CLI agent.
    ///
    /// Called when SyncService receives an `acp-permission-request` ephemeral event.
    ///
    /// - Parameter request: The permission request state to add.
    func addPermissionRequest(_ request: AcpPermissionRequestState) {
        pendingRequests[request.requestId] = request
        updateBadgeCount()
    }

    /// Remove all pending requests for a specific session.
    ///
    /// Called when a session is unsubscribed or disconnected.
    ///
    /// - Parameter sessionId: The session ID to remove requests for.
    func removeRequestsForSession(_ sessionId: String) {
        pendingRequests = pendingRequests.filter { $0.value.sessionId != sessionId }
        updateBadgeCount()
    }

    /// Get the number of pending permission requests.
    var pendingCount: Int {
        pendingRequests.values.filter { $0.status == .pending }.count
    }

    // MARK: - Permission Resolution

    /// Resolve a permission request with the user's decision.
    ///
    /// This is the primary entry point when the user taps Allow/Reject in the UI.
    /// It updates local state, sends the encrypted response via WebSocket, and
    /// updates the badge count.
    ///
    /// - Parameters:
    ///   - requestId: The permission request ID to resolve.
    ///   - selectedOptionId: The option ID the user selected (nil for expiry/cancel).
    ///   - outcome: The outcome of the decision.
    func resolvePermission(
        requestId: String,
        selectedOptionId: String?,
        outcome: AcpPermissionOutcome
    ) {
        // Guard against duplicate responses
        guard !inFlightResponses.contains(requestId) else {
            #if DEBUG
            print("[AcpSessionViewModel] Ignoring duplicate response for requestId=\(requestId)")
            #endif
            return
        }

        guard let request = pendingRequests[requestId] else {
            #if DEBUG
            print("[AcpSessionViewModel] No pending request found for requestId=\(requestId)")
            #endif
            return
        }

        // Mark as in-flight to prevent duplicates
        inFlightResponses.insert(requestId)
        isSending = true
        lastError = nil

        // Update local state immediately for responsive UI
        var updatedRequest = request
        updatedRequest.status = .responded
        updatedRequest.selectedOptionId = selectedOptionId
        pendingRequests[requestId] = updatedRequest

        // Build the decision record
        let selectedOption: SelectedOptionInfo?
        if let optionId = selectedOptionId,
           let option = request.options.first(where: { $0.optionId == optionId }) {
            selectedOption = SelectedOptionInfo(
                optionId: option.optionId,
                name: option.name,
                kind: option.kind
            )
        } else {
            selectedOption = nil
        }

        let decision = AcpPermissionDecision(
            requestId: requestId,
            toolTitle: request.toolCall.title,
            toolKind: request.toolCall.kind,
            selectedOption: selectedOption,
            outcome: outcome,
            decidedAt: Date()
        )

        // Move to history and remove from pending
        permissionHistory.insert(decision, at: 0)
        if permissionHistory.count > historyMaxCount {
            permissionHistory = Array(permissionHistory.prefix(historyMaxCount))
        }
        pendingRequests.removeValue(forKey: requestId)

        // Update badge count
        updateBadgeCount()

        // Send the response via WebSocket (async, fire-and-forget with error handling)
        Task {
            await sendPermissionResponse(
                sessionId: request.sessionId,
                requestId: requestId,
                selectedOptionId: selectedOptionId,
                outcome: outcome
            )
        }
    }

    // MARK: - Private - WebSocket Send

    /// Send the encrypted permission response via SyncService.
    ///
    /// - Parameters:
    ///   - sessionId: The session ID.
    ///   - requestId: The permission request ID.
    ///   - selectedOptionId: The selected option ID.
    ///   - outcome: The permission outcome.
    private func sendPermissionResponse(
        sessionId: String,
        requestId: String,
        selectedOptionId: String?,
        outcome: AcpPermissionOutcome
    ) async {
        defer {
            inFlightResponses.remove(requestId)
            isSending = inFlightResponses.isEmpty ? false : true
        }

        do {
            try await SyncService.shared.sendAcpPermissionResponse(
                sessionId: sessionId,
                requestId: requestId,
                selectedOptionId: selectedOptionId,
                outcome: outcome
            )

            #if DEBUG
            print("[AcpSessionViewModel] Permission response sent: requestId=\(requestId), outcome=\(outcome.rawValue)")
            #endif
        } catch {
            #if DEBUG
            print("[AcpSessionViewModel] Failed to send permission response: \(error.localizedDescription)")
            #endif

            lastError = error.localizedDescription
        }
    }

    // MARK: - Badge Count

    /// Update the app badge count to reflect pending permission requests.
    ///
    /// Must be called on the main thread (enforced by @MainActor on the class).
    private func updateBadgeCount() {
        let count = pendingCount
        UIApplication.shared.applicationIconBadgeNumber = count
    }

    // MARK: - Push Notification Action Observers

    /// Observe push notification actions for ACP permission approve/reject.
    ///
    /// When the user taps "Approve" or "Reject" on a lock screen notification,
    /// `PushNotificationService` posts `.approveToolRequest` or `.rejectToolRequest`
    /// notifications. This method observes those and routes them through
    /// `resolvePermission()` to send the response via WebSocket.
    private func observePushNotificationActions() {
        NotificationCenter.default.publisher(for: .approveToolRequest)
            .receive(on: RunLoop.main)
            .sink { [weak self] notification in
                self?.handlePushNotificationAction(notification: notification, approve: true)
            }
            .store(in: &cancellables)

        NotificationCenter.default.publisher(for: .rejectToolRequest)
            .receive(on: RunLoop.main)
            .sink { [weak self] notification in
                self?.handlePushNotificationAction(notification: notification, approve: false)
            }
            .store(in: &cancellables)
    }

    /// Handle a push notification action (approve or reject).
    ///
    /// - Parameters:
    ///   - notification: The notification containing sessionId and requestId.
    ///   - approve: Whether the user approved (true) or rejected (false).
    private func handlePushNotificationAction(notification: Notification, approve: Bool) {
        guard let userInfo = notification.userInfo,
              let requestId = userInfo["requestId"] as? String else {
            #if DEBUG
            print("[AcpSessionViewModel] Push notification action missing requestId")
            #endif
            return
        }

        guard let request = pendingRequests[requestId] else {
            #if DEBUG
            print("[AcpSessionViewModel] No pending request for push action requestId=\(requestId)")
            #endif
            return
        }

        // Find the appropriate option: first matching allow_once or reject_once
        let targetKind: AcpPermissionOptionKind = approve ? .allowOnce : .rejectOnce
        let option = request.options.first { $0.kind == targetKind }

        resolvePermission(
            requestId: requestId,
            selectedOptionId: option?.optionId,
            outcome: .selected
        )
    }
}
