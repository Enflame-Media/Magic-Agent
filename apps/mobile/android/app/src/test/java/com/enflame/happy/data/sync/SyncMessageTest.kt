package com.enflame.happy.data.sync

import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.SessionStatus
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for sync message parsing.
 *
 * Validates that incoming JSON messages from the server are correctly deserialized
 * into [SyncUpdateEnvelope] instances with the expected types and payload fields.
 */
class SyncMessageTest {

    private lateinit var json: Json

    @Before
    fun setUp() {
        json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            encodeDefaults = true
            isLenient = true
        }
    }

    // ========================================================================
    // SyncUpdateEnvelope Parsing
    // ========================================================================

    @Test
    fun `parse session update envelope`() {
        val jsonString = """
            {
                "type": "session",
                "session": {
                    "id": "sess-123",
                    "title": "Test Session",
                    "status": "ACTIVE",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent()

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.SESSION, envelope.type)
        assertNotNull(envelope.session)
        assertEquals("sess-123", envelope.session!!.id)
        assertEquals("Test Session", envelope.session!!.title)
        assertEquals(SessionStatus.ACTIVE, envelope.session!!.status)
    }

    @Test
    fun `parse message update envelope`() {
        val jsonString = """
            {
                "type": "message",
                "message": {
                    "id": "msg-456",
                    "sessionId": "sess-123",
                    "role": "ASSISTANT",
                    "content": "Hello, world!",
                    "createdAt": 1700000001
                }
            }
        """.trimIndent()

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.MESSAGE, envelope.type)
        assertNotNull(envelope.message)
        assertEquals("msg-456", envelope.message!!.id)
        assertEquals("sess-123", envelope.message!!.sessionId)
        assertEquals(MessageRole.ASSISTANT, envelope.message!!.role)
        assertEquals("Hello, world!", envelope.message!!.content)
    }

    @Test
    fun `parse ping envelope`() {
        val jsonString = """{"type": "ping"}"""

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.PING, envelope.type)
        assertNull(envelope.session)
        assertNull(envelope.message)
    }

    @Test
    fun `parse pong envelope`() {
        val jsonString = """{"type": "pong"}"""

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.PONG, envelope.type)
    }

    @Test
    fun `parse subscribe envelope`() {
        val jsonString = """{"type": "subscribe", "sessionId": "sess-999"}"""

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.SUBSCRIBE, envelope.type)
        assertEquals("sess-999", envelope.sessionId)
    }

    @Test
    fun `parse unsubscribe envelope`() {
        val jsonString = """{"type": "unsubscribe", "sessionId": "sess-999"}"""

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.UNSUBSCRIBE, envelope.type)
        assertEquals("sess-999", envelope.sessionId)
    }

    @Test
    fun `parse session-revival-paused envelope`() {
        val jsonString = """
            {
                "type": "session-revival-paused",
                "reason": "Circuit breaker cooldown active",
                "remainingMs": 15000,
                "resumesAt": 1700001500000,
                "machineId": "machine-abc"
            }
        """.trimIndent()

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.SESSION_REVIVAL_PAUSED, envelope.type)
        assertEquals("Circuit breaker cooldown active", envelope.reason)
        assertEquals(15000, envelope.remainingMs)
        assertEquals(1700001500000L, envelope.resumesAt)
        assertEquals("machine-abc", envelope.machineId)
    }

    @Test
    fun `parse session-revived envelope`() {
        val jsonString = """
            {
                "type": "session-revived",
                "originalSessionId": "old-sess-123",
                "newSessionId": "new-sess-456",
                "machineId": "machine-abc"
            }
        """.trimIndent()

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.SESSION_REVIVED, envelope.type)
        assertEquals("old-sess-123", envelope.originalSessionId)
        assertEquals("new-sess-456", envelope.newSessionId)
        assertEquals("machine-abc", envelope.machineId)
    }

    @Test
    fun `parse envelope with unknown fields is lenient`() {
        val jsonString = """
            {
                "type": "ping",
                "unknownField": "should be ignored",
                "anotherUnknown": 42
            }
        """.trimIndent()

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.PING, envelope.type)
    }

    @Test
    fun `parse session envelope with null optional fields`() {
        val jsonString = """
            {
                "type": "session",
                "session": {
                    "id": "sess-minimal",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent()

        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)

        assertEquals(SyncMessageType.SESSION, envelope.type)
        assertNotNull(envelope.session)
        assertEquals("sess-minimal", envelope.session!!.id)
        assertNull(envelope.session!!.title)
        assertNull(envelope.session!!.machineId)
    }

    // ========================================================================
    // SyncOutgoingMessage Serialization
    // ========================================================================

    @Test
    fun `serialize subscribe outgoing message`() {
        val message = SyncOutgoingMessage(
            type = SyncMessageType.SUBSCRIBE,
            sessionId = "sess-123"
        )

        val serialized = json.encodeToString(SyncOutgoingMessage.serializer(), message)

        // Verify the JSON contains the expected fields
        val parsed = json.decodeFromString<SyncOutgoingMessage>(serialized)
        assertEquals(SyncMessageType.SUBSCRIBE, parsed.type)
        assertEquals("sess-123", parsed.sessionId)
    }

    @Test
    fun `serialize unsubscribe outgoing message`() {
        val message = SyncOutgoingMessage(
            type = SyncMessageType.UNSUBSCRIBE,
            sessionId = "sess-456"
        )

        val serialized = json.encodeToString(SyncOutgoingMessage.serializer(), message)

        val parsed = json.decodeFromString<SyncOutgoingMessage>(serialized)
        assertEquals(SyncMessageType.UNSUBSCRIBE, parsed.type)
        assertEquals("sess-456", parsed.sessionId)
    }

    @Test
    fun `serialize pong outgoing message`() {
        val message = SyncOutgoingMessage(type = SyncMessageType.PONG)

        val serialized = json.encodeToString(SyncOutgoingMessage.serializer(), message)

        val parsed = json.decodeFromString<SyncOutgoingMessage>(serialized)
        assertEquals(SyncMessageType.PONG, parsed.type)
        assertNull(parsed.sessionId)
    }

    @Test
    fun `serialize ping outgoing message`() {
        val message = SyncOutgoingMessage(type = SyncMessageType.PING)

        val serialized = json.encodeToString(SyncOutgoingMessage.serializer(), message)

        val parsed = json.decodeFromString<SyncOutgoingMessage>(serialized)
        assertEquals(SyncMessageType.PING, parsed.type)
    }

    // ========================================================================
    // SyncMessageType Serialization Values
    // ========================================================================

    @Test
    fun `SyncMessageType subscribe serializes to lowercase`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.SUBSCRIBE)
        assertEquals("\"subscribe\"", encoded)
    }

    @Test
    fun `SyncMessageType unsubscribe serializes to lowercase`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.UNSUBSCRIBE)
        assertEquals("\"unsubscribe\"", encoded)
    }

    @Test
    fun `SyncMessageType ping serializes to lowercase`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.PING)
        assertEquals("\"ping\"", encoded)
    }

    @Test
    fun `SyncMessageType pong serializes to lowercase`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.PONG)
        assertEquals("\"pong\"", encoded)
    }

    @Test
    fun `SyncMessageType session serializes to lowercase`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.SESSION)
        assertEquals("\"session\"", encoded)
    }

    @Test
    fun `SyncMessageType message serializes to lowercase`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.MESSAGE)
        assertEquals("\"message\"", encoded)
    }

    @Test
    fun `SyncMessageType session-revival-paused serializes with hyphen`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.SESSION_REVIVAL_PAUSED)
        assertEquals("\"session-revival-paused\"", encoded)
    }

    @Test
    fun `SyncMessageType session-revived serializes with hyphen`() {
        val encoded = json.encodeToString(SyncMessageType.serializer(), SyncMessageType.SESSION_REVIVED)
        assertEquals("\"session-revived\"", encoded)
    }

    // ========================================================================
    // SyncMessage Sealed Class
    // ========================================================================

    @Test
    fun `SyncMessage SessionUpdate holds session data`() {
        val session = com.enflame.happy.domain.model.Session(
            id = "sess-1",
            title = "Test",
            createdAt = 1700000000
        )
        val msg = SyncMessage.SessionUpdate(session)

        assertEquals("sess-1", msg.session.id)
        assertEquals("Test", msg.session.title)
    }

    @Test
    fun `SyncMessage MessageUpdate holds message data`() {
        val message = com.enflame.happy.domain.model.Message(
            id = "msg-1",
            sessionId = "sess-1",
            role = MessageRole.USER,
            content = "Hello",
            createdAt = 1700000000
        )
        val msg = SyncMessage.MessageUpdate(message)

        assertEquals("msg-1", msg.message.id)
        assertEquals(MessageRole.USER, msg.message.role)
    }

    @Test
    fun `SyncMessage SessionRevivalPaused holds event data`() {
        val msg = SyncMessage.SessionRevivalPaused(
            reason = "cooldown",
            remainingMs = 5000,
            resumesAt = 1700000000000L,
            machineId = "m-1"
        )

        assertEquals("cooldown", msg.reason)
        assertEquals(5000, msg.remainingMs)
        assertEquals(1700000000000L, msg.resumesAt)
        assertEquals("m-1", msg.machineId)
    }

    @Test
    fun `SyncMessage SessionRevived holds event data`() {
        val msg = SyncMessage.SessionRevived(
            originalSessionId = "old",
            newSessionId = "new",
            machineId = "m-1"
        )

        assertEquals("old", msg.originalSessionId)
        assertEquals("new", msg.newSessionId)
        assertEquals("m-1", msg.machineId)
    }
}
