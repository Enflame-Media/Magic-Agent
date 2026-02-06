//
//  APIService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import SwiftUI

// MARK: - Configuration

enum APIConfiguration {
    static var baseURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["HAPPY_API_URL"],
           let url = URL(string: urlString) {
            return url
        }
        return URL(string: "https://api.happy.engineering")!
    }

    static var webSocketURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["HAPPY_WS_URL"],
           let url = URL(string: urlString) {
            return url
        }
        return URL(string: "wss://api.happy.engineering/sync")!
    }
}

// MARK: - APIService Protocol

/// Protocol for API service operations, enabling dependency injection and testing.
protocol APIServiceProtocol: Actor {
    func fetchSessions() async throws -> [Session]
    func fetchSession(id: String) async throws -> Session
    func fetchMessages(sessionId: String) async throws -> [Message]
}

// MARK: - APIService

/// Actor-based HTTP service for communication with happy-server.
actor APIService: APIServiceProtocol {
    static let shared = APIService()

    private let baseURL: URL
    private let session: URLSession

    /// Maximum number of retry attempts for transient failures (429, 503).
    private let maxRetries: Int

    /// Base delay in seconds for exponential backoff between retries.
    private let baseRetryDelay: TimeInterval

    init(
        baseURL: URL = APIConfiguration.baseURL,
        session: URLSession? = nil,
        maxRetries: Int = 3,
        baseRetryDelay: TimeInterval = 1.0
    ) {
        self.baseURL = baseURL
        self.maxRetries = maxRetries
        self.baseRetryDelay = baseRetryDelay

        if let session = session {
            self.session = session
        } else {
            let configuration = URLSessionConfiguration.default
            configuration.timeoutIntervalForRequest = 30
            configuration.timeoutIntervalForResource = 60
            self.session = URLSession(configuration: configuration)
        }
    }

    // MARK: - Generic Request Methods

    func fetch<T: Decodable>(_ endpoint: String, authenticated: Bool = true) async throws -> T {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        if authenticated {
            try addAuthHeader(to: &request)
        }

        let (data, response) = try await performRequest(request)
        try handleHTTPError(response: response)
        return try decodeResponse(data)
    }

    func post<T: Encodable, R: Decodable>(_ endpoint: String, body: T, authenticated: Bool = true) async throws -> R {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        if authenticated {
            try addAuthHeader(to: &request)
        }

        let (data, response) = try await performRequest(request)
        try handleHTTPError(response: response)
        return try decodeResponse(data)
    }

    func put<T: Encodable, R: Decodable>(_ endpoint: String, body: T, authenticated: Bool = true) async throws -> R {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        if authenticated {
            try addAuthHeader(to: &request)
        }

        let (data, response) = try await performRequest(request)
        try handleHTTPError(response: response)
        return try decodeResponse(data)
    }

    func delete<T: Decodable>(_ endpoint: String, authenticated: Bool = true) async throws -> T {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        if authenticated {
            try addAuthHeader(to: &request)
        }

        let (data, response) = try await performRequest(request)
        try handleHTTPError(response: response)
        return try decodeResponse(data)
    }

    // MARK: - Session Endpoints

    func fetchSessions() async throws -> [Session] {
        struct SessionsResponse: Decodable {
            let sessions: [Session]
        }
        let response: SessionsResponse = try await fetch("/v1/sessions")
        return response.sessions
    }

    func fetchSession(id: String) async throws -> Session {
        return try await fetch("/v1/sessions/\(id)")
    }

    func fetchMessages(sessionId: String) async throws -> [Message] {
        struct MessagesResponse: Decodable {
            let messages: [Message]
        }
        let response: MessagesResponse = try await fetch("/v1/sessions/\(sessionId)/messages")
        return response.messages
    }

    // MARK: - Device Token Registration

    /// Register or update the APNs device token with the server.
    ///
    /// Sends the device token to happy-server so it can deliver push
    /// notifications to this device. Called automatically after APNs
    /// registration succeeds.
    ///
    /// - Parameter token: The hex-encoded APNs device token string.
    func registerDeviceToken(_ token: String) async throws {
        struct DeviceTokenRequest: Encodable {
            let deviceToken: String
            let platform: String
            let bundleId: String
        }

        struct DeviceTokenResponse: Decodable {
            let success: Bool
        }

        let body = DeviceTokenRequest(
            deviceToken: token,
            platform: "ios",
            bundleId: Bundle.main.bundleIdentifier ?? "com.enflamemedia.happy"
        )

        let _: DeviceTokenResponse = try await post("/v1/devices/register", body: body)
    }

    /// Unregister the device token from the server.
    ///
    /// Called during logout to stop receiving push notifications.
    ///
    /// - Parameter token: The hex-encoded APNs device token string.
    func unregisterDeviceToken(_ token: String) async throws {
        struct DeviceTokenRequest: Encodable {
            let deviceToken: String
            let platform: String
        }

        struct DeviceTokenResponse: Decodable {
            let success: Bool
        }

        let body = DeviceTokenRequest(
            deviceToken: token,
            platform: "ios"
        )

        let _: DeviceTokenResponse = try await post("/v1/devices/unregister", body: body)
    }

    // MARK: - Private Helpers

    private func performRequest(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        var lastError: Error?

        for attempt in 0...maxRetries {
            let (data, response): (Data, URLResponse)
            do {
                (data, response) = try await session.data(for: request)
            } catch {
                throw APIError.networkError(error)
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            // Retry on 429 (rate limited) and 503 (service unavailable)
            if isRetryableStatusCode(httpResponse.statusCode) && attempt < maxRetries {
                let delay = retryDelay(for: attempt, response: httpResponse)
                try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                lastError = APIError.httpError(statusCode: httpResponse.statusCode)
                continue
            }

            return (data, httpResponse)
        }

        // Should not reach here, but handle gracefully
        throw lastError ?? APIError.invalidResponse
    }

    /// Determines whether a status code should trigger a retry.
    ///
    /// - Parameter statusCode: The HTTP status code to check.
    /// - Returns: `true` if the request should be retried.
    private func isRetryableStatusCode(_ statusCode: Int) -> Bool {
        statusCode == 429 || statusCode == 503
    }

    /// Calculates the retry delay using exponential backoff.
    ///
    /// Checks the `Retry-After` header first. If not present, uses
    /// exponential backoff: `baseDelay * 2^attempt` with jitter.
    ///
    /// - Parameters:
    ///   - attempt: The zero-based retry attempt number.
    ///   - response: The HTTP response (checked for `Retry-After` header).
    /// - Returns: The delay in seconds before the next retry.
    private func retryDelay(for attempt: Int, response: HTTPURLResponse) -> TimeInterval {
        // Respect Retry-After header if present
        if let retryAfterString = response.value(forHTTPHeaderField: "Retry-After"),
           let retryAfterSeconds = TimeInterval(retryAfterString) {
            return retryAfterSeconds
        }

        // Exponential backoff: base * 2^attempt with jitter
        let exponentialDelay = baseRetryDelay * pow(2.0, Double(attempt))
        let jitter = Double.random(in: 0...0.5)
        return exponentialDelay + jitter
    }

    private func addAuthHeader(to request: inout URLRequest) throws {
        guard let token = KeychainHelper.readString(.authToken) else {
            throw APIError.noAuthToken
        }
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

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

enum APIError: LocalizedError, Equatable {
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
    case retryExhausted(lastStatusCode: Int, attempts: Int)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server."
        case .httpError(let statusCode):
            return "Server error (code \(statusCode))."
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
        case .retryExhausted(let lastStatusCode, let attempts):
            return "Request failed after \(attempts) retries (last status: \(lastStatusCode))."
        }
    }

    static func == (lhs: APIError, rhs: APIError) -> Bool {
        switch (lhs, rhs) {
        case (.invalidResponse, .invalidResponse),
             (.noAuthToken, .noAuthToken),
             (.noRefreshToken, .noRefreshToken),
             (.unauthorized, .unauthorized),
             (.forbidden, .forbidden),
             (.notFound, .notFound),
             (.rateLimited, .rateLimited):
            return true
        case (.httpError(let a), .httpError(let b)):
            return a == b
        case (.serverError(let a), .serverError(let b)):
            return a == b
        case (.retryExhausted(let a1, let a2), .retryExhausted(let b1, let b2)):
            return a1 == b1 && a2 == b2
        case (.decodingError, .decodingError):
            return true
        case (.networkError, .networkError):
            return true
        default:
            return false
        }
    }
}

// MARK: - SwiftUI Environment Key

/// Environment key providing `APIService` for dependency injection in SwiftUI views.
///
/// Usage:
/// ```swift
/// struct MyView: View {
///     @Environment(\.apiService) private var apiService
///
///     var body: some View {
///         Button("Fetch") {
///             Task {
///                 let sessions: [Session] = try await apiService.fetchSessions()
///             }
///         }
///     }
/// }
/// ```
private struct APIServiceKey: EnvironmentKey {
    static let defaultValue = APIService.shared
}

extension EnvironmentValues {
    /// The API service instance used for network requests.
    var apiService: APIService {
        get { self[APIServiceKey.self] }
        set { self[APIServiceKey.self] = newValue }
    }
}
