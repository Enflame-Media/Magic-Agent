//
//  AcpModels.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  ACP (Agent Control Protocol) data models for macOS session display.
//  These types represent the decoded ACP session data from Claude Code / Codex agents.
//

import Foundation

// MARK: - ACP Session

/// Represents an ACP agent session with its full state.
struct AcpSession: Identifiable, Codable, Hashable {
    /// Unique session identifier.
    let id: String

    /// Display title for the session.
    var title: String

    /// The agent mode currently active.
    var mode: AcpMode

    /// Whether the agent is currently streaming output.
    var isStreaming: Bool

    /// Messages in this session.
    var messages: [AcpMessage]

    /// The current execution plan, if any.
    var plan: AcpPlan?

    /// Context window usage information.
    var usage: AcpUsage?

    /// Available slash commands.
    var commands: [AcpCommand]

    /// Current configuration options.
    var config: [AcpConfigOption]

    /// When the session started.
    var createdAt: Date

    /// When the session was last updated.
    var updatedAt: Date
}

// MARK: - ACP Mode

/// The current operating mode of the ACP agent.
enum AcpMode: String, Codable, Hashable, CaseIterable {
    case code
    case ask
    case architect
    case plan

    /// SF Symbol name for this mode.
    var iconName: String {
        switch self {
        case .code: return "chevron.left.forwardslash.chevron.right"
        case .ask: return "questionmark.bubble"
        case .architect: return "building.2"
        case .plan: return "list.clipboard"
        }
    }

    /// Human-readable display name.
    var displayName: String {
        switch self {
        case .code: return "acp.mode.code".localized
        case .ask: return "acp.mode.ask".localized
        case .architect: return "acp.mode.architect".localized
        case .plan: return "acp.mode.plan".localized
        }
    }
}

// MARK: - ACP Message

/// A message in an ACP session (user prompt or agent response).
struct AcpMessage: Identifiable, Codable, Hashable {
    /// Unique message identifier.
    let id: String

    /// The role of the message sender.
    let role: AcpMessageRole

    /// Text content of the message (may contain Markdown).
    var text: String

    /// Rich content blocks within this message.
    var contentBlocks: [AcpContentBlock]

    /// Agent thoughts associated with this message.
    var thoughts: [AcpThought]

    /// Tool calls made during this message.
    var toolCalls: [AcpToolCall]

    /// Whether this message is currently streaming.
    var isStreaming: Bool

    /// Cost information for this message.
    var cost: AcpMessageCost?

    /// When this message was created.
    let createdAt: Date
}

/// The role of a message sender in an ACP session.
enum AcpMessageRole: String, Codable, Hashable {
    case user
    case assistant
    case system
}

/// Cost information for an ACP message.
struct AcpMessageCost: Codable, Hashable {
    /// Input tokens consumed.
    let inputTokens: Int

    /// Output tokens generated.
    let outputTokens: Int

    /// Total cost in USD, if available.
    let totalCostUSD: Double?
}

// MARK: - ACP Thought

/// An agent reasoning thought / inner monologue entry.
struct AcpThought: Identifiable, Codable, Hashable {
    /// Unique thought identifier.
    let id: String

    /// The reasoning text content.
    var text: String

    /// Preview text (first line or truncated).
    var preview: String {
        let firstLine = text.prefix(while: { $0 != "\n" })
        if firstLine.count > 120 {
            return String(firstLine.prefix(117)) + "..."
        }
        return String(firstLine)
    }
}

// MARK: - ACP Plan

/// An execution plan with steps and their statuses.
struct AcpPlan: Identifiable, Codable, Hashable {
    /// Unique plan identifier.
    let id: String

    /// Overall plan title.
    var title: String

    /// Individual plan steps.
    var steps: [AcpPlanStep]

    /// Progress percentage (0.0 to 1.0).
    var progress: Double {
        guard !steps.isEmpty else { return 0 }
        let completed = steps.filter { $0.status == .completed }.count
        return Double(completed) / Double(steps.count)
    }
}

/// A single step within an execution plan.
struct AcpPlanStep: Identifiable, Codable, Hashable {
    /// Unique step identifier.
    let id: String

