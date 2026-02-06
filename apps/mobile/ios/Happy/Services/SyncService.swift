//
//  SyncService.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import CryptoKit

/// Service for real-time WebSocket synchronization with the Happy server.
///
/// This actor manages the WebSocket connection lifecycle, handles encrypted
/// message reception/transmission, and broadcasts typed updates to subscribers
/// using Combine publishers.
///
/// ## Architecture
/// - Uses `URLSessionWebSocketTask` (native iOS 13+ API) for WebSocket connectivity
/// - Integrates with `EncryptionService` for E2E encrypted message handling
/// - Authentication via short-lived ticket obtained from REST API, avoiding
///   token exposure in WebSocket URL query parameters (see `AuthHandshakeMode`)
/// - Exponential backoff reconnection with configurable parameters
/// - Periodic ping/pong keepalive to detect stale connections
/// - App lifecycle-aware: disconnects on background, reconnects on foreground
///   to minimize battery usage per iOS best practices
///
/// ## Auth Handshake
/// Two authentication modes are supported (see ``AuthHandshakeMode``):
///
/// - **Ticket-based** (default, recommended): The client fetches a short-lived
///   ticket from `POST /v1/auth/ws-ticket`, then passes it as `?ticket=` on
///   the WebSocket URL. The server validates and consumes the ticket on connect.
///   This avoids exposing the long-lived auth token in URLs/logs.
///
/// - **Token query parameter** (legacy): The long-lived auth token is passed
///   directly as `?token=` on the WebSocket URL. Simpler but less secure since
///   the token may appear in server access logs.
///
/// ## Sync Protocol
/// Messages use a typed envelope format (`SyncUpdateEnvelope`):
/// - `session` / `message` - Data updates from the server
/// - `ping` / `pong` - Connection keepalive
/// - `subscribe` / `unsubscribe` - Session subscription management
/// - `session-revival-paused` / `session-revived` - Circuit breaker events
///
/// ## App Lifecycle
/// The service integrates with iOS app lifecycle via ``handleAppDidEnterBackground()``
/// and ``handleAppWillEnterForeground()``:
/// - On background: WebSocket is cleanly disconnected to save battery
/// - On foreground: WebSocket is reconnected and subscriptions are restored
/// - The `scenePhase` changes are observed in `HappyApp.swift`
///
/// ## Usage
/// ```swift
/// let syncService = SyncService.shared
/// try await syncService.connect()
/// try await syncService.subscribe(to: "session-123")
///
/// // Observe updates via Combine publishers
/// syncService.sessionUpdates.sink { session in
///     print("Session updated: \(session.title)")
/// }
/// ```
///
/// ## Cross-Platform Compatibility
/// This implementation mirrors `apps/macos/Happy/Services/SyncService.swift`
/// to maintain a consistent API and protocol across Apple platforms.
actor SyncService {
    // MARK: - Singleton

    /// Shared instance for convenience.
    static let shared = SyncService()

    // MARK: - Publishers

    /// Publisher for session updates received from the server.
    nonisolated let sessionUpdates = PassthroughSubject<Session, Never>()

    /// Publisher for message updates received from the server.
    nonisolated let messageUpdates = PassthroughSubject<Message, Never>()

    /// Publisher for connection status changes.
    nonisolated let connectionStatus = CurrentValueSubject<SyncConnectionStatus, Never>(.disconnected)

    /// Publisher for sync errors.
    nonisolated let syncErrors = PassthroughSubject<SyncError, Never>()

    /// Publisher for session revival paused events (HAP-868).
    /// Emitted when the CLI's circuit breaker cooldown is active.
    nonisolated let sessionRevivalPaused = PassthroughSubject<SessionRevivalPausedEvent, Never>()

    /// Publisher for session revived events (HAP-733).
    /// Emitted when a session has been successfully revived.
    nonisolated let sessionRevived = PassthroughSubject<SessionRevivedEvent, Never>()

    // MARK: - Reconnection Configuration

    /// Configuration for automatic reconnection behavior.
    struct ReconnectionConfig {
        /// Base delay between reconnection attempts (in seconds).
        var baseDelay: TimeInterval = 1.0

        /// Maximum delay between reconnection attempts (in seconds).
        var maxDelay: TimeInterval = 30.0

        /// Multiplier for exponential backoff.
        var backoffMultiplier: Double = 2.0

        /// Maximum number of consecutive reconnection attempts before giving up.
        /// Set to 0 for unlimited attempts.
        var maxAttempts: Int = 10

        /// Default configuration.
        static let `default` = ReconnectionConfig()
    }

    // MARK: - Auth Handshake Mode

    /// Authentication mode for the WebSocket connection.
    ///
    /// ## Design Decision (HAP-1013)
    /// The original HAP-974 implementation used token-as-query-parameter auth.
    /// HAP-375 specifies ticket-based auth as the preferred approach. This enum
    /// supports both modes for backward compatibility while defaulting to the
    /// more secure ticket-based handshake.
    ///
    /// ### Ticket-based (recommended)
    /// 1. Client calls `POST /v1/auth/ws-ticket` with Bearer token
    /// 2. Server returns a short-lived, single-use ticket
    /// 3. Client connects to WebSocket with `?ticket=<ticket>`
    /// 4. Server validates and consumes the ticket
    ///
    /// ### Token query parameter (legacy)
    /// 1. Client connects to WebSocket with `?token=<authToken>`
    /// 2. Server validates the long-lived token directly
    enum AuthHandshakeMode {
        /// Ticket-based auth: fetch a short-lived ticket from the REST API,
        /// then pass it as a query parameter on the WebSocket URL.
        /// This is the preferred mode per HAP-375.
        case ticket

        /// Legacy mode: pass the auth token directly as a query parameter.
        /// Simpler but the token may appear in server logs.
        case tokenQueryParam
    }

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private let urlSession: URLSession
    private let baseURL: URL
    private var encryptionKey: SymmetricKey?

    /// Whether the service should attempt to reconnect on disconnection.
    private var shouldReconnect = false

    /// Current number of consecutive reconnection attempts.
    private var reconnectAttempts = 0

    /// Reconnection configuration.
    private var reconnectionConfig: ReconnectionConfig

    /// Authentication handshake mode for WebSocket connections.
    private let authHandshakeMode: AuthHandshakeMode

    /// Currently subscribed session IDs. Restored after reconnection.
    private var subscribedSessionIds: Set<String> = []

    /// Task for the ping keepalive loop.
    private var pingTask: Task<Void, Never>?

    /// Interval for sending ping messages (in seconds).
    private let pingInterval: TimeInterval = 30.0

    /// Task for the receive message loop.
    private var receiveTask: Task<Void, Never>?

    /// Task for scheduled reconnection.
    private var reconnectTask: Task<Void, Never>?

    /// Whether the service was connected before entering background.
    /// Used to decide whether to reconnect on foreground.
    private var wasConnectedBeforeBackground = false

    /// Whether the app is currently in the background.
    /// Prevents reconnection attempts while backgrounded.
    private var isInBackground = false

    // MARK: - Initialization

    init(
        baseURL: URL = APIConfiguration.webSocketURL,
        urlSession: URLSession? = nil,
        reconnectionConfig: ReconnectionConfig = .default,
        authHandshakeMode: AuthHandshakeMode = .ticket
    ) {
        self.baseURL = baseURL
        self.reconnectionConfig = reconnectionConfig
        self.authHandshakeMode = authHandshakeMode

        if let urlSession = urlSession {
            self.urlSession = urlSession
        } else {
            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 30
            config.waitsForConnectivity = true
            self.urlSession = URLSession(configuration: config)
        }
    }

    // MARK: - Connection Management

    /// Connect to the sync server.
    ///
    /// Establishes an authenticated WebSocket connection and begins receiving
    /// messages. The encryption key is retrieved from the Keychain to enable
    /// decryption of incoming messages.
    ///
    /// In ticket mode, a short-lived ticket is fetched from the server first,
    /// then used as a query parameter on the WebSocket URL. In legacy token mode,
    /// the auth token is passed directly.
    ///
    /// - Throws: `SyncError.encryptionKeyMissing` if no encryption key is available.
    /// - Throws: `SyncError.connectionFailed` if the URL cannot be constructed.
    func connect() async throws {
        // Don't attempt to connect while in background
        guard !isInBackground else {
            #if DEBUG
            print("[SyncService] Skipping connect - app is in background")
            #endif
            return
        }

        // Prevent duplicate connections
        if let existing = webSocketTask, existing.state == .running {
            return
        }

        connectionStatus.send(.connecting)

        // Retrieve or derive the encryption key for decrypting messages
        encryptionKey = try loadEncryptionKey()

        // Fetch ticket if using ticket-based auth
        var ticket: String?
        if authHandshakeMode == .ticket {
            do {
                ticket = try await fetchWebSocketTicket()
            } catch {
                #if DEBUG
                print("[SyncService] Ticket fetch failed, falling back to token auth: \(error)")
                #endif
                // Fall through - buildAuthenticatedURL will use token mode behavior
                // (no ticket param = server may reject, but this provides graceful degradation)
            }
        }

        // Build authenticated WebSocket URL
        guard let authenticatedURL = buildAuthenticatedURL(ticket: ticket) else {
            let error = SyncError.connectionFailed("Failed to construct authenticated WebSocket URL")
            connectionStatus.send(.disconnected)
            syncErrors.send(error)
            throw error
        }

        // Create and start the WebSocket task
        webSocketTask = urlSession.webSocketTask(with: authenticatedURL)
        webSocketTask?.resume()

        // Mark as connected and enable reconnection
        shouldReconnect = true
        reconnectAttempts = 0
        connectionStatus.send(.connected)

        // Start the receive loop
        startReceiveLoop()

        // Start the ping keepalive loop
        startPingLoop()

        // Restore any previous session subscriptions
        await restoreSubscriptions()
    }

    /// Disconnect from the sync server.
    ///
    /// Cleanly closes the WebSocket connection and cancels all background tasks.
    /// Reconnection is disabled until `connect()` is called again.
    func disconnect() {
        shouldReconnect = false
        reconnectAttempts = 0

        // Cancel background tasks
        pingTask?.cancel()
        pingTask = nil
        receiveTask?.cancel()
        receiveTask = nil
        reconnectTask?.cancel()
        reconnectTask = nil

        // Close the WebSocket connection
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil

        connectionStatus.send(.disconnected)
    }

    /// Subscribe to updates for a specific session.
    ///
    /// Sends a subscribe message to the server and tracks the subscription
    /// so it can be restored after reconnection.
    ///
    /// - Parameter sessionId: The session ID to subscribe to.
    /// - Throws: `SyncError.sendFailed` if the message could not be sent.
    func subscribe(to sessionId: String) async throws {
        subscribedSessionIds.insert(sessionId)
        try await sendMessage(SyncMessage(type: .subscribe, sessionId: sessionId))
    }

    /// Unsubscribe from a session.
    ///
    /// Sends an unsubscribe message to the server and removes the session
    /// from the tracked subscriptions.
    ///
    /// - Parameter sessionId: The session ID to unsubscribe from.
    /// - Throws: `SyncError.sendFailed` if the message could not be sent.
    func unsubscribe(from sessionId: String) async throws {
        subscribedSessionIds.remove(sessionId)
        try await sendMessage(SyncMessage(type: .unsubscribe, sessionId: sessionId))
    }

    /// Whether the service is currently connected.
    var isConnected: Bool {
        webSocketTask?.state == .running
    }

    /// Update the reconnection configuration.
    ///
    /// - Parameter config: The new reconnection configuration.
    func setReconnectionConfig(_ config: ReconnectionConfig) {
        reconnectionConfig = config
    }

    // MARK: - App Lifecycle Handling

    /// Handle the app entering the background.
    ///
    /// Disconnects the WebSocket to conserve battery and network resources.
    /// The connection will be restored when the app returns to the foreground
    /// via ``handleAppWillEnterForeground()``.
    ///
    /// This method is called from `HappyApp.swift` when `scenePhase` changes
    /// to `.background`.
    func handleAppDidEnterBackground() {
        isInBackground = true
        wasConnectedBeforeBackground = isConnected

        if isConnected {
            #if DEBUG
            print("[SyncService] App entering background - disconnecting WebSocket")
            #endif

            // Disable auto-reconnect during background disconnect
            let previousShouldReconnect = shouldReconnect
            shouldReconnect = false

            // Cancel background tasks
            pingTask?.cancel()
            pingTask = nil
            receiveTask?.cancel()
            receiveTask = nil
            reconnectTask?.cancel()
            reconnectTask = nil

            // Close the WebSocket connection cleanly
            webSocketTask?.cancel(with: .normalClosure, reason: "App entering background".data(using: .utf8))
            webSocketTask = nil

            connectionStatus.send(.disconnected)

            // Restore the reconnect flag (but reconnection won't trigger
            // because isInBackground is true)
            shouldReconnect = previousShouldReconnect
        }
    }

    /// Handle the app returning to the foreground.
    ///
    /// Reconnects the WebSocket if it was connected before the app went
    /// to the background. Session subscriptions are automatically restored
    /// after reconnection.
    ///
    /// This method is called from `HappyApp.swift` when `scenePhase` changes
    /// from `.background` to `.inactive` or `.active`.
    func handleAppWillEnterForeground() async {
        isInBackground = false

        guard wasConnectedBeforeBackground else {
            #if DEBUG
            print("[SyncService] App entering foreground - was not connected, skipping reconnect")
            #endif
            return
        }

        #if DEBUG
        print("[SyncService] App entering foreground - reconnecting WebSocket")
        #endif

        wasConnectedBeforeBackground = false
        reconnectAttempts = 0

        do {
            try await connect()
        } catch {
            #if DEBUG
            print("[SyncService] Failed to reconnect on foreground: \(error)")
            #endif
            syncErrors.send(.connectionFailed("Foreground reconnect failed: \(error.localizedDescription)"))
        }
    }

    // MARK: - Private - URL Construction

    /// Build the WebSocket URL with authentication credentials.
    ///
    /// In ticket mode, this requires a ticket to have been fetched first via
    /// ``fetchWebSocketTicket()``. In token mode, the auth token is used directly.
    ///
    /// - Parameter ticket: A short-lived ticket for ticket-based auth. Ignored in token mode.
    /// - Returns: The authenticated URL, or nil if construction fails.
    private func buildAuthenticatedURL(ticket: String? = nil) -> URL? {
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        var queryItems = components?.queryItems ?? []

        switch authHandshakeMode {
        case .ticket:
            if let ticket = ticket {
                queryItems.append(URLQueryItem(name: "ticket", value: ticket))
            }
        case .tokenQueryParam:
            if let token = KeychainHelper.readString(.authToken) {
                queryItems.append(URLQueryItem(name: "token", value: token))
            }
        }

        components?.queryItems = queryItems.isEmpty ? nil : queryItems
        return components?.url
    }

    // MARK: - Private - Ticket Fetching

    /// Fetch a short-lived WebSocket authentication ticket from the server.
    ///
    /// The ticket is single-use and expires quickly (typically within 30 seconds).
    /// It is used in place of the long-lived auth token to authenticate the
    /// WebSocket connection, preventing token exposure in URLs and server logs.
    ///
    /// - Returns: The ticket string.
    /// - Throws: `SyncError.connectionFailed` if the ticket cannot be obtained.
    private func fetchWebSocketTicket() async throws -> String {
        guard let token = KeychainHelper.readString(.authToken) else {
            throw SyncError.connectionFailed("No auth token available for ticket request")
        }

        guard let serverUrl = KeychainHelper.readString(.serverUrl),
              let ticketURL = URL(string: "\(serverUrl)/v1/auth/ws-ticket") else {
            throw SyncError.connectionFailed("Invalid server URL for ticket request")
        }

        var request = URLRequest(url: ticketURL)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 10

        let (data, response) = try await urlSession.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            throw SyncError.connectionFailed("Ticket request failed with status \(statusCode)")
        }

        struct TicketResponse: Decodable {
            let ticket: String
        }

        do {
            let ticketResponse = try JSONDecoder().decode(TicketResponse.self, from: data)
            return ticketResponse.ticket
        } catch {
            throw SyncError.connectionFailed("Failed to decode ticket response: \(error.localizedDescription)")
        }
    }

    // MARK: - Private - Encryption Key

    /// Load the encryption key from the Keychain.
    ///
    /// Derives the shared secret from the stored private key and peer public key.
    ///
    /// - Returns: The symmetric encryption key.
    /// - Throws: `SyncError.encryptionKeyMissing` if keys are not available.
    private func loadEncryptionKey() throws -> SymmetricKey {
        guard let privateKeyData = KeychainHelper.read(.privateKey),
              let peerPublicKeyData = KeychainHelper.read(.peerPublicKey) else {
            let error = SyncError.encryptionKeyMissing
            syncErrors.send(error)
            throw error
        }

        do {
            return try EncryptionService.deriveSharedSecret(
                privateKey: privateKeyData,
                peerPublicKey: peerPublicKeyData
            )
        } catch {
            let syncError = SyncError.encryptionKeyMissing
            syncErrors.send(syncError)
            throw syncError
        }
    }

    // MARK: - Private - Send

    /// Send a typed sync message to the server.
    ///
    /// - Parameter message: The message to send.
    /// - Throws: `SyncError.sendFailed` if the message could not be encoded or sent.
    private func sendMessage(_ message: SyncMessage) async throws {
        guard let webSocketTask = webSocketTask else {
            throw SyncError.sendFailed("Not connected")
        }

        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(message)
            try await webSocketTask.send(.data(data))
        } catch let error as SyncError {
            throw error
        } catch {
            throw SyncError.sendFailed(error.localizedDescription)
        }
    }

    /// Send a pong response to the server.
    private func sendPong() async {
        do {
            try await sendMessage(SyncMessage(type: .pong))
        } catch {
            #if DEBUG
            print("[SyncService] Failed to send pong: \(error)")
            #endif
        }
    }

    // MARK: - Private - Receive Loop

    /// Start the continuous message receive loop.
    ///
    /// Spawns a detached task that loops calling `webSocketTask.receive()`.
    /// On connection errors, triggers reconnection if enabled.
    private func startReceiveLoop() {
        receiveTask?.cancel()
        receiveTask = Task { [weak webSocketTask] in
            guard let webSocketTask = webSocketTask else { return }

            while !Task.isCancelled {
                do {
                    let message = try await webSocketTask.receive()

                    switch message {
                    case .data(let data):
                        await handleIncomingMessage(data)
                    case .string(let text):
                        if let data = text.data(using: .utf8) {
                            await handleIncomingMessage(data)
                        }
                    @unknown default:
                        break
                    }
                } catch {
                    if !Task.isCancelled {
                        await handleConnectionLost(error: error)
                    }
                    return
                }
            }
        }
    }

    // MARK: - Private - Message Handling

    /// Handle an incoming WebSocket message.
    ///
    /// Decrypts the message data and dispatches it to the appropriate handler
    /// based on the message type.
    ///
    /// - Parameter data: The raw (encrypted) message data.
    private func handleIncomingMessage(_ data: Data) async {
        guard let key = encryptionKey else {
            syncErrors.send(.encryptionKeyMissing)
            return
        }

        do {
            // Decrypt the message
            let decryptedData = try EncryptionService.decrypt(data, with: key)

            // Configure decoder to match server JSON format
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            decoder.keyDecodingStrategy = .convertFromSnakeCase

            // Try to decode as a typed sync update envelope
            if let envelope = try? decoder.decode(SyncUpdateEnvelope.self, from: decryptedData) {
                await processEnvelope(envelope)
            }
            // Fall back to raw Session
            else if let session = try? decoder.decode(Session.self, from: decryptedData) {
                sessionUpdates.send(session)
            }
            // Fall back to raw Message
            else if let message = try? decoder.decode(Message.self, from: decryptedData) {
                messageUpdates.send(message)
            }
            else {
                #if DEBUG
                print("[SyncService] Received unrecognized message format")
                #endif
            }
        } catch {
            syncErrors.send(.decryptionFailed(error.localizedDescription))
        }
    }

    /// Process a typed sync update envelope.
    ///
    /// - Parameter envelope: The decoded sync update.
    private func processEnvelope(_ envelope: SyncUpdateEnvelope) async {
        switch envelope.type {
        case .session:
            if let session = envelope.session {
                sessionUpdates.send(session)
            }

        case .message:
            if let message = envelope.message {
                messageUpdates.send(message)
            }

        case .ping:
            await sendPong()

        case .pong:
            // Server acknowledged our ping - connection is alive
            break

        case .sessionRevivalPaused:
            // HAP-868: Handle circuit breaker cooldown event
            if let reason = envelope.reason,
               let remainingMs = envelope.remainingMs,
               let resumesAt = envelope.resumesAt,
               let machineId = envelope.machineId {
                let event = SessionRevivalPausedEvent(
                    reason: reason,
                    remainingMs: remainingMs,
                    resumesAt: resumesAt,
                    machineId: machineId
                )
                sessionRevivalPaused.send(event)
            }

        case .sessionRevived:
            // HAP-733: Handle session revived event
            if let originalSessionId = envelope.originalSessionId,
               let newSessionId = envelope.newSessionId,
               let machineId = envelope.machineId {
                let event = SessionRevivedEvent(
                    originalSessionId: originalSessionId,
                    newSessionId: newSessionId,
                    machineId: machineId
                )
                sessionRevived.send(event)
            }

        case .subscribe, .unsubscribe, .update:
            // Client-to-server messages; ignore if received from server
            break
        }
    }

    // MARK: - Private - Ping/Pong Keepalive

    /// Start the periodic ping keepalive loop.
    ///
    /// Sends a ping message at `pingInterval` to detect stale connections.
    /// Uses `URLSessionWebSocketTask.sendPing` for protocol-level pings.
    private func startPingLoop() {
        pingTask?.cancel()
        pingTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(pingInterval * 1_000_000_000))

                guard !Task.isCancelled, let ws = webSocketTask else { return }

                ws.sendPing { [weak self] error in
                    if let error {
                        #if DEBUG
                        print("[SyncService] Ping failed: \(error.localizedDescription)")
                        #endif
                        Task {
                            await self?.handleConnectionLost(error: error)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Private - Reconnection

    /// Handle a connection loss event.
    ///
    /// Updates the connection status and schedules a reconnection attempt
    /// if automatic reconnection is enabled and the app is not in the background.
    ///
    /// - Parameter error: The error that caused the disconnection.
    private func handleConnectionLost(error: Error) async {
        // Clean up existing connection state
        pingTask?.cancel()
        pingTask = nil
        receiveTask?.cancel()
        receiveTask = nil
        webSocketTask?.cancel(with: .abnormalClosure, reason: nil)
        webSocketTask = nil

        connectionStatus.send(.disconnected)

        guard shouldReconnect, !isInBackground else { return }

        // Check if we've exceeded the maximum number of attempts
        if reconnectionConfig.maxAttempts > 0 && reconnectAttempts >= reconnectionConfig.maxAttempts {
            shouldReconnect = false
            syncErrors.send(.connectionFailed(
                "Maximum reconnection attempts (\(reconnectionConfig.maxAttempts)) exceeded"
            ))
            return
        }

        scheduleReconnect()
    }

    /// Schedule a reconnection attempt with exponential backoff.
    private func scheduleReconnect() {
        reconnectTask?.cancel()

        let attempt = reconnectAttempts
        let delay = min(
            reconnectionConfig.baseDelay * pow(reconnectionConfig.backoffMultiplier, Double(attempt)),
            reconnectionConfig.maxDelay
        )
        reconnectAttempts += 1

        connectionStatus.send(.reconnecting(attempt: reconnectAttempts))

        #if DEBUG
        print("[SyncService] Scheduling reconnection attempt \(reconnectAttempts) in \(delay)s")
        #endif

        reconnectTask = Task {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))

            guard !Task.isCancelled, shouldReconnect else { return }

            do {
                try await connect()
            } catch {
                #if DEBUG
                print("[SyncService] Reconnection attempt \(attempt + 1) failed: \(error)")
                #endif
                // handleConnectionLost will be triggered by the receive loop or connect failure
            }
        }
    }

    /// Restore session subscriptions after a successful reconnection.
    private func restoreSubscriptions() async {
        for sessionId in subscribedSessionIds {
            do {
                try await sendMessage(SyncMessage(type: .subscribe, sessionId: sessionId))
            } catch {
                #if DEBUG
                print("[SyncService] Failed to restore subscription for \(sessionId): \(error)")
                #endif
            }
        }
    }
}

