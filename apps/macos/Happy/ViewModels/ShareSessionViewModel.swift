//
//  ShareSessionViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

/// ViewModel for the ShareSessionSheet, managing share state and operations.
///
/// This class coordinates between the ShareSessionService and FriendsService
/// to provide a complete interface for session sharing functionality.
@Observable
final class ShareSessionViewModel {
    // MARK: - State

    /// The session ID being shared.
    let sessionId: String

    /// Current shares on this session.
    var shares: [Share] = []

    /// Pending email invitations.
    var invitations: [Invitation] = []

    /// URL sharing configuration.
    var urlConfig: URLSharing = URLSharing(
        enabled: false,
        expiresAt: nil,
        password: nil,
        permission: .viewOnly,
        token: nil
    )

    /// The generated share URL, if URL sharing is enabled.
    var shareUrl: URL?

    /// Whether data is being loaded.
    var isLoading = false

    /// Whether a save operation is in progress.
    var isSaving = false

    /// Error message to display.
    var errorMessage: String?

    /// Whether to show error alert.
    var showingError = false

    /// Search query for filtering friends.
    var friendSearchQuery = ""

    /// Email address for non-user invitations.
    var inviteEmail = ""

    /// Selected permission for new shares.
    var selectedPermission: SessionSharePermission = .viewOnly

    /// Whether URL sharing settings have pending changes.
    var urlConfigHasChanges = false

    /// Password for URL sharing (editable).
    var urlPassword = ""

    /// Whether URL sharing is enabled (editable).
    var urlEnabled = false

    /// Permission for URL sharing (editable).
    var urlPermission: SessionSharePermission = .viewOnly

    /// Feedback message after clipboard copy.
    var copyFeedback: String?

    // MARK: - Computed Properties

    /// Friends filtered by search query who are not already shared with.
    var filteredFriends: [UserProfile] {
        let query = friendSearchQuery.lowercased()
        return friendsService.acceptedFriends.filter { friend in
            // Exclude already shared
            guard !shares.contains(where: { $0.userId == friend.id }) else { return false }

            // Filter by search query
            guard !query.isEmpty else { return true }
            return friend.firstName.lowercased().contains(query) ||
                   friend.username.lowercased().contains(query) ||
                   (friend.lastName?.lowercased().contains(query) ?? false)
        }
    }

    /// Whether the email is valid for sending an invitation.
    var isEmailValid: Bool {
        let emailRegex = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return inviteEmail.range(of: emailRegex, options: .regularExpression) != nil
    }

    /// Pending invitations only.
    var pendingInvitations: [Invitation] {
        invitations.filter { $0.status == .pending }
    }

    // MARK: - Dependencies

    private let shareService: ShareSessionService
    private let friendsService: FriendsService
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Initialization

    /// Initialize with the session ID to share.
    /// - Parameters:
    ///   - sessionId: The session to manage sharing for.
    ///   - shareService: The share service. Defaults to shared instance.
    ///   - friendsService: The friends service. Defaults to shared instance.
    init(
        sessionId: String,
        shareService: ShareSessionService = .shared,
        friendsService: FriendsService = .shared
    ) {
        self.sessionId = sessionId
        self.shareService = shareService
        self.friendsService = friendsService
    }

    // MARK: - Load Methods

    /// Load the current share settings for the session.
    @MainActor
    func loadSharing() async {
        isLoading = true
        errorMessage = nil

        do {
            let settings = try await shareService.fetchShareSettings(sessionId: sessionId)
            shares = settings.shares
            invitations = settings.invitations
            urlConfig = settings.urlSharing

            // Sync editable URL config
            urlEnabled = settings.urlSharing.enabled
            urlPassword = settings.urlSharing.password ?? ""
            urlPermission = settings.urlSharing.permission

            // Build share URL if enabled
            if urlConfig.enabled, let token = urlConfig.token {
                shareUrl = shareService.buildShareUrl(sessionId: sessionId, token: token)
            }

            // Load friends if not already loaded
            if friendsService.friends.isEmpty {
                await friendsService.loadFriends()
            }
        } catch {
            errorMessage = error.localizedDescription
            showingError = true
        }

        isLoading = false
    }

    // MARK: - Share Management

