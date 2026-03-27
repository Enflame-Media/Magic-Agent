//
//  AcpTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

// MARK: - JSON Decoding Tests

/// Unit tests for ACP model JSON decoding.
///
/// Verifies that all ACP types decode correctly from JSON, matching
/// the wire format produced by `@magic-agent/protocol` Zod schemas.
final class AcpJsonDecodingTests: XCTestCase {

    private var decoder: JSONDecoder!

    override func setUp() {
        super.setUp()
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    // MARK: - Content Block Decoding

    func testDecodeTextContentBlock() throws {
        let json = """
        {"type": "text", "text": "Hello, world!"}
        """.data(using: .utf8)!

        let block = try decoder.decode(AcpContentBlock.self, from: json)
        guard case .text(let content) = block else {
            XCTFail("Expected text content block")
            return
        }
        XCTAssertEqual(content.text, "Hello, world!")
        XCTAssertEqual(block.textContent, "Hello, world!")
    }

    func testDecodeImageContentBlock() throws {
        let json = """
        {"type": "image", "data": "base64data", "mime_type": "image/png"}
        """.data(using: .utf8)!

        let block = try decoder.decode(AcpContentBlock.self, from: json)
        guard case .image(let content) = block else {
            XCTFail("Expected image content block")
            return
        }
        XCTAssertEqual(content.data, "base64data")
        XCTAssertEqual(content.mimeType, "image/png")
        XCTAssertEqual(block.textContent, "")
    }

    func testDecodeResourceLinkContentBlock() throws {
        let json = """
        {"type": "resource_link", "name": "file.ts", "uri": "file:///path/to/file.ts", "size": 1024}
        """.data(using: .utf8)!

        let block = try decoder.decode(AcpContentBlock.self, from: json)
        guard case .resourceLink(let content) = block else {
            XCTFail("Expected resource link content block")
            return
        }
        XCTAssertEqual(content.name, "file.ts")
        XCTAssertEqual(content.uri, "file:///path/to/file.ts")
        XCTAssertEqual(content.size, 1024)
    }

    func testDecodeUnknownContentBlockType() throws {
        let json = """
        {"type": "future_type", "data": "some data"}
        """.data(using: .utf8)!

        let block = try decoder.decode(AcpContentBlock.self, from: json)
        guard case .unknown(let type) = block else {
            XCTFail("Expected unknown content block")
            return
        }
        XCTAssertEqual(type, "future_type")
    }

    // MARK: - Tool Call Decoding

    func testDecodeToolCall() throws {
        let json = """
        {
            "tool_call_id": "tc-123",
            "title": "Read file.ts",
            "kind": "read",
            "status": "in_progress",
            "locations": [{"path": "/src/file.ts", "line": 42}]
        }
        """.data(using: .utf8)!

        let toolCall = try decoder.decode(AcpToolCall.self, from: json)
        XCTAssertEqual(toolCall.toolCallId, "tc-123")
        XCTAssertEqual(toolCall.title, "Read file.ts")
        XCTAssertEqual(toolCall.kind, .read)
        XCTAssertEqual(toolCall.status, .inProgress)
        XCTAssertEqual(toolCall.locations?.count, 1)
        XCTAssertEqual(toolCall.locations?.first?.path, "/src/file.ts")
        XCTAssertEqual(toolCall.locations?.first?.line, 42)
    }

    func testDecodeToolCallContent() throws {
        let json = """
        {"type": "diff", "path": "/src/file.ts", "new_text": "new code", "old_text": "old code"}
        """.data(using: .utf8)!

        let content = try decoder.decode(AcpToolCallContent.self, from: json)
        guard case .diff(let diff) = content else {
            XCTFail("Expected diff content")
            return
        }
        XCTAssertEqual(diff.path, "/src/file.ts")
        XCTAssertEqual(diff.newText, "new code")
        XCTAssertEqual(diff.oldText, "old code")
    }

    func testDecodeToolCallContentTerminal() throws {
        let json = """
        {"type": "terminal", "terminal_id": "term-abc"}
        """.data(using: .utf8)!

        let content = try decoder.decode(AcpToolCallContent.self, from: json)
        guard case .terminal(let terminal) = content else {
            XCTFail("Expected terminal content")
            return
        }
        XCTAssertEqual(terminal.terminalId, "term-abc")
    }

    // MARK: - Plan Entry Decoding

    func testDecodePlanEntry() throws {
        let json = """
        {"content": "Fix authentication bug", "priority": "high", "status": "in_progress"}
        """.data(using: .utf8)!

        let entry = try decoder.decode(AcpPlanEntry.self, from: json)
        XCTAssertEqual(entry.content, "Fix authentication bug")
        XCTAssertEqual(entry.priority, .high)
        XCTAssertEqual(entry.status, .inProgress)
    }

    // MARK: - Permission Option Decoding

    func testDecodePermissionOption() throws {
        let json = """
        {"option_id": "opt-1", "name": "Allow Once", "kind": "allow_once"}
        """.data(using: .utf8)!

        let option = try decoder.decode(AcpPermissionOption.self, from: json)
        XCTAssertEqual(option.optionId, "opt-1")
        XCTAssertEqual(option.name, "Allow Once")
        XCTAssertEqual(option.kind, .allowOnce)
    }

    // MARK: - Session Config Decoding

    func testDecodeSessionConfigOption() throws {
        let json = """
        {
            "type": "select",
            "id": "model",
            "name": "Model",
            "current_value": "claude-4",
            "options": [
                {"value": "claude-4", "name": "Claude 4"},
                {"value": "claude-3.5", "name": "Claude 3.5"}
            ]
        }
        """.data(using: .utf8)!

        let option = try decoder.decode(AcpSessionConfigOption.self, from: json)
        XCTAssertEqual(option.id, "model")
        XCTAssertEqual(option.name, "Model")
        XCTAssertEqual(option.currentValue, "claude-4")
    }

    // MARK: - Available Command Decoding

    func testDecodeAvailableCommand() throws {
        let json = """
        {"name": "/help", "description": "Show available commands"}
        """.data(using: .utf8)!

        let command = try decoder.decode(AcpAvailableCommand.self, from: json)
        XCTAssertEqual(command.name, "/help")
        XCTAssertEqual(command.description, "Show available commands")
        XCTAssertNil(command.input)
    }

    // MARK: - Agent Registry Decoding

    func testDecodeRegisteredAgent() throws {
        let json = """
        {
            "id": "claude-code",
            "name": "Claude Code",
            "description": "AI coding assistant",
            "status": "connected",
            "version": "1.0.0"
        }
        """.data(using: .utf8)!

        let agent = try decoder.decode(AcpRegisteredAgent.self, from: json)
        XCTAssertEqual(agent.id, "claude-code")
        XCTAssertEqual(agent.name, "Claude Code")
        XCTAssertEqual(agent.status, .connected)
        XCTAssertEqual(agent.version, "1.0.0")
    }
}

// MARK: - Session Update Decoding Tests

/// Unit tests for ACP session update JSON decoding.
///
/// Verifies all 11 session update kinds decode correctly from the
/// discriminated union wire format.
final class AcpSessionUpdateDecodingTests: XCTestCase {

