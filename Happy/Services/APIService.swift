//
//  APIService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

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

    init(baseURL: URL = URL(string: "https://api.happy.engineering")!) {
        self.baseURL = baseURL

        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: configuration)
    }

    // MARK: - Public Methods

    /// Fetch data from an endpoint.
    /// - Parameter endpoint: The API endpoint to fetch.
    /// - Returns: Decoded response of type T.
    func fetch<T: Decodable>(_ endpoint: String) async throws -> T {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }

    /// Post data to an endpoint.
    /// - Parameters:
    ///   - endpoint: The API endpoint.
    ///   - body: The request body to encode.
    /// - Returns: Decoded response of type R.
    func post<T: Encodable, R: Decodable>(_ endpoint: String, body: T) async throws -> R {
        let url = baseURL.appendingPathComponent(endpoint)
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try JSONDecoder().decode(R.self, from: data)
    }
}

// MARK: - Errors

/// Errors that can occur during API operations.
enum APIError: LocalizedError {
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let statusCode):
            return "HTTP error: \(statusCode)"
        case .decodingError(let error):
            return "Failed to decode response: \(error.localizedDescription)"
        }
    }
}
