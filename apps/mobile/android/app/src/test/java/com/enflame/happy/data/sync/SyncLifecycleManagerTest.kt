package com.enflame.happy.data.sync

import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import io.mockk.verifyOrder
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [SyncLifecycleManager].
 *
 * Uses a [TestLifecycleOwner] (manual [LifecycleRegistry]) to simulate app-level
 * lifecycle events without requiring a real Android device or emulator.
 *
 * Covers:
 * - ON_STOP triggers disconnect
 * - ON_START triggers reconnect (only if previously connected)
 * - Grace period delay before disconnect
 * - No connection leaks on background
 * - Network unavailability handling (no crash/spin-loop)
 * - Idempotent registration
 */
@OptIn(ExperimentalCoroutinesApi::class)
class SyncLifecycleManagerTest {

    private lateinit var syncLifecycleManager: SyncLifecycleManager
    private lateinit var mockSyncService: SyncService
    private lateinit var testScope: TestScope
    private lateinit var lifecycleOwner: LifecycleOwner
    private lateinit var lifecycleRegistry: LifecycleRegistry
    private lateinit var connectionStateFlow: MutableStateFlow<ConnectionState>

    @Before
    fun setUp() {
        mockSyncService = mockk(relaxed = true)
        connectionStateFlow = MutableStateFlow(ConnectionState.DISCONNECTED)
        every { mockSyncService.connectionState } returns connectionStateFlow

        testScope = TestScope(UnconfinedTestDispatcher())

        syncLifecycleManager = SyncLifecycleManager(
            syncService = mockSyncService,
            coroutineScope = testScope
        )
        // Disable grace period for deterministic testing (override in specific tests)
        syncLifecycleManager.gracePeriodMs = 0L

        // Create a test lifecycle owner with a manual lifecycle registry
        lifecycleOwner = mockk(relaxed = true)
        lifecycleRegistry = LifecycleRegistry.createUnsafe(lifecycleOwner)
        every { lifecycleOwner.lifecycle } returns lifecycleRegistry
    }

    // ========================================================================
    // Registration
    // ========================================================================

    @Test
    fun `register adds observer to lifecycle owner`() {
        syncLifecycleManager.register(lifecycleOwner)

        // Verify the observer count increased (lifecycle registry tracks observers)
        assertEquals(1, lifecycleRegistry.observerCount)
    }

    @Test
    fun `register is idempotent`() {
        syncLifecycleManager.register(lifecycleOwner)
        syncLifecycleManager.register(lifecycleOwner)

        // Should still only have one observer
        assertEquals(1, lifecycleRegistry.observerCount)
    }

    @Test
    fun `unregister removes observer from lifecycle owner`() {
        syncLifecycleManager.register(lifecycleOwner)
        syncLifecycleManager.unregister(lifecycleOwner)

        assertEquals(0, lifecycleRegistry.observerCount)
    }

    // ========================================================================
    // ON_STOP: Background Disconnect
    // ========================================================================

    @Test
    fun `onStop disconnects when WebSocket is connected`() {
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Triggers ON_STOP

        verify { mockSyncService.disconnect() }
    }

    @Test
    fun `onStop disconnects when WebSocket is connecting`() {
        connectionStateFlow.value = ConnectionState.CONNECTING

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Triggers ON_STOP

        verify { mockSyncService.disconnect() }
    }

    @Test
    fun `onStop disconnects when WebSocket is reconnecting`() {
        connectionStateFlow.value = ConnectionState.RECONNECTING

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Triggers ON_STOP

        verify { mockSyncService.disconnect() }
    }

    @Test
    fun `onStop does not disconnect when already disconnected`() {
        connectionStateFlow.value = ConnectionState.DISCONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Triggers ON_STOP

        verify(exactly = 0) { mockSyncService.disconnect() }
    }

    // ========================================================================
    // ON_START: Foreground Reconnect
    // ========================================================================

    @Test
    fun `onStart reconnects after onStop when was connected`() {
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED) // Initial foreground
        moveToState(Lifecycle.State.CREATED) // Background (ON_STOP)
        moveToState(Lifecycle.State.STARTED) // Foreground again (ON_START)

