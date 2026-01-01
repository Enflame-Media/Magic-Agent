//
//  MessageView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view displaying a single message in a session.
struct MessageView: View {
    let message: Message

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Role icon
            roleIcon

            VStack(alignment: .leading, spacing: 8) {
                // Header
                header

                // Content
                content

                // Tool uses
                if let toolUses = message.toolUses, !toolUses.isEmpty {
                    toolUsesSection(toolUses)
                }

                // Cost info
                if let cost = message.cost {
                    costBadge(cost)
                }
            }
        }
        .padding()
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(borderColor, lineWidth: 1)
        )
    }

    // MARK: - Role Icon

    @ViewBuilder
    private var roleIcon: some View {
        ZStack {
            Circle()
                .fill(roleIconBackground)
                .frame(width: 32, height: 32)

            Image(systemName: roleIconName)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(roleIconForeground)
        }
    }

    private var roleIconName: String {
        switch message.role {
        case .user: return "person.fill"
        case .assistant: return "sparkles"
        case .system: return "gearshape.fill"
        case .tool: return "wrench.fill"
        }
    }

    private var roleIconBackground: Color {
        switch message.role {
        case .user: return .blue.opacity(0.15)
        case .assistant: return .purple.opacity(0.15)
        case .system: return .gray.opacity(0.15)
        case .tool: return .orange.opacity(0.15)
        }
    }

    private var roleIconForeground: Color {
        switch message.role {
        case .user: return .blue
        case .assistant: return .purple
        case .system: return .gray
        case .tool: return .orange
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        HStack {
            Text(roleName)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Spacer()

            if message.isStreaming {
                HStack(spacing: 4) {
                    ProgressView()
                        .scaleEffect(0.5)
                    Text("Streaming")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text(formattedTime)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var roleName: String {
        switch message.role {
        case .user: return "You"
        case .assistant: return "Claude"
        case .system: return "System"
        case .tool: return "Tool"
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        Text(message.content)
            .font(.body)
            .textSelection(.enabled)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Tool Uses

    @ViewBuilder
    private func toolUsesSection(_ toolUses: [ToolUse]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tools Used")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)

            ForEach(toolUses) { tool in
                ToolUseRow(toolUse: tool)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Cost Badge

    @ViewBuilder
    private func costBadge(_ cost: MessageCost) -> some View {
        HStack(spacing: 8) {
            Label("\(cost.inputTokens)", systemImage: "arrow.down.circle")
                .font(.caption2)
            Label("\(cost.outputTokens)", systemImage: "arrow.up.circle")
                .font(.caption2)
            Text(cost.formattedCost)
                .font(.caption2)
                .fontWeight(.medium)
                .fontDesign(.monospaced)
        }
        .foregroundStyle(.secondary)
        .padding(.top, 4)
    }

    // MARK: - Styling

    private var backgroundColor: Color {
        switch message.role {
        case .user: return Color(.controlBackgroundColor)
        case .assistant: return Color(.windowBackgroundColor)
        case .system: return Color(.controlBackgroundColor).opacity(0.5)
        case .tool: return Color(.controlBackgroundColor).opacity(0.5)
        }
    }

    private var borderColor: Color {
        Color(.separatorColor).opacity(0.3)
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: message.createdAt)
    }
}

/// A row showing a tool use.
struct ToolUseRow: View {
    let toolUse: ToolUse

    @State private var isExpanded = false

    var body: some View {
        DisclosureGroup(isExpanded: $isExpanded) {
            VStack(alignment: .leading, spacing: 8) {
                if let input = toolUse.input {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Input")
                            .font(.caption2)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                        Text(input)
                            .font(.caption)
                            .fontDesign(.monospaced)
                            .textSelection(.enabled)
                    }
                }

                if let output = toolUse.output {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Output")
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
            }
            .padding(.top, 8)
        } label: {
            HStack {
                Image(systemName: toolIconName)
                    .foregroundStyle(statusColor)

                Text(toolUse.name)
                    .font(.caption)
                    .fontWeight(.medium)

                Spacer()

                statusBadge
            }
        }
        .padding(8)
        .background(Color(.controlBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var toolIconName: String {
        switch toolUse.name.lowercased() {
        case "read": return "doc.text"
        case "write": return "doc.badge.plus"
        case "edit": return "pencil"
        case "bash": return "terminal"
        case "glob": return "folder.badge.gearshape"
        case "grep": return "magnifyingglass"
        default: return "wrench"
        }
    }

    private var statusColor: Color {
        switch toolUse.status {
        case .pending: return .gray
        case .running: return .orange
        case .completed: return .green
        case .failed: return .red
        }
    }

    @ViewBuilder
    private var statusBadge: some View {
        Text(toolUse.status.rawValue.uppercased())
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.15))
            .foregroundStyle(statusColor)
            .clipShape(Capsule())
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        MessageView(message: .sampleUser)
        MessageView(message: .sampleAssistant)
    }
    .padding()
}
