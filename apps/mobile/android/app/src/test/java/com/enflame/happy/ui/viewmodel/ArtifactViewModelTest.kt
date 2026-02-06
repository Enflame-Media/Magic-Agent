package com.enflame.happy.ui.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.enflame.happy.domain.model.Artifact
import com.enflame.happy.domain.model.ArtifactLanguage
import com.enflame.happy.domain.model.ArtifactType
import com.enflame.happy.domain.repository.SessionRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
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
class ArtifactViewModelTest {

    private lateinit var viewModel: ArtifactViewModel
    private lateinit var mockRepository: SessionRepository
    private lateinit var savedStateHandle: SavedStateHandle

    private val testDispatcher = StandardTestDispatcher()

    private val now = System.currentTimeMillis()

    private val testArtifacts = listOf(
        Artifact(
            id = "artifact-1",
            sessionId = "session-123",
            type = ArtifactType.CODE,
            title = "AuthService",
            content = "class AuthService {\n    fun login() {}\n}",
            language = ArtifactLanguage.KOTLIN,
            filePath = "src/auth/AuthService.kt",
            createdAt = now - 3_600_000,
            updatedAt = now - 120_000,
            sizeBytes = 50
        ),
        Artifact(
            id = "artifact-2",
            sessionId = "session-123",
            type = ArtifactType.CONFIG,
            title = "Package Config",
            content = "{\n    \"name\": \"app\"\n}",
            language = ArtifactLanguage.JSON,
            filePath = "package.json",
            createdAt = now - 7_200_000,
            updatedAt = now - 1_800_000,
            sizeBytes = 30
        ),
        Artifact(
            id = "artifact-3",
            sessionId = "session-123",
            type = ArtifactType.DOCUMENT,
            title = "README",
            content = "# README\n\nThis is a test.",
            language = ArtifactLanguage.MARKDOWN,
            filePath = "README.md",
            createdAt = now - 86_400_000,
            updatedAt = now - 3_600_000,
            sizeBytes = 32
        ),
        Artifact(
            id = "artifact-4",
            sessionId = "session-123",
            type = ArtifactType.CODE,
            title = "UserRepository",
            content = "interface UserRepository {\n    suspend fun getUser(): User\n}",
            language = ArtifactLanguage.KOTLIN,
            filePath = "src/repo/UserRepository.kt",
            createdAt = now - 14_400_000,
            updatedAt = now - 600_000,
            sizeBytes = 65
        )
    )

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockRepository = mockk()
        savedStateHandle = SavedStateHandle(mapOf("sessionId" to "session-123"))
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): ArtifactViewModel {
        return ArtifactViewModel(savedStateHandle, mockRepository)
    }

    @Test
    fun `initial state is loading`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()

        val state = viewModel.uiState.first()
        assertTrue(state.isLoading)
        assertFalse(state.hasLoaded)
        assertEquals("", state.searchQuery)
        assertEquals(ArtifactTypeFilter.ALL, state.typeFilter)
    }

    @Test
    fun `artifacts are loaded on init`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertFalse(state.isLoading)
        assertTrue(state.hasLoaded)
        assertNull(state.errorMessage)
        assertEquals(4, state.totalCount)
        assertEquals(2, state.codeCount)
        assertEquals(1, state.documentCount)
        assertEquals(1, state.configCount)

        coVerify(exactly = 1) { mockRepository.getArtifacts("session-123") }
    }

    @Test
    fun `filtered artifacts returns all when filter is ALL`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(4, artifacts.size)
    }

    @Test
    fun `filtered artifacts returns only code when filter is CODE`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(ArtifactTypeFilter.CODE)
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(2, artifacts.size)
        assertTrue(artifacts.all { it.type == ArtifactType.CODE })
    }

    @Test
    fun `filtered artifacts returns only documents when filter is DOCUMENTS`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(ArtifactTypeFilter.DOCUMENTS)
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(1, artifacts.size)
        assertTrue(artifacts.all { it.type == ArtifactType.DOCUMENT })
    }

    @Test
    fun `filtered artifacts returns only config when filter is CONFIG`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(ArtifactTypeFilter.CONFIG)
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(1, artifacts.size)
        assertTrue(artifacts.all { it.type == ArtifactType.CONFIG })
    }

    @Test
    fun `search filters artifacts by title`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("AuthService")
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(1, artifacts.size)
        assertEquals("artifact-1", artifacts[0].id)
    }

    @Test
    fun `search filters artifacts by file path`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("package.json")
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(1, artifacts.size)
        assertEquals("artifact-2", artifacts[0].id)
    }

    @Test
    fun `search is case insensitive`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("AUTHSERVICE")
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(1, artifacts.size)
    }

    @Test
    fun `search and filter can be combined`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(ArtifactTypeFilter.CODE)
        viewModel.onSearchQueryChanged("user")
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(1, artifacts.size)
        assertEquals("artifact-4", artifacts[0].id)
    }

    @Test
    fun `empty search query shows all artifacts`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("AuthService")
        advanceUntilIdle()
        assertEquals(1, viewModel.filteredArtifacts.first().size)

        viewModel.onSearchQueryChanged("")
        advanceUntilIdle()
        assertEquals(4, viewModel.filteredArtifacts.first().size)
    }

    @Test
    fun `artifacts are sorted by most recent activity`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        // artifact-1 updated 2 min ago, artifact-4 updated 10 min ago,
        // artifact-2 updated 30 min ago, artifact-3 updated 1 hour ago
        assertEquals("artifact-1", artifacts[0].id)
        assertEquals("artifact-4", artifacts[1].id)
        assertEquals("artifact-2", artifacts[2].id)
        assertEquals("artifact-3", artifacts[3].id)
    }

    @Test
    fun `error state is set when loading fails`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } throws RuntimeException("Network error")

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertTrue(state.hasLoaded)
        assertEquals("Network error", state.errorMessage)
    }

    @Test
    fun `dismissError clears error message`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } throws RuntimeException("Network error")

        viewModel = createViewModel()
        advanceUntilIdle()
        assertNotNull(viewModel.uiState.first().errorMessage)

        viewModel.dismissError()

        assertNull(viewModel.uiState.first().errorMessage)
    }

    @Test
    fun `filter change updates ui state`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onFilterChanged(ArtifactTypeFilter.CODE)

        assertEquals(ArtifactTypeFilter.CODE, viewModel.uiState.first().typeFilter)
    }

    @Test
    fun `search query change updates ui state`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("test query")

        assertEquals("test query", viewModel.uiState.first().searchQuery)
    }

    @Test
    fun `no matching search returns empty list`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("nonexistent artifact xyz")
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertTrue(artifacts.isEmpty())
    }

    @Test
    fun `findArtifact returns artifact by id`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        val artifact = viewModel.findArtifact("artifact-2")
        assertNotNull(artifact)
        assertEquals("Package Config", artifact!!.title)
    }

    @Test
    fun `findArtifact returns null for unknown id`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        val artifact = viewModel.findArtifact("nonexistent-id")
        assertNull(artifact)
    }

    @Test
    fun `refreshArtifacts reloads data`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.refreshArtifacts()
        advanceUntilIdle()

        // Called twice: once from init, once from refresh
        coVerify(exactly = 2) { mockRepository.getArtifacts("session-123") }
    }

    @Test
    fun `search filters by language display name`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        viewModel.onSearchQueryChanged("kotlin")
        advanceUntilIdle()

        val artifacts = viewModel.filteredArtifacts.first()
        assertEquals(2, artifacts.size)
        assertTrue(artifacts.all { it.language == ArtifactLanguage.KOTLIN })
    }

    @Test
    fun `sessionId is extracted from SavedStateHandle`() = runTest {
        coEvery { mockRepository.getArtifacts("session-123") } returns testArtifacts

        viewModel = createViewModel()

        assertEquals("session-123", viewModel.sessionId)
    }

    @Test
    fun `counts reflect loaded artifact types`() = runTest {
        val singleTypeArtifacts = listOf(
            Artifact(
                id = "a1",
                sessionId = "session-123",
                type = ArtifactType.CODE,
                title = "File1",
                content = "code",
                createdAt = now
            ),
            Artifact(
                id = "a2",
                sessionId = "session-123",
                type = ArtifactType.CODE,
                title = "File2",
                content = "code",
                createdAt = now
            ),
            Artifact(
                id = "a3",
                sessionId = "session-123",
                type = ArtifactType.CODE,
                title = "File3",
                content = "code",
                createdAt = now
            )
        )
        coEvery { mockRepository.getArtifacts("session-123") } returns singleTypeArtifacts

        viewModel = createViewModel()
        advanceUntilIdle()

        val state = viewModel.uiState.first()
        assertEquals(3, state.totalCount)
        assertEquals(3, state.codeCount)
        assertEquals(0, state.documentCount)
        assertEquals(0, state.configCount)
    }
}