    /// Add a share for a friend.
    /// - Parameters:
    ///   - userId: The user ID to share with.
    ///   - permission: The permission level.
    @MainActor
    func addShare(userId: String, permission: SessionSharePermission) async {
        isSaving = true
        defer { isSaving = false }

        do {
            try await shareService.addShare(
                sessionId: sessionId,
                userId: userId,
                permission: permission
            )
            // Reload to get updated shares
            await loadSharing()
        } catch {
            errorMessage = "Failed to share session: \(error.localizedDescription)"
            showingError = true
        }
    }

    /// Update the permission for an existing share.
    /// - Parameters:
    ///   - share: The share to update.
    ///   - permission: The new permission level.
    @MainActor
    func updateShare(_ share: Share, permission: SessionSharePermission) async {
        isSaving = true
        defer { isSaving = false }

        do {
            try await shareService.updateShare(
                sessionId: sessionId,
                shareId: share.id,
                permission: permission
            )
            await loadSharing()
        } catch {
            errorMessage = "Failed to update permission: \(error.localizedDescription)"
            showingError = true
        }
    }

    /// Remove a share.
    /// - Parameter share: The share to remove.
    @MainActor
    func removeShare(_ share: Share) async {
        isSaving = true
        defer { isSaving = false }

        do {
            try await shareService.removeShare(sessionId: sessionId, shareId: share.id)
            shares.removeAll { $0.id == share.id }
        } catch {
            errorMessage = "Failed to remove share: \(error.localizedDescription)"
            showingError = true
        }
    }

    // MARK: - Invitation Management

    /// Send an email invitation.
    @MainActor
    func sendInvitation() async {
        guard isEmailValid else { return }

        isSaving = true
        defer { isSaving = false }

        do {
            try await shareService.sendInvitation(
                sessionId: sessionId,
                email: inviteEmail,
                permission: selectedPermission
            )
            inviteEmail = ""
            await loadSharing()
        } catch {
            errorMessage = "Failed to send invitation: \(error.localizedDescription)"
            showingError = true
        }
    }

    /// Revoke a pending invitation.
    /// - Parameter invitation: The invitation to revoke.
    @MainActor
    func revokeInvitation(_ invitation: Invitation) async {
        isSaving = true
        defer { isSaving = false }

        do {
            try await shareService.revokeInvitation(sessionId: sessionId, invitationId: invitation.id)
            invitations.removeAll { $0.id == invitation.id }
        } catch {
            errorMessage = "Failed to revoke invitation: \(error.localizedDescription)"
            showingError = true
        }
    }

    // MARK: - URL Sharing

    /// Save URL sharing settings.
    @MainActor
    func saveUrlSettings() async {
        isSaving = true
        defer { isSaving = false }

        do {
            let urlString = try await shareService.updateUrlSharing(
                sessionId: sessionId,
                enabled: urlEnabled,
                password: urlPassword.isEmpty ? nil : urlPassword,
                permission: urlPermission
            )

            if let urlString, let url = URL(string: urlString) {
                shareUrl = url
            } else if !urlEnabled {
                shareUrl = nil
            }

            // Reload to sync state
            await loadSharing()
        } catch {
            errorMessage = "Failed to update URL sharing: \(error.localizedDescription)"
            showingError = true
        }
    }

    /// Regenerate the share URL token.
    @MainActor
    func regenerateUrl() async {
        isSaving = true
        defer { isSaving = false }

        do {
            let urlString = try await shareService.regenerateShareUrl(sessionId: sessionId)
            if let url = URL(string: urlString) {
                shareUrl = url
            }
            await loadSharing()
        } catch {
            errorMessage = "Failed to regenerate URL: \(error.localizedDescription)"
            showingError = true
        }
    }

    // MARK: - Clipboard

    /// Copy the share URL to the clipboard.
    func copyUrlToClipboard() {
        guard let shareUrl else { return }

        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(shareUrl.absoluteString, forType: .string)

        copyFeedback = "Copied!"

        // Clear feedback after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            self?.copyFeedback = nil
        }
    }

    /// Share the URL using the native macOS share sheet.
    func shareUrlNatively() {
        guard let shareUrl,
              let window = NSApp.keyWindow,
              let contentView = window.contentView else { return }

        let picker = NSSharingServicePicker(items: [shareUrl])
        picker.show(relativeTo: .zero, of: contentView, preferredEdge: .minY)
    }

    // MARK: - Error Handling

    /// Dismiss the error alert.
    func dismissError() {
        showingError = false
        errorMessage = nil
    }
}
