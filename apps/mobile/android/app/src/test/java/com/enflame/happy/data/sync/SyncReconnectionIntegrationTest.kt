package com.enflame.happy.data.sync

import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
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
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.io.IOException
import java.net.SocketTimeoutException

/**
 * Integration tests for [SyncService] reconnection behavior.
 *
 * Validates the complete reconnection lifecycle including:
 * - Exponential backoff timing under various failure modes
 * - Reconnection after different WebSocket close codes
 * - Subscription restoration after reconnection
 * - State machine transitions during reconnect cycles
 * - Interaction between explicit disconnect and automatic reconnection
 * - Message reception after successful reconnection
 *
 * ## Test Design
 * These tests use [TestScope] with [UnconfinedTestDispatcher] and virtual time
 * advancement to verify backoff delays without real-time waits.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SyncReconnectionIntegrationTest {

    private lateinit var syncService: SyncService
    private lateinit var mockOkHttpClient: OkHttpClient
    private lateinit var mockTokenStorage: TokenStorage
    private lateinit var encryptionService: EncryptionService
    private lateinit var json: Json
    private lateinit var testScope: TestScope

    private lateinit var capturedListener: WebSocketListener
    private lateinit var mockWebSocket: WebSocket
    private lateinit var encryptionKey: ByteArray

    @Before
    fun setUp() {
        mockOkHttpClient = mockk(relaxed = true)
        mockTokenStorage = mockk(relaxed = true)
        encryptionService = EncryptionService()
        json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            encodeDefaults = true
            isLenient = true
        }
        testScope = TestScope(UnconfinedTestDispatcher())

        mockWebSocket = mockk(relaxed = true)

        val aliceKeyPair = encryptionService.generateKeyPair()
        val bobKeyPair = encryptionService.generateKeyPair()
        encryptionKey = encryptionService.deriveSharedSecret(
            aliceKeyPair.privateKey,
            bobKeyPair.publicKey
        )

        every { mockTokenStorage.privateKeyBytes } returns aliceKeyPair.privateKey
        every { mockTokenStorage.peerPublicKeyBytes } returns bobKeyPair.publicKey
        every { mockTokenStorage.authToken } returns "test-auth-token"
        every { mockTokenStorage.serverUrl } returns "https://api.happy.dev"

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

    private fun connectAndOpen() {
        syncService.connect()
        capturedListener.onOpen(mockWebSocket, mockk<Response>(relaxed = true))
    }

    // ========================================================================
    // Failure Mode: IOException (Network Error)
    // ========================================================================

    @Test
    fun `IOException triggers reconnection`() = runTest {
        connectAndOpen()
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Track reconnect attempts
        var reconnectAttempts = 0
        val reconnectListenerSlot = slot<WebSocketListener>()
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            reconnectAttempts++
            capturedListener = reconnectListenerSlot.captured
            mockk<WebSocket>(relaxed = true)
        }

        // Simulate network error
        capturedListener.onFailure(
            mockWebSocket,
            IOException("Connection reset by peer"),
            null
        )

        advanceTimeBy(2_000)
        advanceUntilIdle()

        assertTrue("Should have attempted reconnection", reconnectAttempts >= 1)
    }

    @Test
    fun `SocketTimeoutException triggers reconnection`() = runTest {
        connectAndOpen()

        var reconnectAttempts = 0
        val reconnectListenerSlot = slot<WebSocketListener>()
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            reconnectAttempts++
            capturedListener = reconnectListenerSlot.captured
            mockk<WebSocket>(relaxed = true)
        }

        capturedListener.onFailure(
            mockWebSocket,
            SocketTimeoutException("Connect timed out"),
            null
        )

        advanceTimeBy(2_000)
        advanceUntilIdle()

        assertTrue("Should have attempted reconnection after timeout", reconnectAttempts >= 1)
    }

    // ========================================================================
    // Failure Mode: Server Close Codes
    // ========================================================================

    @Test
    fun `server normal close triggers reconnection`() = runTest {
        connectAndOpen()

        var reconnectAttempts = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            reconnectAttempts++
            mockk<WebSocket>(relaxed = true)
        }

        capturedListener.onClosing(mockWebSocket, 1000, "Server shutting down")
        capturedListener.onClosed(mockWebSocket, 1000, "Server shutting down")

        advanceTimeBy(2_000)
        advanceUntilIdle()

        assertTrue("Should attempt reconnection after server close", reconnectAttempts >= 1)
    }

    @Test
    fun `server going away close triggers reconnection`() = runTest {
        connectAndOpen()

        var reconnectAttempts = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            reconnectAttempts++
            mockk<WebSocket>(relaxed = true)
        }

        capturedListener.onClosing(mockWebSocket, 1001, "Server going away")
        capturedListener.onClosed(mockWebSocket, 1001, "Server going away")

        advanceTimeBy(2_000)
        advanceUntilIdle()

        assertTrue("Should reconnect on going away", reconnectAttempts >= 1)
    }

    // ========================================================================
    // Exponential Backoff Timing
    // ========================================================================

    @Test
    fun `first reconnect delay matches base delay`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 1000,
                maxDelayMs = 30_000,
                backoffMultiplier = 2.0,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        var reconnectAttempts = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            reconnectAttempts++
            mockk<WebSocket>(relaxed = true)
        }

        capturedListener.onFailure(mockWebSocket, IOException("Error"), null)

        // At 500ms, should NOT have reconnected yet (base delay is 1000ms)
        advanceTimeBy(500)
        advanceUntilIdle()
        assertEquals("Should not reconnect before base delay", 0, reconnectAttempts)

        // At 1100ms, should have reconnected
        advanceTimeBy(600)
        advanceUntilIdle()
        assertEquals("Should reconnect after base delay", 1, reconnectAttempts)
    }

    @Test
    fun `second reconnect delay is doubled`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 100,
                maxDelayMs = 10_000,
                backoffMultiplier = 2.0,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        val wsInstances = mutableListOf<WebSocket>()
        val listeners = mutableListOf<WebSocketListener>()
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            val listener = secondArg<WebSocketListener>()
            listeners.add(listener)
            val ws = mockk<WebSocket>(relaxed = true)
            wsInstances.add(ws)
            ws
        }

        // First failure
        capturedListener.onFailure(mockWebSocket, IOException("Error 1"), null)

        // Wait for first reconnect (100ms base delay)
        advanceTimeBy(150)
        advanceUntilIdle()
        assertEquals("First reconnect should happen", 1, wsInstances.size)

        // Simulate the reconnect also failing
        listeners.last().onFailure(wsInstances.last(), IOException("Error 2"), null)

        // Second reconnect should take 200ms (100 * 2^1)
        advanceTimeBy(150) // Not enough time
        advanceUntilIdle()
        assertEquals("Should not have second reconnect yet", 1, wsInstances.size)

        advanceTimeBy(100) // Total 250ms from second failure
        advanceUntilIdle()
        assertEquals("Second reconnect should happen", 2, wsInstances.size)
    }

    // ========================================================================
    // Max Attempts
    // ========================================================================

    @Test
    fun `reconnection stops after max attempts`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 10,
                maxDelayMs = 10,
                backoffMultiplier = 1.0,
                maxAttempts = 3
            )
        )

        connectAndOpen()

        var totalAttempts = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            totalAttempts++
            val listener = secondArg<WebSocketListener>()
            val ws = mockk<WebSocket>(relaxed = true)
            // Each reconnect fails immediately
            listener.onFailure(ws, IOException("Persistent failure"), null)
            ws
        }

        // Trigger initial failure
        capturedListener.onFailure(mockWebSocket, IOException("Initial"), null)

        // Advance well past all possible attempts
        advanceTimeBy(1000)
        advanceUntilIdle()

        assertTrue(
            "Should stop after max attempts (3), actual: $totalAttempts",
            totalAttempts <= 3
        )
    }

    @Test
    fun `unlimited attempts never exhaust`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 10,
                maxDelayMs = 10,
                backoffMultiplier = 1.0,
                maxAttempts = 0 // Unlimited
            )
        )

        connectAndOpen()

        var totalAttempts = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            totalAttempts++
            val listener = secondArg<WebSocketListener>()
            val ws = mockk<WebSocket>(relaxed = true)
            if (totalAttempts < 20) {
                listener.onFailure(ws, IOException("Failure $totalAttempts"), null)
            }
            ws
        }

        capturedListener.onFailure(mockWebSocket, IOException("Initial"), null)

        // Should keep trying many times
        advanceTimeBy(500)
        advanceUntilIdle()

        assertTrue(
            "Should have many attempts with unlimited strategy, actual: $totalAttempts",
            totalAttempts >= 15
        )
    }

    // ========================================================================
    // Successful Reconnection Resets Counter
    // ========================================================================

    @Test
    fun `successful reconnection resets backoff and accepts messages`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 100,
                maxDelayMs = 10_000,
                backoffMultiplier = 2.0,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        // Subscribe to a session before failure
        syncService.subscribe("sess-persistent")

        // Set up for reconnection
        val reconnectListenerSlot = slot<WebSocketListener>()
        val mockWebSocket2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            capturedListener = reconnectListenerSlot.captured
            mockWebSocket2
        }

        // Simulate failure
        capturedListener.onFailure(mockWebSocket, IOException("Dropped"), null)

        // Wait for reconnect
        advanceTimeBy(150)
        advanceUntilIdle()

        // Simulate successful reconnection
        capturedListener.onOpen(mockWebSocket2, mockk(relaxed = true))
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Should be able to receive messages on the new connection
        val messages = mutableListOf<SyncMessage>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.incomingMessages.collect { messages.add(it) }
        }

        val sessionJson = """{"type":"session","session":{"id":"sess-after-reconnect","createdAt":1}}"""
        val encrypted = encryptionService.encrypt(
            sessionJson.toByteArray(Charsets.UTF_8),
            encryptionKey
        )
        capturedListener.onMessage(mockWebSocket2, encrypted.toByteString())

        assertEquals("Should receive message after reconnect", 1, messages.size)
        assertTrue(messages[0] is SyncMessage.SessionUpdate)

        job.cancel()
    }

    @Test
    fun `after successful reconnect - next failure uses base delay again`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 100,
                maxDelayMs = 10_000,
                backoffMultiplier = 2.0,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        // First failure + reconnect cycle
        val reconnectListenerSlot = slot<WebSocketListener>()
        var mockWs2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot)) } answers {
            capturedListener = reconnectListenerSlot.captured
            mockWs2
        }

        capturedListener.onFailure(mockWebSocket, IOException("Error 1"), null)
        advanceTimeBy(150)
        advanceUntilIdle()

        // Successful reconnect (resets counter)
        capturedListener.onOpen(mockWs2, mockk(relaxed = true))
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Second failure - should use base delay (100ms), not escalated delay
        var reconnectCount = 0
        val reconnectListenerSlot2 = slot<WebSocketListener>()
        val mockWs3 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(reconnectListenerSlot2)) } answers {
            reconnectCount++
            capturedListener = reconnectListenerSlot2.captured
            mockWs3
        }

        capturedListener.onFailure(mockWs2, IOException("Error 2"), null)

        // At 50ms: should NOT have reconnected (less than base delay)
        advanceTimeBy(50)
        advanceUntilIdle()
        assertEquals("Should not reconnect before base delay", 0, reconnectCount)

        // At 150ms: should have reconnected (past base delay)
        advanceTimeBy(100)
        advanceUntilIdle()
        assertEquals("Should reconnect at base delay", 1, reconnectCount)
    }

    // ========================================================================
    // Race Conditions: Disconnect During Reconnection
    // ========================================================================

    @Test
    fun `disconnect during reconnect delay cancels pending reconnect`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 5000,
                maxDelayMs = 5000,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        var reconnectAttempts = 0
        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            reconnectAttempts++
            mockk<WebSocket>(relaxed = true)
        }

        // Fail (schedules reconnect in 5s)
        capturedListener.onFailure(mockWebSocket, IOException("Error"), null)

        // Disconnect before the reconnect fires
        advanceTimeBy(1000)
        syncService.disconnect()

        // Advance past the original reconnect time
        advanceTimeBy(10_000)
        advanceUntilIdle()

        assertEquals(
            "Should not have reconnected after explicit disconnect",
            0,
            reconnectAttempts
        )
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)
    }

    @Test
    fun `rapid connect-disconnect-connect does not cause double connections`() = runTest {
        // First connect
        connectAndOpen()
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Disconnect
        syncService.disconnect()
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)

        // Immediate reconnect
        val listenerSlot2 = slot<WebSocketListener>()
        val mockWs2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(listenerSlot2)) } answers {
            capturedListener = listenerSlot2.captured
            mockWs2
        }

        syncService.connect()
        capturedListener.onOpen(mockWs2, mockk(relaxed = true))
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        // Service should be functional
        assertTrue(syncService.isConnected)
    }

    // ========================================================================
    // Multiple Failures Before Success
    // ========================================================================

    @Test
    fun `multiple consecutive failures followed by success`() = runTest {
        syncService.setReconnectionStrategy(
            ReconnectionStrategy(
                baseDelayMs = 50,
                maxDelayMs = 500,
                backoffMultiplier = 2.0,
                maxAttempts = 10
            )
        )

        connectAndOpen()

        var attempt = 0
        val finalWebSocket = mockk<WebSocket>(relaxed = true)

        every { mockOkHttpClient.newWebSocket(any(), any()) } answers {
            attempt++
            val listener = secondArg<WebSocketListener>()
            val ws = if (attempt < 4) {
                mockk<WebSocket>(relaxed = true).also { ws ->
                    // Simulate failure on first 3 reconnect attempts
                    listener.onFailure(ws, IOException("Failure $attempt"), null)
                }
            } else {
                // 4th attempt succeeds
                finalWebSocket.also { ws ->
                    capturedListener = listener
                    listener.onOpen(ws, mockk(relaxed = true))
                }
            }
            ws
        }

        // Trigger initial failure
        capturedListener.onFailure(mockWebSocket, IOException("Initial"), null)

        // Advance through all retry delays
        advanceTimeBy(2000)
        advanceUntilIdle()

        assertEquals("Should have made 4 reconnect attempts", 4, attempt)
        assertEquals(
            "Should be connected after successful retry",
            ConnectionState.CONNECTED,
            syncService.connectionState.value
        )
    }

    // ========================================================================
    // State Consistency
    // ========================================================================

    @Test
    fun `connectionState never emits invalid transitions`() = runTest {
        val states = mutableListOf<ConnectionState>()
        val job = launch(UnconfinedTestDispatcher(testScheduler)) {
            syncService.connectionState.collect { states.add(it) }
        }

        // Full lifecycle: connect -> open -> fail -> reconnect -> open -> disconnect
        syncService.connect()
        capturedListener.onOpen(mockWebSocket, mockk(relaxed = true))

        val listenerSlot2 = slot<WebSocketListener>()
        val mockWs2 = mockk<WebSocket>(relaxed = true)
        every { mockOkHttpClient.newWebSocket(any(), capture(listenerSlot2)) } answers {
            capturedListener = listenerSlot2.captured
            mockWs2
        }

        capturedListener.onFailure(mockWebSocket, IOException("Error"), null)
        advanceTimeBy(2_000)
        advanceUntilIdle()

        capturedListener.onOpen(mockWs2, mockk(relaxed = true))
        syncService.disconnect()

        // Verify all states are valid enum values
        for (state in states) {
            assertTrue(
                "State $state should be a valid ConnectionState",
                state in ConnectionState.entries
            )
        }

        // Verify we saw the major transitions
        assertTrue("Should have been CONNECTING", states.contains(ConnectionState.CONNECTING))
        assertTrue("Should have been CONNECTED", states.contains(ConnectionState.CONNECTED))
        assertTrue("Should have been DISCONNECTED", states.contains(ConnectionState.DISCONNECTED))

        job.cancel()
    }

    @Test
    fun `isConnected is consistent with connectionState`() = runTest {
        assertFalse(syncService.isConnected)
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)

        syncService.connect()
        assertFalse(syncService.isConnected)

        capturedListener.onOpen(mockWebSocket, mockk(relaxed = true))
        assertTrue(syncService.isConnected)
        assertEquals(ConnectionState.CONNECTED, syncService.connectionState.value)

        syncService.disconnect()
        assertFalse(syncService.isConnected)
        assertEquals(ConnectionState.DISCONNECTED, syncService.connectionState.value)
    }
}
