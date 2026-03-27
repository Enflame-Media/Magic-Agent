//
//  AcpModels.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - ACP Session

/// Represents an ACP (Agent Control Protocol) session.
///
/// ACP sessions track the full state of an agent conversation, including
/// messages, thoughts, plans, tool calls, and permission requests.
struct AcpSession: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var status: AcpSessionStatus
    var agentId: String?
    var agentName: String?
    var mode: AcpMode
    var createdAt: Date
    var updatedAt: Date
    var contentBlocks: [AcpContentBlock]
    var pendingPermissions: [AcpPermissionRequest]
    var usage: AcpUsage?

    var isActive: Bool {
        status == .running || status == .waiting
    }

    var hasPendingPermissions: Bool {
        !pendingPermissions.isEmpty
    }
}

enum AcpSessionStatus: String, Codable, Hashable {
    case idle
    case running
    case waiting
    case completed
    case error
    case paused
}

// MARK: - ACP Mode

/// The operating mode of an ACP agent.
enum AcpMode: String, Codable, Hashable {
    case autonomous
    case supervised
    case manual
    case planReview = "plan_review"

    var displayName: String {
        switch self {
        case .autonomous: return "Autonomous"
        case .supervised: return "Supervised"
        case .manual: return "Manual"
        case .planReview: return "Plan Review"
        }
    }

    var icon: String {
        switch self {
        case .autonomous: return "bolt.fill"
        case .supervised: return "eye.fill"
        case .manual: return "hand.raised.fill"
        case .planReview: return "list.clipboard.fill"
        }
    }
}

// MARK: - ACP Content Block

/// A content block in an ACP session (message, thought, plan, tool call, etc.).
struct AcpContentBlock: Identifiable, Codable, Hashable {
    let id: String
    let type: AcpContentBlockType
    var content: String
    var status: AcpContentBlockStatus
    let createdAt: Date
    var metadata: AcpContentBlockMetadata?
}

enum AcpContentBlockType: String, Codable, Hashable {
    case text
    case thought
    case plan
    case toolCall = "tool_call"
    case toolResult = "tool_result"
    case diff
    case image
    case terminalOutput = "terminal_output"
    case resource
    case error
}

enum AcpContentBlockStatus: String, Codable, Hashable {
    case pending
    case streaming
    case completed
    case failed
}

struct AcpContentBlockMetadata: Codable, Hashable {
    var toolName: String?
    var filePath: String?
    var language: String?
    var exitCode: Int?
    var mimeType: String?
    var planSteps: [AcpPlanStep]?
}

// MARK: - ACP Plan

/// A step in an agent's plan.
struct AcpPlanStep: Identifiable, Codable, Hashable {
    let id: String
    var title: String
    var status: AcpPlanStepStatus
    var description: String?
}

enum AcpPlanStepStatus: String, Codable, Hashable {
    case pending
    case inProgress = "in_progress"
    case completed
    case skipped
    case failed
}

// MARK: - ACP Permission Request

/// A permission request from the agent requiring user approval.
struct AcpPermissionRequest: Identifiable, Codable, Hashable {
    let id: String
    let sessionId: String
    let toolName: String
    var description: String
    var filePath: String?
    var command: String?
    var status: AcpPermissionStatus
    let createdAt: Date
    var resolvedAt: Date?
    var resolvedBy: String?
}

enum AcpPermissionStatus: String, Codable, Hashable {
    case pending
    case approved
    case denied
    case expired
}

// MARK: - ACP Agent

/// An agent registered in the ACP system.
struct AcpAgent: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var model: String?
    var status: AcpAgentStatus
    var capabilities: [String]
    var lastActiveAt: Date?
}

enum AcpAgentStatus: String, Codable, Hashable {
    case available
    case busy
    case offline
}

// MARK: - ACP Usage

/// Usage statistics for an ACP session.
struct AcpUsage: Codable, Hashable {
    var inputTokens: Int
    var outputTokens: Int
    var totalCostUSD: Double
    var cacheReadTokens: Int?
    var cacheWriteTokens: Int?