    private var decoder: JSONDecoder!

    override func setUp() {
        super.setUp()
        decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    func testDecodeAgentMessageChunk() throws {
        let json = """
        {"session_update": "agent_message_chunk", "content": {"type": "text", "text": "Hello from agent"}}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .agentMessageChunk(let content) = update else {
            XCTFail("Expected agent_message_chunk")
            return
        }
        XCTAssertEqual(content.textContent, "Hello from agent")
    }

    func testDecodeUserMessageChunk() throws {
        let json = """
        {"session_update": "user_message_chunk", "content": {"type": "text", "text": "Hello from user"}}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .userMessageChunk(let content) = update else {
            XCTFail("Expected user_message_chunk")
            return
        }
        XCTAssertEqual(content.textContent, "Hello from user")
    }

    func testDecodeAgentThoughtChunk() throws {
        let json = """
        {"session_update": "agent_thought_chunk", "content": {"type": "text", "text": "Thinking..."}}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .agentThoughtChunk(let content) = update else {
            XCTFail("Expected agent_thought_chunk")
            return
        }
        XCTAssertEqual(content.textContent, "Thinking...")
    }

    func testDecodeToolCallUpdate() throws {
        let json = """
        {
            "session_update": "tool_call",
            "tool_call_id": "tc-456",
            "title": "Edit main.ts",
            "kind": "edit",
            "status": "pending"
        }
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .toolCall(let toolCall) = update else {
            XCTFail("Expected tool_call")
            return
        }
        XCTAssertEqual(toolCall.toolCallId, "tc-456")
        XCTAssertEqual(toolCall.title, "Edit main.ts")
        XCTAssertEqual(toolCall.kind, .edit)
        XCTAssertEqual(toolCall.status, .pending)
    }

    func testDecodeToolCallStatusUpdate() throws {
        let json = """
        {
            "session_update": "tool_call_update",
            "tool_call_id": "tc-456",
            "status": "completed"
        }
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .toolCallUpdate(let tcUpdate) = update else {
            XCTFail("Expected tool_call_update")
            return
        }
        XCTAssertEqual(tcUpdate.toolCallId, "tc-456")
        XCTAssertEqual(tcUpdate.status, .completed)
    }

    func testDecodePlanUpdate() throws {
        let json = """
        {
            "session_update": "plan",
            "entries": [
                {"content": "Step 1: Read files", "priority": "high", "status": "completed"},
                {"content": "Step 2: Fix bug", "priority": "high", "status": "in_progress"},
                {"content": "Step 3: Write tests", "priority": "medium", "status": "pending"}
            ]
        }
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .plan(let entries) = update else {
            XCTFail("Expected plan update")
            return
        }
        XCTAssertEqual(entries.count, 3)
        XCTAssertEqual(entries[0].status, .completed)
        XCTAssertEqual(entries[1].status, .inProgress)
        XCTAssertEqual(entries[2].status, .pending)
    }

    func testDecodeAvailableCommandsUpdate() throws {
        let json = """
        {
            "session_update": "available_commands_update",
            "available_commands": [
                {"name": "/help", "description": "Show help"},
                {"name": "/clear", "description": "Clear context"}
            ]
        }
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .availableCommandsUpdate(let commands) = update else {
            XCTFail("Expected available_commands_update")
            return
        }
        XCTAssertEqual(commands.count, 2)
        XCTAssertEqual(commands[0].name, "/help")
    }

    func testDecodeCurrentModeUpdate() throws {
        let json = """
        {"session_update": "current_mode_update", "current_mode_id": "architect"}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .currentModeUpdate(let modeId) = update else {
            XCTFail("Expected current_mode_update")
            return
        }
        XCTAssertEqual(modeId, "architect")
    }

    func testDecodeConfigOptionUpdate() throws {
        let json = """
        {
            "session_update": "config_option_update",
            "config_options": [
                {
                    "type": "select",
                    "id": "model",
                    "name": "Model",
                    "current_value": "claude-4",
                    "options": [{"value": "claude-4", "name": "Claude 4"}]
                }
            ]
        }
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .configOptionUpdate(let options) = update else {
            XCTFail("Expected config_option_update")
            return
        }
        XCTAssertEqual(options.count, 1)
        XCTAssertEqual(options[0].id, "model")
    }

    func testDecodeSessionInfoUpdate() throws {
        let json = """
        {"session_update": "session_info_update", "title": "Fix authentication bug"}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .sessionInfoUpdate(let title, _) = update else {
            XCTFail("Expected session_info_update")
            return
        }
        XCTAssertEqual(title, "Fix authentication bug")
    }

    func testDecodeUsageUpdate() throws {
        let json = """
        {
            "session_update": "usage_update",
            "used": 50000,
            "size": 200000,
            "cost": {"amount": 0.0035, "currency": "USD"}
        }
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .usageUpdate(let used, let size, let cost) = update else {
            XCTFail("Expected usage_update")
            return
        }
        XCTAssertEqual(used, 50000)
        XCTAssertEqual(size, 200000)
        XCTAssertEqual(cost?.amount, 0.0035)
        XCTAssertEqual(cost?.currency, "USD")
    }

    func testDecodeUnknownUpdateType() throws {
        let json = """
        {"session_update": "future_update_type", "data": "something"}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .unknown(let type) = update else {
            XCTFail("Expected unknown update type")
            return
        }
        XCTAssertEqual(type, "future_update_type")
    }

    func testDecodeUsageUpdateWithoutCost() throws {
        let json = """
        {"session_update": "usage_update", "used": 1000, "size": 100000}
        """.data(using: .utf8)!

        let update = try decoder.decode(AcpSessionUpdate.self, from: json)
        guard case .usageUpdate(let used, let size, let cost) = update else {
            XCTFail("Expected usage_update")
            return
        }
        XCTAssertEqual(used, 1000)
        XCTAssertEqual(size, 100000)
        XCTAssertNil(cost)
    }
}

// MARK: - Apply Update Tests

/// Unit tests for `AcpSessionState.applying(_:)`.
///
/// Verifies all 11 ACP update kinds are applied correctly to the state,
/// mirroring the behavior of the TypeScript `applyAcpSessionUpdate` function.
final class AcpApplyUpdateTests: XCTestCase {

