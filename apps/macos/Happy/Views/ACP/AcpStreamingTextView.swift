//
//  AcpStreamingTextView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Renders streaming agent message text with Markdown support using AttributedString.
//

import SwiftUI

/// Renders agent message text with Markdown support.
///
/// Converts Markdown content to an AttributedString for rich text rendering.
/// Shows a streaming indicator when the message is still being received.
struct AcpStreamingTextView: View {
    /// The Markdown text content to render.
    let text: String

    /// Whether this text is actively streaming.
    var isStreaming: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let attributedString = markdownAttributedString {
                Text(attributedString)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                // Fallback to plain text if Markdown parsing fails
                Text(text)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            if isStreaming {
                HStack(spacing: 4) {
                    ProgressView()
                        .scaleEffect(0.5)
                        .frame(width: 12, height: 12)
                    Text("acp.streaming".localized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Markdown Parsing

    /// Convert Markdown text to an AttributedString.
    private var markdownAttributedString: AttributedString? {
        guard !text.isEmpty else { return nil }
        do {
            var attributed = try AttributedString(
                markdown: text,
                options: AttributedString.MarkdownParsingOptions(
                    interpretedSyntax: .inlineOnlyPreservingWhitespace
                )
            )
            // Apply default font
            attributed.font = .body
            return attributed
        } catch {
            return nil
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(alignment: .leading, spacing: 16) {
        AcpStreamingTextView(
            text: "I'll help you **implement the login endpoint**. Let me first look at the existing `auth` setup.",
            isStreaming: false
        )

        AcpStreamingTextView(
            text: "Analyzing the codebase structure...",
            isStreaming: true
        )
    }
    .padding()
    .frame(width: 500)
}