    /// Description of this step.
    var description: String

    /// Current status.
    var status: AcpPlanStepStatus
}

/// Status of a plan step.
enum AcpPlanStepStatus: String, Codable, Hashable {
    case pending
    case inProgress = "in_progress"
    case completed
    case failed

    /// SF Symbol name for this status.
    var iconName: String {
        switch self {
        case .pending: return "circle"
        case .inProgress: return "arrow.triangle.2.circlepath"
        case .completed: return "checkmark.circle.fill"
        case .failed: return "xmark.circle.fill"
        }
    }

    /// Color for this status indicator.
    var displayColor: String {
        switch self {
        case .pending: return "secondary"
        case .inProgress: return "blue"
        case .completed: return "green"
        case .failed: return "red"
        }
    }
}

// MARK: - ACP Tool Call

/// A tool invocation by the agent.
struct AcpToolCall: Identifiable, Codable, Hashable {
    /// Unique tool call identifier.
    let id: String

    /// The tool name (e.g., Read, Write, Edit, Bash, Grep, Glob).
    let name: String

    /// The kind/category of tool.
    var kind: AcpToolKind

    /// Current execution status.
    var status: AcpToolStatus

    /// Input parameters as a display string.
    var input: String?

    /// Output result as a display string.
    var output: String?

    /// File path involved, if any.
    var filePath: String?

    /// Duration in seconds, if completed.
    var duration: Double?
}

/// Category of tool.
enum AcpToolKind: String, Codable, Hashable {
    case fileRead
    case fileWrite
    case fileEdit
    case bash
    case search
    case glob
    case web
    case mcp
    case other

    /// SF Symbol name for this tool kind.
    var iconName: String {
        switch self {
        case .fileRead: return "doc.text"
        case .fileWrite: return "doc.badge.plus"
        case .fileEdit: return "pencil"
        case .bash: return "terminal"
        case .search: return "magnifyingglass"
        case .glob: return "folder.badge.gearshape"
        case .web: return "globe"
        case .mcp: return "server.rack"
        case .other: return "wrench"
        }
    }
}

/// Status of a tool execution.
enum AcpToolStatus: String, Codable, Hashable {
    case pending
    case running
    case completed
    case failed

    /// SF Symbol name for this status.
    var iconName: String {
        switch self {
        case .pending: return "clock"
        case .running: return "play.circle"
        case .completed: return "checkmark.circle"
        case .failed: return "xmark.circle"
        }
    }
}

// MARK: - ACP Content Block

/// A rich content block within a message.
enum AcpContentBlock: Identifiable, Codable, Hashable {
    case text(AcpTextBlock)
    case diff(AcpDiffBlock)
    case image(AcpImageBlock)
    case terminal(AcpTerminalBlock)
    case resource(AcpResourceBlock)

    var id: String {
        switch self {
        case .text(let b): return b.id
        case .diff(let b): return b.id
        case .image(let b): return b.id
        case .terminal(let b): return b.id
        case .resource(let b): return b.id
        }
    }
}

/// A text content block.
struct AcpTextBlock: Identifiable, Codable, Hashable {
    let id: String
    var text: String
}

/// A diff content block showing file changes.
struct AcpDiffBlock: Identifiable, Codable, Hashable {
    let id: String
    var filePath: String
    var hunks: [AcpDiffHunk]
}

/// A single hunk in a diff.
struct AcpDiffHunk: Identifiable, Codable, Hashable {
    let id: String
    var lines: [AcpDiffLine]
}

/// A single line in a diff hunk.
struct AcpDiffLine: Identifiable, Codable, Hashable {
    let id: String
    var lineNumber: Int?
    var content: String
    var type: AcpDiffLineType
}

/// Type of diff line.
enum AcpDiffLineType: String, Codable, Hashable {
    case context
    case added
    case removed
}

/// An image content block.
struct AcpImageBlock: Identifiable, Codable, Hashable {
    let id: String
    var url: String
    var altText: String?
    var width: Int?
    var height: Int?
}

/// A terminal output content block.
struct AcpTerminalBlock: Identifiable, Codable, Hashable {
    let id: String
    var command: String?
    var output: String
    var exitCode: Int?
}

