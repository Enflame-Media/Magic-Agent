//
//  AcpToolCallView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays a tool call or tool result content block.
///
/// Shows the tool name, file path (if applicable), status indicator,
/// and tool output with syntax-appropriate formatting.
struct AcpToolCallView: View {

    let block: AcpContentBlock
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            Button {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isExpanded.toggle()
                }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: toolIcon)
                        .font(.subheadline)
                        .foregroundStyle(.orange)

                    if let toolName = block.metadata?.toolName {
                        Text(toolName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)
                    }

                    // Status
                    statusBadge

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            // File path
            if let filePath = block.metadata?.filePath {
                Text(filePath)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            // Content (collapsible)
            if isExpanded {
                Text(block.content)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(6)
            }
        }
        .padding(12)
        .background(Color.orange.opacity(0.08))
        .cornerRadius(12)
    }

    private var toolIcon: String {
        guard let toolName = block.metadata?.toolName else {
            return "wrench.fill"
        }
        switch toolName.lowercased() {
        case "read": return "doc.text.fill"
        case "edit": return "pencil"
        case "write": return "square.and.pencil"
        case "bash": return "terminal.fill"
        case "grep", "glob": return "magnifyingglass"
        default: return "wrench.fill"
        }
    }

    private var statusBadge: some View {
        Group {
            switch block.status {
            case .pending:
                Image(systemName: "clock")
                    .font(.caption2)
                    .foregroundStyle(.gray)
            case .streaming:
                ProgressView()
                    .scaleEffect(0.6)
            case .completed:
                Image(systemName: "checkmark.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(.green)
            case .failed:
                Image(systemName: "xmark.circle.fill")
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    AcpToolCallView(block: AcpContentBlock.samples[1])
        .padding()
}
