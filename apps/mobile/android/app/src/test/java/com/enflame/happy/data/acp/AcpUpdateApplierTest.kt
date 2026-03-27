package com.enflame.happy.data.acp

import com.enflame.happy.domain.model.acp.AcpAvailableCommand
import com.enflame.happy.domain.model.acp.AcpConfigOption
import com.enflame.happy.domain.model.acp.AcpContentBlock
import com.enflame.happy.domain.model.acp.AcpCost
import com.enflame.happy.domain.model.acp.AcpPermissionOptionKind
import com.enflame.happy.domain.model.acp.AcpPermissionOutcome
import com.enflame.happy.domain.model.acp.AcpPermissionRequestState
import com.enflame.happy.domain.model.acp.AcpPermissionRequestStatus
import com.enflame.happy.domain.model.acp.AcpPermissionToolInfo
import com.enflame.happy.domain.model.acp.AcpPlanEntry
import com.enflame.happy.domain.model.acp.AcpPlanEntryPriority
import com.enflame.happy.domain.model.acp.AcpPlanEntryStatus
import com.enflame.happy.domain.model.acp.AcpSessionState
import com.enflame.happy.domain.model.acp.AcpSessionUpdate
import com.enflame.happy.domain.model.acp.AcpToolCall
import com.enflame.happy.domain.model.acp.AcpToolCallStatus
import com.enflame.happy.domain.model.acp.AcpToolCallUpdate
import com.enflame.happy.domain.model.acp.AcpToolKind
import com.enflame.happy.domain.model.acp.AcpPermissionOption
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [AcpUpdateApplier].
 *
 * Tests all 11 ACP session update kinds plus permission management
 * and unknown update handling.
 */
class AcpUpdateApplierTest {

    private lateinit var initialState: AcpSessionState

    @Before
    fun setUp() {
        initialState = AcpSessionState()
    }

    // ========================================================================
    // 1. agent_message_chunk
    // ========================================================================

    @Test
    fun `apply AgentMessageChunk appends text to agentMessage`() {
        val update = AcpSessionUpdate.AgentMessageChunk(
            content = AcpContentBlock.Text(text = "Hello "),
        )

        val state1 = AcpUpdateApplier.apply(initialState, update)
        assertEquals("Hello ", state1.agentMessage)

        val update2 = AcpSessionUpdate.AgentMessageChunk(
            content = AcpContentBlock.Text(text = "world!"),
        )
        val state2 = AcpUpdateApplier.apply(state1, update2)
        assertEquals("Hello world!", state2.agentMessage)
    }

    @Test
    fun `apply AgentMessageChunk with non-text block appends empty string`() {
        val update = AcpSessionUpdate.AgentMessageChunk(
            content = AcpContentBlock.Image(data = "base64data", mimeType = "image/png"),
        )

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals("", state.agentMessage)
    }

    // ========================================================================
    // 2. user_message_chunk
    // ========================================================================

    @Test
    fun `apply UserMessageChunk appends text to userMessage`() {
        val update = AcpSessionUpdate.UserMessageChunk(
            content = AcpContentBlock.Text(text = "What is Kotlin?"),
        )

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals("What is Kotlin?", state.userMessage)
    }

    // ========================================================================
    // 3. agent_thought_chunk
    // ========================================================================

    @Test
    fun `apply AgentThoughtChunk appends text to agentThought`() {
        val update = AcpSessionUpdate.AgentThoughtChunk(
            content = AcpContentBlock.Text(text = "Let me think..."),
        )

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals("Let me think...", state.agentThought)
    }

    // ========================================================================
    // 4. tool_call
    // ========================================================================

    @Test
    fun `apply ToolCallNotification adds new tool call`() {
        val toolCall = AcpToolCall(
            toolCallId = "tc-1",
            title = "Read File",
            kind = AcpToolKind.READ,
            status = AcpToolCallStatus.IN_PROGRESS,
        )
        val update = AcpSessionUpdate.ToolCallNotification(toolCall = toolCall)

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals(1, state.toolCalls.size)
        assertEquals("Read File", state.toolCalls["tc-1"]?.title)
        assertEquals(AcpToolKind.READ, state.toolCalls["tc-1"]?.kind)
    }

