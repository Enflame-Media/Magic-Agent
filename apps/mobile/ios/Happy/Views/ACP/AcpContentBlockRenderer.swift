//
//  AcpContentBlockRenderer.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Renders an ACP content block based on its type.
///
/// Dispatches to the appropriate specialized view (thought, plan,
/// tool call, diff, image, terminal, resource, or streaming text).
struct AcpContentBlockRenderer: View {

    let block: AcpContentBlock

    var body: some View {
        Group {
            switch block.type {
            case .text:
                AcpStreamingTextView(
                    content: block.content,
                    isStreaming: block.status == .streaming
                )
            case .thought:
                AcpThoughtView(block: block)
            case .plan:
                AcpPlanView(block: block)
            case .toolCall:
                AcpToolCallView(block: block)
            case .toolResult:
                AcpToolCallView(block: block)
            case .diff:
                AcpDiffView(content: block.content, filePath: block.metadata?.filePath)
            case .image:
                AcpImageView(content: block.content, mimeType: block.metadata?.mimeType)
            case .terminalOutput:
                AcpTerminalOutputView(
                    content: block.content,
                    exitCode: block.metadata?.exitCode
                )
            case .resource:
                AcpResourceView(block: block)
            case .error:
                errorView
            }
        }
    }

    private var errorView: some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)

            Text(block.content)
                .font(.subheadline)
                .foregroundStyle(.red)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.red.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Preview

#Preview {
    List {
        ForEach(AcpContentBlock.samples) { block in
            AcpContentBlockRenderer(block: block)
                .listRowSeparator(.hidden)
        }
    }
    .listStyle(.plain)
}
