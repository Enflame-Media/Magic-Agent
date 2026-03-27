//
//  AcpDiffView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Monospace diff display with add/remove line coloring, line numbers,
//  and collapsible support for large diffs.
//

import SwiftUI

/// Displays a file diff with line numbers and color-coded additions/removals.
///
/// Features:
/// - Green background for added lines
/// - Red background for removed lines
/// - Line numbers in a gutter column
/// - Collapsible for large diffs (>50 lines)
/// - Monospace font for proper code alignment
/// - Copy-to-clipboard support
struct AcpDiffView: View {
    /// The diff block data.
    let diff: AcpDiffBlock

    /// Whether the diff is expanded (for large diffs).
    @State private var isExpanded = false

    /// Threshold for auto-collapsing large diffs.
    private let collapseThreshold = 50

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // File path header
            fileHeader

            // Diff content
            if shouldCollapse && !isExpanded {
                collapsedView
            } else {
                diffContent
            }
        }
        .background(Color(.textBackgroundColor))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .strokeBorder(Color(.separatorColor).opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - File Header

    @ViewBuilder
    private var fileHeader: some View {
        HStack(spacing: 8) {
            Image(systemName: "doc.text")
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(diff.filePath)
                .font(.caption)
                .fontDesign(.monospaced)
                .fontWeight(.medium)

            Spacer()

            // Stats
            HStack(spacing: 8) {
                if addedCount > 0 {
                    Text("+\(addedCount)")
                        .font(.caption2)
                        .fontDesign(.monospaced)
                        .foregroundStyle(.green)
                }
                if removedCount > 0 {
                    Text("-\(removedCount)")
                        .font(.caption2)
                        .fontDesign(.monospaced)
                        .foregroundStyle(.red)
                }
            }

            // Copy button
            Button {
                copyDiffToClipboard()
            } label: {
                Image(systemName: "doc.on.doc")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .help("acp.diff.copy".localized)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color(.controlBackgroundColor))
    }

    // MARK: - Diff Content

    @ViewBuilder
    private var diffContent: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(allLines) { line in
                    diffLineRow(line)
                }
            }
        }

        if shouldCollapse && isExpanded {
            Button {
                withAnimation {
                    isExpanded = false
                }
            } label: {
                Text("acp.diff.collapse".localized)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func diffLineRow(_ line: AcpDiffLine) -> some View {
        HStack(spacing: 0) {
            // Line number gutter
            Text(line.lineNumber.map { String($0) } ?? "")
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(.tertiary)
                .frame(width: 40, alignment: .trailing)
                .padding(.trailing, 8)

            // Line prefix (+/-/space)
            Text(linePrefix(for: line.type))
                .font(.system(size: 12, design: .monospaced))
                .foregroundStyle(lineColor(for: line.type))
                .frame(width: 14)

            // Line content
            Text(line.content)
                .font(.system(size: 12, design: .monospaced))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, 4)
        .padding(.vertical, 1)
        .background(lineBackground(for: line.type))
    }

    // MARK: - Collapsed View

    @ViewBuilder
    private var collapsedView: some View {
        VStack(spacing: 8) {
            Text("acp.diff.largeCollapsed".localized(totalLineCount))
                .font(.caption)
                .foregroundStyle(.secondary)

            Button {
                withAnimation {
                    isExpanded = true
                }
            } label: {
                Text("acp.diff.expand".localized)
                    .font(.caption)
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
        .padding(16)
    }

    // MARK: - Helpers

    private var allLines: [AcpDiffLine] {
        diff.hunks.flatMap { $0.lines }
    }

    private var totalLineCount: Int {
        allLines.count
    }

    private var addedCount: Int {
        allLines.filter { $0.type == .added }.count
    }

    private var removedCount: Int {
        allLines.filter { $0.type == .removed }.count
    }

    private var shouldCollapse: Bool {
        totalLineCount > collapseThreshold
    }

    private func linePrefix(for type: AcpDiffLineType) -> String {
        switch type {
        case .context: return " "
        case .added: return "+"
        case .removed: return "-"
        }
    }

    private func lineColor(for type: AcpDiffLineType) -> Color {
        switch type {
        case .context: return .secondary
        case .added: return .green
        case .removed: return .red
        }
    }

    private func lineBackground(for type: AcpDiffLineType) -> Color {
        switch type {
        case .context: return .clear
        case .added: return .green.opacity(0.08)
        case .removed: return .red.opacity(0.08)
        }
    }

    private func copyDiffToClipboard() {
        let content = allLines.map { line in
            "\(linePrefix(for: line.type))\(line.content)"
        }.joined(separator: "\n")

        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(content, forType: .string)
    }
}

// MARK: - Preview

#Preview {
    AcpDiffView(diff: AcpDiffBlock(
        id: "diff-1",
        filePath: "src/routes/auth.ts",
        hunks: [AcpDiffHunk(
            id: "hunk-1",
            lines: [
                AcpDiffLine(id: "l1", lineNumber: 10, content: "import { Router } from 'express';", type: .context),
                AcpDiffLine(id: "l2", lineNumber: nil, content: "import { sign, verify } from 'jsonwebtoken';", type: .added),
                AcpDiffLine(id: "l3", lineNumber: nil, content: "import { hashPassword } from './utils';", type: .added),
                AcpDiffLine(id: "l4", lineNumber: 11, content: "", type: .context),
                AcpDiffLine(id: "l5", lineNumber: 15, content: "// Old basic auth handler", type: .removed),
                AcpDiffLine(id: "l6", lineNumber: nil, content: "// JWT-based authentication handler", type: .added),
                AcpDiffLine(id: "l7", lineNumber: 16, content: "export async function authenticate(req, res) {", type: .context),
            ]
        )]
    ))
    .padding()
    .frame(width: 600)
}