    func testApplyAgentMessageChunk() {
        var state = AcpSessionState.initial()

        state = state.applying(.agentMessageChunk(
            content: .text(AcpTextContent(text: "Hello"))
        ))
        XCTAssertEqual(state.agentMessage, "Hello")

        state = state.applying(.agentMessageChunk(
            content: .text(AcpTextContent(text: " world"))
        ))
        XCTAssertEqual(state.agentMessage, "Hello world")
    }

    func testApplyUserMessageChunk() {
        var state = AcpSessionState.initial()

        state = state.applying(.userMessageChunk(
            content: .text(AcpTextContent(text: "Fix this bug"))
        ))
        XCTAssertEqual(state.userMessage, "Fix this bug")
    }

    func testApplyAgentThoughtChunk() {
        var state = AcpSessionState.initial()

        state = state.applying(.agentThoughtChunk(
            content: .text(AcpTextContent(text: "Let me think about this..."))
        ))
        XCTAssertEqual(state.agentThought, "Let me think about this...")
    }

    func testApplyToolCall() {
        var state = AcpSessionState.initial()

        let toolCall = AcpToolCall(
            toolCallId: "tc-1",
            title: "Read file.ts",
            kind: .read,
            status: .pending
        )

        state = state.applying(.toolCall(toolCall))
        XCTAssertEqual(state.toolCalls.count, 1)
        XCTAssertEqual(state.toolCalls["tc-1"]?.title, "Read file.ts")
        XCTAssertEqual(state.toolCalls["tc-1"]?.kind, .read)
    }