/// A resource reference content block.
struct AcpResourceBlock: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var uri: String
    var mimeType: String?
}

// MARK: - ACP Usage

/// Context window and cost usage information.
struct AcpUsage: Codable, Hashable {
    /// Tokens used in the context window.
    var tokensUsed: Int

    /// Total context window size in tokens.
    var contextWindowSize: Int

    /// Cost information, if available.
    var cost: AcpCost?

    /// Usage percentage (0.0 to 1.0).
    var percentage: Double {
        guard contextWindowSize > 0 else { return 0 }
        return min(Double(tokensUsed) / Double(contextWindowSize), 1.0)
    }
}

/// Cost information.
struct AcpCost: Codable, Hashable {
    /// Cost amount.
    var amount: Double

    /// Currency code (e.g., "USD").
    var currency: String
}

// MARK: - ACP Command

/// A slash command available in the ACP session.
struct AcpCommand: Identifiable, Codable, Hashable {
    /// Unique command identifier.
    let id: String

    /// The command name (e.g., "/help", "/clear").
    var name: String

    /// Description of what the command does.
    var description: String

    /// Category for grouping.
    var category: String?
}

// MARK: - ACP Config Option

/// A configuration option for the ACP session.
struct AcpConfigOption: Identifiable, Codable, Hashable {
    /// Unique option identifier.
    let id: String

    /// Option display name.
    var name: String

    /// Option description.
    var description: String?

    /// The type of configuration control.
    var type: AcpConfigType

    /// Current value as a string.
    var value: String

    /// Available choices for picker type.
    var choices: [String]?
}

/// Type of configuration control.
enum AcpConfigType: String, Codable, Hashable {
    case toggle
    case picker
    case text
}

// MARK: - Sample Data

extension AcpSession {
    /// Sample ACP session for previews.
    static let sample = AcpSession(
        id: "acp-session-1",
        title: "Implement authentication flow",
        mode: .code,
        isStreaming: false,
        messages: AcpMessage.samples,
        plan: .sample,
        usage: AcpUsage(
            tokensUsed: 85_000,
            contextWindowSize: 200_000,
            cost: AcpCost(amount: 0.42, currency: "USD")
        ),
        commands: AcpCommand.samples,
        config: AcpConfigOption.samples,
        createdAt: Date().addingTimeInterval(-3600),
        updatedAt: Date()
    )
}

extension AcpMessage {
    /// Sample messages for previews.
    static let samples: [AcpMessage] = [
        AcpMessage(
            id: "msg-1",
            role: .user,
            text: "Help me implement the login endpoint with JWT authentication",
            contentBlocks: [],
            thoughts: [],
            toolCalls: [],
            isStreaming: false,
            cost: nil,
            createdAt: Date().addingTimeInterval(-300)
        ),
        AcpMessage(
            id: "msg-2",
            role: .assistant,
            text: "I'll help you implement the login endpoint. Let me first look at the existing authentication setup and then create the JWT-based login flow.\n\nHere's my plan:\n1. Read the current auth configuration\n2. Create the login route handler\n3. Add JWT token generation\n4. Write tests",
            contentBlocks: [
                .diff(AcpDiffBlock(
                    id: "diff-1",
                    filePath: "src/routes/auth.ts",
                    hunks: [AcpDiffHunk(
                        id: "hunk-1",
                        lines: [
                            AcpDiffLine(id: "l1", lineNumber: 10, content: "import { Router } from 'express';", type: .context),
                            AcpDiffLine(id: "l2", lineNumber: nil, content: "import { sign } from 'jsonwebtoken';", type: .added),
                            AcpDiffLine(id: "l3", lineNumber: 11, content: "", type: .context),
                            AcpDiffLine(id: "l4", lineNumber: 15, content: "// Old auth handler", type: .removed),
                            AcpDiffLine(id: "l5", lineNumber: nil, content: "// JWT-based auth handler", type: .added),
                        ]
                    )]
                )),
                .terminal(AcpTerminalBlock(
                    id: "term-1",
                    command: "npm test -- --grep auth",
                    output: "PASS src/routes/auth.test.ts\n  Login endpoint\n    \u{2713} returns JWT token on valid credentials (45ms)\n    \u{2713} returns 401 on invalid password (12ms)\n\nTest Suites: 1 passed, 1 total\nTests:       2 passed, 2 total",
                    exitCode: 0
                ))
            ],
            thoughts: [
                AcpThought(
                    id: "thought-1",
                    text: "The user wants JWT authentication. I should check if jsonwebtoken is already installed as a dependency, then look at the existing route structure to maintain consistency. I need to handle both successful login and error cases properly."
                )
            ],
            toolCalls: [
                AcpToolCall(
                    id: "tc-1",
                    name: "Read",
                    kind: .fileRead,
                    status: .completed,
                    input: "src/routes/auth.ts",
                    output: nil,
                    filePath: "src/routes/auth.ts",
                    duration: 0.15
                ),
                AcpToolCall(
                    id: "tc-2",
                    name: "Edit",
                    kind: .fileEdit,
                    status: .completed,
                    input: nil,
                    output: nil,
                    filePath: "src/routes/auth.ts",
                    duration: 0.08
                ),
                AcpToolCall(
                    id: "tc-3",
                    name: "Bash",
                    kind: .bash,
                    status: .completed,
                    input: "npm test -- --grep auth",
                    output: "2 passed, 2 total",
                    filePath: nil,
                    duration: 3.2
                )
            ],
            isStreaming: false,
            cost: AcpMessageCost(inputTokens: 12500, outputTokens: 3200, totalCostUSD: 0.085),
            createdAt: Date().addingTimeInterval(-240)
        )
    ]
}