    // ========================================================================
    // 5. tool_call_update
    // ========================================================================

    @Test
    fun `apply ToolCallStatusUpdate merges into existing tool call`() {
        // First, add a tool call
        val toolCall = AcpToolCall(
            toolCallId = "tc-1",
            title = "Read File",
            kind = AcpToolKind.READ,
            status = AcpToolCallStatus.IN_PROGRESS,
        )
        val state1 = AcpUpdateApplier.apply(
            initialState,
            AcpSessionUpdate.ToolCallNotification(toolCall = toolCall),
        )

        // Now update it
        val tcUpdate = AcpToolCallUpdate(
            toolCallId = "tc-1",
            status = AcpToolCallStatus.COMPLETED,
        )
        val update = AcpSessionUpdate.ToolCallStatusUpdate(toolCallUpdate = tcUpdate)
        val state2 = AcpUpdateApplier.apply(state1, update)

        val merged = state2.toolCalls["tc-1"]
        assertNotNull(merged)
        assertEquals("Read File", merged?.title) // preserved from original
        assertEquals(AcpToolKind.READ, merged?.kind) // preserved from original
        assertEquals(AcpToolCallStatus.COMPLETED, merged?.status) // updated
    }

    @Test
    fun `apply ToolCallStatusUpdate creates minimal entry for unknown tool call`() {
        val tcUpdate = AcpToolCallUpdate(
            toolCallId = "tc-unknown",
            title = "New Tool",
            status = AcpToolCallStatus.PENDING,
        )
        val update = AcpSessionUpdate.ToolCallStatusUpdate(toolCallUpdate = tcUpdate)

        val state = AcpUpdateApplier.apply(initialState, update)
        val created = state.toolCalls["tc-unknown"]
        assertNotNull(created)
        assertEquals("New Tool", created?.title)
        assertEquals(AcpToolCallStatus.PENDING, created?.status)
    }

    @Test
    fun `apply ToolCallStatusUpdate for unknown call uses Unknown Tool as default title`() {
        val tcUpdate = AcpToolCallUpdate(
            toolCallId = "tc-no-title",
            status = AcpToolCallStatus.FAILED,
        )
        val update = AcpSessionUpdate.ToolCallStatusUpdate(toolCallUpdate = tcUpdate)

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals("Unknown Tool", state.toolCalls["tc-no-title"]?.title)
    }

    // ========================================================================
    // 6. plan
    // ========================================================================

    @Test
    fun `apply PlanUpdate replaces entire plan`() {
        val entries1 = listOf(
            AcpPlanEntry("Step 1", AcpPlanEntryPriority.HIGH, AcpPlanEntryStatus.IN_PROGRESS),
        )
        val state1 = AcpUpdateApplier.apply(
            initialState,
            AcpSessionUpdate.PlanUpdate(entries = entries1),
        )
        assertEquals(1, state1.plan.size)

        val entries2 = listOf(
            AcpPlanEntry("Step 1", AcpPlanEntryPriority.HIGH, AcpPlanEntryStatus.COMPLETED),
            AcpPlanEntry("Step 2", AcpPlanEntryPriority.MEDIUM, AcpPlanEntryStatus.PENDING),
        )
        val state2 = AcpUpdateApplier.apply(
            state1,
            AcpSessionUpdate.PlanUpdate(entries = entries2),
        )
        assertEquals(2, state2.plan.size)
        assertEquals(AcpPlanEntryStatus.COMPLETED, state2.plan[0].status)
    }

    // ========================================================================
    // 7. available_commands_update
    // ========================================================================