    func testApplyToolCallUpdateMergesIntoExisting() {
        var state = AcpSessionState.initial()

        // First, add a tool call
        let toolCall = AcpToolCall(
            toolCallId: "tc-1",
            title: "Read file.ts",
            kind: .read,
            status: .pending
        )
        state = state.applying(.toolCall(toolCall))

        // Then update its status
        let update = AcpToolCallUpdate(
            toolCallId: "tc-1",
            title: nil,
            kind: nil,
            status: .completed,
            content: nil,
            locations: nil
        )
        state = state.applying(.toolCallUpdate(update))

        XCTAssertEqual(state.toolCalls["tc-1"]?.status, .completed)
        XCTAssertEqual(state.toolCalls["tc-1"]?.title, "Read file.ts") // Preserved
    }

    func testApplyToolCallUpdateCreatesMinimalEntry() {
        var state = AcpSessionState.initial()

        // Update for a tool call we haven't seen yet
        let update = AcpToolCallUpdate(
            toolCallId: "tc-new",
            title: nil,
            kind: nil,
            status: .inProgress,
            content: nil,
            locations: nil
        )
        state = state.applying(.toolCallUpdate(update))

        XCTAssertEqual(state.toolCalls["tc-new"]?.title, "Unknown Tool")
        XCTAssertEqual(state.toolCalls["tc-new"]?.status, .inProgress)
    }

