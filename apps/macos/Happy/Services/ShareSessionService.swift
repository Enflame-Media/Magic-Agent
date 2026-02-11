//
//  ShareSessionService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Request/Response Types

/// Request body for adding a share to a session.
struct AddShareRequest: Codable {
    let userId: String
    let permission: SessionSharePermission
}

/// Request body for updating a share.
struct UpdateShareRequest: Codable {
    let permission: SessionSharePermission
}

/// Request body for sending an email invitation.
struct SendInvitationRequest: Codable {
    let email: String
    let permission: SessionSharePermission
}

/// Request body for updating URL sharing settings.
struct UpdateUrlSharingRequest: Codable {
    let enabled: Bool
    let password: String?
    let permission: SessionSharePermission
}

/// Response for share modification actions.
struct ShareActionResponse: Codable {
    let success: Bool
    let message: String?
}

/// Response containing the share URL.
struct ShareUrlResponse: Codable {
    let url: String
    let token: String
}

// MARK: - Share Session Service

/// Service for managing session sharing.
///
/// This actor provides thread-safe methods for fetching and modifying
/// session share settings, including friend shares, email invitations,
/// and URL-based sharing.
///
/// Usage:
/// ```swift
/// let service = ShareSessionService.shared
///
/// // Fetch share settings
/// let settings = try await service.fetchShareSettings(sessionId: "...")
///
/// // Add a share
/// try await service.addShare(sessionId: "...", userId: "...", permission: .viewOnly)
/// ```
actor ShareSessionService {
    // MARK: - Singleton

    /// Shared instance for app-wide usage.
    static let shared = ShareSessionService()

    // MARK: - Dependencies

    private let apiService: APIService

    // MARK: - Initialization

    init(apiService: APIService = .shared) {
        self.apiService = apiService
    }

    // MARK: - Fetch Methods

    /// Fetch the current share settings for a session.
    /// - Parameter sessionId: The session ID to fetch settings for.
    /// - Returns: The complete share settings including shares, invitations, and URL config.
    func fetchShareSettings(sessionId: String) async throws -> SessionShareSettings {
        return try await apiService.fetch("/v1/sessions/\(sessionId)/share")
    }

    // MARK: - Share Management

    /// Add a share for a user on a session.
    /// - Parameters:
    ///   - sessionId: The session to share.
    ///   - userId: The user to share with.
    ///   - permission: The permission level to grant.
    func addShare(sessionId: String, userId: String, permission: SessionSharePermission) async throws {
        let request = AddShareRequest(userId: userId, permission: permission)
        let _: ShareActionResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share",
            body: request
        )
    }

    /// Update the permission for an existing share.
    /// - Parameters:
    ///   - sessionId: The session ID.
    ///   - shareId: The share ID to update.
    ///   - permission: The new permission level.
    func updateShare(sessionId: String, shareId: String, permission: SessionSharePermission) async throws {
        let request = UpdateShareRequest(permission: permission)
        let _: ShareActionResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share/\(shareId)",
            body: request
        )
    }

    /// Remove a share from a session.
    /// - Parameters:
    ///   - sessionId: The session ID.
    ///   - shareId: The share ID to remove.
    func removeShare(sessionId: String, shareId: String) async throws {
        struct EmptyRequest: Codable {}
        let _: ShareActionResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share/\(shareId)/remove",
            body: EmptyRequest()
        )
    }

    // MARK: - Invitation Management

    /// Send an email invitation to share a session.
    /// - Parameters:
    ///   - sessionId: The session to share.
    ///   - email: The email address to invite.
    ///   - permission: The permission level to grant.
    func sendInvitation(sessionId: String, email: String, permission: SessionSharePermission) async throws {
        let request = SendInvitationRequest(email: email, permission: permission)
        let _: ShareActionResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share/invite",
            body: request
        )
    }

    /// Revoke a pending invitation.
    /// - Parameters:
    ///   - sessionId: The session ID.
    ///   - invitationId: The invitation ID to revoke.
    func revokeInvitation(sessionId: String, invitationId: String) async throws {
        struct EmptyRequest: Codable {}
        let _: ShareActionResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share/invite/\(invitationId)/revoke",
            body: EmptyRequest()
        )
    }

    // MARK: - URL Sharing

    /// Update the URL sharing settings for a session.
    /// - Parameters:
    ///   - sessionId: The session ID.
    ///   - enabled: Whether URL sharing is enabled.
    ///   - password: Optional password protection.
    ///   - permission: The permission level for URL-based access.
    /// - Returns: The share URL if enabled.
    func updateUrlSharing(
        sessionId: String,
        enabled: Bool,
        password: String?,
        permission: SessionSharePermission
    ) async throws -> String? {
        let request = UpdateUrlSharingRequest(
            enabled: enabled,
            password: password,
            permission: permission
        )
        let response: ShareUrlResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share/url",
            body: request
        )
        return enabled ? response.url : nil
    }

    /// Generate a new share URL token (regenerates if already exists).
    /// - Parameter sessionId: The session ID.
    /// - Returns: The new share URL.
    func regenerateShareUrl(sessionId: String) async throws -> String {
        struct EmptyRequest: Codable {}
        let response: ShareUrlResponse = try await apiService.post(
            "/v1/sessions/\(sessionId)/share/url/regenerate",
            body: EmptyRequest()
        )
        return response.url
    }
}

// MARK: - Share URL Building

extension ShareSessionService {
    /// Build the full share URL from settings.
    /// - Parameters:
    ///   - sessionId: The session ID.
    ///   - token: The share token.
    /// - Returns: The complete share URL.
    nonisolated func buildShareUrl(sessionId: String, token: String) -> URL? {
        let baseUrl = APIConfiguration.baseURL
            .absoluteString
            .replacingOccurrences(of: "api.", with: "app.")
        return URL(string: "\(baseUrl)/session/\(sessionId)?share=\(token)")
    }
}
