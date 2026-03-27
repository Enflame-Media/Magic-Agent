package com.enflame.happy.data.acp

import com.enflame.happy.domain.model.acp.AcpContentBlock
import com.enflame.happy.domain.model.acp.AcpPlanEntryPriority
import com.enflame.happy.domain.model.acp.AcpPlanEntryStatus
import com.enflame.happy.domain.model.acp.AcpSessionUpdate
import com.enflame.happy.domain.model.acp.AcpToolCallContent
import com.enflame.happy.domain.model.acp.AcpToolCallStatus
import com.enflame.happy.domain.model.acp.AcpToolKind
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [AcpJsonParser].
 *
 * Validates that ACP session update JSON payloads are correctly parsed
 * into typed [AcpSessionUpdate] instances for all 11 update kinds.
 */
class AcpJsonParserTest {

    private lateinit var parser: AcpJsonParser

    @Before
    fun setUp() {
        val json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            encodeDefaults = true
            isLenient = true
        }
        parser = AcpJsonParser(json)
    }

    // ========================================================================
    // 1. agent_message_chunk
    // ========================================================================

    @Test
    fun `parse agent_message_chunk with text content`() {
        val jsonString = """
            {
                "sessionUpdate": "agent_message_chunk",
                "content": {
                    "type": "text",
                    "text": "Hello, world!"
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.AgentMessageChunk)
        val chunk = update as AcpSessionUpdate.AgentMessageChunk
        assertTrue(chunk.content is AcpContentBlock.Text)
        assertEquals("Hello, world!", (chunk.content as AcpContentBlock.Text).text)
    }

    @Test
    fun `parse agent_message_chunk with image content`() {
        val jsonString = """
            {
                "sessionUpdate": "agent_message_chunk",
                "content": {
                    "type": "image",
                    "data": "base64data",
                    "mimeType": "image/png"
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.AgentMessageChunk)
        val chunk = update as AcpSessionUpdate.AgentMessageChunk
        assertTrue(chunk.content is AcpContentBlock.Image)
    }

    // ========================================================================
    // 2. user_message_chunk
    // ========================================================================

    @Test
    fun `parse user_message_chunk`() {
        val jsonString = """
            {
                "sessionUpdate": "user_message_chunk",
                "content": {
                    "type": "text",
                    "text": "What is Kotlin?"
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.UserMessageChunk)
        val chunk = update as AcpSessionUpdate.UserMessageChunk
        assertEquals("What is Kotlin?", (chunk.content as AcpContentBlock.Text).text)
    }

    // ========================================================================
    // 3. agent_thought_chunk
    // ========================================================================

    @Test
    fun `parse agent_thought_chunk`() {
        val jsonString = """
            {
                "sessionUpdate": "agent_thought_chunk",
                "content": {
                    "type": "text",
                    "text": "Let me think about this..."
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.AgentThoughtChunk)
    }

    // ========================================================================
    // 4. tool_call
    // ========================================================================

    @Test
    fun `parse tool_call with full fields`() {
        val jsonString = """
            {
                "sessionUpdate": "tool_call",
                "toolCallId": "tc-123",
                "title": "Read File",
                "kind": "read",
                "status": "in_progress",
                "locations": [
                    {"path": "/src/main.kt", "line": 42}
                ]
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.ToolCallNotification)
        val tc = (update as AcpSessionUpdate.ToolCallNotification).toolCall
        assertEquals("tc-123", tc.toolCallId)
        assertEquals("Read File", tc.title)
        assertEquals(AcpToolKind.READ, tc.kind)
        assertEquals(AcpToolCallStatus.IN_PROGRESS, tc.status)
        assertNotNull(tc.locations)
        assertEquals(1, tc.locations?.size)
        assertEquals("/src/main.kt", tc.locations?.get(0)?.path)
        assertEquals(42, tc.locations?.get(0)?.line)
    }

    @Test
    fun `parse tool_call with content array`() {
        val jsonString = """
            {
                "sessionUpdate": "tool_call",
                "toolCallId": "tc-456",
                "title": "Edit File",
                "kind": "edit",
                "content": [
                    {
                        "type": "diff",
                        "path": "/src/main.kt",
                        "newText": "fun main() {}",
                        "oldText": "fun main() { println() }"
                    },
                    {
                        "type": "terminal",
                        "terminalId": "term-1"
                    }
                ]
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.ToolCallNotification)
        val tc = (update as AcpSessionUpdate.ToolCallNotification).toolCall
        assertEquals(2, tc.content?.size)
        assertTrue(tc.content?.get(0) is AcpToolCallContent.Diff)
        assertTrue(tc.content?.get(1) is AcpToolCallContent.Terminal)

        val diff = tc.content?.get(0) as AcpToolCallContent.Diff
        assertEquals("/src/main.kt", diff.path)
        assertEquals("fun main() {}", diff.newText)
    }

    // ========================================================================
    // 5. tool_call_update
    // ========================================================================

    @Test
    fun `parse tool_call_update`() {
        val jsonString = """
            {
                "sessionUpdate": "tool_call_update",
                "toolCallId": "tc-123",
                "status": "completed",
                "title": "Read File (done)"
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.ToolCallStatusUpdate)
        val tcu = (update as AcpSessionUpdate.ToolCallStatusUpdate).toolCallUpdate
        assertEquals("tc-123", tcu.toolCallId)
        assertEquals(AcpToolCallStatus.COMPLETED, tcu.status)
        assertEquals("Read File (done)", tcu.title)
    }

    // ========================================================================
    // 6. plan
    // ========================================================================

    @Test
    fun `parse plan update`() {
        val jsonString = """
            {
                "sessionUpdate": "plan",
                "entries": [
                    {
                        "content": "Analyze requirements",
                        "priority": "high",
                        "status": "completed"
                    },
                    {
                        "content": "Implement solution",
                        "priority": "medium",
                        "status": "in_progress"
                    },
                    {
                        "content": "Write tests",
                        "priority": "low",
                        "status": "pending"
                    }
                ]
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.PlanUpdate)
        val plan = (update as AcpSessionUpdate.PlanUpdate).entries
        assertEquals(3, plan.size)

        assertEquals("Analyze requirements", plan[0].content)
        assertEquals(AcpPlanEntryPriority.HIGH, plan[0].priority)
        assertEquals(AcpPlanEntryStatus.COMPLETED, plan[0].status)

        assertEquals("Implement solution", plan[1].content)
        assertEquals(AcpPlanEntryPriority.MEDIUM, plan[1].priority)
        assertEquals(AcpPlanEntryStatus.IN_PROGRESS, plan[1].status)

        assertEquals("Write tests", plan[2].content)
        assertEquals(AcpPlanEntryPriority.LOW, plan[2].priority)
        assertEquals(AcpPlanEntryStatus.PENDING, plan[2].status)
    }

    // ========================================================================
    // 7. available_commands_update
    // ========================================================================

    @Test
    fun `parse available_commands_update`() {
        val jsonString = """
            {
                "sessionUpdate": "available_commands_update",
                "availableCommands": [
                    {
                        "name": "/review",
                        "description": "Review code changes",
                        "input": {
                            "type": "unstructured",
                            "hint": "Enter file path"
                        }
                    },
                    {
                        "name": "/test",
                        "description": "Run tests"
                    }
                ]
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.AvailableCommandsUpdate)
        val commands = (update as AcpSessionUpdate.AvailableCommandsUpdate).availableCommands
        assertEquals(2, commands.size)
        assertEquals("/review", commands[0].name)
        assertNotNull(commands[0].input)
        assertEquals("Enter file path", commands[0].input?.hint)
        assertNull(commands[1].input)
    }

    // ========================================================================
    // 8. current_mode_update
    // ========================================================================

    @Test
    fun `parse current_mode_update`() {
        val jsonString = """
            {
                "sessionUpdate": "current_mode_update",
                "currentModeId": "architect"
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.CurrentModeUpdate)
        assertEquals("architect", (update as AcpSessionUpdate.CurrentModeUpdate).currentModeId)
    }

    // ========================================================================
    // 9. config_option_update
    // ========================================================================

    @Test
    fun `parse config_option_update`() {
        val jsonString = """
            {
                "sessionUpdate": "config_option_update",
                "configOptions": [
                    {
                        "type": "select",
                        "id": "model",
                        "name": "Model",
                        "description": "Select the AI model",
                        "currentValue": "claude-4",
                        "options": []
                    }
                ]
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.ConfigOptionUpdate)
        val options = (update as AcpSessionUpdate.ConfigOptionUpdate).configOptions
        assertEquals(1, options.size)
        assertEquals("model", options[0].id)
        assertEquals("claude-4", options[0].currentValue)
    }

    // ========================================================================
    // 10. session_info_update
    // ========================================================================

    @Test
    fun `parse session_info_update`() {
        val jsonString = """
            {
                "sessionUpdate": "session_info_update",
                "title": "My Project Session",
                "updatedAt": "2026-03-26T00:00:00Z"
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.SessionInfoUpdate)
        val info = update as AcpSessionUpdate.SessionInfoUpdate
        assertEquals("My Project Session", info.title)
        assertEquals("2026-03-26T00:00:00Z", info.updatedAt)
    }

    @Test
    fun `parse session_info_update with null title`() {
        val jsonString = """
            {
                "sessionUpdate": "session_info_update",
                "title": null,
                "updatedAt": null
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.SessionInfoUpdate)
        val info = update as AcpSessionUpdate.SessionInfoUpdate
        assertNull(info.title)
    }

    // ========================================================================
    // 11. usage_update
    // ========================================================================

    @Test
    fun `parse usage_update with cost`() {
        val jsonString = """
            {
                "sessionUpdate": "usage_update",
                "used": 50000,
                "size": 200000,
                "cost": {
                    "amount": 0.05,
                    "currency": "USD"
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.UsageUpdate)
        val usage = update as AcpSessionUpdate.UsageUpdate
        assertEquals(50000, usage.used)
        assertEquals(200000, usage.size)
        assertNotNull(usage.cost)
        assertEquals(0.05, usage.cost?.amount ?: 0.0, 0.001)
        assertEquals("USD", usage.cost?.currency)
    }

    @Test
    fun `parse usage_update without cost`() {
        val jsonString = """
            {
                "sessionUpdate": "usage_update",
                "used": 1000,
                "size": 100000
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.UsageUpdate)
        val usage = update as AcpSessionUpdate.UsageUpdate
        assertEquals(1000, usage.used)
        assertNull(usage.cost)
    }

    // ========================================================================
    // Unknown / Error Handling
    // ========================================================================

    @Test
    fun `parse unknown sessionUpdate kind returns Unknown`() {
        val jsonString = """
            {
                "sessionUpdate": "future_feature",
                "someData": 42
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.Unknown)
        assertEquals("future_feature", (update as AcpSessionUpdate.Unknown).kind)
    }

    @Test
    fun `parse missing sessionUpdate field returns Unknown`() {
        val jsonString = """
            {
                "someOtherField": "value"
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.Unknown)
        assertEquals("missing_sessionUpdate", (update as AcpSessionUpdate.Unknown).kind)
    }

    @Test
    fun `parse invalid JSON returns Unknown`() {
        val jsonString = "not valid json {"

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.Unknown)
        assertEquals("parse_error", (update as AcpSessionUpdate.Unknown).kind)
    }

    @Test
    fun `parse with extra unknown fields is lenient`() {
        val jsonString = """
            {
                "sessionUpdate": "current_mode_update",
                "currentModeId": "code",
                "_meta": {"schemaVersion": 1},
                "unknownField": true
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.CurrentModeUpdate)
        assertEquals("code", (update as AcpSessionUpdate.CurrentModeUpdate).currentModeId)
    }

    // ========================================================================
    // Content Block Types
    // ========================================================================

    @Test
    fun `parse resource_link content block`() {
        val jsonString = """
            {
                "sessionUpdate": "agent_message_chunk",
                "content": {
                    "type": "resource_link",
                    "name": "main.kt",
                    "uri": "file:///src/main.kt",
                    "mimeType": "text/x-kotlin",
                    "size": 1024
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.AgentMessageChunk)
        val content = (update as AcpSessionUpdate.AgentMessageChunk).content
        assertTrue(content is AcpContentBlock.ResourceLink)
        val link = content as AcpContentBlock.ResourceLink
        assertEquals("main.kt", link.name)
        assertEquals("file:///src/main.kt", link.uri)
        assertEquals(1024, link.size)
    }

    @Test
    fun `parse audio content block`() {
        val jsonString = """
            {
                "sessionUpdate": "agent_message_chunk",
                "content": {
                    "type": "audio",
                    "data": "base64audiodata",
                    "mimeType": "audio/mp3"
                }
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.AgentMessageChunk)
        val content = (update as AcpSessionUpdate.AgentMessageChunk).content
        assertTrue(content is AcpContentBlock.Audio)
    }

    // ========================================================================
    // Tool Call Content Types
    // ========================================================================

    @Test
    fun `parse tool call content with nested content block`() {
        val jsonString = """
            {
                "sessionUpdate": "tool_call",
                "toolCallId": "tc-789",
                "title": "Search",
                "content": [
                    {
                        "type": "content",
                        "content": {
                            "type": "text",
                            "text": "Found 3 results"
                        }
                    }
                ]
            }
        """.trimIndent()

        val update = parser.parseSessionUpdate(jsonString)

        assertTrue(update is AcpSessionUpdate.ToolCallNotification)
        val tc = (update as AcpSessionUpdate.ToolCallNotification).toolCall
        assertEquals(1, tc.content?.size)
        val tcContent = tc.content?.get(0)
        assertTrue(tcContent is AcpToolCallContent.Content)
        val inner = (tcContent as AcpToolCallContent.Content).content
        assertTrue(inner is AcpContentBlock.Text)
        assertEquals("Found 3 results", (inner as AcpContentBlock.Text).text)
    }
}
