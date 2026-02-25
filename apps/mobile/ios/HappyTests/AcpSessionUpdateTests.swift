//
//  AcpSessionUpdateTests.swift
//  HappyTests
//
//  Tests for AcpSessionState.applyUpdate() covering all 11 ACP update kinds.
//

import XCTest
@testable import Happy

final class AcpSessionUpdateTests: XCTestCase {

    // MARK: - Message Chunks

    func testUserMessageChunk() {
        var state = AcpSessionState()
        let update = AcpSessionUpdate.userMessageChunk(
            content: .text(AcpTextContent(text: "Hello"))
        )
        state.applyUpdate(update)
        XCTAssertEqual(state.userMessage, "Hello")
        XCTAssertTrue(state.lastUpdateAt > 0)
    }

    func testUserMessageChunkAccumulates() {
        var state = AcpSessionState()
        state.applyUpdate(.userMessageChunk(content: .text(AcpTextContent(text: "Hello "))))
        state.applyUpdate(.userMessageChunk(content: .text(AcpTextContent(text: "World"))))
        XCTAssertEqual(state.userMessage, "Hello World")
    }

    func testAgentMessageChunk() {
        var state = AcpSessionState()
        state.applyUpdate(.agentMessageChunk(content: .text(AcpTextContent(text: "Response"))))
        XCTAssertEqual(state.agentMessage, "Response")
    }

    func testAgentMessageChunkAccumulates() {
        var state = AcpSessionState()
        state.applyUpdate(.agentMessageChunk(content: .text(AcpTextContent(text: "Part 1 "))))
        state.applyUpdate(.agentMessageChunk(content: .text(AcpTextContent(text: "Part 2"))))
        XCTAssertEqual(state.agentMessage, "Part 1 Part 2")
    }

    func testAgentThoughtChunk() {
        var state = AcpSessionState()
        state.applyUpdate(.agentThoughtChunk(content: .text(AcpTextContent(text: "Thinking..."))))
        XCTAssertEqual(state.agentThought, "Thinking...")
    }

    func testAgentThoughtChunkAccumulates() {
        var state = AcpSessionState()
        state.applyUpdate(.agentThoughtChunk(content: .text(AcpTextContent(text: "Step 1. "))))
        state.applyUpdate(.agentThoughtChunk(content: .text(AcpTextContent(text: "Step 2."))))
        XCTAssertEqual(state.agentThought, "Step 1. Step 2.")
    }

    // MARK: - Tool Calls

    func testToolCall() {
        var state = AcpSessionState()
        let toolCall = AcpToolCall(
            toolCallId: "tc-1",
            title: "Read file",
            kind: .read,
            status: .inProgress
        )
        state.applyUpdate(.toolCall(toolCall))
        XCTAssertEqual(state.toolCalls.count, 1)
        XCTAssertEqual(state.toolCalls["tc-1"]?.title, "Read file")
        XCTAssertEqual(state.toolCalls["tc-1"]?.kind, .read)
        XCTAssertEqual(state.toolCalls["tc-1"]?.status, .inProgress)
    }