    var formattedCost: String {
        String(format: "$%.4f", totalCostUSD)
    }

    var totalTokens: Int {
        inputTokens + outputTokens
    }
}

// MARK: - ACP Config

/// Configuration for an ACP session.
struct AcpConfig: Codable, Hashable {
    var mode: AcpMode
    var autoApprove: [String]
    var maxTurns: Int?
    var model: String?
    var systemPrompt: String?
}

// MARK: - Sample Data

extension AcpSession {
    static let sample = AcpSession(
        id: "acp-session-123",
        title: "Implementing authentication",
        status: .running,
        agentId: "agent-1",
        agentName: "Claude",
        mode: .supervised,
        createdAt: Date().addingTimeInterval(-3600),
        updatedAt: Date().addingTimeInterval(-60),
        contentBlocks: AcpContentBlock.samples,
        pendingPermissions: [AcpPermissionRequest.sample],
        usage: AcpUsage(
            inputTokens: 15000,
            outputTokens: 8500,
            totalCostUSD: 0.0425,
            cacheReadTokens: 3000,
            cacheWriteTokens: 1500
        )
    )

    static let empty = AcpSession(
        id: "",
        title: "",
        status: .idle,
        agentId: nil,
        agentName: nil,
        mode: .supervised,
        createdAt: Date(),
        updatedAt: Date(),
        contentBlocks: [],
        pendingPermissions: [],
        usage: nil
    )
}

extension AcpContentBlock {
    static let samples: [AcpContentBlock] = [
        AcpContentBlock(
            id: "block-1",
            type: .thought,
            content: "I need to examine the authentication service to understand the current implementation before making changes.",
            status: .completed,
            createdAt: Date().addingTimeInterval(-300),
            metadata: nil
        ),
        AcpContentBlock(
            id: "block-2",
            type: .toolCall,
            content: "Reading src/auth/service.ts",
            status: .completed,
            createdAt: Date().addingTimeInterval(-280),
            metadata: AcpContentBlockMetadata(
                toolName: "Read",
                filePath: "src/auth/service.ts",
                language: nil,
                exitCode: nil,
                mimeType: nil,
                planSteps: nil
            )
        ),
        AcpContentBlock(
            id: "block-3",
            type: .text,
            content: "I found the issue in the authentication service. The token validation is not checking the expiration timestamp correctly.",
            status: .completed,
            createdAt: Date().addingTimeInterval(-240),
            metadata: nil
        ),
        AcpContentBlock(
            id: "block-4",
            type: .plan,
            content: "Fix authentication token validation",
            status: .completed,
            createdAt: Date().addingTimeInterval(-220),
            metadata: AcpContentBlockMetadata(
                toolName: nil,
                filePath: nil,
                language: nil,
                exitCode: nil,
                mimeType: nil,
                planSteps: [
                    AcpPlanStep(id: "step-1", title: "Update token validation logic", status: .completed),
                    AcpPlanStep(id: "step-2", title: "Add expiration check", status: .inProgress),
                    AcpPlanStep(id: "step-3", title: "Write unit tests", status: .pending)
                ]
            )
        )
    ]
}

extension AcpPermissionRequest {
    static let sample = AcpPermissionRequest(
        id: "perm-1",
        sessionId: "acp-session-123",
        toolName: "Edit",
        description: "Edit file src/auth/service.ts to fix token validation",
        filePath: "src/auth/service.ts",
        command: nil,
        status: .pending,
        createdAt: Date().addingTimeInterval(-60),
        resolvedAt: nil,
        resolvedBy: nil
    )
}

extension AcpAgent {
    static let sample = AcpAgent(
        id: "agent-1",
        name: "Claude",
        model: "claude-sonnet-4-20250514",
        status: .busy,
        capabilities: ["code", "analysis", "planning"],
        lastActiveAt: Date()
    )

    static let samples: [AcpAgent] = [
        .sample,
        AcpAgent(
            id: "agent-2",
            name: "Codex",
            model: "codex-mini-latest",
            status: .available,
            capabilities: ["code", "testing"],
            lastActiveAt: Date().addingTimeInterval(-600)
        )
    ]
}
