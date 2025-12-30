//
//  SyncService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine

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

    /// Publisher for connection status changes.
    nonisolated let connectionStatus = CurrentValueSubject<SyncConnectionStatus, Never>(.disconnected)

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private let session = URLSession.shared
    private let baseURL: URL

    // MARK: - Initialization

    init(baseURL: URL = URL(string: "wss://api.happy.engineering/sync")!) {
        self.baseURL = baseURL
    }

    // MARK: - Public Methods

    /// Connect to the sync server.
    func connect() async throws {
        connectionStatus.send(.connecting)

        webSocketTask = session.webSocketTask(with: baseURL)
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
        // TODO: Decrypt and parse message
        // let decrypted = try encryptionService.decrypt(data)
        // let update = try JSONDecoder().decode(SessionUpdate.self, from: decrypted)
        // sessionUpdates.send(update.session)
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
}
