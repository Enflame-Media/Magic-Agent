package com.enflame.happy.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.repository.LocalSessionRepository
import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.repository.SessionRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SessionDetailViewModelTest {

    private lateinit var viewModel: SessionDetailViewModel
    private lateinit var mockSessionRepository: SessionRepository
    private lateinit var mockLocalSessionRepository: LocalSessionRepository
    private lateinit var mockEncryptionService: EncryptionService

    private val testDispatcher = StandardTestDispatcher()

    private val testSessionId = "session-123"

    private val testSession = Session(
        id = testSessionId,
        title = "Test Session",
        status = SessionStatus.ACTIVE,
        createdAt = 1706800000000L,
        updatedAt = 1706803600000L,
        machineId = "machine-1",
        machineName = "Test Machine"
    )

    private val testMessages = listOf(
        Message(
            id = "msg-1",
            sessionId = testSessionId,
            role = MessageRole.USER,
            content = "Hello",
            createdAt = 1706800100000L
        ),
        Message(
            id = "msg-2",
            sessionId = testSessionId,
            role = MessageRole.ASSISTANT,
            content = "Hi! How can I help?",
            createdAt = 1706800200000L
        )
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockSessionRepository = mockk(relaxed = true)
        mockLocalSessionRepository = mockk(relaxed = true)
        mockEncryptionService = mockk(relaxed = true)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): SessionDetailViewModel {
        val savedStateHandle = SavedStateHandle(mapOf("sessionId" to testSessionId))
        return SessionDetailViewModel(
            savedStateHandle = savedStateHandle,
            sessionRepository = mockSessionRepository,
            localSessionRepository = mockLocalSessionRepository,
            encryptionService = mockEncryptionService
        )
    }

    @Test
    fun `initial state has isLoading true`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()

        // Before advancing, the initial state should show loading
        val state = viewModel.uiState.value
        assertTrue(state.isLoading)
    }

    @Test
    fun `loads session successfully on init`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertNotNull(state.session)
        assertEquals(testSessionId, state.session?.id)
        assertEquals("Test Session", state.session?.title)
        assertFalse(state.isLoading)
        assertTrue(state.hasLoaded)
        assertNull(state.errorMessage)
    }

    @Test
    fun `loads messages from local repository`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(testMessages)

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(2, state.messages.size)
        assertEquals("msg-1", state.messages[0].id)
        assertEquals("msg-2", state.messages[1].id)
    }

    @Test
    fun `sets error state when session not found`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns null
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertNull(state.session)
        assertTrue(state.hasLoaded)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("not found"))
    }

    @Test
    fun `sets error state when session load fails`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } throws RuntimeException("Network error")
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isLoading)
        assertTrue(state.hasLoaded)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("Network error"))
    }

    @Test
    fun `subscribeToUpdates calls repository`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.subscribeToUpdates()
        advanceUntilIdle()

        coVerify(exactly = 1) { mockSessionRepository.subscribeToSession(testSessionId) }
    }

    @Test
    fun `unsubscribeFromUpdates calls repository`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.unsubscribeFromUpdates()
        advanceUntilIdle()

        coVerify(exactly = 1) { mockSessionRepository.unsubscribeFromSession(testSessionId) }
    }

    @Test
    fun `refresh reloads session data`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        val updatedSession = testSession.copy(title = "Updated Title")
        coEvery { mockSessionRepository.getSession(testSessionId) } returns updatedSession

        viewModel.refresh()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals("Updated Title", state.session?.title)
        assertFalse(state.isRefreshing)
    }

    @Test
    fun `refresh handles error gracefully`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        coEvery { mockSessionRepository.getSession(testSessionId) } throws RuntimeException("Refresh failed")

        viewModel.refresh()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isRefreshing)
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("Refresh failed"))
    }

    @Test
    fun `refresh is ignored when already refreshing`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        coEvery { mockSessionRepository.getSession(testSessionId) } coAnswers {
            kotlinx.coroutines.delay(1000)
            testSession
        }

        viewModel.refresh()
        viewModel.refresh() // Second call should be ignored
        advanceUntilIdle()

        // getSession is called once on init, then once for the single refresh
        coVerify(exactly = 2) { mockSessionRepository.getSession(testSessionId) }
    }

    @Test
    fun `deleteSession calls repository and invokes callback`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())
        coEvery { mockLocalSessionRepository.deleteSession(testSessionId) } returns Unit

        viewModel = createViewModel()
        advanceUntilIdle()

        var successCalled = false
        viewModel.deleteSession { successCalled = true }
        advanceUntilIdle()

        assertTrue(successCalled)
        coVerify(exactly = 1) { mockLocalSessionRepository.deleteSession(testSessionId) }
    }

    @Test
    fun `deleteSession handles error`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())
        coEvery { mockLocalSessionRepository.deleteSession(testSessionId) } throws RuntimeException("Delete failed")

        viewModel = createViewModel()
        advanceUntilIdle()

        var successCalled = false
        viewModel.deleteSession { successCalled = true }
        advanceUntilIdle()

        assertFalse(successCalled)
        val state = viewModel.uiState.first()
        assertNotNull(state.errorMessage)
        assertTrue(state.errorMessage!!.contains("Delete failed"))
    }

    @Test
    fun `dismissError clears error message`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } throws RuntimeException("Error")
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        assertNotNull(viewModel.uiState.first().errorMessage)

        viewModel.dismissError()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `sessionId is extracted from SavedStateHandle`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()

        assertEquals(testSessionId, viewModel.sessionId)
    }

    @Test(expected = IllegalStateException::class)
    fun `throws when sessionId is missing from SavedStateHandle`() {
        val emptyHandle = SavedStateHandle()
        SessionDetailViewModel(
            savedStateHandle = emptyHandle,
            sessionRepository = mockSessionRepository,
            localSessionRepository = mockLocalSessionRepository,
            encryptionService = mockEncryptionService
        )
    }

    @Test
    fun `messages are observed reactively`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession

        val messagesFlow = kotlinx.coroutines.flow.MutableStateFlow<List<Message>>(emptyList())
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns messagesFlow

        viewModel = createViewModel()
        advanceUntilIdle()

        assertEquals(0, viewModel.uiState.first().messages.size)

        // Simulate new messages arriving via WebSocket sync
        messagesFlow.value = testMessages
        advanceUntilIdle()

        assertEquals(2, viewModel.uiState.first().messages.size)

        // Simulate another message arriving
        val newMessage = Message(
            id = "msg-3",
            sessionId = testSessionId,
            role = MessageRole.ASSISTANT,
            content = "Here are the changes.",
            createdAt = 1706800300000L
        )
        messagesFlow.value = testMessages + newMessage
        advanceUntilIdle()

        assertEquals(3, viewModel.uiState.first().messages.size)
        assertEquals("msg-3", viewModel.uiState.first().messages.last().id)
    }

    @Test
    fun `empty messages state with active session`() = runTest {
        val activeSession = testSession.copy(status = SessionStatus.ACTIVE)
        coEvery { mockSessionRepository.getSession(testSessionId) } returns activeSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(SessionStatus.ACTIVE, state.session?.status)
        assertTrue(state.messages.isEmpty())
        assertTrue(state.hasLoaded)
    }

    @Test
    fun `subscribe error does not crash`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())
        coEvery { mockSessionRepository.subscribeToSession(testSessionId) } throws RuntimeException("WebSocket error")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.subscribeToUpdates()
        advanceUntilIdle()

        // Should not crash, error is logged
        coVerify(exactly = 1) { mockSessionRepository.subscribeToSession(testSessionId) }
    }

    @Test
    fun `unsubscribe error does not crash`() = runTest {
        coEvery { mockSessionRepository.getSession(testSessionId) } returns testSession
        every { mockLocalSessionRepository.getMessages(testSessionId) } returns flowOf(emptyList())
        coEvery { mockSessionRepository.unsubscribeFromSession(testSessionId) } throws RuntimeException("WebSocket error")

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.unsubscribeFromUpdates()
        advanceUntilIdle()

        // Should not crash, error is logged
        coVerify(exactly = 1) { mockSessionRepository.unsubscribeFromSession(testSessionId) }
    }
}