    @Test
    fun `apply AvailableCommandsUpdate replaces commands list`() {
        val commands = listOf(
            AcpAvailableCommand(name = "/review", description = "Review code"),
            AcpAvailableCommand(name = "/test", description = "Run tests"),
        )
        val update = AcpSessionUpdate.AvailableCommandsUpdate(availableCommands = commands)

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals(2, state.availableCommands.size)
        assertEquals("/review", state.availableCommands[0].name)
    }

    // ========================================================================
    // 8. current_mode_update
    // ========================================================================

    @Test
    fun `apply CurrentModeUpdate sets currentModeId`() {
        val update = AcpSessionUpdate.CurrentModeUpdate(currentModeId = "architect")

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals("architect", state.currentModeId)
    }

    // ========================================================================
    // 9. config_option_update
    // ========================================================================

    @Test
    fun `apply ConfigOptionUpdate replaces configOptions`() {
        val options = listOf(
            AcpConfigOption(
                type = "select",
                id = "model",
                name = "Model",
                currentValue = "claude-4",
                options = JsonObject(emptyMap()),
            ),
        )
        val update = AcpSessionUpdate.ConfigOptionUpdate(configOptions = options)

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals(1, state.configOptions.size)
        assertEquals("model", state.configOptions[0].id)
    }

    // ========================================================================
    // 10. session_info_update
    // ========================================================================

    @Test
    fun `apply SessionInfoUpdate sets sessionTitle`() {
        val update = AcpSessionUpdate.SessionInfoUpdate(
            title = "My Project",
            updatedAt = "2026-03-26T00:00:00Z",
        )

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals("My Project", state.sessionTitle)
    }

    @Test
    fun `apply SessionInfoUpdate with null title preserves existing title`() {
        val stateWithTitle = initialState.copy(sessionTitle = "Existing Title")
        val update = AcpSessionUpdate.SessionInfoUpdate(title = null, updatedAt = null)

        val state = AcpUpdateApplier.apply(stateWithTitle, update)
        assertEquals("Existing Title", state.sessionTitle)
    }

    // ========================================================================
    // 11. usage_update
    // ========================================================================

    @Test
    fun `apply UsageUpdate sets usage info`() {
        val update = AcpSessionUpdate.UsageUpdate(
            used = 50000,
            size = 200000,
            cost = AcpCost(amount = 0.05, currency = "USD"),
        )

        val state = AcpUpdateApplier.apply(initialState, update)
        assertNotNull(state.usage)
        assertEquals(50000, state.usage?.used)
        assertEquals(200000, state.usage?.size)
        assertEquals(0.05, state.usage?.cost?.amount ?: 0.0, 0.001)
        assertEquals("USD", state.usage?.cost?.currency)
    }

    @Test
    fun `apply UsageUpdate with null cost sets cost to null`() {
        val update = AcpSessionUpdate.UsageUpdate(used = 1000, size = 100000, cost = null)

        val state = AcpUpdateApplier.apply(initialState, update)
        assertNotNull(state.usage)
        assertNull(state.usage?.cost)
    }

    // ========================================================================
    // Unknown Update
    // ========================================================================

    @Test
    fun `apply Unknown update returns state unchanged`() {
        val update = AcpSessionUpdate.Unknown(kind = "future_feature")

        val state = AcpUpdateApplier.apply(initialState, update)
        assertEquals(initialState.agentMessage, state.agentMessage)
        assertEquals(initialState.toolCalls, state.toolCalls)
        assertEquals(initialState.lastUpdateAt, state.lastUpdateAt) // not updated
    }

    // ========================================================================
    // lastUpdateAt
    // ========================================================================

    @Test
    fun `apply update sets lastUpdateAt to non-zero`() {
        val update = AcpSessionUpdate.AgentMessageChunk(
            content = AcpContentBlock.Text(text = "hi"),
        )

        val state = AcpUpdateApplier.apply(initialState, update)
        assertTrue(state.lastUpdateAt > 0)
    }

    // ========================================================================
    // Permission Management
    // ========================================================================

