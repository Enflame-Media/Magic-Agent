//
//  AcpResourceView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays a resource content block (file reference, URL, etc.).
///
/// Shows a compact card with resource type icon, path, and
/// a preview of the resource content if available.
struct AcpResourceView: View {

    let block: AcpContentBlock

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack(spacing: 8) {
                Image(systemName: resourceIcon)
                    .font(.subheadline)
                    .foregroundStyle(.cyan)

                VStack(alignment: .leading, spacing: 2) {
                    if let filePath = block.metadata?.filePath {
                        Text(filePath)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .lineLimit(1)
                    }

                    if let language = block.metadata?.language {
                        Text(language)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Image(systemName: "arrow.right.circle")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            // Content preview
            if !block.content.isEmpty {
                Text(block.content)
                    .font(.system(.caption, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .lineLimit(5)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(8)
                    .background(Color(.systemGray6))
                    .cornerRadius(6)
            }
        }
        .padding(12)
        .background(Color.cyan.opacity(0.08))
        .cornerRadius(12)
    }

    private var resourceIcon: String {
        guard let mimeType = block.metadata?.mimeType else {
            return "doc.fill"
        }
        if mimeType.hasPrefix("image/") {
            return "photo.fill"
        } else if mimeType.hasPrefix("text/") {
            return "doc.text.fill"
        } else {
            return "doc.fill"
        }
    }
}

// MARK: - Preview

#Preview {
    AcpResourceView(block: AcpContentBlock(
        id: "resource-1",
        type: .resource,
        content: "export function validateToken(token: string): boolean {\n  return token.length > 0;\n}",
        status: .completed,
        createdAt: Date(),
        metadata: AcpContentBlockMetadata(
            toolName: nil,
            filePath: "src/auth/service.ts",
            language: "TypeScript",
            exitCode: nil,
            mimeType: "text/typescript",
            planSteps: nil
        )
    ))
    .padding()
}
