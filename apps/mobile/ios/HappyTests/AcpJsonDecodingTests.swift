//
//  AcpJsonDecodingTests.swift
//  HappyTests
//
//  Tests for JSON decoding of ACP types.
//

import XCTest
@testable import Happy

final class AcpJsonDecodingTests: XCTestCase {
    let decoder = JSONDecoder()

    // MARK: - Content Block Decoding

    func testDecodeTextContentBlock() throws {
        let json = """
        {"_meta":{},"type":"text","text":"Hello world"}
        """
        let block = try decoder.decode(AcpContentBlock.self, from: json.data(using: .utf8)!)
        if case .text(let content) = block {
            XCTAssertEqual(content.text, "Hello world")
        } else {
            XCTFail("Expected text content block")
        }
    }

    func testDecodeImageContentBlock() throws {
        let json = """
        {"_meta":{},"type":"image","data":"abc123","mimeType":"image/png"}
        """
        let block = try decoder.decode(AcpContentBlock.self, from: json.data(using: .utf8)!)
        if case .image(let content) = block {
            XCTAssertEqual(content.mimeType, "image/png")
            XCTAssertEqual(content.data, "abc123")
        } else {
            XCTFail("Expected image content block")
        }
    }

    func testDecodeResourceLinkContentBlock() throws {
        let json = """
        {"_meta":{},"type":"resource_link","uri":"file:///test.txt","name":"test.txt","title":"Test File"}
        """
        let block = try decoder.decode(AcpContentBlock.self, from: json.data(using: .utf8)!)
        if case .resourceLink(let content) = block {
            XCTAssertEqual(content.name, "test.txt")
            XCTAssertEqual(content.title, "Test File")
        } else {
            XCTFail("Expected resource link content block")
        }
    }

    func testDecodeUnknownContentBlock() throws {
        let json = """
        {"_meta":{},"type":"future_type","data":"something"}
        """
        let block = try decoder.decode(AcpContentBlock.self, from: json.data(using: .utf8)!)
        if case .unknown = block {
            // Expected
        } else {
            XCTFail("Expected unknown content block")
        }
    }

    // MARK: - Tool Call Decoding

