package com.enflame.happy.data.repository

import com.enflame.happy.data.api.HappyApiService
import com.enflame.happy.data.local.dao.MessageDao
import com.enflame.happy.data.local.dao.SessionDao
import com.enflame.happy.data.local.entity.MessageEntity
import com.enflame.happy.data.local.entity.SessionEntity
import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for LocalSessionRepository.
 *
 * Verifies the offline-first strategy: local Room database as
 * source of truth, with remote API for refreshing cached data.
 */
class LocalSessionRepositoryTest {

    private lateinit var sessionDao: SessionDao
    private lateinit var messageDao: MessageDao
    private lateinit var apiService: HappyApiService
    private lateinit var repository: LocalSessionRepository

    private val testSessionEntity = SessionEntity(
        id = "session-1",
        title = "Test Session",
        status = "ACTIVE",
        createdAt = 1000L,
        updatedAt = 2000L,
        machineId = "machine-1",
        machineName = "Test Machine"
    )

    private val testSession = Session(
        id = "session-1",
        title = "Test Session",
        status = SessionStatus.ACTIVE,
        createdAt = 1000L,
        updatedAt = 2000L,
        machineId = "machine-1",
        machineName = "Test Machine"
    )

    private val testMessage = Message(
        id = "msg-1",
        sessionId = "session-1",
        role = MessageRole.USER,
        content = "Hello!",
        createdAt = 1000L,
        toolUses = null
    )

    @Before
    fun setup() {
        sessionDao = mockk(relaxed = true)
        messageDao = mockk(relaxed = true)
        apiService = mockk(relaxed = true)
        repository = LocalSessionRepository(sessionDao, messageDao, apiService)
    }

    // --- getSessions ---

    @Test
    fun `getSessions returns mapped domain objects from local dao`() = runTest {
        coEvery { sessionDao.observeAll() } returns flowOf(listOf(testSessionEntity))

        val result = repository.getSessions().first()

        assertEquals(1, result.size)
        assertEquals("session-1", result[0].id)
        assertEquals("Test Session", result[0].title)
        assertEquals(SessionStatus.ACTIVE, result[0].status)
    }

    @Test
    fun `getSessions returns empty list when no sessions cached`() = runTest {
        coEvery { sessionDao.observeAll() } returns flowOf(emptyList())

        val result = repository.getSessions().first()

        assertEquals(0, result.size)
    }

    // --- getSession ---

    @Test
    fun `getSession returns local session when available`() = runTest {
        coEvery { sessionDao.getById("session-1") } returns testSessionEntity

        val result = repository.getSession("session-1")

        assertEquals("session-1", result?.id)
        assertEquals(SessionStatus.ACTIVE, result?.status)
        // Should not call API when local cache is available
        coVerify(exactly = 0) { apiService.getSession(any()) }
    }

    @Test
    fun `getSession fetches from API when not in local cache`() = runTest {
        coEvery { sessionDao.getById("session-1") } returns null
        coEvery { apiService.getSession("session-1") } returns testSession

        val result = repository.getSession("session-1")

        assertEquals("session-1", result?.id)
        // Verify it was fetched from API
        coVerify { apiService.getSession("session-1") }
        // Verify it was cached locally
        coVerify { sessionDao.insert(any()) }
    }

    @Test
    fun `getSession returns null when not in cache and API fails`() = runTest {
        coEvery { sessionDao.getById("session-1") } returns null
        coEvery { apiService.getSession("session-1") } throws RuntimeException("Network error")

        val result = repository.getSession("session-1")

        assertNull(result)
    }

    // --- refreshSessions ---

    @Test
    fun `refreshSessions fetches from API and persists to local storage`() = runTest {
        val remoteSessions = listOf(testSession)
        coEvery { apiService.getSessions() } returns remoteSessions

        repository.refreshSessions()

        coVerify { apiService.getSessions() }
        coVerify { sessionDao.insertAll(any()) }
    }

    @Test
    fun `refreshSessions propagates API errors`() = runTest {
        coEvery { apiService.getSessions() } throws RuntimeException("Network error")

        var threwException = false
        try {
            repository.refreshSessions()
        } catch (e: RuntimeException) {
            threwException = true
            assertEquals("Network error", e.message)
        }

        assertEquals(true, threwException)
    }

    // --- getMessages ---

    @Test
    fun `getMessages returns mapped domain objects from local dao`() = runTest {
        val messageEntity = MessageEntity(
            id = "msg-1",
            sessionId = "session-1",
            role = "USER",
            content = "Hello!",
            createdAt = 1000L,
            toolUses = null
        )
        coEvery { messageDao.observeBySessionId("session-1") } returns flowOf(listOf(messageEntity))

        val result = repository.getMessages("session-1").first()

        assertEquals(1, result.size)
        assertEquals("msg-1", result[0].id)
        assertEquals(MessageRole.USER, result[0].role)
        assertEquals("Hello!", result[0].content)
    }

    // --- saveSession ---

    @Test
    fun `saveSession inserts entity into dao`() = runTest {
        repository.saveSession(testSession)

        coVerify { sessionDao.insert(any()) }
    }

    // --- saveMessage ---

    @Test
    fun `saveMessage inserts entity into dao`() = runTest {
        repository.saveMessage(testMessage)

        coVerify { messageDao.insert(any()) }
    }

    // --- saveMessages ---

    @Test
    fun `saveMessages inserts all entities into dao`() = runTest {
        val messages = listOf(testMessage, testMessage.copy(id = "msg-2"))

        repository.saveMessages(messages)

        coVerify { messageDao.insertAll(any()) }
    }

    // --- deleteSession ---

    @Test
    fun `deleteSession removes session by id`() = runTest {
        repository.deleteSession("session-1")

        coVerify { sessionDao.deleteById("session-1") }
    }

    // --- clearCache ---

    @Test
    fun `clearCache deletes all sessions and messages`() = runTest {
        repository.clearCache()

        coVerify { sessionDao.deleteAll() }
        coVerify { messageDao.deleteAll() }
    }
}