extension AcpPlan {
    /// Sample plan for previews.
    static let sample = AcpPlan(
        id: "plan-1",
        title: "Implement JWT Authentication",
        steps: [
            AcpPlanStep(id: "step-1", description: "Read existing auth configuration", status: .completed),
            AcpPlanStep(id: "step-2", description: "Create login route handler", status: .completed),
            AcpPlanStep(id: "step-3", description: "Add JWT token generation", status: .inProgress),
            AcpPlanStep(id: "step-4", description: "Write unit tests", status: .pending),
            AcpPlanStep(id: "step-5", description: "Update API documentation", status: .pending),
        ]
    )
}

extension AcpCommand {
    /// Sample commands for previews.
    static let samples: [AcpCommand] = [
        AcpCommand(id: "cmd-1", name: "/help", description: "Show available commands", category: "General"),
        AcpCommand(id: "cmd-2", name: "/clear", description: "Clear conversation history", category: "General"),
        AcpCommand(id: "cmd-3", name: "/compact", description: "Compact conversation context", category: "Context"),
        AcpCommand(id: "cmd-4", name: "/mode", description: "Switch agent mode", category: "Mode"),
        AcpCommand(id: "cmd-5", name: "/cost", description: "Show session cost summary", category: "Info"),
        AcpCommand(id: "cmd-6", name: "/review", description: "Review recent changes", category: "Code"),
    ]
}

extension AcpConfigOption {
    /// Sample config options for previews.
    static let samples: [AcpConfigOption] = [
        AcpConfigOption(
            id: "cfg-1",
            name: "Auto-approve reads",
            description: "Automatically approve file read operations",
            type: .toggle,
            value: "true",
            choices: nil
        ),
        AcpConfigOption(
            id: "cfg-2",
            name: "Model",
            description: "The AI model to use",
            type: .picker,
            value: "claude-sonnet-4-20250514",
            choices: ["claude-sonnet-4-20250514", "claude-opus-4-20250514", "claude-haiku-3-5"]
        ),
        AcpConfigOption(
            id: "cfg-3",
            name: "Max turns",
            description: "Maximum number of agentic turns",
            type: .text,
            value: "25",
            choices: nil
        ),
    ]
}

extension AcpResourceBlock {
    /// Sample resource for previews.
    static let sample = AcpResourceBlock(
        id: "res-1",
        name: "Authentication Guide",
        uri: "file:///docs/auth-guide.md",
        mimeType: "text/markdown"
    )
}
