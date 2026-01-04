//
//  SyncService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import CryptoKit

/// Service for real-time WebSocket synchronization with the Happy server.
///
/// This actor manages the WebSocket connection and broadcasts updates
/// to subscribers using Combine publishers.
actor SyncService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = SyncService()

    // MARK: - Publishers

    /// Publisher for session updates.
    nonisolated let sessionUpdates = PassthroughSubject<Session, Never>()

    /// Publisher for message updates.
    nonisolated let messageUpdates = PassthroughSubject<Message, Never>()

    /// Publisher for connection status changes.
    nonisolated let connectionStatus = CurrentValueSubject<SyncConnectionStatus, Never>(.disconnected)

    /// Publisher for sync errors.
    nonisolated let syncErrors = PassthroughSubject<SyncError, Never>()

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private let session = URLSession.shared
    private let baseURL: URL
    private var encryptionKey: SymmetricKey?
    private var pingTimer: Timer?

    // MARK: - Initialization

    init(baseURL: URL = APIConfiguration.webSocketURL) {
        self.baseURL = baseURL
    }

    // MARK: - Public Methods

    /// Connect to the sync server.
    func connect() async throws {
        connectionStatus.send(.connecting)

        // Get the encryption key for decrypting messages
        do {
            encryptionKey = try AuthService.shared.getEncryptionKey()
        } catch {
            syncErrors.send(.encryptionKeyMissing)
            throw SyncError.encryptionKeyMissing
        }

        // Build URL with auth token
        var urlComponents = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        if let token = KeychainHelper.readString(.authToken) {
            urlComponents.queryItems = [URLQueryItem(name: "token", value: token)]
        }

        guard let authenticatedURL = urlComponents.url else {
            throw SyncError.connectionFailed("Invalid URL")
        }

        webSocketTask = session.webSocketTask(with: authenticatedURL)
        webSocketTask?.resume()

        connectionStatus.send(.connected)

        // Start receiving messages
        await receiveMessages()
    }

    /// Disconnect from the sync server.
    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        connectionStatus.send(.disconnected)
    }

    /// Subscribe to updates for a specific session.
    /// - Parameter sessionId: The session ID to subscribe to.
    func subscribe(to sessionId: String) async throws {
        let message = SyncMessage(type: .subscribe, sessionId: sessionId)
        let data = try JSONEncoder().encode(message)
        try await webSocketTask?.send(.data(data))
    }

    /// Unsubscribe from a session.
    /// - Parameter sessionId: The session ID to unsubscribe from.
    func unsubscribe(from sessionId: String) async throws {
        let message = SyncMessage(type: .unsubscribe, sessionId: sessionId)
        let data = try JSONEncoder().encode(message)
        try await webSocketTask?.send(.data(data))
    }

    // MARK: - Private Methods

    private func receiveMessages() async {
        guard let webSocketTask = webSocketTask else { return }

        do {
            while true {
                let message = try await webSocketTask.receive()

                switch message {
                case .data(let data):
                    await handleMessage(data)
                case .string(let text):
                    if let data = text.data(using: .utf8) {
                        await handleMessage(data)
                    }
                @unknown default:
                    break
                }
            }
        } catch {
            connectionStatus.send(.disconnected)
        }
    }

    private func handleMessage(_ data: Data) async {
        guard let key = encryptionKey else {
            syncErrors.send(.encryptionKeyMissing)
            return
        }

        do {
            // Decrypt the message
            let decryptedData = try EncryptionService.decrypt(data, with: key)

            // Try to decode the message
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            decoder.keyDecodingStrategy = .convertFromSnakeCase

            // First, try to decode as a sync update envelope
            if let update = try? decoder.decode(SyncUpdateEnvelope.self, from: decryptedData) {
                await processSyncUpdate(update)
            }
            // If that fails, try to decode as raw session
            else if let session = try? decoder.decode(Session.self, from: decryptedData) {
                sessionUpdates.send(session)
            }
            // Or as a message
            else if let message = try? decoder.decode(Message.self, from: decryptedData) {
                messageUpdates.send(message)
            }
        } catch {
            syncErrors.send(.decryptionFailed(error.localizedDescription))
        }
    }

    /// Process a typed sync update.
    private func processSyncUpdate(_ update: SyncUpdateEnvelope) async {
        switch update.type {
        case .session:
            if let session = update.session {
                sessionUpdates.send(session)
            }
        case .message:
            if let message = update.message {
                messageUpdates.send(message)
            }
        case .ping:
            // Respond with pong
            Task {
                try? await sendPong()
            }
        case .pong:
            // Server acknowledged our ping
            break
        }
    }

    /// Send a pong response to the server.
    private func sendPong() async throws {
        let message = SyncMessage(type: .pong)
        let data = try JSONEncoder().encode(message)
        try await webSocketTask?.send(.data(data))
    }
}

// MARK: - Supporting Types

/// Connection status for the sync service.
enum SyncConnectionStatus {
    case connected
    case connecting
    case disconnected
}

/// Message format for sync protocol.
struct SyncMessage: Codable {
    let type: SyncMessageType
    let sessionId: String?

    init(type: SyncMessageType, sessionId: String? = nil) {
        self.type = type
        self.sessionId = sessionId
    }
}

/// Types of sync messages.
enum SyncMessageType: String, Codable {
    case subscribe
    case unsubscribe
    case update
    case ping
    case pong
    case session
    case message
}

/// Envelope for typed sync updates from the server.
struct SyncUpdateEnvelope: Codable {
    let type: SyncMessageType
    let session: Session?
    let message: Message?
    let sessionId: String?

    enum CodingKeys: String, CodingKey {
        case type, session, message, sessionId
    }
}

// MARK: - Errors

/// Errors that can occur during sync operations.
enum SyncError: LocalizedError {
    case connectionFailed(String)
    case encryptionKeyMissing
    case decryptionFailed(String)
    case sendFailed(String)

    var errorDescription: String? {
        switch self {
        case .connectionFailed(let reason):
            return "Failed to connect: \(reason)"
        case .encryptionKeyMissing:
            return "Encryption key not available. Please re-pair with CLI."
        case .decryptionFailed(let reason):
            return "Failed to decrypt message: \(reason)"
        case .sendFailed(let reason):
            return "Failed to send message: \(reason)"
        }
    }
}