    func testApplyPlanReplacesFully() {
        var state = AcpSessionState.initial()

        let entries1 = [
            AcpPlanEntry(content: "Step 1", priority: .high, status: .completed),
        ]
        state = state.applying(.plan(entries: entries1))
        XCTAssertEqual(state.plan.count, 1)

        let entries2 = [
            AcpPlanEntry(content: "Step A", priority: .high, status: .pending),
            AcpPlanEntry(content: "Step B", priority: .medium, status: .pending),
        ]
        state = state.applying(.plan(entries: entries2))
        XCTAssertEqual(state.plan.count, 2)
        XCTAssertEqual(state.plan[0].content, "Step A")
    }

    func testApplyAvailableCommandsUpdate() {
        var state = AcpSessionState.initial()

        let commands = [
            AcpAvailableCommand(name: "/help", description: "Show help", input: nil),
            AcpAvailableCommand(name: "/clear", description: "Clear context", input: nil),
        ]
        state = state.applying(.availableCommandsUpdate(commands: commands))

        XCTAssertEqual(state.availableCommands.count, 2)
        XCTAssertEqual(state.availableCommands[0].name, "/help")
    }

    func testApplyCurrentModeUpdate() {
        var state = AcpSessionState.initial()
        XCTAssertNil(state.currentModeId)

        state = state.applying(.currentModeUpdate(currentModeId: "architect"))
        XCTAssertEqual(state.currentModeId, "architect")

        state = state.applying(.currentModeUpdate(currentModeId: "code"))
        XCTAssertEqual(state.currentModeId, "code")
    }

    func testApplyConfigOptionUpdate() {
        var state = AcpSessionState.initial()

        let options = [
            AcpSessionConfigOption(
                type: "select",
                id: "model",
                name: "Model",
                description: nil,
                category: nil,
                currentValue: "claude-4",
                options: .flat([
                    AcpSessionConfigSelectOption(value: "claude-4", name: "Claude 4", description: nil),
                ])
            ),
        ]
        state = state.applying(.configOptionUpdate(configOptions: options))

        XCTAssertEqual(state.configOptions.count, 1)
        XCTAssertEqual(state.configOptions[0].currentValue, "claude-4")
    }

    func testApplySessionInfoUpdate() {
        var state = AcpSessionState.initial()
        XCTAssertNil(state.sessionTitle)

        state = state.applying(.sessionInfoUpdate(title: "Fix auth bug", updatedAt: nil))
        XCTAssertEqual(state.sessionTitle, "Fix auth bug")
    }

    func testApplySessionInfoUpdatePreservesExistingTitle() {
        var state = AcpSessionState.initial()
        state = state.applying(.sessionInfoUpdate(title: "First title", updatedAt: nil))

        // nil title should preserve existing
        state = state.applying(.sessionInfoUpdate(title: nil, updatedAt: "2026-01-01"))
        XCTAssertEqual(state.sessionTitle, "First title")
    }

    func testApplyUsageUpdate() {
        var state = AcpSessionState.initial()
        XCTAssertNil(state.usage)

        state = state.applying(.usageUpdate(
            used: 50000,
            size: 200000,
            cost: AcpCost(amount: 0.0035, currency: "USD")
        ))

        XCTAssertEqual(state.usage?.used, 50000)
        XCTAssertEqual(state.usage?.size, 200000)
        XCTAssertEqual(state.usage?.cost?.amount, 0.0035)
        XCTAssertEqual(state.usage?.percentage, 0.25)
    }

