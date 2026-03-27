//
//  AcpStreamingTextView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays streaming or completed text content from an ACP agent.
///
/// Shows a typing indicator animation when content is actively streaming,
/// and renders the full text when completed.
struct AcpStreamingTextView: View {

    let content: String
    var isStreaming: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(content)
                .font(.body)
                .frame(maxWidth: .infinity, alignment: .leading)

            if isStreaming {
                HStack(spacing: 4) {
                    ForEach(0..<3) { index in
                        Circle()
                            .fill(Color.purple.opacity(0.6))
                            .frame(width: 6, height: 6)
                            .offset(y: isStreaming ? -4 : 0)
                            .animation(
                                .easeInOut(duration: 0.5)
                                    .repeatForever()
                                    .delay(Double(index) * 0.15),
                                value: isStreaming
                            )
                    }
                }
            }
        }
        .padding(12)
        .background(Color.purple.opacity(0.08))
        .cornerRadius(12)
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        AcpStreamingTextView(
            content: "I found the issue in the authentication service.",
            isStreaming: false
        )
        AcpStreamingTextView(
            content: "Let me analyze the code structure...",
            isStreaming: true
        )
    }
    .padding()
}
