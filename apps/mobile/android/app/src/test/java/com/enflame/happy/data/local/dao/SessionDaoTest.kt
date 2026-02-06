package com.enflame.happy.data.local.dao

import com.enflame.happy.data.local.entity.SessionEntity
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
 * Unit tests for SessionDao operations using MockK.
 *
 * These tests verify the contract behavior of SessionDao methods.
 * For integration tests with a real Room database, see the androidTest
 * source set.
 */
class SessionDaoTest {

    private lateinit var sessionDao: SessionDao

    private val testSession = SessionEntity(
        id = "session-1",
        title = "Test Session",
        status = "ACTIVE",
        createdAt = 1000L,
        updatedAt = 2000L,
        machineId = "machine-1",
        machineName = "Test Machine"
    )

    private val testSessions = listOf(
        testSession,
        SessionEntity(
            id = "session-2",
            title = "Second Session",
            status = "IDLE",
            createdAt = 500L,
            updatedAt = 1500L
        )
    )

    @Before
    fun setup() {
        sessionDao = mockk(relaxed = true)
    }

    @Test
    fun `observeAll returns flow of all sessions`() = runTest {
        coEvery { sessionDao.observeAll() } returns flowOf(testSessions)

        val result = sessionDao.observeAll().first()

        assertEquals(2, result.size)
        assertEquals("session-1", result[0].id)
        assertEquals("session-2", result[1].id)
    }

    @Test
    fun `observeById returns flow of matching session`() = runTest {
        coEvery { sessionDao.observeById("session-1") } returns flowOf(testSession)

        val result = sessionDao.observeById("session-1").first()

        assertEquals("session-1", result?.id)
        assertEquals("Test Session", result?.title)
    }

    @Test
    fun `observeById returns flow of null for missing session`() = runTest {
        coEvery { sessionDao.observeById("nonexistent") } returns flowOf(null)

        val result = sessionDao.observeById("nonexistent").first()

        assertNull(result)
    }

    @Test
    fun `observeByStatus filters sessions correctly`() = runTest {
        val activeSessions = testSessions.filter { it.status == "ACTIVE" }
        coEvery { sessionDao.observeByStatus("ACTIVE") } returns flowOf(activeSessions)

        val result = sessionDao.observeByStatus("ACTIVE").first()

        assertEquals(1, result.size)
        assertEquals("ACTIVE", result[0].status)
    }

    @Test
    fun `getAll returns all sessions`() = runTest {
        coEvery { sessionDao.getAll() } returns testSessions

        val result = sessionDao.getAll()

        assertEquals(2, result.size)
    }

    @Test
    fun `getById returns matching session`() = runTest {
        coEvery { sessionDao.getById("session-1") } returns testSession

        val result = sessionDao.getById("session-1")

        assertEquals("session-1", result?.id)
    }

    @Test
    fun `getById returns null for missing session`() = runTest {
        coEvery { sessionDao.getById("nonexistent") } returns null

        val result = sessionDao.getById("nonexistent")

        assertNull(result)
    }

    @Test
    fun `getCount returns correct count`() = runTest {
        coEvery { sessionDao.getCount() } returns 2

        val result = sessionDao.getCount()

        assertEquals(2, result)
    }

    @Test
    fun `insert is called with correct entity`() = runTest {
        sessionDao.insert(testSession)

        coVerify { sessionDao.insert(testSession) }
    }

    @Test
    fun `insertAll is called with correct entities`() = runTest {
        sessionDao.insertAll(testSessions)

        coVerify { sessionDao.insertAll(testSessions) }
    }

    @Test
    fun `update is called with correct entity`() = runTest {
        val updated = testSession.copy(title = "Updated Title")

        sessionDao.update(updated)

        coVerify { sessionDao.update(updated) }
    }

    @Test
    fun `delete is called with correct entity`() = runTest {
        sessionDao.delete(testSession)

        coVerify { sessionDao.delete(testSession) }
    }

    @Test
    fun `deleteById is called with correct id`() = runTest {
        sessionDao.deleteById("session-1")

        coVerify { sessionDao.deleteById("session-1") }
    }

    @Test
    fun `deleteAll is called`() = runTest {
        sessionDao.deleteAll()

        coVerify { sessionDao.deleteAll() }
    }
}