    func testApplyUnknownUpdateTypeIsIgnored() {
        let state = AcpSessionState.initial()
        let newState = state.applying(.unknown("future_type"))

        // State should be unchanged
        XCTAssertEqual(newState.agentMessage, "")
        XCTAssertEqual(newState.toolCalls.count, 0)
        XCTAssertEqual(newState.lastUpdateAt, 0) // Not updated
    }

    func testLastUpdateAtIsUpdated() {
        let state = AcpSessionState.initial()
        XCTAssertEqual(state.lastUpdateAt, 0)

        let newState = state.applying(.agentMessageChunk(
            content: .text(AcpTextContent(text: "test"))
        ))
        XCTAssertGreaterThan(newState.lastUpdateAt, 0)
    }
}

// MARK: - Permission Management Tests

/// Unit tests for ACP permission request management.
final class AcpPermissionTests: XCTestCase {

    func testAddPermissionRequest() {
        let state = AcpSessionState.initial()

        let request = AcpPermissionRequestState(
            requestId: "req-1",
            sessionId: "session-1",
            toolCall: AcpPermissionRequestToolCall(
                toolCallId: "tc-1",
                title: "Execute command",
                kind: .execute,
                locations: nil
            ),
            options: [
                AcpPermissionOption(optionId: "opt-1", name: "Allow Once", kind: .allowOnce),
                AcpPermissionOption(optionId: "opt-2", name: "Reject Once", kind: .rejectOnce),
            ],
            receivedAt: 1000,
            timeoutAt: nil,
            status: .pending,
            selectedOptionId: nil
        )

        let newState = state.addingPermissionRequest(request)
        XCTAssertEqual(newState.permissionRequests.count, 1)
        XCTAssertEqual(newState.permissionRequests["req-1"]?.toolCall.title, "Execute command")
        XCTAssertTrue(newState.hasPendingPermissions)
    }

    func testResolvePermissionRequest() {
        var state = AcpSessionState.initial()

        let request = AcpPermissionRequestState(
            requestId: "req-1",
            sessionId: "session-1",
            toolCall: AcpPermissionRequestToolCall(
                toolCallId: "tc-1",
                title: "Execute command",
                kind: .execute,
                locations: nil
            ),
            options: [
                AcpPermissionOption(optionId: "opt-1", name: "Allow Once", kind: .allowOnce),
            ],
            receivedAt: 1000,
            timeoutAt: nil,
            status: .pending,
            selectedOptionId: nil
        )

        state = state.addingPermissionRequest(request)

        // Resolve it
        state = state.resolvingPermissionRequest(
            requestId: "req-1",
            outcome: .selected,
            selectedOptionId: "opt-1"
        )

        XCTAssertEqual(state.permissionRequests.count, 0)
        XCTAssertEqual(state.permissionHistory.count, 1)
        XCTAssertEqual(state.permissionHistory[0].outcome, .selected)
        XCTAssertEqual(state.permissionHistory[0].selectedOption?.name, "Allow Once")
        XCTAssertFalse(state.hasPendingPermissions)
    }

    func testResolveNonexistentRequestIsNoOp() {
        let state = AcpSessionState.initial()
        let newState = state.resolvingPermissionRequest(
            requestId: "nonexistent",
            outcome: .cancelled,
            selectedOptionId: nil
        )
        XCTAssertEqual(newState.permissionHistory.count, 0)
    }

