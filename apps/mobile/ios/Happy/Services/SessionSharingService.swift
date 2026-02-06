//
//  SessionSharingService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Protocol for session sharing API operations, enabling dependency injection and testing.
protocol SessionSharingServiceProtocol {
    /// Share a session with a friend.
    func shareSession(sessionId: String, withFriendId: String, permission: SharedSessionPermission) async throws -> SharedSession
    /// Fetch sessions shared between the current user and a specific friend.
    func fetchSharedSessions(friendId: String) async throws -> [SharedSession]
    /// Revoke a previously shared session.
    func revokeSharedSession(sharedSessionId: String) async throws
    /// Update the permission level of a shared session.
    func updatePermission(sharedSessionId: String, permission: SharedSessionPermission) async throws -> SharedSession
}

/// Service for managing session sharing between friends.
///
/// Wraps the shared `APIService` actor to provide session sharing-specific
/// endpoints. All methods are async and throw on network or server errors.
struct SessionSharingService: SessionSharingServiceProtocol {

    private let apiService: APIService

    init(apiService: APIService = .shared) {
        self.apiService = apiService
    }

    func shareSession(sessionId: String, withFriendId friendId: String, permission: SharedSessionPermission) async throws -> SharedSession {
        struct ShareBody: Encodable {
            let sessionId: String
            let friendId: String
            let permission: String
        }
        let body = ShareBody(
            sessionId: sessionId,
            friendId: friendId,
            permission: permission.rawValue
        )
        return try await apiService.post("/v1/friends/sessions/share", body: body)
    }

    func fetchSharedSessions(friendId: String) async throws -> [SharedSession] {
        struct SharedSessionsResponse: Decodable {
            let sessions: [SharedSession]
        }
        let response: SharedSessionsResponse = try await apiService.fetch("/v1/friends/\(friendId)/sessions")
        return response.sessions
    }

    func revokeSharedSession(sharedSessionId: String) async throws {
        struct EmptyBody: Encodable {}
        struct EmptyResponse: Decodable {}
        let _: EmptyResponse = try await apiService.put(
            "/v1/friends/sessions/\(sharedSessionId)/revoke",
            body: EmptyBody()
        )
    }

    func updatePermission(sharedSessionId: String, permission: SharedSessionPermission) async throws -> SharedSession {
        struct UpdateBody: Encodable {
            let permission: String
        }
        let body = UpdateBody(permission: permission.rawValue)
        return try await apiService.put(
            "/v1/friends/sessions/\(sharedSessionId)/permission",
            body: body
        )
    }
}