    func testDecodeToolCall() throws {
        let json = """
        {
            "_meta":{},
            "toolCallId":"tc-123",
            "title":"Read file.swift",
            "kind":"read",
            "status":"completed",
            "locations":[{"_meta":{},"path":"src/main.swift","line":42}]
        }
        """
        let toolCall = try decoder.decode(AcpToolCall.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(toolCall.toolCallId, "tc-123")
        XCTAssertEqual(toolCall.title, "Read file.swift")
        XCTAssertEqual(toolCall.kind, .read)
        XCTAssertEqual(toolCall.status, .completed)
        XCTAssertEqual(toolCall.locations?.count, 1)
        XCTAssertEqual(toolCall.locations?[0].path, "src/main.swift")
        XCTAssertEqual(toolCall.locations?[0].line, 42)
    }

    func testDecodeToolCallWithContent() throws {
        let json = """
        {
            "_meta":{},
            "toolCallId":"tc-456",
            "title":"Edit file",
            "kind":"edit",
            "content":[
                {"_meta":{},"type":"diff","path":"src/app.swift","newText":"new code","oldText":"old code"}
            ]
        }
        """
        let toolCall = try decoder.decode(AcpToolCall.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(toolCall.content?.count, 1)
        if case .diff(let path, let newText, let oldText) = toolCall.content?[0] {
            XCTAssertEqual(path, "src/app.swift")
            XCTAssertEqual(newText, "new code")
            XCTAssertEqual(oldText, "old code")
        } else {
            XCTFail("Expected diff content")
        }
    }

    // MARK: - Plan Entry Decoding

    func testDecodePlanEntry() throws {
        let json = """
        {"_meta":{},"content":"Implement feature X","priority":"high","status":"in_progress"}
        """
        let entry = try decoder.decode(AcpPlanEntry.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(entry.content, "Implement feature X")
        XCTAssertEqual(entry.priority, .high)
        XCTAssertEqual(entry.status, .inProgress)
    }

    // MARK: - Session Update Decoding (All 11 Kinds)

    func testDecodeUserMessageChunk() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"user_message_chunk","content":{"_meta":{},"type":"text","text":"user input"}}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .userMessageChunk(let content) = update {
            XCTAssertEqual(content.text, "user input")
        } else {
            XCTFail("Expected userMessageChunk")
        }
    }

    func testDecodeAgentMessageChunk() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"agent_message_chunk","content":{"_meta":{},"type":"text","text":"agent reply"}}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .agentMessageChunk(let content) = update {
            XCTAssertEqual(content.text, "agent reply")
        } else {
            XCTFail("Expected agentMessageChunk")
        }
    }

    func testDecodeAgentThoughtChunk() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"agent_thought_chunk","content":{"_meta":{},"type":"text","text":"thinking..."}}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .agentThoughtChunk(let content) = update {
            XCTAssertEqual(content.text, "thinking...")
        } else {
            XCTFail("Expected agentThoughtChunk")
        }
    }

    func testDecodeToolCallUpdate() throws {
        let json = """
        {
            "_meta":{},
            "sessionUpdate":"tool_call",
            "toolCallId":"tc-1",
            "title":"Read file",
            "kind":"read",
            "status":"pending"
        }
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .toolCall(let tc) = update {
            XCTAssertEqual(tc.toolCallId, "tc-1")
            XCTAssertEqual(tc.title, "Read file")
        } else {
            XCTFail("Expected toolCall")
        }
    }

    func testDecodeToolCallStatusUpdate() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"tool_call_update","toolCallId":"tc-1","status":"completed"}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .toolCallUpdate(let tcu) = update {
            XCTAssertEqual(tcu.toolCallId, "tc-1")
            XCTAssertEqual(tcu.status, .completed)
        } else {
            XCTFail("Expected toolCallUpdate")
        }
    }

    func testDecodePlanUpdate() throws {
        let json = """
        {
            "_meta":{},
            "sessionUpdate":"plan",
            "entries":[
                {"_meta":{},"content":"Step 1","priority":"high","status":"completed"},
                {"_meta":{},"content":"Step 2","priority":"medium","status":"pending"}
            ]
        }
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .plan(let entries) = update {
            XCTAssertEqual(entries.count, 2)
            XCTAssertEqual(entries[0].content, "Step 1")
        } else {
            XCTFail("Expected plan")
        }
    }

    func testDecodeAvailableCommandsUpdate() throws {
        let json = """
        {
            "_meta":{},
            "sessionUpdate":"available_commands_update",
            "availableCommands":[
                {"_meta":{},"name":"/help","description":"Show help"}
            ]
        }
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .availableCommandsUpdate(let cmds) = update {
            XCTAssertEqual(cmds.count, 1)
            XCTAssertEqual(cmds[0].name, "/help")
        } else {
            XCTFail("Expected availableCommandsUpdate")
        }
    }

    func testDecodeCurrentModeUpdate() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"current_mode_update","currentModeId":"architect"}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .currentModeUpdate(let modeId) = update {
            XCTAssertEqual(modeId, "architect")
        } else {
            XCTFail("Expected currentModeUpdate")
        }
    }

    func testDecodeConfigOptionUpdate() throws {
        let json = """
        {
            "_meta":{},
            "sessionUpdate":"config_option_update",
            "configOptions":[{
                "_meta":{},
                "type":"select",
                "id":"model",
                "name":"Model",
                "currentValue":"claude-4",
                "options":[
                    {"_meta":{},"value":"claude-4","name":"Claude 4"},
                    {"_meta":{},"value":"claude-3","name":"Claude 3"}
                ]
            }]
        }
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .configOptionUpdate(let opts) = update {
            XCTAssertEqual(opts.count, 1)
            XCTAssertEqual(opts[0].id, "model")
        } else {
            XCTFail("Expected configOptionUpdate")
        }
    }

    func testDecodeSessionInfoUpdate() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"session_info_update","title":"My Session","updatedAt":"2026-01-01T00:00:00Z"}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .sessionInfoUpdate(let title, let updatedAt) = update {
            XCTAssertEqual(title, "My Session")
            XCTAssertEqual(updatedAt, "2026-01-01T00:00:00Z")
        } else {
            XCTFail("Expected sessionInfoUpdate")
        }
    }

    func testDecodeUsageUpdate() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"usage_update","used":50000,"size":200000,"cost":{"amount":0.05,"currency":"USD"}}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .usageUpdate(let used, let size, let cost) = update {
            XCTAssertEqual(used, 50000)
            XCTAssertEqual(size, 200000)
            XCTAssertEqual(cost?.amount, 0.05)
        } else {
            XCTFail("Expected usageUpdate")
        }
    }

    func testDecodeUnknownSessionUpdate() throws {
        let json = """
        {"_meta":{},"sessionUpdate":"some_future_type","data":"whatever"}
        """
        let update = try decoder.decode(AcpSessionUpdate.self, from: json.data(using: .utf8)!)
        if case .unknown(let kind) = update {
            XCTAssertEqual(kind, "some_future_type")
        } else {
            XCTFail("Expected unknown")
        }
    }

    // MARK: - Permission Types

    func testDecodePermissionOption() throws {
        let json = """
        {"_meta":{},"optionId":"opt-1","name":"Allow Once","kind":"allow_once"}
        """
        let option = try decoder.decode(AcpPermissionOption.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(option.optionId, "opt-1")
        XCTAssertEqual(option.name, "Allow Once")
        XCTAssertEqual(option.kind, .allowOnce)
    }

    func testDecodeWirePermissionRequest() throws {
        let json = """
        {
            "_meta":{},
            "sessionId":"session-1",
            "toolCall":{
                "_meta":{},
                "toolCallId":"tc-1",
                "title":"Write to file"
            },
            "options":[
                {"_meta":{},"optionId":"opt-1","name":"Allow","kind":"allow_once"},
                {"_meta":{},"optionId":"opt-2","name":"Reject","kind":"reject_once"}
            ]
        }
        """
        let request = try decoder.decode(AcpWirePermissionRequest.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(request.sessionId, "session-1")
        XCTAssertEqual(request.toolCall.toolCallId, "tc-1")
        XCTAssertEqual(request.options.count, 2)
    }

    // MARK: - Agent Registry

    func testDecodeAgentRegistryState() throws {
        let json = """
        {
            "agents": {
                "claude-code": {
                    "id": "claude-code",
                    "name": "Claude Code",
                    "description": "Anthropic coding agent",
                    "status": "connected",
                    "version": "1.0.0"
                }
            },
            "activeAgentId": "claude-code",
            "switching": false,
            "switchError": null
        }
        """
        let registry = try decoder.decode(AcpAgentRegistryState.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(registry.agents.count, 1)
        XCTAssertEqual(registry.activeAgentId, "claude-code")
        XCTAssertEqual(registry.activeAgent?.name, "Claude Code")
        XCTAssertEqual(registry.activeAgent?.status, .connected)
        XCTAssertFalse(registry.switching)
    }

    // MARK: - Config Select Options

    func testDecodeConfigWithGroupedOptions() throws {
        let json = """
        {
            "_meta":{},
            "type":"select",
            "id":"model",
            "name":"Model",
            "currentValue":"claude-4",
            "options":[
                {
                    "_meta":{},
                    "group":"anthropic",
                    "name":"Anthropic Models",
                    "options":[
                        {"_meta":{},"value":"claude-4","name":"Claude 4"},
                        {"_meta":{},"value":"claude-3","name":"Claude 3"}
                    ]
                }
            ]
        }
        """
        let config = try decoder.decode(AcpSessionConfigOption.self, from: json.data(using: .utf8)!)
        XCTAssertEqual(config.id, "model")
        if case .grouped(let groups) = config.options {
            XCTAssertEqual(groups.count, 1)
            XCTAssertEqual(groups[0].name, "Anthropic Models")
            XCTAssertEqual(groups[0].options.count, 2)
        } else {
            XCTFail("Expected grouped options")
        }
    }
}
