//
//  APIService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Configuration

/// Configuration for the Happy API service.
enum APIConfiguration {
    /// The base URL for API requests.
    static var baseURL: URL {
        // Check for environment override (useful for local development)
        if let urlString = ProcessInfo.processInfo.environment["HAPPY_API_URL"],
           let url = URL(string: urlString) {
            return url
        }

        #if DEBUG
        // Development server
        return URL(string: "https://api.happy.engineering")!
        #else
        // Production server
        return URL(string: "https://api.happy.engineering")!
        #endif
    }

    /// The base URL for WebSocket connections.
    static var webSocketURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["HAPPY_WS_URL"],
           let url = URL(string: urlString) {
            return url
        }

        #if DEBUG
        return URL(string: "wss://api.happy.engineering/sync")!
        #else
        return URL(string: "wss://api.happy.engineering/sync")!
        #endif
    }
}

/// Service for HTTP communication with the Happy server.
///
/// This actor ensures thread-safe network operations using Swift concurrency.
/// All requests are encrypted end-to-end using the EncryptionService.
actor APIService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = APIService()

    // MARK: - Configuration

    /// Base URL for the API.
    private let baseURL: URL

    /// URL session for network requests.
    private let session: URLSession

    // MARK: - Initialization

    init(baseURL: URL = APIConfiguration.baseURL) {
        self.baseURL = baseURL

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Public Methods

    /// Fetch data from an endpoint.
    /// - Parameters:
    ///   - endpoint: The API endpoint to fetch.
    ///   - authenticated: Whether to include authentication header.
    /// - Returns: Decoded response of type T.
    func fetch<T: Decodable>(_ endpoint: String, authenticated: Bool = true) async throws -> T {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if authenticated {
            try addAuthHeader(to: &request)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try handleHTTPError(response: httpResponse)

        return try decodeResponse(data)
    }

    /// Post data to an endpoint.
    /// - Parameters:
    ///   - endpoint: The API endpoint.
    ///   - body: The request body to encode.
    ///   - authenticated: Whether to include authentication header.
    /// - Returns: Decoded response of type R.
    func post<T: Encodable, R: Decodable>(_ endpoint: String, body: T, authenticated: Bool = true) async throws -> R {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        if authenticated {
            try addAuthHeader(to: &request)
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        try handleHTTPError(response: httpResponse)

        return try decodeResponse(data)
    }

    // MARK: - Session Endpoints

    /// Fetch all sessions for the authenticated user.
    /// - Returns: Array of sessions.
    func fetchSessions() async throws -> [Session] {
        struct SessionsResponse: Decodable {
            let sessions: [Session]
        }

        let response: SessionsResponse = try await fetch("/v1/sessions")
        return response.sessions
    }

    /// Fetch a single session by ID.
    /// - Parameter id: The session ID.
    /// - Returns: The session details.
    func fetchSession(id: String) async throws -> Session {
        return try await fetch("/v1/sessions/\(id)")
    }

    /// Fetch messages for a session.
    /// - Parameter sessionId: The session ID.
    /// - Returns: Array of messages.
    func fetchMessages(sessionId: String) async throws -> [Message] {
        struct MessagesResponse: Decodable {
            let messages: [Message]
        }

        let response: MessagesResponse = try await fetch("/v1/sessions/\(sessionId)/messages")
        return response.messages
    }

    /// Archive a session.
    ///
    /// Archiving a session marks it as inactive and removes it from the active sessions list.
    /// This is useful for cleaning up sessions that can no longer be revived.
    ///
    /// - Parameters:
    ///   - sessionId: The session ID to archive.
    ///   - reason: The reason for archiving (e.g., revival failed).
    func archiveSession(sessionId: String, reason: SessionArchiveReason) async throws {
        struct ArchiveRequest: Encodable {
            let reason: String
        }

        struct ArchiveResponse: Decodable {
            let success: Bool
        }

        let request = ArchiveRequest(reason: reason.rawValue)
        let _: ArchiveResponse = try await post("/v1/sessions/\(sessionId)/archive", body: request)
    }

    // MARK: - Authentication Endpoints

    /// Validate the current authentication token.
    /// - Returns: True if the token is valid.
    func validateToken() async throws -> Bool {
        struct ValidateResponse: Decodable {
            let valid: Bool
        }

        guard let token = KeychainHelper.readString(.authToken) else {
            throw APIError.noAuthToken
        }

        struct ValidateRequest: Encodable {
            let token: String
        }

        let response: ValidateResponse = try await post("/v1/auth/validate", body: ValidateRequest(token: token))
        return response.valid
    }

    /// Refresh the authentication token.
    /// - Returns: The new token.
    func refreshToken() async throws -> String {
        struct RefreshResponse: Decodable {
            let token: String
        }

        guard let refreshToken = KeychainHelper.readString(.refreshToken) else {
            throw APIError.noRefreshToken
        }

        struct RefreshRequest: Encodable {
            let refreshToken: String
        }

        let response: RefreshResponse = try await post("/v1/auth/refresh", body: RefreshRequest(refreshToken: refreshToken))

        // Save the new token
        try KeychainHelper.save(response.token, for: .authToken)

        return response.token
    }

    // MARK: - Private Helpers

    /// Add authentication header to a request.
    private func addAuthHeader(to request: inout URLRequest) throws {
        guard let token = KeychainHelper.readString(.authToken) else {
            throw APIError.noAuthToken
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    /// Handle HTTP error responses.
    private func handleHTTPError(response: HTTPURLResponse) throws {
        guard (200...299).contains(response.statusCode) else {
            switch response.statusCode {
            case 401:
                throw APIError.unauthorized
            case 403:
                throw APIError.forbidden
            case 404:
                throw APIError.notFound
            case 429:
                throw APIError.rateLimited
            case 500...599:
                throw APIError.serverError(statusCode: response.statusCode)
            default:
                throw APIError.httpError(statusCode: response.statusCode)
            }
        }
    }

    /// Decode a JSON response with proper date handling.
    private func decodeResponse<T: Decodable>(_ data: Data) throws -> T {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }
}

// MARK: - Errors

/// Errors that can occur during API operations.
enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    case noAuthToken
    case noRefreshToken
    case unauthorized
    case forbidden
    case notFound
    case rateLimited
    case serverError(statusCode: Int)
    case networkError(Error)
    case sessionRevivalFailed(sessionId: String, reason: String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "Server error (code \(statusCode))"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        case .noAuthToken:
            return "Not authenticated. Please pair with CLI first."
        case .noRefreshToken:
            return "Session expired. Please re-authenticate."
        case .unauthorized:
            return "Authentication failed. Please pair with CLI again."
        case .forbidden:
            return "You don't have permission to access this resource."
        case .notFound:
            return "The requested resource was not found."
        case .rateLimited:
            return "Too many requests. Please try again later."
        case .serverError(let statusCode):
            return "Server error (\(statusCode)). Please try again later."
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .sessionRevivalFailed(let sessionId, let reason):
            return "Session \(sessionId) could not be restored: \(reason)"
        }
    }
}
