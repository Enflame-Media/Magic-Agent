//
//  AcpContentBlockRenderer.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  ViewBuilder dispatcher for ACP content block types.
//

import SwiftUI

/// Dispatches content blocks to the appropriate specialized view.
///
/// Acts as a factory/router that renders the correct view for each
/// content block type (text, diff, image, terminal, resource).
struct AcpContentBlockRenderer: View {
    /// The content block to render.
    let block: AcpContentBlock

    var body: some View {
        switch block {
        case .text(let textBlock):
            AcpStreamingTextView(text: textBlock.text)

        case .diff(let diffBlock):
            AcpDiffView(diff: diffBlock)

        case .image(let imageBlock):
            AcpImageView(image: imageBlock)

        case .terminal(let terminalBlock):
            AcpTerminalOutputView(terminal: terminalBlock)

        case .resource(let resourceBlock):
            AcpResourceView(resource: resourceBlock)
        }
    }
}

/// Renders a list of content blocks.
struct AcpContentBlockListView: View {
    /// The content blocks to render.
    let blocks: [AcpContentBlock]

    var body: some View {
        if !blocks.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                ForEach(blocks) { block in
                    AcpContentBlockRenderer(block: block)
                }
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ScrollView {
        AcpContentBlockListView(blocks: [
            .text(AcpTextBlock(id: "t1", text: "Here are the changes I made:")),
            .diff(AcpDiffBlock(
                id: "d1",
                filePath: "src/auth.ts",
                hunks: [AcpDiffHunk(
                    id: "h1",
                    lines: [
                        AcpDiffLine(id: "l1", lineNumber: 10, content: "import express from 'express';", type: .context),
                        AcpDiffLine(id: "l2", lineNumber: nil, content: "import jwt from 'jsonwebtoken';", type: .added),
                        AcpDiffLine(id: "l3", lineNumber: 12, content: "const OLD_HANDLER = true;", type: .removed),
                    ]
                )]
            )),
            .terminal(AcpTerminalBlock(
                id: "tm1",
                command: "npm test",
                output: "All tests passed",
                exitCode: 0
            )),
            .resource(AcpResourceBlock(
                id: "r1",
                name: "README.md",
                uri: "file:///project/README.md",
                mimeType: "text/markdown"
            ))
        ])
        .padding()
    }
    .frame(width: 600, height: 500)
}