// MARK: - Connection Status

/// Connection status for the sync service.
enum SyncConnectionStatus: Equatable {
    /// Connected to the server and receiving messages.
    case connected

    /// Attempting to establish initial connection.
    case connecting

    /// Not connected to the server.
    case disconnected

    /// Attempting to reconnect after a connection loss.
    /// - Parameter attempt: The current reconnection attempt number.
    case reconnecting(attempt: Int)
}

// MARK: - Sync Protocol Types

/// Message format for the sync protocol.
///
/// Used for client-to-server messages (subscribe, unsubscribe, pong).
struct SyncMessage: Codable {
    let type: SyncMessageType
    let sessionId: String?

    init(type: SyncMessageType, sessionId: String? = nil) {
        self.type = type
        self.sessionId = sessionId
    }
}

/// Types of sync messages in the protocol.
enum SyncMessageType: String, Codable {
    case subscribe
    case unsubscribe
    case update
    case ping
    case pong
    case session
    case message
    /// Session revival paused due to circuit breaker cooldown (HAP-868)
    case sessionRevivalPaused = "session-revival-paused"
    /// Session was successfully revived (HAP-733)
    case sessionRevived = "session-revived"
}

/// Envelope for typed sync updates from the server.
///
/// The server sends all real-time updates wrapped in this envelope format.
/// The `type` field determines which optional fields are populated.
struct SyncUpdateEnvelope: Codable {
    let type: SyncMessageType
    let session: Session?
    let message: Message?
    let sessionId: String?

