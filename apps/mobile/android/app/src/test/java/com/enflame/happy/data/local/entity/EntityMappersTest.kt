package com.enflame.happy.data.local.entity

import com.enflame.happy.domain.model.Message
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.Session
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.model.ToolUse
import com.enflame.happy.domain.model.ToolUseStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Unit tests for entity-to-domain and domain-to-entity mappers.
 */
class EntityMappersTest {

    // --- Session Mappers ---

    @Test
    fun `SessionEntity toDomain maps all fields correctly`() {
        val entity = SessionEntity(
            id = "session-1",
            title = "Test Session",
            status = "ACTIVE",
            createdAt = 1000L,
            updatedAt = 2000L,
            machineId = "machine-1",
            machineName = "MacBook Pro"
        )

        val domain = entity.toDomain()

        assertEquals("session-1", domain.id)
        assertEquals("Test Session", domain.title)
        assertEquals(SessionStatus.ACTIVE, domain.status)
        assertEquals(1000L, domain.createdAt)
        assertEquals(2000L, domain.updatedAt)
        assertEquals("machine-1", domain.machineId)
        assertEquals("MacBook Pro", domain.machineName)
    }

    @Test
    fun `SessionEntity toDomain handles null fields`() {
        val entity = SessionEntity(
            id = "session-2",
            title = null,
            status = "IDLE",
            createdAt = 1000L,
            updatedAt = null,
            machineId = null,
            machineName = null
        )

        val domain = entity.toDomain()

        assertEquals("session-2", domain.id)
        assertNull(domain.title)
        assertEquals(SessionStatus.IDLE, domain.status)
        assertNull(domain.updatedAt)
        assertNull(domain.machineId)
        assertNull(domain.machineName)
    }

    @Test
    fun `SessionEntity toDomain handles unknown status`() {
        val entity = SessionEntity(
            id = "session-3",
            status = "INVALID_STATUS",
            createdAt = 1000L
        )

        val domain = entity.toDomain()

        assertEquals(SessionStatus.UNKNOWN, domain.status)
    }

    @Test
    fun `Session toEntity maps all fields correctly`() {
        val domain = Session(
            id = "session-1",
            title = "Test Session",
            status = SessionStatus.ACTIVE,
            createdAt = 1000L,
            updatedAt = 2000L,
            machineId = "machine-1",
            machineName = "MacBook Pro"
        )

        val entity = domain.toEntity()

        assertEquals("session-1", entity.id)
        assertEquals("Test Session", entity.title)
        assertEquals("ACTIVE", entity.status)
        assertEquals(1000L, entity.createdAt)
        assertEquals(2000L, entity.updatedAt)
        assertEquals("machine-1", entity.machineId)
        assertEquals("MacBook Pro", entity.machineName)
    }

    @Test
    fun `Session round-trip preserves all data`() {
        val original = Session(
            id = "session-rt",
            title = "Round Trip",
            status = SessionStatus.COMPLETED,
            createdAt = 1000L,
            updatedAt = 2000L,
            machineId = "m1",
            machineName = "My Machine"
        )

        val roundTripped = original.toEntity().toDomain()

        assertEquals(original, roundTripped)
    }

    // --- Message Mappers ---

    @Test
    fun `MessageEntity toDomain maps all fields correctly`() {
        val entity = MessageEntity(
            id = "msg-1",
            sessionId = "session-1",
            role = "USER",
            content = "Hello, world!",
            createdAt = 1000L,
            toolUses = null
        )

        val domain = entity.toDomain()

        assertEquals("msg-1", domain.id)
        assertEquals("session-1", domain.sessionId)
        assertEquals(MessageRole.USER, domain.role)
        assertEquals("Hello, world!", domain.content)
        assertEquals(1000L, domain.createdAt)
        assertNull(domain.toolUses)
    }

    @Test
    fun `MessageEntity toDomain handles unknown role`() {
        val entity = MessageEntity(
            id = "msg-2",
            sessionId = "session-1",
            role = "INVALID_ROLE",
            content = "test",
            createdAt = 1000L
        )

        val domain = entity.toDomain()

        assertEquals(MessageRole.SYSTEM, domain.role)
    }

    @Test
    fun `MessageEntity toDomain deserializes tool uses`() {
        val toolUsesJson = """[{"id":"tu-1","name":"read_file","input":"/test.txt","output":"content","status":"COMPLETED"}]"""
        val entity = MessageEntity(
            id = "msg-3",
            sessionId = "session-1",
            role = "ASSISTANT",
            content = "I'll read that file.",
            createdAt = 1000L,
            toolUses = toolUsesJson
        )

        val domain = entity.toDomain()

        assertEquals(1, domain.toolUses?.size)
        val toolUse = domain.toolUses!![0]
        assertEquals("tu-1", toolUse.id)
        assertEquals("read_file", toolUse.name)
        assertEquals("/test.txt", toolUse.input)
        assertEquals("content", toolUse.output)
        assertEquals(ToolUseStatus.COMPLETED, toolUse.status)
    }

    @Test
    fun `MessageEntity toDomain handles malformed tool uses JSON`() {
        val entity = MessageEntity(
            id = "msg-4",
            sessionId = "session-1",
            role = "ASSISTANT",
            content = "test",
            createdAt = 1000L,
            toolUses = "not valid json"
        )

        val domain = entity.toDomain()

        assertNull(domain.toolUses)
    }

    @Test
    fun `Message toEntity maps all fields correctly`() {
        val toolUses = listOf(
            ToolUse(
                id = "tu-1",
                name = "write_file",
                input = "/output.txt",
                output = null,
                status = ToolUseStatus.RUNNING
            )
        )
        val domain = Message(
            id = "msg-1",
            sessionId = "session-1",
            role = MessageRole.ASSISTANT,
            content = "Writing file...",
            createdAt = 1000L,
            toolUses = toolUses
        )

        val entity = domain.toEntity()

        assertEquals("msg-1", entity.id)
        assertEquals("session-1", entity.sessionId)
        assertEquals("ASSISTANT", entity.role)
        assertEquals("Writing file...", entity.content)
        assertEquals(1000L, entity.createdAt)
        // Verify tool uses are serialized to JSON
        assert(entity.toolUses != null)
        assert(entity.toolUses!!.contains("tu-1"))
        assert(entity.toolUses!!.contains("write_file"))
    }

    @Test
    fun `Message round-trip preserves all data`() {
        val original = Message(
            id = "msg-rt",
            sessionId = "session-1",
            role = MessageRole.USER,
            content = "Round trip test",
            createdAt = 1000L,
            toolUses = listOf(
                ToolUse(
                    id = "tu-1",
                    name = "tool",
                    input = "in",
                    output = "out",
                    status = ToolUseStatus.COMPLETED
                )
            )
        )

        val roundTripped = original.toEntity().toDomain()

        assertEquals(original, roundTripped)
    }

    @Test
    fun `Message round-trip preserves null tool uses`() {
        val original = Message(
            id = "msg-null-tu",
            sessionId = "session-1",
            role = MessageRole.USER,
            content = "No tools",
            createdAt = 1000L,
            toolUses = null
        )

        val roundTripped = original.toEntity().toDomain()

        assertEquals(original, roundTripped)
    }
}
