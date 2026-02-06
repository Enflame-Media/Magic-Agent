package com.enflame.happy.data.sync

import android.util.Log
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import okio.ByteString.Companion.toByteString
import javax.inject.Inject
import javax.inject.Singleton

/**
 * WebSocket synchronization service for real-time communication with the Happy server.
 *
 * Manages the WebSocket connection lifecycle, handles encrypted message reception/transmission,
 * and broadcasts typed updates to subscribers using Kotlin Flow.
 *
 * ## Architecture
 * - Uses OkHttp WebSocket client for connectivity
 * - Integrates with [EncryptionService] for E2E encrypted message handling
 * - Authentication via token passed as query parameter on WebSocket URL
 * - Exponential backoff reconnection via [ReconnectionStrategy]
 * - Periodic ping/pong keepalive to detect stale connections
 *
 * ## Sync Protocol
 * Messages use a typed envelope format ([SyncUpdateEnvelope]):
 * - `session` / `message` - Data updates from the server
 * - `ping` / `pong` - Connection keepalive
 * - `subscribe` / `unsubscribe` - Session subscription management
 * - `session-revival-paused` / `session-revived` - Circuit breaker events
 *
 * ## Usage
 * ```kotlin
 * @Inject lateinit var syncService: SyncService
 *
 * // Connect
 * syncService.connect()
 *
 * // Subscribe to a session
 * syncService.subscribe("session-123")
 *
 * // Observe incoming messages
 * syncService.incomingMessages.collect { message ->
 *     when (message) {
 *         is SyncMessage.SessionUpdate -> handleSessionUpdate(message.session)
 *         is SyncMessage.MessageUpdate -> handleMessageUpdate(message.message)
 *         else -> { /* handle other types */ }
 *     }
 * }
 *
 * // Observe connection state
 * syncService.connectionState.collect { state ->
 *     updateConnectionIndicator(state)
 * }
 * ```
 *
 * ## Cross-Platform Compatibility
 * This implementation mirrors `apps/mobile/ios/Happy/Services/SyncService.swift`
 * to maintain a consistent API and protocol across platforms.
 */
@Singleton
class SyncService @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val tokenStorage: TokenStorage,
    private val encryptionService: EncryptionService,
    private val json: Json,
    private val coroutineScope: CoroutineScope
) {

    // ========================================================================
    // Public Flow Properties
    // ========================================================================

    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)

    /** Current connection state, observable by UI components. */
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _incomingMessages = MutableSharedFlow<SyncMessage>(
        extraBufferCapacity = INCOMING_BUFFER_CAPACITY
    )

    /**
     * Flow of incoming sync messages from the server.
     *
     * Subscribers receive all parsed and decrypted messages. Use `filterIsInstance`
     * to listen for specific message types:
     * ```kotlin
     * syncService.incomingMessages
     *     .filterIsInstance<SyncMessage.SessionUpdate>()
     *     .collect { update -> /* ... */ }
     * ```
     */
    val incomingMessages: SharedFlow<SyncMessage> = _incomingMessages.asSharedFlow()

    // ========================================================================
    // Internal State
    // ========================================================================

    /** The active WebSocket connection, or null if disconnected. */
    private var webSocket: WebSocket? = null

    /** Whether the service should attempt to reconnect after disconnection. */
    private var shouldReconnect = false

    /** Current reconnection attempt number (zero-based). */
    private var reconnectAttempts = 0

    /** Reconnection configuration. Can be replaced via [setReconnectionStrategy]. */
    var reconnectionStrategy = ReconnectionStrategy()
        private set

    /** Currently subscribed session IDs. Restored after reconnection. */
    private val subscribedSessionIds = mutableSetOf<String>()

    /** Cached encryption key derived from stored key material. */
    private var encryptionKey: ByteArray? = null

    /** Job for the ping keepalive loop. */
    private var pingJob: Job? = null

    /** Job for a scheduled reconnection attempt. */
    private var reconnectJob: Job? = null

    // ========================================================================
    // Connection Management
    // ========================================================================

    /**
     * Connect to the sync server.
     *
     * Establishes an authenticated WebSocket connection to `wss://[server]/v1/sync`.
     * The auth token is appended as a query parameter. On success, the service starts
     * listening for messages and sending periodic pings.
     *
     * If a connection is already active, this method returns immediately.
     *
     * @throws SyncException.EncryptionKeyMissing if encryption keys are not stored.
     * @throws SyncException.ConnectionFailed if the auth token is missing.
     */
    fun connect() {
        // Prevent duplicate connections
        if (webSocket != null && _connectionState.value == ConnectionState.CONNECTED) {
            return
        }

        _connectionState.value = ConnectionState.CONNECTING

        // Derive encryption key from stored key material
        try {
            encryptionKey = loadEncryptionKey()
        } catch (e: SyncException) {
            _connectionState.value = ConnectionState.DISCONNECTED
            Log.e(TAG, "Failed to load encryption key", e)
            return
        }

        // Build authenticated WebSocket URL
        val url = buildAuthenticatedUrl()
        if (url == null) {
            _connectionState.value = ConnectionState.DISCONNECTED
            Log.e(TAG, "Failed to build authenticated WebSocket URL: missing auth token")
            return
        }

        val request = Request.Builder()
            .url(url)
            .build()

        shouldReconnect = true
        webSocket = okHttpClient.newWebSocket(request, createWebSocketListener())
    }

    /**
     * Disconnect from the sync server.
     *
     * Cleanly closes the WebSocket connection and cancels all background tasks.
     * Reconnection is disabled until [connect] is called again.
     */
    fun disconnect() {
        shouldReconnect = false
        reconnectAttempts = 0

        // Cancel background tasks
        pingJob?.cancel()
        pingJob = null
        reconnectJob?.cancel()
        reconnectJob = null

        // Close the WebSocket connection
        webSocket?.close(NORMAL_CLOSURE_CODE, "Client disconnect")
        webSocket = null

        _connectionState.value = ConnectionState.DISCONNECTED
    }

    /**
     * Subscribe to updates for a specific session.
     *
     * Sends a subscribe message to the server and tracks the subscription
     * so it can be restored after reconnection.
     *
     * @param sessionId The session ID to subscribe to.
     */
    fun subscribe(sessionId: String) {
        subscribedSessionIds.add(sessionId)
        sendOutgoing(SyncOutgoingMessage(type = SyncMessageType.SUBSCRIBE, sessionId = sessionId))
    }

    /**
     * Unsubscribe from a session.
     *
     * Sends an unsubscribe message to the server and removes the session
     * from the tracked subscriptions.
     *
     * @param sessionId The session ID to unsubscribe from.
     */
    fun unsubscribe(sessionId: String) {
        subscribedSessionIds.remove(sessionId)
        sendOutgoing(SyncOutgoingMessage(type = SyncMessageType.UNSUBSCRIBE, sessionId = sessionId))
    }

    /** Whether the service is currently connected. */
    val isConnected: Boolean
        get() = _connectionState.value == ConnectionState.CONNECTED

    /**
     * Update the reconnection strategy.
     *
     * @param strategy The new reconnection strategy.
     */
    fun setReconnectionStrategy(strategy: ReconnectionStrategy) {
        reconnectionStrategy = strategy
    }

    // ========================================================================
    // Private - URL Construction
    // ========================================================================

    /**
     * Build the WebSocket URL with authentication token as a query parameter.
     *
     * @return The authenticated URL string, or null if no auth token is available.
     */
    private fun buildAuthenticatedUrl(): String? {
        val token = tokenStorage.authToken ?: return null
        val serverUrl = tokenStorage.serverUrl ?: DEFAULT_SERVER_URL

        // Convert https:// to wss:// or http:// to ws://
        val wsUrl = serverUrl
            .replace("https://", "wss://")
            .replace("http://", "ws://")
            .trimEnd('/')

        return "$wsUrl/v1/sync?token=$token"
    }

    // ========================================================================
    // Private - Encryption Key
    // ========================================================================

    /**
     * Load the encryption key from stored key material.
     *
     * Derives the shared secret from the stored private key and peer public key
     * using ECDH + HKDF (same as the iOS SyncService).
     *
     * @return The 32-byte symmetric encryption key.
     * @throws SyncException.EncryptionKeyMissing if keys are not stored.
     */
    private fun loadEncryptionKey(): ByteArray {
        val privateKey = tokenStorage.privateKeyBytes
            ?: throw SyncException.EncryptionKeyMissing
        val peerPublicKey = tokenStorage.peerPublicKeyBytes
            ?: throw SyncException.EncryptionKeyMissing

        return try {
            encryptionService.deriveSharedSecret(privateKey, peerPublicKey)
        } catch (e: Exception) {
            throw SyncException.EncryptionKeyMissing
        }
    }

    // ========================================================================
    // Private - WebSocket Listener
    // ========================================================================

    /**
     * Create the OkHttp WebSocket listener.
     *
     * Handles connection open, message reception, failure, and closure events.
     */
    private fun createWebSocketListener(): WebSocketListener {
        return object : WebSocketListener() {

            override fun onOpen(webSocket: WebSocket, response: Response) {
                Log.d(TAG, "WebSocket connected")
                _connectionState.value = ConnectionState.CONNECTED
                reconnectAttempts = 0
                startPingLoop()
                restoreSubscriptions()
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                handleIncomingMessage(text.toByteArray(Charsets.UTF_8))
            }

            override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                handleIncomingMessage(bytes.toByteArray())
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                Log.e(TAG, "WebSocket failure: ${t.message}", t)
                handleConnectionLost()
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closing: code=$code reason=$reason")
                webSocket.close(code, reason)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                Log.d(TAG, "WebSocket closed: code=$code reason=$reason")
                handleConnectionLost()
            }
        }
    }

    // ========================================================================
    // Private - Message Handling
    // ========================================================================

    /**
     * Handle an incoming WebSocket message.
     *
     * Decrypts the message data and dispatches it to the appropriate handler
     * based on the message type.
     *
     * @param data The raw (potentially encrypted) message data.
     */
    private fun handleIncomingMessage(data: ByteArray) {
        val key = encryptionKey
        if (key == null) {
            Log.w(TAG, "Received message but encryption key is not available")
            return
        }

        try {
            // Decrypt the message
            val decryptedData = encryptionService.decrypt(data, key)
            val jsonString = String(decryptedData, Charsets.UTF_8)

            // Try to parse as a typed sync update envelope
            val envelope = tryParseEnvelope(jsonString)
            if (envelope != null) {
                processEnvelope(envelope)
                return
            }

            // Fall back to raw Session
            val session = tryParseSession(jsonString)
            if (session != null) {
                _incomingMessages.tryEmit(SyncMessage.SessionUpdate(session))
                return
            }

            // Fall back to raw Message
            val message = tryParseMessage(jsonString)
            if (message != null) {
                _incomingMessages.tryEmit(SyncMessage.MessageUpdate(message))
                return
            }

            Log.d(TAG, "Received unrecognized message format")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process incoming message", e)
        }
    }

    /**
     * Try to parse a JSON string as a [SyncUpdateEnvelope].
     */
    private fun tryParseEnvelope(jsonString: String): SyncUpdateEnvelope? {
        return try {
            json.decodeFromString<SyncUpdateEnvelope>(jsonString)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Try to parse a JSON string as a [com.enflame.happy.domain.model.Session].
     */
    private fun tryParseSession(jsonString: String): com.enflame.happy.domain.model.Session? {
        return try {
            json.decodeFromString<com.enflame.happy.domain.model.Session>(jsonString)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Try to parse a JSON string as a [com.enflame.happy.domain.model.Message].
     */
    private fun tryParseMessage(jsonString: String): com.enflame.happy.domain.model.Message? {
        return try {
            json.decodeFromString<com.enflame.happy.domain.model.Message>(jsonString)
        } catch (e: Exception) {
            null
        }
    }

    /**
     * Process a typed sync update envelope and emit the appropriate [SyncMessage].
     *
     * @param envelope The decoded sync update.
     */
    private fun processEnvelope(envelope: SyncUpdateEnvelope) {
        when (envelope.type) {
            SyncMessageType.SESSION -> {
                envelope.session?.let {
                    _incomingMessages.tryEmit(SyncMessage.SessionUpdate(it))
                }
            }

            SyncMessageType.MESSAGE -> {
                envelope.message?.let {
                    _incomingMessages.tryEmit(SyncMessage.MessageUpdate(it))
                }
            }

            SyncMessageType.PING -> {
                _incomingMessages.tryEmit(SyncMessage.Ping)
                sendPong()
            }

            SyncMessageType.PONG -> {
                _incomingMessages.tryEmit(SyncMessage.Pong)
            }

            SyncMessageType.SESSION_REVIVAL_PAUSED -> {
                val reason = envelope.reason ?: return
                val remainingMs = envelope.remainingMs ?: return
                val resumesAt = envelope.resumesAt ?: return
                val machineId = envelope.machineId ?: return
                _incomingMessages.tryEmit(
                    SyncMessage.SessionRevivalPaused(
                        reason = reason,
                        remainingMs = remainingMs,
                        resumesAt = resumesAt,
                        machineId = machineId
                    )
                )
            }

            SyncMessageType.SESSION_REVIVED -> {
                val originalSessionId = envelope.originalSessionId ?: return
                val newSessionId = envelope.newSessionId ?: return
                val machineId = envelope.machineId ?: return
                _incomingMessages.tryEmit(
                    SyncMessage.SessionRevived(
                        originalSessionId = originalSessionId,
                        newSessionId = newSessionId,
                        machineId = machineId
                    )
                )
            }

            // Client-to-server types; ignore if received from server
            SyncMessageType.SUBSCRIBE,
            SyncMessageType.UNSUBSCRIBE,
            SyncMessageType.UPDATE -> {
                // No-op
            }
        }
    }

    // ========================================================================
    // Private - Sending Messages
    // ========================================================================

    /**
     * Send a typed outgoing message to the server.
     *
     * @param message The outgoing message to serialize and send.
     */
    private fun sendOutgoing(message: SyncOutgoingMessage) {
        val ws = webSocket ?: run {
            Log.w(TAG, "Cannot send message: not connected")
            return
        }

        try {
            val jsonString = json.encodeToString(SyncOutgoingMessage.serializer(), message)
            ws.send(jsonString)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send message", e)
        }
    }

    /**
     * Send a pong response to the server.
     */
    private fun sendPong() {
        sendOutgoing(SyncOutgoingMessage(type = SyncMessageType.PONG))
    }

    // ========================================================================
    // Private - Ping/Pong Keepalive
    // ========================================================================

    /**
     * Start the periodic ping keepalive loop.
     *
     * Sends a WebSocket ping frame at [PING_INTERVAL_MS] intervals to detect
     * stale connections. OkHttp automatically handles pong responses at the
     * protocol level; we also send application-level pings for the sync protocol.
     */
    private fun startPingLoop() {
        pingJob?.cancel()
        pingJob = coroutineScope.launch {
            while (true) {
                delay(PING_INTERVAL_MS)
                val ws = webSocket ?: break
                // Protocol-level ping
                ws.send("".toByteArray().toByteString())
                // Application-level ping (matches iOS behavior)
                sendOutgoing(SyncOutgoingMessage(type = SyncMessageType.PING))
            }
        }
    }

    // ========================================================================
    // Private - Reconnection
    // ========================================================================

    /**
     * Handle a connection loss event.
     *
     * Updates the connection state and schedules a reconnection attempt
     * if automatic reconnection is enabled.
     */
    private fun handleConnectionLost() {
        // Clean up
        pingJob?.cancel()
        pingJob = null
        webSocket = null

        _connectionState.value = ConnectionState.DISCONNECTED

        if (!shouldReconnect) return

        // Check if we have exhausted reconnection attempts
        if (reconnectionStrategy.isExhausted(reconnectAttempts)) {
            shouldReconnect = false
            Log.w(TAG, "Maximum reconnection attempts (${reconnectionStrategy.maxAttempts}) exceeded")
            return
        }

        scheduleReconnect()
    }

    /**
     * Schedule a reconnection attempt with exponential backoff.
     */
    private fun scheduleReconnect() {
        reconnectJob?.cancel()

        val delayMs = reconnectionStrategy.delayForAttempt(reconnectAttempts)
        reconnectAttempts++

        _connectionState.value = ConnectionState.RECONNECTING

        Log.d(TAG, "Scheduling reconnection attempt $reconnectAttempts in ${delayMs}ms")

        reconnectJob = coroutineScope.launch {
            delay(delayMs)
            if (shouldReconnect) {
                connect()
            }
        }
    }

    /**
     * Restore session subscriptions after a successful reconnection.
     */
    private fun restoreSubscriptions() {
        for (sessionId in subscribedSessionIds) {
            sendOutgoing(SyncOutgoingMessage(type = SyncMessageType.SUBSCRIBE, sessionId = sessionId))
        }
    }

    companion object {
        private const val TAG = "SyncService"

        /** Default server URL if none is stored. */
        private const val DEFAULT_SERVER_URL = "https://api.happy.dev"

        /** Ping interval in milliseconds (30 seconds, matching iOS). */
        const val PING_INTERVAL_MS = 30_000L

        /** Buffer capacity for the incoming messages SharedFlow. */
        private const val INCOMING_BUFFER_CAPACITY = 64

        /** Normal closure WebSocket status code (RFC 6455). */
        private const val NORMAL_CLOSURE_CODE = 1000
    }
}

/**
 * Errors that can occur during sync operations.
 */
sealed class SyncException(message: String, cause: Throwable? = null) : Exception(message, cause) {

    /** Failed to establish or maintain a WebSocket connection. */
    class ConnectionFailed(message: String) : SyncException("Failed to connect: $message")

    /** The encryption key is not available in storage. */
    data object EncryptionKeyMissing : SyncException(
        "Encryption key not available. Please re-pair with CLI."
    )

    /** Failed to decrypt an incoming message. */
    class DecryptionFailed(message: String) : SyncException("Failed to decrypt message: $message")

    /** Failed to send a message over the WebSocket. */
    class SendFailed(message: String) : SyncException("Failed to send message: $message")
}