    func testToolCallUpdate_existingToolCall() {
        var state = AcpSessionState()
        // Add initial tool call
        let toolCall = AcpToolCall(toolCallId: "tc-1", title: "Read file", kind: .read, status: .inProgress)
        state.applyUpdate(.toolCall(toolCall))

        // Update status
        let json = """
        {"sessionUpdate":"tool_call_update","toolCallId":"tc-1","status":"completed","title":"Read file done"}
        """
        let decoder = JSONDecoder()
        if let update = try? decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!) {
            state.applyUpdate(update)
        }
        XCTAssertEqual(state.toolCalls["tc-1"]?.status, .completed)
        XCTAssertEqual(state.toolCalls["tc-1"]?.title, "Read file done")
    }

    func testToolCallUpdate_unknownToolCall() {
        var state = AcpSessionState()
        let json = """
        {"sessionUpdate":"tool_call_update","toolCallId":"tc-unknown","title":"Mystery Tool","status":"completed"}
        """
        let decoder = JSONDecoder()
        if let update = try? decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!) {
            state.applyUpdate(update)
        }
        XCTAssertEqual(state.toolCalls["tc-unknown"]?.title, "Mystery Tool")
        XCTAssertEqual(state.toolCalls["tc-unknown"]?.status, .completed)
    }

    // MARK: - Plan

    func testPlanUpdate() {
        var state = AcpSessionState()
        let entries = [
            AcpPlanEntry(content: "Step 1", priority: .high, status: .completed),
            AcpPlanEntry(content: "Step 2", priority: .medium, status: .inProgress),
            AcpPlanEntry(content: "Step 3", priority: .low, status: .pending),
        ]
        state.applyUpdate(.plan(entries: entries))
        XCTAssertEqual(state.plan.count, 3)
        XCTAssertEqual(state.plan[0].content, "Step 1")
        XCTAssertEqual(state.plan[0].status, .completed)
        XCTAssertEqual(state.plan[1].priority, .medium)
        XCTAssertEqual(state.plan[2].status, .pending)
    }

    func testPlanUpdateReplaces() {
        var state = AcpSessionState()
        state.applyUpdate(.plan(entries: [
            AcpPlanEntry(content: "Old step", priority: .high, status: .pending),
        ]))
        XCTAssertEqual(state.plan.count, 1)

        state.applyUpdate(.plan(entries: [
            AcpPlanEntry(content: "New step 1", priority: .high, status: .completed),
            AcpPlanEntry(content: "New step 2", priority: .medium, status: .pending),
        ]))
        XCTAssertEqual(state.plan.count, 2)
        XCTAssertEqual(state.plan[0].content, "New step 1")
    }

    // MARK: - Available Commands

    func testAvailableCommandsUpdate() {
        var state = AcpSessionState()
        let commands = [
            AcpAvailableCommand(name: "/help", description: "Show help"),
            AcpAvailableCommand(name: "/clear", description: "Clear session"),
        ]
        state.applyUpdate(.availableCommandsUpdate(commands: commands))
        XCTAssertEqual(state.availableCommands.count, 2)
        XCTAssertEqual(state.availableCommands[0].name, "/help")
        XCTAssertEqual(state.availableCommands[1].description, "Clear session")
    }

    // MARK: - Current Mode

    func testCurrentModeUpdate() {
        var state = AcpSessionState()
        state.applyUpdate(.currentModeUpdate(currentModeId: "architect"))
        XCTAssertEqual(state.currentModeId, "architect")

        state.applyUpdate(.currentModeUpdate(currentModeId: "code"))
        XCTAssertEqual(state.currentModeId, "code")
    }

    // MARK: - Config Option

    func testConfigOptionUpdate() {
        var state = AcpSessionState()
        let json = """
        {
            "sessionUpdate": "config_option_update",
            "configOptions": [{
                "_meta": {},
                "type": "select",
                "id": "model",
                "name": "Model",
                "currentValue": "claude-4",
                "options": [
                    {"_meta": {}, "value": "claude-4", "name": "Claude 4"},
                    {"_meta": {}, "value": "claude-3", "name": "Claude 3"}
                ]
            }]
        }
        """
        let decoder = JSONDecoder()
        if let update = try? decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!) {
            state.applyUpdate(update)
        }
        XCTAssertEqual(state.configOptions.count, 1)
        XCTAssertEqual(state.configOptions[0].id, "model")
        XCTAssertEqual(state.configOptions[0].currentValue, "claude-4")
    }

    // MARK: - Session Info

    func testSessionInfoUpdate() {
        var state = AcpSessionState()
        state.applyUpdate(.sessionInfoUpdate(title: "My Session", updatedAt: "2026-01-01T00:00:00Z"))
        XCTAssertEqual(state.sessionTitle, "My Session")
    }

    func testSessionInfoUpdateNilTitle() {
        var state = AcpSessionState()
        state.sessionTitle = "Existing Title"
        state.applyUpdate(.sessionInfoUpdate(title: nil, updatedAt: nil))
        XCTAssertEqual(state.sessionTitle, "Existing Title")
    }

    // MARK: - Usage

    func testUsageUpdate() {
        var state = AcpSessionState()
        state.applyUpdate(.usageUpdate(used: 50000, size: 200000, cost: AcpCost(amount: 0.05, currency: "USD")))
        XCTAssertEqual(state.usage?.used, 50000)
        XCTAssertEqual(state.usage?.size, 200000)
        XCTAssertEqual(state.usage?.cost?.amount, 0.05)
        XCTAssertEqual(state.usage?.cost?.currency, "USD")
    }

    func testUsageUpdateNoCost() {
        var state = AcpSessionState()
        state.applyUpdate(.usageUpdate(used: 1000, size: 100000, cost: nil))
        XCTAssertEqual(state.usage?.used, 1000)
        XCTAssertNil(state.usage?.cost)
    }

    // MARK: - Unknown

    func testUnknownUpdateIgnored() {
        var state = AcpSessionState()
        let beforeTimestamp = state.lastUpdateAt
        state.applyUpdate(.unknown(sessionUpdate: "future_update_type"))
        XCTAssertEqual(state.lastUpdateAt, beforeTimestamp)
    }

    // MARK: - Permission Helpers

    func testAddPermissionRequest() {
        var state = AcpSessionState()
        let request = AcpPermissionRequestState(
            requestId: "req-1",
            sessionId: "session-1",
            toolCall: .init(toolCallId: "tc-1", title: "Write file", kind: "edit", locations: nil),
            options: [
                AcpPermissionOption(optionId: "opt-1", name: "Allow Once", kind: .allowOnce),
                AcpPermissionOption(optionId: "opt-2", name: "Reject", kind: .rejectOnce),
            ]
        )
        state.addPermissionRequest(request)
        XCTAssertEqual(state.permissionRequests.count, 1)
        XCTAssertEqual(state.permissionRequests["req-1"]?.status, .pending)
    }

    func testResolvePermissionRequest() {
        var state = AcpSessionState()
        let request = AcpPermissionRequestState(
            requestId: "req-1",
            sessionId: "session-1",
            toolCall: .init(toolCallId: "tc-1", title: "Write file", kind: "edit", locations: nil),
            options: [
                AcpPermissionOption(optionId: "opt-1", name: "Allow Once", kind: .allowOnce),
            ]
        )
        state.addPermissionRequest(request)
        state.resolvePermissionRequest(requestId: "req-1", outcome: .selected, selectedOptionId: "opt-1")

        XCTAssertTrue(state.permissionRequests.isEmpty)
        XCTAssertEqual(state.permissionHistory.count, 1)
        XCTAssertEqual(state.permissionHistory[0].outcome, .selected)
        XCTAssertEqual(state.permissionHistory[0].selectedOption?.optionId, "opt-1")
    }

    func testNextPendingPermission() {
        var state = AcpSessionState()
        let request1 = AcpPermissionRequestState(
            requestId: "req-1",
            sessionId: "s1",
            toolCall: .init(toolCallId: "tc-1", title: "Tool 1", kind: nil, locations: nil),
            options: [],
            receivedAt: 1000
        )
        let request2 = AcpPermissionRequestState(
            requestId: "req-2",
            sessionId: "s1",
            toolCall: .init(toolCallId: "tc-2", title: "Tool 2", kind: nil, locations: nil),
            options: [],
            receivedAt: 2000
        )
        state.addPermissionRequest(request2)
        state.addPermissionRequest(request1)

        let next = state.nextPendingPermission()
        XCTAssertEqual(next?.requestId, "req-1") // Oldest first
    }

    // MARK: - Non-text Content Block

    func testNonTextContentBlockReturnsEmptyString() {
        var state = AcpSessionState()
        state.applyUpdate(.agentMessageChunk(content: .image(AcpImageContent(
            from: try! JSONDecoder().decode(
                AcpImageContent.self,
                from: """
                {"type":"image","data":"base64data","mimeType":"image/png"}
                """.data(using: .utf8)!
            )
        ))))
        XCTAssertEqual(state.agentMessage, "")
    }
}