    @Test
    fun `addPermissionRequest adds request to state`() {
        val request = createTestPermissionRequest("req-1")

        val state = AcpUpdateApplier.addPermissionRequest(initialState, request)
        assertEquals(1, state.permissionRequests.size)
        assertNotNull(state.permissionRequests["req-1"])
    }

    @Test
    fun `resolvePermissionRequest moves request to history`() {
        val request = createTestPermissionRequest("req-1")
        val stateWithRequest = AcpUpdateApplier.addPermissionRequest(initialState, request)

        val resolved = AcpUpdateApplier.resolvePermissionRequest(
            state = stateWithRequest,
            requestId = "req-1",
            outcome = AcpPermissionOutcome.SELECTED,
            selectedOptionId = "opt-allow",
        )

        assertEquals(0, resolved.permissionRequests.size)
        assertEquals(1, resolved.permissionHistory.size)
        assertEquals("req-1", resolved.permissionHistory[0].requestId)
        assertEquals(AcpPermissionOutcome.SELECTED, resolved.permissionHistory[0].outcome)
    }

    @Test
    fun `resolvePermissionRequest for unknown request returns state unchanged`() {
        val state = AcpUpdateApplier.resolvePermissionRequest(
            state = initialState,
            requestId = "nonexistent",
            outcome = AcpPermissionOutcome.CANCELLED,
            selectedOptionId = null,
        )

        assertEquals(initialState.permissionRequests, state.permissionRequests)
        assertEquals(initialState.permissionHistory, state.permissionHistory)
    }

    @Test
    fun `permission history is capped at PERMISSION_HISTORY_MAX`() {
        var state = initialState
        // Add more than max decisions
        for (i in 1..(AcpSessionState.PERMISSION_HISTORY_MAX + 5)) {
            val request = createTestPermissionRequest("req-$i")
            state = AcpUpdateApplier.addPermissionRequest(state, request)
            state = AcpUpdateApplier.resolvePermissionRequest(
                state = state,
                requestId = "req-$i",
                outcome = AcpPermissionOutcome.SELECTED,
                selectedOptionId = "opt-allow",
            )
        }

        assertEquals(AcpSessionState.PERMISSION_HISTORY_MAX, state.permissionHistory.size)
    }

    @Test
    fun `getNextPendingPermission returns oldest pending request`() {
        val req1 = createTestPermissionRequest("req-1", receivedAt = 100)
        val req2 = createTestPermissionRequest("req-2", receivedAt = 200)

        var state = AcpUpdateApplier.addPermissionRequest(initialState, req1)
        state = AcpUpdateApplier.addPermissionRequest(state, req2)

        val next = AcpUpdateApplier.getNextPendingPermission(state)
        assertNotNull(next)
        assertEquals("req-1", next?.requestId)
    }

    @Test
    fun `getNextPendingPermission returns null when no pending requests`() {
        val next = AcpUpdateApplier.getNextPendingPermission(initialState)
        assertNull(next)
    }

    // ========================================================================
    // Helpers
    // ========================================================================

    private fun createTestPermissionRequest(
        requestId: String,
        receivedAt: Long = System.currentTimeMillis(),
    ): AcpPermissionRequestState {
        return AcpPermissionRequestState(
            requestId = requestId,
            sessionId = "sess-1",
            toolCall = AcpPermissionToolInfo(
                toolCallId = "tc-1",
                title = "Write File",
                kind = AcpToolKind.EDIT,
                locations = null,
            ),
            options = listOf(
                AcpPermissionOption(
                    optionId = "opt-allow",
                    name = "Allow",
                    kind = AcpPermissionOptionKind.ALLOW_ONCE,
                ),
                AcpPermissionOption(
                    optionId = "opt-deny",
                    name = "Deny",
                    kind = AcpPermissionOptionKind.REJECT_ONCE,
                ),
            ),
            receivedAt = receivedAt,
            timeoutAt = null,
            status = AcpPermissionRequestStatus.PENDING,
            selectedOptionId = null,
        )
    }
}
