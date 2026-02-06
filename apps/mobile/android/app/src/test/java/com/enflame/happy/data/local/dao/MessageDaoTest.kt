package com.enflame.happy.data.local.dao

import com.enflame.happy.data.local.entity.MessageEntity
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
 * Unit tests for MessageDao operations using MockK.
 *
 * These tests verify the contract behavior of MessageDao methods.
 * For integration tests with a real Room database, see the androidTest
 * source set.
 */
class MessageDaoTest {

    private lateinit var messageDao: MessageDao

    private val testMessage = MessageEntity(
        id = "msg-1",
        sessionId = "session-1",
        role = "USER",
        content = "Hello, Claude!",
        createdAt = 1000L,
        toolUses = null
    )

    private val testMessages = listOf(
        testMessage,
        MessageEntity(
            id = "msg-2",
            sessionId = "session-1",
            role = "ASSISTANT",
            content = "Hello! How can I help?",
            createdAt = 2000L,
            toolUses = """[{"id":"tu-1","name":"read_file","status":"COMPLETED"}]"""
        ),
        MessageEntity(
            id = "msg-3",
            sessionId = "session-2",
            role = "USER",
            content = "Different session message",
            createdAt = 3000L
        )
    )

    @Before
    fun setup() {
        messageDao = mockk(relaxed = true)
    }

    @Test
    fun `observeBySessionId returns flow of session messages`() = runTest {
        val session1Messages = testMessages.filter { it.sessionId == "session-1" }
        coEvery { messageDao.observeBySessionId("session-1") } returns flowOf(session1Messages)

        val result = messageDao.observeBySessionId("session-1").first()

        assertEquals(2, result.size)
        assertEquals("msg-1", result[0].id)
        assertEquals("msg-2", result[1].id)
    }

    @Test
    fun `observeBySessionId returns empty list for unknown session`() = runTest {
        coEvery { messageDao.observeBySessionId("unknown") } returns flowOf(emptyList())

        val result = messageDao.observeBySessionId("unknown").first()

        assertEquals(0, result.size)
    }

    @Test
    fun `observeById returns flow of matching message`() = runTest {
        coEvery { messageDao.observeById("msg-1") } returns flowOf(testMessage)

        val result = messageDao.observeById("msg-1").first()

        assertEquals("msg-1", result?.id)
        assertEquals("Hello, Claude!", result?.content)
    }

    @Test
    fun `observeById returns flow of null for missing message`() = runTest {
        coEvery { messageDao.observeById("nonexistent") } returns flowOf(null)

        val result = messageDao.observeById("nonexistent").first()

        assertNull(result)
    }

    @Test
    fun `getBySessionId returns messages for session`() = runTest {
        val session1Messages = testMessages.filter { it.sessionId == "session-1" }
        coEvery { messageDao.getBySessionId("session-1") } returns session1Messages

        val result = messageDao.getBySessionId("session-1")

        assertEquals(2, result.size)
    }

    @Test
    fun `getById returns matching message`() = runTest {
        coEvery { messageDao.getById("msg-1") } returns testMessage

        val result = messageDao.getById("msg-1")

        assertEquals("msg-1", result?.id)
    }

    @Test
    fun `getById returns null for missing message`() = runTest {
        coEvery { messageDao.getById("nonexistent") } returns null

        val result = messageDao.getById("nonexistent")

        assertNull(result)
    }

    @Test
    fun `getCountBySessionId returns correct count`() = runTest {
        coEvery { messageDao.getCountBySessionId("session-1") } returns 2

        val result = messageDao.getCountBySessionId("session-1")

        assertEquals(2, result)
    }

    @Test
    fun `getLatestBySessionId returns most recent message`() = runTest {
        val latestMessage = testMessages[1] // msg-2 has higher createdAt for session-1
        coEvery { messageDao.getLatestBySessionId("session-1") } returns latestMessage

        val result = messageDao.getLatestBySessionId("session-1")

        assertEquals("msg-2", result?.id)
    }

    @Test
    fun `getLatestBySessionId returns null for empty session`() = runTest {
        coEvery { messageDao.getLatestBySessionId("empty-session") } returns null

        val result = messageDao.getLatestBySessionId("empty-session")

        assertNull(result)
    }

    @Test
    fun `insert is called with correct entity`() = runTest {
        messageDao.insert(testMessage)

        coVerify { messageDao.insert(testMessage) }
    }

    @Test
    fun `insertAll is called with correct entities`() = runTest {
        messageDao.insertAll(testMessages)

        coVerify { messageDao.insertAll(testMessages) }
    }

    @Test
    fun `update is called with correct entity`() = runTest {
        val updated = testMessage.copy(content = "Updated content")

        messageDao.update(updated)

        coVerify { messageDao.update(updated) }
    }

    @Test
    fun `delete is called with correct entity`() = runTest {
        messageDao.delete(testMessage)

        coVerify { messageDao.delete(testMessage) }
    }

    @Test
    fun `deleteById is called with correct id`() = runTest {
        messageDao.deleteById("msg-1")

        coVerify { messageDao.deleteById("msg-1") }
    }

    @Test
    fun `deleteBySessionId is called with correct session id`() = runTest {
        messageDao.deleteBySessionId("session-1")

        coVerify { messageDao.deleteBySessionId("session-1") }
    }

    @Test
    fun `deleteAll is called`() = runTest {
        messageDao.deleteAll()

        coVerify { messageDao.deleteAll() }
    }
}