        verifyOrder {
            mockSyncService.disconnect()
            mockSyncService.connect()
        }
    }

    @Test
    fun `onStart does not reconnect if was not connected before background`() {
        connectionStateFlow.value = ConnectionState.DISCONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED) // Initial foreground
        moveToState(Lifecycle.State.CREATED) // Background (ON_STOP)
        moveToState(Lifecycle.State.STARTED) // Foreground again (ON_START)

        verify(exactly = 0) { mockSyncService.connect() }
        verify(exactly = 0) { mockSyncService.disconnect() }
    }

    @Test
    fun `onStart reconnects only once after background`() {
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background
        moveToState(Lifecycle.State.STARTED) // Foreground

        // wasConnectedBeforeBackground should be reset after reconnect
        // A second foreground event should not trigger another connect
        verify(exactly = 1) { mockSyncService.connect() }
    }

    // ========================================================================
    // Grace Period
    // ========================================================================

    @Test
    fun `onStop with grace period delays disconnect`() = runTest {
        syncLifecycleManager.gracePeriodMs = 5_000L
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background

        // Disconnect should NOT have happened yet (grace period)
        verify(exactly = 0) { mockSyncService.disconnect() }

        // Advance past grace period
        testScope.advanceTimeBy(5_001L)

        verify(exactly = 1) { mockSyncService.disconnect() }
    }

    @Test
    fun `returning within grace period cancels disconnect`() = runTest {
        syncLifecycleManager.gracePeriodMs = 5_000L
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background

        // Return to foreground before grace period expires
        testScope.advanceTimeBy(2_000L)
        moveToState(Lifecycle.State.STARTED) // Foreground

        // Advance past original grace period
        testScope.advanceTimeBy(5_000L)

        // Disconnect should never have been called
        verify(exactly = 0) { mockSyncService.disconnect() }

        // But connect should NOT be called either (disconnect was cancelled,
        // so the connection was never actually dropped)
        // However, wasConnectedBeforeBackground was set before the grace period,
        // and onStart sees it as true, so it calls connect. SyncService.connect()
        // is idempotent (returns immediately if already connected), so this is safe.
        verify(exactly = 1) { mockSyncService.connect() }
    }

    // ========================================================================
    // No Connection Leaks
    // ========================================================================

    @Test
    fun `multiple background-foreground cycles do not leak connections`() {
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)

        // Cycle 1: background -> foreground
        moveToState(Lifecycle.State.CREATED)
        moveToState(Lifecycle.State.STARTED)

        // Cycle 2: background -> foreground
        connectionStateFlow.value = ConnectionState.CONNECTED
        moveToState(Lifecycle.State.CREATED)
        moveToState(Lifecycle.State.STARTED)

        // Cycle 3: background -> foreground
        connectionStateFlow.value = ConnectionState.CONNECTED
        moveToState(Lifecycle.State.CREATED)
        moveToState(Lifecycle.State.STARTED)

        // Each cycle should have exactly one disconnect and one connect
        verify(exactly = 3) { mockSyncService.disconnect() }
        verify(exactly = 3) { mockSyncService.connect() }
    }

    // ========================================================================
    // Network Unavailability
    // ========================================================================

    @Test
    fun `onStart handles connect failure gracefully`() {
        connectionStateFlow.value = ConnectionState.CONNECTED
        // Simulate SyncService.connect() throwing unexpectedly
        every { mockSyncService.connect() } throws RuntimeException("Network unavailable")

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background
        moveToState(Lifecycle.State.STARTED) // Foreground - connect will throw

        // Should not crash - the exception is caught
        verify { mockSyncService.connect() }
    }

    @Test
    fun `onStop handles disconnect failure gracefully`() {
        connectionStateFlow.value = ConnectionState.CONNECTED
        every { mockSyncService.disconnect() } throws RuntimeException("Already disconnected")

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background - disconnect will throw

        // Should not crash
        verify { mockSyncService.disconnect() }
    }

    // ========================================================================
    // Default Grace Period
    // ========================================================================

    @Test
    fun `default grace period is 5 seconds`() {
        val freshManager = SyncLifecycleManager(
            syncService = mockSyncService,
            coroutineScope = testScope
        )

        assertEquals(SyncLifecycleManager.DEFAULT_GRACE_PERIOD_MS, freshManager.gracePeriodMs)
        assertEquals(5_000L, freshManager.gracePeriodMs)
    }

    @Test
    fun `grace period can be configured`() {
        syncLifecycleManager.gracePeriodMs = 10_000L

        assertEquals(10_000L, syncLifecycleManager.gracePeriodMs)
    }

    // ========================================================================
    // Unregister Behavior
    // ========================================================================

    @Test
    fun `unregister cancels pending disconnect job`() = runTest {
        syncLifecycleManager.gracePeriodMs = 5_000L
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background - starts grace period

        // Unregister before grace period expires
        syncLifecycleManager.unregister(lifecycleOwner)

        // Advance past grace period
        testScope.advanceTimeBy(10_000L)

        // Disconnect should never have been called (job was cancelled)
        verify(exactly = 0) { mockSyncService.disconnect() }
    }

    @Test
    fun `unregister resets wasConnectedBeforeBackground`() {
        connectionStateFlow.value = ConnectionState.CONNECTED

        syncLifecycleManager.register(lifecycleOwner)
        moveToState(Lifecycle.State.STARTED)
        moveToState(Lifecycle.State.CREATED) // Background - sets wasConnectedBeforeBackground

        syncLifecycleManager.unregister(lifecycleOwner)

        // Re-register and go to foreground - should NOT reconnect
        // because unregister reset the state
        val lifecycleOwner2 = mockk<LifecycleOwner>(relaxed = true)
        val lifecycleRegistry2 = LifecycleRegistry.createUnsafe(lifecycleOwner2)
        every { lifecycleOwner2.lifecycle } returns lifecycleRegistry2

        syncLifecycleManager.register(lifecycleOwner2)
        lifecycleRegistry2.currentState = Lifecycle.State.STARTED

        // connect should not be called (wasConnectedBeforeBackground was reset)
        verify(exactly = 0) { mockSyncService.connect() }
    }

    // ========================================================================
    // Helper Methods
    // ========================================================================

    /**
     * Move the test lifecycle to the given state.
     *
     * [LifecycleRegistry] automatically dispatches the appropriate events
     * (ON_CREATE, ON_START, ON_RESUME, ON_PAUSE, ON_STOP, ON_DESTROY)
     * based on the state transition.
     */
    private fun moveToState(state: Lifecycle.State) {
        lifecycleRegistry.currentState = state
    }
}
