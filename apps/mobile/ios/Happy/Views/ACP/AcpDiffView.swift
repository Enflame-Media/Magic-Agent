//
//  AcpDiffView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays a diff content block with added/removed line highlighting.
///
/// Renders unified diff format with green/red line coloring for
/// additions and deletions, and a file path header.
struct AcpDiffView: View {

    let content: String
    let filePath: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // File path header
            if let filePath = filePath {
                HStack(spacing: 6) {
                    Image(systemName: "doc.badge.plus")
                        .font(.caption)
                        .foregroundStyle(.blue)

                    Text(filePath)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.blue)
                        .lineLimit(1)
                }
            }

            // Diff content
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(diffLines.enumerated()), id: \.offset) { _, line in
                        Text(line.text)
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(line.color)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 1)
                            .padding(.horizontal, 8)
                            .background(line.backgroundColor)
                    }
                }
            }
            .background(Color(.systemGray6))
            .cornerRadius(6)
        }
        .padding(12)
        .background(Color.blue.opacity(0.06))
        .cornerRadius(12)
    }

    private var diffLines: [DiffLine] {
        content.components(separatedBy: "\n").map { line in
            if line.hasPrefix("+") && !line.hasPrefix("+++") {
                return DiffLine(text: line, color: .green, backgroundColor: Color.green.opacity(0.1))
            } else if line.hasPrefix("-") && !line.hasPrefix("---") {
                return DiffLine(text: line, color: .red, backgroundColor: Color.red.opacity(0.1))
            } else if line.hasPrefix("@@") {
                return DiffLine(text: line, color: .blue, backgroundColor: Color.blue.opacity(0.05))
            } else {
                return DiffLine(text: line, color: .primary, backgroundColor: .clear)
            }
        }
    }
}

private struct DiffLine {
    let text: String
    let color: Color
    let backgroundColor: Color
}

// MARK: - Preview

#Preview {
    AcpDiffView(
        content: """
        @@ -10,7 +10,8 @@
         function validateToken(token) {
        -  return token !== null;
        +  if (!token) return false;
        +  return token.expiresAt > Date.now();
         }
        """,
        filePath: "src/auth/service.ts"
    )
    .padding()
}
