//
//  AcpThoughtView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays an agent's thought/reasoning content block.
///
/// Rendered with a distinct visual style to differentiate thoughts
/// from regular text output. Thoughts are collapsed by default
/// and can be expanded to show the full reasoning.
struct AcpThoughtView: View {

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
                    Image(systemName: "brain")
                        .font(.subheadline)
                        .foregroundStyle(.indigo)

                    Text("acp.thought".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.indigo)

                    if block.status == .streaming {
                        ProgressView()
                            .scaleEffect(0.6)
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            // Content (collapsible)
            if isExpanded || block.status == .streaming {
                Text(block.content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                Text(block.content)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(12)
        .background(Color.indigo.opacity(0.08))
        .cornerRadius(12)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        AcpThoughtView(block: AcpContentBlock(
            id: "thought-1",
            type: .thought,
            content: "I need to examine the authentication service to understand the current implementation before making changes. The token validation might be using an outdated algorithm.",
            status: .completed,
            createdAt: Date(),
            metadata: nil
        ))
    }
    .padding()
}
