package com.enflame.happy.ui.viewmodel

import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.repository.SessionRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SessionListViewModelTest {

    private lateinit var viewModel: SessionListViewModel
    private lateinit var mockRepository: SessionRepository

    private val testDispatcher = StandardTestDispatcher()
    private val sessionsFlow = MutableStateFlow<List<Session>>(emptyList())

    private val now = System.currentTimeMillis()

    private val testSessions = listOf(
        Session(
            id = "session-1",
            title = "Fix authentication bug",
            status = SessionStatus.ACTIVE,
            createdAt = now - 3_600_000,
            updatedAt = now - 120_000,
            machineId = "macbook-pro",
            machineName = "MacBook Pro"
        ),
        Session(
            id = "session-2",
            title = "Implement session list view",
            status = SessionStatus.COMPLETED,
            createdAt = now - 7_200_000,
            updatedAt = now - 1_800_000,
            machineId = "dev-server",
            machineName = "Dev Server"
        ),
        Session(
            id = "session-3",
            title = null,
            status = SessionStatus.DISCONNECTED,
            createdAt = now - 86_400_000,
            updatedAt = now - 3_600_000,
            machineId = "ci-runner",
            machineName = "CI Runner"
        ),
        Session(
            id = "session-4",
            title = "Review pull request #142",
            status = SessionStatus.IDLE,
            createdAt = now - 14_400_000,
            updatedAt = now - 600_000,
            machineId = "workstation",
            machineName = "Workstation"
        )
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockRepository = mockk()
        every { mockRepository.getSessions() } returns sessionsFlow
        coEvery { mockRepository.refreshSessions() } coAnswers {
            sessionsFlow.value = testSessions
        }
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): SessionListViewModel {
        return SessionListViewModel(mockRepository)
    }

    @Test
    fun `initial state is loading`() = runTest {
        viewModel = createViewModel()

        val state = viewModel.uiState.first()
        assertTrue(state.isLoading)
        assertFalse(state.hasLoaded)
        assertEquals("", state.searchQuery)
        assertEquals(SessionFilter.ALL, state.filter)
    }

    @Test
    fun `sessions are loaded from repository on init`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isLoading)
        assertTrue(state.hasLoaded)
        assertNull(state.errorMessage)
        coVerify(exactly = 1) { mockRepository.refreshSessions() }
    }

    @Test
    fun `filtered sessions returns all when filter is ALL`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(4, sessions.size)
    }

    @Test
    fun `filtered sessions returns only active when filter is ACTIVE`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(SessionFilter.ACTIVE)
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        // ACTIVE filter includes both ACTIVE and IDLE statuses
        assertEquals(2, sessions.size)
        assertTrue(sessions.all {
            it.status == SessionStatus.ACTIVE || it.status == SessionStatus.IDLE
        })
    }

    @Test
    fun `filtered sessions returns only completed when filter is COMPLETED`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(SessionFilter.COMPLETED)
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
        assertTrue(sessions.all { it.status == SessionStatus.COMPLETED })
    }

    @Test
    fun `filtered sessions returns only error when filter is ERROR`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(SessionFilter.ERROR)
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
        assertTrue(sessions.all { it.status == SessionStatus.DISCONNECTED })
    }

    @Test
    fun `search filters sessions by title`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("authentication")
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
        assertEquals("session-1", sessions[0].id)
    }

    @Test
    fun `search filters sessions by machine name`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("Dev Server")
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
        assertEquals("session-2", sessions[0].id)
    }

    @Test
    fun `search is case insensitive`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("AUTHENTICATION")
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
    }

    @Test
    fun `search and filter can be combined`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(SessionFilter.ACTIVE)
        viewModel.onSearchQueryChanged("fix")
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
        assertEquals("session-1", sessions[0].id)
    }

    @Test
    fun `empty search query shows all sessions`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("authentication")
        advanceUntilIdle()
        assertEquals(1, viewModel.filteredSessions.first().size)

        viewModel.onSearchQueryChanged("")
        advanceUntilIdle()
        assertEquals(4, viewModel.filteredSessions.first().size)
    }

    @Test
    fun `sessions are sorted by most recent activity`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        // session-1 updated 2 min ago, session-4 updated 10 min ago,
        // session-2 updated 30 min ago, session-3 updated 1 hour ago
        assertEquals("session-1", sessions[0].id)
        assertEquals("session-4", sessions[1].id)
        assertEquals("session-2", sessions[2].id)
        assertEquals("session-3", sessions[3].id)
    }

    @Test
    fun `refreshSessions sets refreshing state`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.refreshSessions()

        // During refresh, isRefreshing should be true
        val stateWhileRefreshing = viewModel.uiState.first()
        assertTrue(stateWhileRefreshing.isRefreshing)

        advanceUntilIdle()

        val stateAfterRefresh = viewModel.uiState.first()
        assertFalse(stateAfterRefresh.isRefreshing)
    }

    @Test
    fun `refreshSessions calls repository refresh`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.refreshSessions()
        advanceUntilIdle()

        // Once from init, once from explicit refresh
        coVerify(exactly = 2) { mockRepository.refreshSessions() }
    }

    @Test
    fun `error state is set when refresh fails`() = runTest {
        coEvery { mockRepository.refreshSessions() } throws RuntimeException("Network error")

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.hasLoaded)
        assertEquals("Network error", state.errorMessage)
    }

    @Test
    fun `dismissError clears error message`() = runTest {
        coEvery { mockRepository.refreshSessions() } throws RuntimeException("Network error")

        viewModel = createViewModel()
        advanceUntilIdle()
        assertTrue(viewModel.uiState.first().errorMessage != null)

        viewModel.dismissError()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `filter change updates ui state`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(SessionFilter.COMPLETED)

        assertEquals(SessionFilter.COMPLETED, viewModel.uiState.first().filter)
    }

    @Test
    fun `search query change updates ui state`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("test query")

        assertEquals("test query", viewModel.uiState.first().searchQuery)
    }

    @Test
    fun `no matching search returns empty list`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("nonexistent session title xyz")
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertTrue(sessions.isEmpty())
    }

    @Test
    fun `search by session id works`() = runTest {
        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("session-3")
        advanceUntilIdle()

        val sessions = viewModel.filteredSessions.first()
        assertEquals(1, sessions.size)
        assertEquals("session-3", sessions[0].id)
    }

    @Test
    fun `refreshSessions resets error on success`() = runTest {
        var callCount = 0
        coEvery { mockRepository.refreshSessions() } coAnswers {
            callCount++
            if (callCount == 1) {
                throw RuntimeException("Network error")
            } else {
                sessionsFlow.value = testSessions
            }
        }

        viewModel = createViewModel()
        advanceUntilIdle()
        assertTrue(viewModel.uiState.first().errorMessage != null)

        viewModel.refreshSessions()
        advanceUntilIdle()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `initial connection status is disconnected`() = runTest {
        viewModel = createViewModel()

        assertEquals(ConnectionStatus.DISCONNECTED, viewModel.uiState.first().connectionStatus)
    }
}