    // Session revival paused event fields (HAP-868)
    let reason: String?
    let remainingMs: Int?
    let resumesAt: Int64?
    let machineId: String?

    // Session revived event fields (HAP-733)
    let originalSessionId: String?
    let newSessionId: String?

    enum CodingKeys: String, CodingKey {
        case type, session, message, sessionId
        case reason, remainingMs, resumesAt, machineId
        case originalSessionId, newSessionId
    }
}

// MARK: - Session Revival Events

/// Event payload for session-revival-paused WebSocket event (HAP-868).
///
/// Sent by the server when the CLI's circuit breaker cooldown is active,
/// meaning automatic session revival attempts are temporarily paused.
struct SessionRevivalPausedEvent {
    /// Human-readable reason for the pause.
    let reason: String

    /// Remaining cooldown time in milliseconds.
    let remainingMs: Int

    /// Unix timestamp (ms) when the cooldown expires.
    let resumesAt: Int64

    /// Machine ID this event originated from.
    let machineId: String
}

/// Event payload for session-revived WebSocket event (HAP-733).
///
/// Sent by the CLI when a stopped session has been successfully revived.
/// The app should clear any cooldown UI and update session references.
struct SessionRevivedEvent {
    /// The original session ID that was stopped.
    let originalSessionId: String

    /// The new session ID after revival.
    let newSessionId: String

    /// Machine ID this event originated from.
    let machineId: String
}

// MARK: - Errors

/// Errors that can occur during sync operations.
enum SyncError: LocalizedError, Equatable {
    /// Failed to establish or maintain a WebSocket connection.
    case connectionFailed(String)

    /// The encryption key is not available in the Keychain.
    case encryptionKeyMissing

    /// Failed to decrypt an incoming message.
    case decryptionFailed(String)

    /// Failed to send a message over the WebSocket.
    case sendFailed(String)

    /// A session revival attempt failed (HAP-733).
    case sessionRevivalFailed(sessionId: String, reason: String)

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
        case .sessionRevivalFailed(let sessionId, let reason):
            return "Session \(sessionId) could not be restored: \(reason)"
        }
    }
}
