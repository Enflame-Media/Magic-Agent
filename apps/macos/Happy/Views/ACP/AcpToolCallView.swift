//
//  AcpToolCallView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Tool call cards with kind-specific SF Symbol icons, status badge, and file locations.
//

import SwiftUI

/// Displays a tool call with its kind-specific icon, status, input/output, and file path.
///
/// Shows a collapsible card with the tool name, status badge, and optional
/// file path. When expanded, shows input parameters and output results.
struct AcpToolCallView: View {
    /// The tool call to display.
    let toolCall: AcpToolCall

    /// Whether the detail section is expanded.
    @State private var isExpanded = false

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: 8) {
                // Input
                if let input = toolCall.input, !input.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("acp.toolcall.input".localized)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                        Text(input)
                            .font(.caption)
                            .fontDesign(.monospaced)
                            .textSelection(.enabled)
                            .lineLimit(8)
                    }
                }

                // Output
                if let output = toolCall.output, !output.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("acp.toolcall.output".localized)
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                        Text(output)
                            .font(.caption)
                            .fontDesign(.monospaced)
                            .textSelection(.enabled)
                            .lineLimit(10)
                    }
                }

                // Duration
                if let duration = toolCall.duration {
                    Text(String(format: "%.2fs", duration))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.top, 8)
        } label: {
            HStack(spacing: 8) {
                // Kind icon
                Image(systemName: toolCall.kind.iconName)
                    .font(.system(size: 12))
                    .foregroundStyle(statusColor)
                    .frame(width: 16)
                    .symbolEffect(.pulse, isActive: toolCall.status == .running)

                // Tool name
                Text(toolCall.name)
                    .font(.caption)
                    .fontWeight(.medium)

                // File path
                if let filePath = toolCall.filePath {
                    Text(filePath)
                        .font(.caption2)
                        .fontDesign(.monospaced)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.middle)
                }

                Spacer()

                // Status badge
                statusBadge
            }
        }
        .padding(8)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Status Badge

    @ViewBuilder
    private var statusBadge: some View {
        Text(toolCall.status.rawValue.uppercased())
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.15))
            .foregroundStyle(statusColor)
            .clipShape(Capsule())
    }

    // MARK: - Colors

    private var statusColor: Color {
        switch toolCall.status {
        case .pending: return .gray
        case .running: return .orange
        case .completed: return .green
        case .failed: return .red
        }
    }
}

// MARK: - Tool Call List

/// Displays a list of tool calls.
struct AcpToolCallListView: View {
    /// The tool calls to display.
    let toolCalls: [AcpToolCall]

    var body: some View {
        if !toolCalls.isEmpty {
            VStack(alignment: .leading, spacing: 4) {
                Text("acp.toolcalls.label".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                ForEach(toolCalls) { toolCall in
                    AcpToolCallView(toolCall: toolCall)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 8) {
        AcpToolCallView(toolCall: AcpToolCall(
            id: "tc-1",
            name: "Read",
            kind: .fileRead,
            status: .completed,
            input: "src/routes/auth.ts",
            output: nil,
            filePath: "src/routes/auth.ts",
            duration: 0.15
        ))

        AcpToolCallView(toolCall: AcpToolCall(
            id: "tc-2",
            name: "Bash",
            kind: .bash,
            status: .running,
            input: "npm test -- --grep auth",
            output: nil,
            filePath: nil,
            duration: nil
        ))

        AcpToolCallView(toolCall: AcpToolCall(
            id: "tc-3",
            name: "Edit",
            kind: .fileEdit,
            status: .failed,
            input: nil,
            output: "Permission denied",
            filePath: "src/config.ts",
            duration: 0.02
        ))
    }
    .padding()
    .frame(width: 500)
}
