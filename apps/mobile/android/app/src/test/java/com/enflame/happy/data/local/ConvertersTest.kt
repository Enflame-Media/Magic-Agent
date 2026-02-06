package com.enflame.happy.data.local

import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.model.ToolUse
import com.enflame.happy.domain.model.ToolUseStatus
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for Room type converters.
 */
class ConvertersTest {

    private lateinit var converters: Converters

    @Before
    fun setup() {
        converters = Converters()
    }

    // --- SessionStatus ---

    @Test
    fun `fromSessionStatus converts all statuses to name strings`() {
        SessionStatus.entries.forEach { status ->
            assertEquals(status.name, converters.fromSessionStatus(status))
        }
    }

    @Test
    fun `toSessionStatus converts valid names back to enums`() {
        SessionStatus.entries.forEach { status ->
            assertEquals(status, converters.toSessionStatus(status.name))
        }
    }

    @Test
    fun `toSessionStatus returns UNKNOWN for invalid value`() {
        assertEquals(SessionStatus.UNKNOWN, converters.toSessionStatus("INVALID"))
        assertEquals(SessionStatus.UNKNOWN, converters.toSessionStatus(""))
    }

    // --- MessageRole ---

    @Test
    fun `fromMessageRole converts all roles to name strings`() {
        MessageRole.entries.forEach { role ->
            assertEquals(role.name, converters.fromMessageRole(role))
        }
    }

    @Test
    fun `toMessageRole converts valid names back to enums`() {
        MessageRole.entries.forEach { role ->
            assertEquals(role, converters.toMessageRole(role.name))
        }
    }

    @Test
    fun `toMessageRole returns SYSTEM for invalid value`() {
        assertEquals(MessageRole.SYSTEM, converters.toMessageRole("INVALID"))
        assertEquals(MessageRole.SYSTEM, converters.toMessageRole(""))
    }

    // --- List<ToolUse> ---

    @Test
    fun `fromToolUseList serializes list to JSON`() {
        val toolUses = listOf(
            ToolUse(
                id = "tu-1",
                name = "read_file",
                input = "/test.txt",
                output = "file contents",
                status = ToolUseStatus.COMPLETED
            )
        )

        val json = converters.fromToolUseList(toolUses)

        assert(json != null)
        assert(json!!.contains("tu-1"))
        assert(json.contains("read_file"))
        assert(json.contains("COMPLETED"))
    }

    @Test
    fun `fromToolUseList returns null for null input`() {
        assertNull(converters.fromToolUseList(null))
    }

    @Test
    fun `toToolUseList deserializes JSON to list`() {
        val json = """[{"id":"tu-1","name":"read_file","input":"/test.txt","output":"contents","status":"COMPLETED"}]"""

        val result = converters.toToolUseList(json)

        assertEquals(1, result?.size)
        assertEquals("tu-1", result!![0].id)
        assertEquals("read_file", result[0].name)
        assertEquals(ToolUseStatus.COMPLETED, result[0].status)
    }

    @Test
    fun `toToolUseList returns null for null input`() {
        assertNull(converters.toToolUseList(null))
    }

    @Test
    fun `toToolUseList returns null for invalid JSON`() {
        assertNull(converters.toToolUseList("not valid json"))
    }

    @Test
    fun `ToolUse list round-trip preserves data`() {
        val original = listOf(
            ToolUse("tu-1", "tool_a", "input1", "output1", ToolUseStatus.COMPLETED),
            ToolUse("tu-2", "tool_b", null, null, ToolUseStatus.PENDING)
        )

        val json = converters.fromToolUseList(original)
        val restored = converters.toToolUseList(json)

        assertEquals(original, restored)
    }

    @Test
    fun `fromToolUseList handles empty list`() {
        val json = converters.fromToolUseList(emptyList())
        assert(json != null)

        val restored = converters.toToolUseList(json)
        assertEquals(emptyList<ToolUse>(), restored)
    }
}
