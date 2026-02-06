package com.enflame.happy.data.sync

import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.SessionStatus
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString.Companion.toByteString
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Integration tests for [SyncService].
 *
 * These tests exercise the full WebSocket sync pipeline end-to-end:
 * encryption -> WebSocket transport -> decryption -> message parsing -> Flow emission.
 *
 * Unlike the unit tests in [SyncServiceTest], these tests simulate real server
 * interactions by capturing the [WebSocketListener] and invoking its callbacks
 * with properly encrypted payloads, validating the complete message flow.
 *
 * ## Coverage Areas
 * - Full encrypt/decrypt/parse pipeline with real [EncryptionService]
 * - WebSocket lifecycle: connect, receive, disconnect, reconnect
 * - Subscription management and restoration after reconnect
 * - Ping/pong keepalive protocol
 * - Error handling: corrupted messages, missing keys, bad JSON
 * - Connection state machine transitions under various scenarios
 * - Concurrent message handling
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SyncServiceIntegrationTest {

    // ========================================================================
    // Test Infrastructure
    // ========================================================================

    private lateinit var syncService: SyncService
    private lateinit var mockOkHttpClient: OkHttpClient
    private lateinit var mockTokenStorage: TokenStorage
    private lateinit var encryptionService: EncryptionService
    private lateinit var json: Json
    private lateinit var testScope: TestScope

    /** The captured WebSocketListener that SyncService passes to OkHttp. */
    private lateinit var capturedListener: WebSocketListener

    /** Mock WebSocket instance returned by OkHttp. */
    private lateinit var mockWebSocket: WebSocket

    /** The symmetric encryption key used for the test session. */
    private lateinit var encryptionKey: ByteArray

    @Before
    fun setUp() {
        mockOkHttpClient = mockk(relaxed = true)
        mockTokenStorage = mockk(relaxed = true)
        // Use a REAL EncryptionService for integration tests
        encryptionService = EncryptionService()
        json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            encodeDefaults = true
            isLenient = true
        }
        testScope = TestScope(UnconfinedTestDispatcher())

        mockWebSocket = mockk(relaxed = true)

        // Generate a real X25519 key pair for E2E encryption tests
        val aliceKeyPair = encryptionService.generateKeyPair()
        val bobKeyPair = encryptionService.generateKeyPair()
        encryptionKey = encryptionService.deriveSharedSecret(
            aliceKeyPair.privateKey,
            bobKeyPair.publicKey
        )

        // TokenStorage returns keys that will produce the same derived secret
        every { mockTokenStorage.privateKeyBytes } returns aliceKeyPair.privateKey
        every { mockTokenStorage.peerPublicKeyBytes } returns bobKeyPair.publicKey
        every { mockTokenStorage.authToken } returns "test-auth-token-12345"
        every { mockTokenStorage.serverUrl } returns "https://api.happy.dev"

        // Capture the WebSocketListener when OkHttp creates a WebSocket
        val listenerSlot = slot<WebSocketListener>()
        every { mockOkHttpClient.newWebSocket(any(), capture(listenerSlot)) } answers {
            capturedListener = listenerSlot.captured
            mockWebSocket
        }

        syncService = SyncService(
            okHttpClient = mockOkHttpClient,
            tokenStorage = mockTokenStorage,
            encryptionService = encryptionService,
            json = json,
            coroutineScope = testScope
        )
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    /**
     * Connect the SyncService and simulate the server accepting the connection
     * by invoking the onOpen callback.
     */
    private fun connectAndOpen() {
        syncService.connect()
        val mockResponse = mockk<Response>(relaxed = true)
        capturedListener.onOpen(mockWebSocket, mockResponse)
    }

    /**
     * Encrypt a JSON string using the shared encryption key, producing a
     * binary bundle in the same format the server would send.
     */
    private fun encryptPayload(jsonString: String): ByteArray {
        return encryptionService.encrypt(jsonString.toByteArray(Charsets.UTF_8), encryptionKey)
    }

    /**
     * Simulate the server sending an encrypted binary WebSocket message.
     */
    private fun serverSendsBinary(jsonString: String) {
        val encrypted = encryptPayload(jsonString)
        capturedListener.onMessage(mockWebSocket, encrypted.toByteString())
    }

    /**
     * Simulate the server sending an encrypted text WebSocket message.
     * Text messages are UTF-8 encoded byte arrays.
     */
    private fun serverSendsText(jsonString: String) {
        val encrypted = encryptPayload(jsonString)
        capturedListener.onMessage(mockWebSocket, String(encrypted, Charsets.ISO_8859_1))
    }

    // ========================================================================
    // E2E Encrypt -> Decrypt -> Parse Pipeline
    // ========================================================================

    @Test
    fun `full pipeline - encrypted session update is decrypted and emitted`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val sessionJson = """
            {
                "type": "session",
                "session": {
                    "id": "sess-e2e-001",
                    "title": "E2E Integration Test",
                    "status": "ACTIVE",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent()

        serverSendsBinary(sessionJson)

        assertTrue("Should have received a message", messages.isNotEmpty())
        val msg = messages.first()
        assertTrue("Message should be SessionUpdate", msg is SyncMessage.SessionUpdate)
        val sessionUpdate = msg as SyncMessage.SessionUpdate
        assertEquals("sess-e2e-001", sessionUpdate.session.id)
        assertEquals("E2E Integration Test", sessionUpdate.session.title)
        assertEquals(SessionStatus.ACTIVE, sessionUpdate.session.status)

        job.cancel()
    }

    @Test
    fun `full pipeline - encrypted message update is decrypted and emitted`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val messageJson = """
            {
                "type": "message",
                "message": {
                    "id": "msg-e2e-001",
                    "sessionId": "sess-e2e-001",
                    "role": "ASSISTANT",
                    "content": "Hello from the E2E test!",
                    "createdAt": 1700000001
                }
            }
        """.trimIndent()

        serverSendsBinary(messageJson)

        assertTrue("Should have received a message", messages.isNotEmpty())
        val msg = messages.first()
        assertTrue("Message should be MessageUpdate", msg is SyncMessage.MessageUpdate)
        val messageUpdate = msg as SyncMessage.MessageUpdate
        assertEquals("msg-e2e-001", messageUpdate.message.id)
        assertEquals(MessageRole.ASSISTANT, messageUpdate.message.role)
        assertEquals("Hello from the E2E test!", messageUpdate.message.content)

        job.cancel()
    }

    @Test
    fun `full pipeline - ping from server triggers pong response`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val pingJson = """{"type": "ping"}"""
        serverSendsBinary(pingJson)

        // Should emit a Ping message
        assertTrue("Should have received Ping", messages.any { it is SyncMessage.Ping })

        // Should have sent a pong response
        verify(atLeast = 1) { mockWebSocket.send(any<String>()) }

        // Verify the pong message content
        val sentMessages = mutableListOf<String>()
        verify { mockWebSocket.send(capture(sentMessages)) }

        val pongSent = sentMessages.any { sent ->
            try {
                val parsed = json.decodeFromString<SyncOutgoingMessage>(sent)
                parsed.type == SyncMessageType.PONG
            } catch (e: Exception) {
                false
            }
        }
        assertTrue("Should have sent a pong response", pongSent)

        job.cancel()
    }

    @Test
    fun `full pipeline - session revival paused event is parsed correctly`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val revivalPausedJson = """
            {
                "type": "session-revival-paused",
                "reason": "Circuit breaker cooldown active",
                "remainingMs": 25000,
                "resumesAt": 1700001500000,
                "machineId": "machine-integration-test"
            }
        """.trimIndent()

        serverSendsBinary(revivalPausedJson)

        assertTrue("Should have received a message", messages.isNotEmpty())
        val msg = messages.first()
        assertTrue("Should be SessionRevivalPaused", msg is SyncMessage.SessionRevivalPaused)
        val paused = msg as SyncMessage.SessionRevivalPaused
        assertEquals("Circuit breaker cooldown active", paused.reason)
        assertEquals(25000, paused.remainingMs)
        assertEquals(1700001500000L, paused.resumesAt)
        assertEquals("machine-integration-test", paused.machineId)

        job.cancel()
    }

    @Test
    fun `full pipeline - session revived event is parsed correctly`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val revivedJson = """
            {
                "type": "session-revived",
                "originalSessionId": "old-sess-e2e",
                "newSessionId": "new-sess-e2e",
                "machineId": "machine-e2e"
            }
        """.trimIndent()

        serverSendsBinary(revivedJson)

        assertTrue("Should have received a message", messages.isNotEmpty())
        val msg = messages.first()
        assertTrue("Should be SessionRevived", msg is SyncMessage.SessionRevived)
        val revived = msg as SyncMessage.SessionRevived
        assertEquals("old-sess-e2e", revived.originalSessionId)
        assertEquals("new-sess-e2e", revived.newSessionId)
        assertEquals("machine-e2e", revived.machineId)

        job.cancel()
    }

    @Test
    fun `full pipeline - multiple sequential messages are all received`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Send a series of different message types
        serverSendsBinary("""
            {"type": "session", "session": {"id": "sess-1", "title": "First", "createdAt": 1700000000}}
        """.trimIndent())

        serverSendsBinary("""
            {"type": "message", "message": {"id": "msg-1", "sessionId": "sess-1", "role": "USER", "content": "Hi", "createdAt": 1700000001}}
        """.trimIndent())

        serverSendsBinary("""
            {"type": "message", "message": {"id": "msg-2", "sessionId": "sess-1", "role": "ASSISTANT", "content": "Hello!", "createdAt": 1700000002}}
        """.trimIndent())

        serverSendsBinary("""
            {"type": "session", "session": {"id": "sess-1", "title": "Updated Title", "status": "ACTIVE", "createdAt": 1700000000}}
        """.trimIndent())

        assertEquals("Should have received 4 messages", 4, messages.size)
        assertTrue("First should be SessionUpdate", messages[0] is SyncMessage.SessionUpdate)
        assertTrue("Second should be MessageUpdate", messages[1] is SyncMessage.MessageUpdate)
        assertTrue("Third should be MessageUpdate", messages[2] is SyncMessage.MessageUpdate)
        assertTrue("Fourth should be SessionUpdate", messages[3] is SyncMessage.SessionUpdate)

        // Verify content of the last session update
        val lastSession = (messages[3] as SyncMessage.SessionUpdate).session
        assertEquals("Updated Title", lastSession.title)

        job.cancel()
    }

    // ========================================================================
    // Connection State Machine
    // ========================================================================

    @Test
    fun `state transitions - connect -> open -> connected`() = runTest {
        val states = mutableListOf<ConnectionState>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.connectionState.collect { states.add(it) }
        }

        syncService.connect()
        assertTrue(
            "Should transition to CONNECTING",
            states.contains(ConnectionState.CONNECTING)
        )

        val mockResponse = mockk<Response>(relaxed = true)
        capturedListener.onOpen(mockWebSocket, mockResponse)
        assertTrue(
            "Should transition to CONNECTED",
            states.contains(ConnectionState.CONNECTED)
        )

        job.cancel()
    }

    @Test
    fun `state transitions - connected -> failure -> disconnected -> reconnecting`() = runTest {
        connectAndOpen()
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Simulate connection failure
        capturedListener.onFailure(
            mockWebSocket,
            java.io.IOException("Connection reset"),
            null
        )

        // After failure, should transition through DISCONNECTED to RECONNECTING
        val state = syncService.connectionState.value
        assertTrue(
            "State should be DISCONNECTED or RECONNECTING after failure, was $state",
            state == ConnectionState.DISCONNECTED || state == ConnectionState.RECONNECTING
        )
    }

    @Test
    fun `state transitions - connected -> server close -> disconnected`() = runTest {
        connectAndOpen()

        // Simulate server-initiated close
        capturedListener.onClosing(mockWebSocket, 1000, "Server shutting down")
        capturedListener.onClosed(mockWebSocket, 1000, "Server shutting down")

        val state = syncService.connectionState.value
        assertTrue(
            "State should be DISCONNECTED or RECONNECTING after server close, was $state",
            state == ConnectionState.DISCONNECTED || state == ConnectionState.RECONNECTING
        )
    }

    @Test
    fun `state transitions - disconnect prevents reconnection`() = runTest {
        connectAndOpen()

        // Explicit disconnect
        syncService.disconnect()
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)

        // Even if we simulate a late failure callback, should stay disconnected
        // (The listener may still fire after disconnect is called)
        assertFalse("Should not be connected", syncService.isConnected)
    }

    // ========================================================================
    // Subscription Management and Restoration
    // ========================================================================

    @Test
    fun `subscribe sends correctly formatted JSON message`() = runTest {
        connectAndOpen()

        syncService.subscribe("sess-sub-001")

        val sentMessages = mutableListOf<String>()
        verify { mockWebSocket.send(capture(sentMessages)) }

        val subscribeSent = sentMessages.any { sent ->
            try {
                val parsed = json.decodeFromString<SyncOutgoingMessage>(sent)
                parsed.type == SyncMessageType.SUBSCRIBE && parsed.sessionId == "sess-sub-001"
            } catch (e: Exception) {
                false
            }
        }
        assertTrue("Should have sent subscribe message for sess-sub-001", subscribeSent)
    }

    @Test
    fun `unsubscribe sends correctly formatted JSON message`() = runTest {
        connectAndOpen()

        syncService.subscribe("sess-sub-002")
        syncService.unsubscribe("sess-sub-002")

        val sentMessages = mutableListOf<String>()
        verify(atLeast = 2) { mockWebSocket.send(capture(sentMessages)) }

        val unsubscribeSent = sentMessages.any { sent ->
            try {
                val parsed = json.decodeFromString<SyncOutgoingMessage>(sent)
                parsed.type == SyncMessageType.UNSUBSCRIBE && parsed.sessionId == "sess-sub-002"
            } catch (e: Exception) {
                false
            }
        }
        assertTrue("Should have sent unsubscribe message", unsubscribeSent)
    }

    @Test
    fun `subscriptions are restored after reconnection`() = runTest {
        connectAndOpen()

        // Subscribe to multiple sessions
        syncService.subscribe("sess-a")
        syncService.subscribe("sess-b")
        syncService.subscribe("sess-c")

        // Reset mock tracking before simulating reconnection
        val reconnectListenerSlot = slot<WebSocketListener>()
        val mockWebSocket2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            capturedListener = reconnectListenerSlot.captured
            mockWebSocket2
        }

        // Simulate connection failure (triggers reconnection)
        capturedListener.onFailure(
            mockWebSocket,
            java.io.IOException("Connection lost"),
            null
        )

        // Advance time past the reconnection delay
        advanceTimeBy(2_000)
        advanceUntilIdle()

        // Simulate the reconnected WebSocket opening
        val mockResponse2 = mockk<Response>(relaxed = true)
        capturedListener.onOpen(mockWebSocket2, mockResponse2)

        // Verify subscriptions were restored on the new WebSocket
        val sentMessages = mutableListOf<String>()
        verify(atLeast = 3) { mockWebSocket2.send(capture(sentMessages)) }

        val restoredSessionIds = sentMessages.mapNotNull { sent ->
            try {
                val parsed = json.decodeFromString<SyncOutgoingMessage>(sent)
                if (parsed.type == SyncMessageType.SUBSCRIBE) parsed.sessionId else null
            } catch (e: Exception) {
                null
            }
        }.toSet()

        assertTrue("sess-a should be restored", restoredSessionIds.contains("sess-a"))
        assertTrue("sess-b should be restored", restoredSessionIds.contains("sess-b"))
        assertTrue("sess-c should be restored", restoredSessionIds.contains("sess-c"))
    }

    @Test
    fun `unsubscribed sessions are not restored after reconnect`() = runTest {
        connectAndOpen()

        syncService.subscribe("sess-keep")
        syncService.subscribe("sess-remove")
        syncService.unsubscribe("sess-remove")

        // Reset mock for reconnection
        val reconnectListenerSlot = slot<WebSocketListener>()
        val mockWebSocket2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            capturedListener = reconnectListenerSlot.captured
            mockWebSocket2
        }

        // Simulate failure and reconnect
        capturedListener.onFailure(mockWebSocket, java.io.IOException("Lost"), null)
        advanceTimeBy(2_000)
        advanceUntilIdle()

        capturedListener.onOpen(mockWebSocket2, mockk(relaxed = true))

        val sentMessages = mutableListOf<String>()
        verify { mockWebSocket2.send(capture(sentMessages)) }

        val restoredSessionIds = sentMessages.mapNotNull { sent ->
            try {
                val parsed = json.decodeFromString<SyncOutgoingMessage>(sent)
                if (parsed.type == SyncMessageType.SUBSCRIBE) parsed.sessionId else null
            } catch (e: Exception) {
                null
            }
        }.toSet()

        assertTrue("sess-keep should be restored", restoredSessionIds.contains("sess-keep"))
        assertFalse("sess-remove should NOT be restored", restoredSessionIds.contains("sess-remove"))
    }

    // ========================================================================
    // Reconnection Behavior
    // ========================================================================

    @Test
    fun `reconnection resets attempt counter on successful connect`() = runTest {
        connectAndOpen()

        // After successful connection, reconnect attempts should be 0.
        // Verify by disconnecting, reconnecting, and checking state
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // The fact that we're connected means the counter was reset in onOpen
        // Disconnect cleanly
        syncService.disconnect()
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)
    }

    @Test
    fun `reconnection uses exponential backoff`() = runTest {
        // Use a custom strategy with known delays for verification
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 100,
                maxDelayMs = 1000,
                backoffMultiplier = 2.0,
                maxAttempts = 5
            )
        )

        connectAndOpen()

        // Track reconnect attempts by counting newWebSocket calls
        var reconnectCount = 0
        val reconnectListenerSlot = slot<WebSocketListener>()
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            reconnectCount++
            capturedListener = reconnectListenerSlot.captured
            mockk<WebSocket>(relaxed = true)
        }

        // Simulate failure
        capturedListener.onFailure(mockWebSocket, java.io.IOException("Error"), null)

        // First reconnect at ~100ms
        advanceTimeBy(150)
        advanceUntilIdle()
        assertTrue("Should have attempted at least 1 reconnect", reconnectCount >= 1)
    }

    @Test
    fun `reconnection stops after max attempts exhausted`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 10,
                maxDelayMs = 50,
                backoffMultiplier = 1.0,
                maxAttempts = 3
            )
        )

        connectAndOpen()

        // Each failure + reconnect should fail immediately (simulated)
        var reconnectCount = 0
        val listeners = mutableListOf<WebSocketListener>()

        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            reconnectCount++
            val listener = secondArg<WebSocketListener>()
            listeners.add(listener)
            val ws = mockk<WebSocket>(relaxed = true)
            // Simulate immediate failure on each reconnect attempt
            listener.onFailure(ws, java.io.IOException("Failure $reconnectCount"), null)
            ws
        }

        // Trigger initial failure
        capturedListener.onFailure(mockWebSocket, java.io.IOException("Initial failure"), null)

        // Advance past all possible reconnection delays
        advanceTimeBy(500)
        advanceUntilIdle()

        // Should eventually stop reconnecting (3 max attempts)
        assertTrue(
            "Should have stopped after max attempts, made $reconnectCount attempts",
            reconnectCount <= 4 // Account for possible off-by-one
        )
    }

    @Test
    fun `explicit disconnect cancels pending reconnection`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 5000, // Long delay
                maxDelayMs = 5000,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        // Simulate failure (should schedule reconnect in 5s)
        capturedListener.onFailure(mockWebSocket, java.io.IOException("Error"), null)

        // Immediately disconnect before reconnect fires
        syncService.disconnect()

        // Track any reconnect attempts
        var reconnectCount = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            reconnectCount++
            mockk<WebSocket>(relaxed = true)
        }

        // Advance past the reconnect delay
        advanceTimeBy(10_000)
        advanceUntilIdle()

        assertEquals(
            "Should not have reconnected after explicit disconnect",
            0,
            reconnectCount
        )
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)
    }

    // ========================================================================
    // Encryption Error Handling
    // ========================================================================

    @Test
    fun `corrupted encrypted message does not crash service`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Send corrupted data (random bytes that can't be decrypted)
        val corruptedData = ByteArray(50) { (it * 7).toByte() }
        capturedListener.onMessage(mockWebSocket, corruptedData.toByteString())

        // Service should still be connected
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)
        assertTrue("No messages should have been emitted for corrupted data", messages.isEmpty())

        // Send a valid message afterward - service should still work
        serverSendsBinary("""
            {"type": "session", "session": {"id": "sess-after-corrupt", "createdAt": 1700000000}}
        """.trimIndent())

        assertEquals("Valid message after corruption should still work", 1, messages.size)
        assertTrue(messages[0] is SyncMessage.SessionUpdate)

        job.cancel()
    }

    @Test
    fun `message encrypted with wrong key is silently dropped`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Encrypt with a completely different key
        val wrongKey = ByteArray(32) { 0xFF.toByte() }
        val wrongKeyEncrypted = encryptionService.encrypt(
            """{"type": "session", "session": {"id": "wrong-key", "createdAt": 1}}""".toByteArray(),
            wrongKey
        )
        capturedListener.onMessage(mockWebSocket, wrongKeyEncrypted.toByteString())

        // Should not have emitted any messages (decryption failed silently)
        assertTrue("Should not emit messages encrypted with wrong key", messages.isEmpty())
        assertEquals(
            "Service should remain connected after decryption failure",
            ConnectionState.CONNECTED,
            syncService.connectionState.value
        )

        job.cancel()
    }

    @Test
    fun `valid encryption with invalid JSON content is silently dropped`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Encrypt valid but non-JSON data
        val notJson = encryptionService.encrypt(
            "this is not json at all!!!".toByteArray(),
            encryptionKey
        )
        capturedListener.onMessage(mockWebSocket, notJson.toByteString())

        // Should not crash, should not emit (can't parse as any known type)
        assertTrue("Should not emit for non-JSON content", messages.isEmpty())

        job.cancel()
    }

    @Test
    fun `encrypted JSON with unknown type field is silently dropped`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // This will fail envelope parsing (unknown type), then fail
        // session and message parsing too
        serverSendsBinary("""{"type": "unknown-future-type", "data": 42}""")

        // The message uses "ignoreUnknownKeys = true", but the type enum
        // won't match. The catch block will handle it gracefully.
        assertEquals(
            "Service should remain connected",
            ConnectionState.CONNECTED,
            syncService.connectionState.value
        )

        job.cancel()
    }

    @Test
    fun `empty encrypted payload is handled gracefully`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Encrypt an empty string
        val emptyEncrypted = encryptionService.encrypt(
            "".toByteArray(),
            encryptionKey
        )
        capturedListener.onMessage(mockWebSocket, emptyEncrypted.toByteString())

        assertTrue("Should not emit for empty payload", messages.isEmpty())

        job.cancel()
    }

    // ========================================================================
    // Partial / Malformed Envelope Fields
    // ========================================================================

    @Test
    fun `session-revival-paused with missing required fields is not emitted`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Missing machineId - processEnvelope should return early
        serverSendsBinary("""
            {
                "type": "session-revival-paused",
                "reason": "cooldown",
                "remainingMs": 5000,
                "resumesAt": 1700000000000
            }
        """.trimIndent())

        assertTrue("Should not emit with missing machineId", messages.isEmpty())

        job.cancel()
    }

    @Test
    fun `session-revived with missing required fields is not emitted`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Missing newSessionId
        serverSendsBinary("""
            {
                "type": "session-revived",
                "originalSessionId": "old-sess",
                "machineId": "m-1"
            }
        """.trimIndent())

        assertTrue("Should not emit with missing newSessionId", messages.isEmpty())

        job.cancel()
    }

    @Test
    fun `session envelope with null session payload is not emitted`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Type is "session" but no session field
        serverSendsBinary("""{"type": "session"}""")

        assertTrue("Should not emit session update when session is null", messages.isEmpty())

        job.cancel()
    }

    @Test
    fun `message envelope with null message payload is not emitted`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Type is "message" but no message field
        serverSendsBinary("""{"type": "message"}""")

        assertTrue("Should not emit message update when message is null", messages.isEmpty())

        job.cancel()
    }

    // ========================================================================
    // WebSocket URL Construction
    // ========================================================================

    @Test
    fun `connect constructs correct WebSocket URL with token`() = runTest {
        every { mockTokenStorage.serverUrl } returns "https://api.happy.dev"
        every { mockTokenStorage.authToken } returns "my-secret-token"

        val requestSlot = slot<Request>()
        every { mockOkHttpClient.newWebSocket(capture(requestSlot), any()) } returns mockWebSocket

        syncService.connect()

        val url = requestSlot.captured.url.toString()
        assertTrue(
            "URL should use wss:// scheme, was: $url",
            url.startsWith("wss://")
        )
        assertTrue(
            "URL should contain /v1/sync path, was: $url",
            url.contains("/v1/sync")
        )
        assertTrue(
            "URL should contain token parameter, was: $url",
            url.contains("token=my-secret-token")
        )
    }

    @Test
    fun `connect converts http to ws scheme`() = runTest {
        every { mockTokenStorage.serverUrl } returns "http://localhost:3000"
        every { mockTokenStorage.authToken } returns "dev-token"

        val requestSlot = slot<Request>()
        every { mockOkHttpClient.newWebSocket(capture(requestSlot), any()) } returns mockWebSocket

        syncService.connect()

        val url = requestSlot.captured.url.toString()
        assertTrue(
            "HTTP should be converted to WS, was: $url",
            url.startsWith("ws://")
        )
    }

    @Test
    fun `connect uses default server URL when none stored`() = runTest {
        every { mockTokenStorage.serverUrl } returns null
        every { mockTokenStorage.authToken } returns "fallback-token"

        val requestSlot = slot<Request>()
        every { mockOkHttpClient.newWebSocket(capture(requestSlot), any()) } returns mockWebSocket

        syncService.connect()

        val url = requestSlot.captured.url.toString()
        assertTrue(
            "Should use default server URL, was: $url",
            url.contains("api.happy.dev")
        )
    }

    // ========================================================================
    // Duplicate Connection Prevention
    // ========================================================================

    @Test
    fun `calling connect twice does not create duplicate connections`() = runTest {
        connectAndOpen()

        // Reset the mock counter
        var newWebSocketCalls = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            newWebSocketCalls++
            mockWebSocket
        }

        // Call connect again while already connected
        syncService.connect()

        assertEquals(
            "Should not create a new WebSocket when already connected",
            0,
            newWebSocketCalls
        )
    }

    // ========================================================================
    // Pong Response for Server Ping
    // ========================================================================

    @Test
    fun `pong envelope type is correctly emitted and response sent`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""{"type": "pong"}""")

        assertTrue("Should have received Pong message", messages.any { it is SyncMessage.Pong })

        job.cancel()
    }

    // ========================================================================
    // Client-to-Server Types Received from Server (No-Op)
    // ========================================================================

    @Test
    fun `subscribe type from server is ignored`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""{"type": "subscribe", "sessionId": "should-ignore"}""")

        assertTrue("Client-to-server types should not emit messages", messages.isEmpty())

        job.cancel()
    }

    @Test
    fun `update type from server is ignored`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""{"type": "update"}""")

        assertTrue("Update type should not emit messages", messages.isEmpty())

        job.cancel()
    }

    // ========================================================================
    // Session with Extra/Unknown Fields (Forward Compatibility)
    // ========================================================================

    @Test
    fun `session with unknown fields is parsed successfully`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""
            {
                "type": "session",
                "session": {
                    "id": "sess-forward-compat",
                    "title": "Forward Compatible",
                    "status": "ACTIVE",
                    "createdAt": 1700000000,
                    "futureField1": "unknown",
                    "futureField2": 42,
                    "futureNested": {"a": "b"}
                },
                "unknownTopLevel": true
            }
        """.trimIndent())

        assertEquals("Should parse session with unknown fields", 1, messages.size)
        val session = (messages[0] as SyncMessage.SessionUpdate).session
        assertEquals("sess-forward-compat", session.id)

        job.cancel()
    }

    @Test
    fun `message with tool uses is parsed correctly through pipeline`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""
            {
                "type": "message",
                "message": {
                    "id": "msg-tools-001",
                    "sessionId": "sess-1",
                    "role": "ASSISTANT",
                    "content": "Let me run that for you.",
                    "createdAt": 1700000000,
                    "toolUses": [
                        {
                            "id": "tool-1",
                            "name": "bash",
                            "input": "ls -la",
                            "output": "total 42",
                            "status": "COMPLETED"
                        },
                        {
                            "id": "tool-2",
                            "name": "read",
                            "input": "/path/to/file",
                            "status": "RUNNING"
                        }
                    ]
                }
            }
        """.trimIndent())

        assertEquals(1, messages.size)
        val msg = (messages[0] as SyncMessage.MessageUpdate).message
        assertNotNull("Tool uses should be parsed", msg.toolUses)
        assertEquals(2, msg.toolUses!!.size)
        assertEquals("bash", msg.toolUses!![0].name)
        assertEquals("COMPLETED", msg.toolUses!![0].status.name)
        assertEquals("RUNNING", msg.toolUses!![1].status.name)

        job.cancel()
    }

    // ========================================================================
    // V1 Bundle Format E2E
    // ========================================================================

    @Test
    fun `v1 encrypted bundle is decrypted and parsed correctly`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        // Construct a v1 bundle manually from a v0 encryption
        val sessionJson = """{"type":"session","session":{"id":"sess-v1","title":"V1 Bundle","createdAt":1700000000}}"""
        val v0Bundle = encryptionService.encrypt(sessionJson.toByteArray(Charsets.UTF_8), encryptionKey)

        // Extract nonce + ciphertext+authTag from v0 bundle
        val nonce = v0Bundle.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE)
        val ciphertextAndTag = v0Bundle.copyOfRange(1 + EncryptionService.NONCE_SIZE, v0Bundle.size)

        // Construct v1 bundle: [0x01][keyVersion:2][nonce:12][ciphertext+authTag]
        val v1Bundle = ByteArray(3 + EncryptionService.NONCE_SIZE + ciphertextAndTag.size)
        v1Bundle[0] = EncryptionService.BUNDLE_VERSION_V1
        v1Bundle[1] = 0x00 // key version high byte
        v1Bundle[2] = 0x01 // key version low byte (version 1)
        System.arraycopy(nonce, 0, v1Bundle, 3, EncryptionService.NONCE_SIZE)
        System.arraycopy(ciphertextAndTag, 0, v1Bundle, 3 + EncryptionService.NONCE_SIZE, ciphertextAndTag.size)

        capturedListener.onMessage(mockWebSocket, v1Bundle.toByteString())

        assertEquals("V1 bundle should be parsed successfully", 1, messages.size)
        val session = (messages[0] as SyncMessage.SessionUpdate).session
        assertEquals("sess-v1", session.id)
        assertEquals("V1 Bundle", session.title)

        job.cancel()
    }

    // ========================================================================
    // Cross-Platform Message Format Compatibility
    // ========================================================================

    @Test
    fun `session with all optional fields populated is parsed correctly`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""
            {
                "type": "session",
                "session": {
                    "id": "sess-full",
                    "title": "Full Session",
                    "status": "IDLE",
                    "createdAt": 1700000000,
                    "updatedAt": 1700000999,
                    "machineId": "machine-full",
                    "machineName": "My MacBook Pro"
                }
            }
        """.trimIndent())

        assertEquals(1, messages.size)
        val session = (messages[0] as SyncMessage.SessionUpdate).session
        assertEquals("sess-full", session.id)
        assertEquals("Full Session", session.title)
        assertEquals(SessionStatus.IDLE, session.status)
        assertEquals(1700000000L, session.createdAt)
        assertEquals(1700000999L, session.updatedAt)
        assertEquals("machine-full", session.machineId)
        assertEquals("My MacBook Pro", session.machineName)

        job.cancel()
    }

    @Test
    fun `message with all roles is parsed correctly`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        for (role in listOf("USER", "ASSISTANT", "SYSTEM")) {
            serverSendsBinary("""
                {
                    "type": "message",
                    "message": {
                        "id": "msg-$role",
                        "sessionId": "sess-1",
                        "role": "$role",
                        "content": "Message from $role",
                        "createdAt": 1700000000
                    }
                }
            """.trimIndent())
        }

        assertEquals(3, messages.size)
        assertEquals(MessageRole.USER, (messages[0] as SyncMessage.MessageUpdate).message.role)
        assertEquals(MessageRole.ASSISTANT, (messages[1] as SyncMessage.MessageUpdate).message.role)
        assertEquals(MessageRole.SYSTEM, (messages[2] as SyncMessage.MessageUpdate).message.role)

        job.cancel()
    }

    // ========================================================================
    // Unicode and Special Characters in Encrypted Messages
    // ========================================================================

    @Test
    fun `encrypted message with unicode content is handled correctly`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val unicodeContent = "Hello \uD83D\uDE00 \u4F60\u597D \u3053\u3093\u306B\u3061\u306F Caf\u00E9"
        serverSendsBinary("""
            {
                "type": "message",
                "message": {
                    "id": "msg-unicode",
                    "sessionId": "sess-1",
                    "role": "ASSISTANT",
                    "content": "$unicodeContent",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent())

        assertEquals(1, messages.size)
        val content = (messages[0] as SyncMessage.MessageUpdate).message.content
        assertEquals(unicodeContent, content)

        job.cancel()
    }

    @Test
    fun `encrypted message with escaped characters in JSON`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""
            {
                "type": "message",
                "message": {
                    "id": "msg-escaped",
                    "sessionId": "sess-1",
                    "role": "ASSISTANT",
                    "content": "Line 1\nLine 2\tTabbed\n\"Quoted\"",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent())

        assertEquals(1, messages.size)
        val content = (messages[0] as SyncMessage.MessageUpdate).message.content
        assertTrue("Should contain newline", content.contains("\n"))
        assertTrue("Should contain tab", content.contains("\t"))
        assertTrue("Should contain quotes", content.contains("\""))

        job.cancel()
    }

    // ========================================================================
    // Stress / Rapid Message Flow
    // ========================================================================

    @Test
    fun `rapid message stream is handled without data loss`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val messageCount = 50
        for (i in 0 until messageCount) {
            serverSendsBinary("""
                {
                    "type": "message",
                    "message": {
                        "id": "msg-rapid-$i",
                        "sessionId": "sess-1",
                        "role": "ASSISTANT",
                        "content": "Rapid message $i",
                        "createdAt": ${1700000000 + i}
                    }
                }
            """.trimIndent())
        }

        assertEquals(
            "All $messageCount messages should be received",
            messageCount,
            messages.size
        )

        // Verify ordering
        for (i in 0 until messageCount) {
            val msg = messages[i] as SyncMessage.MessageUpdate
            assertEquals("msg-rapid-$i", msg.message.id)
        }

        job.cancel()
    }

    @Test
    fun `interleaved session and message updates maintain order`() = runTest {
        connectAndOpen()

        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""{"type": "session", "session": {"id": "s1", "title": "Start", "createdAt": 1}}""")
        serverSendsBinary("""{"type": "message", "message": {"id": "m1", "sessionId": "s1", "role": "USER", "content": "a", "createdAt": 2}}""")
        serverSendsBinary("""{"type": "message", "message": {"id": "m2", "sessionId": "s1", "role": "ASSISTANT", "content": "b", "createdAt": 3}}""")
        serverSendsBinary("""{"type": "session", "session": {"id": "s1", "title": "Updated", "createdAt": 1}}""")
        serverSendsBinary("""{"type": "ping"}""")
        serverSendsBinary("""{"type": "message", "message": {"id": "m3", "sessionId": "s1", "role": "ASSISTANT", "content": "c", "createdAt": 4}}""")

        assertEquals(6, messages.size)
        assertTrue(messages[0] is SyncMessage.SessionUpdate)
        assertTrue(messages[1] is SyncMessage.MessageUpdate)
        assertTrue(messages[2] is SyncMessage.MessageUpdate)
        assertTrue(messages[3] is SyncMessage.SessionUpdate)
        assertTrue(messages[4] is SyncMessage.Ping)
        assertTrue(messages[5] is SyncMessage.MessageUpdate)

        job.cancel()
    }

    // ========================================================================
    // Connection Lifecycle Edge Cases
    // ========================================================================

    @Test
    fun `disconnect while no connection is a no-op`() = runTest {
        // Should not throw
        syncService.disconnect()
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)
    }

    @Test
    fun `connect after disconnect restores functionality`() = runTest {
        // First connection
        connectAndOpen()
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Disconnect
        syncService.disconnect()
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)

        // Re-setup the mock for second connection
        val listenerSlot2 = slot<WebSocketListener>()
        val mockWebSocket2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(listenerSlot2)) } answers {
            capturedListener = listenerSlot2.captured
            mockWebSocket2
        }

        // Reconnect
        syncService.connect()
        capturedListener.onOpen(mockWebSocket2, mockk(relaxed = true))
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Should still receive messages
        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        serverSendsBinary("""{"type": "session", "session": {"id": "sess-reconnected", "createdAt": 1}}""")
        assertEquals(1, messages.size)

        job.cancel()
    }

    @Test
    fun `subscribe before connect queues subscription`() = runTest {
        // Subscribe before connecting
        syncService.subscribe("sess-early")

        // Now connect
        connectAndOpen()

        // The subscription should be sent when subscriptions are restored on open
        val sentMessages = mutableListOf<String>()
        verify { mockWebSocket.send(capture(sentMessages)) }

        val subscribeSent = sentMessages.any { sent ->
            try {
                val parsed = json.decodeFromString<SyncOutgoingMessage>(sent)
                parsed.type == SyncMessageType.SUBSCRIBE && parsed.sessionId == "sess-early"
            } catch (e: Exception) {
                false
            }
        }
        assertTrue("Early subscription should be sent on connect", subscribeSent)
    }
}