    func testNextPendingPermissionReturnsOldest() {
        var state = AcpSessionState.initial()

        let request1 = AcpPermissionRequestState(
            requestId: "req-1",
            sessionId: "s",
            toolCall: AcpPermissionRequestToolCall(toolCallId: "tc-1", title: "Tool 1", kind: nil, locations: nil),
            options: [],
            receivedAt: 2000,
            timeoutAt: nil,
            status: .pending,
            selectedOptionId: nil
        )

        let request2 = AcpPermissionRequestState(
            requestId: "req-2",
            sessionId: "s",
            toolCall: AcpPermissionRequestToolCall(toolCallId: "tc-2", title: "Tool 2", kind: nil, locations: nil),
            options: [],
            receivedAt: 1000,
            timeoutAt: nil,
            status: .pending,
            selectedOptionId: nil
        )

        state = state.addingPermissionRequest(request1)
        state = state.addingPermissionRequest(request2)

        // req-2 has earlier receivedAt, should be first
        XCTAssertEqual(state.nextPendingPermission?.requestId, "req-2")
    }

    func testPermissionHistoryMaxCap() {
        var state = AcpSessionState.initial()

        // Add and resolve 55 permission requests (exceeds max of 50)
        for i in 0..<55 {
            let request = AcpPermissionRequestState(
                requestId: "req-\(i)",
                sessionId: "s",
                toolCall: AcpPermissionRequestToolCall(
                    toolCallId: "tc-\(i)", title: "Tool \(i)", kind: nil, locations: nil
                ),
                options: [],
                receivedAt: TimeInterval(i),
                timeoutAt: nil,
                status: .pending,
                selectedOptionId: nil
            )
            state = state.addingPermissionRequest(request)
            state = state.resolvingPermissionRequest(
                requestId: "req-\(i)",
                outcome: .cancelled,
                selectedOptionId: nil
            )
        }

        XCTAssertEqual(state.permissionHistory.count, 50)
    }
}

// MARK: - Agent Registry Tests

/// Unit tests for ACP agent registry state.
final class AcpAgentRegistryTests: XCTestCase {

    func testInitialState() {
        let state = AcpAgentRegistryState.initial()
        XCTAssertTrue(state.agents.isEmpty)
        XCTAssertNil(state.activeAgentId)
        XCTAssertFalse(state.switching)
        XCTAssertNil(state.switchError)
        XCTAssertNil(state.activeAgent)
    }

    func testActiveAgentLookup() {
        var state = AcpAgentRegistryState.initial()
        state.agents["claude-code"] = AcpRegisteredAgent(
            id: "claude-code",
            name: "Claude Code",
            description: nil,
            status: .connected,
            version: "1.0"
        )
        state.activeAgentId = "claude-code"

        XCTAssertEqual(state.activeAgent?.name, "Claude Code")
    }

    func testActiveAgentNilWhenIdMismatch() {
        var state = AcpAgentRegistryState.initial()
        state.activeAgentId = "nonexistent"

        XCTAssertNil(state.activeAgent)
    }
}

// MARK: - Computed Property Tests

/// Tests for AcpSessionState computed properties and helpers.
final class AcpSessionStateComputedTests: XCTestCase {

    func testActiveToolCallCount() {
        var state = AcpSessionState.initial()

        state = state.applying(.toolCall(AcpToolCall(
            toolCallId: "tc-1", title: "Tool 1", kind: .read, status: .pending
        )))
        state = state.applying(.toolCall(AcpToolCall(
            toolCallId: "tc-2", title: "Tool 2", kind: .edit, status: .inProgress
        )))
        state = state.applying(.toolCall(AcpToolCall(
            toolCallId: "tc-3", title: "Tool 3", kind: .read, status: .completed
        )))

        XCTAssertEqual(state.activeToolCallCount, 2) // tc-1 (pending) and tc-2 (in_progress)
    }

    func testUsagePercentage() {
        let usage = AcpUsage(used: 50000, size: 200000, cost: nil)
        XCTAssertEqual(usage.percentage, 0.25)
    }

    func testUsagePercentageZeroSize() {
        let usage = AcpUsage(used: 0, size: 0, cost: nil)
        XCTAssertEqual(usage.percentage, 0)
    }

    func testCostFormatted() {
        let cost = AcpCost(amount: 0.0035, currency: "USD")
        XCTAssertEqual(cost.formatted, "0.0035 USD")
    }
}
