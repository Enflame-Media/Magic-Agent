//
//  AcpDiffView.swift
//  Happy
//
//  Monospace diff display with line coloring for additions and deletions.
//

import SwiftUI

/// Displays a code diff with path header, line numbers, and colored additions/deletions.
struct AcpDiffView: View {

    let path: String
    let newText: String?
    let oldText: String?

    @Environment(\.colorScheme) private var colorScheme

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Path header
            HStack(spacing: 6) {
                Image(systemName: "doc.text")
                    .font(.caption)
                Text(path)
                    .font(.system(.caption, design: .monospaced))
                    .lineLimit(1)
            }
            .foregroundColor(.secondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(headerBackground)

            Divider()

            // Diff content
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(diffLines.enumerated()), id: \.offset) { idx, line in
                        diffLineView(line, lineNumber: idx + 1)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .background(diffBackground)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color(.systemGray4), lineWidth: 0.5)
        )
    }

    // MARK: - Diff Line

    private struct DiffLine {
        let prefix: String // "+", "-", or " "
        let text: String
    }

    private func diffLineView(_ line: DiffLine, lineNumber: Int) -> some View {
        HStack(alignment: .top, spacing: 0) {
            // Line number
            Text("\(lineNumber)")
                .font(.system(.caption2, design: .monospaced))
                .foregroundColor(.secondary)
                .frame(width: 32, alignment: .trailing)
                .padding(.trailing, 4)

            // Prefix
            Text(line.prefix)
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(lineColor(line.prefix))
                .frame(width: 14)

            // Content
            Text(line.text)
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(.primary)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 1)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(lineBackground(line.prefix))
    }

    // MARK: - Colors

    private func lineColor(_ prefix: String) -> Color {
        switch prefix {
        case "+": return .green
        case "-": return .red
        default: return .secondary
        }
    }

    private func lineBackground(_ prefix: String) -> Color {
        switch prefix {
        case "+": return Color.green.opacity(0.08)
        case "-": return Color.red.opacity(0.08)
        default: return .clear
        }
    }

    private var headerBackground: Color {
        colorScheme == .dark
            ? Color(red: 0.15, green: 0.16, blue: 0.18)
            : Color(red: 0.93, green: 0.94, blue: 0.96)
    }

    private var diffBackground: Color {
        colorScheme == .dark
            ? Color(red: 0.1, green: 0.1, blue: 0.12)
            : Color(red: 0.98, green: 0.98, blue: 0.99)
    }

    // MARK: - Diff Computation

    private var diffLines: [DiffLine] {
        let oldLines = (oldText ?? "").components(separatedBy: "\n")
        let newLines = (newText ?? "").components(separatedBy: "\n")

        // Simple line-by-line diff
        var result: [DiffLine] = []
        let maxCount = max(oldLines.count, newLines.count)

        if oldText != nil && newText != nil {
            // Show removals then additions (simplified)
            for line in oldLines where !line.isEmpty {
                if !newLines.contains(line) {
                    result.append(DiffLine(prefix: "-", text: line))
                }
            }
            for line in newLines {
                if oldLines.contains(line) {
                    result.append(DiffLine(prefix: " ", text: line))
                } else {
                    result.append(DiffLine(prefix: "+", text: line))
                }
            }
        } else if let newText = newText {
            for line in newText.components(separatedBy: "\n") {
                result.append(DiffLine(prefix: "+", text: line))
            }
        } else if let oldText = oldText {
            for line in oldText.components(separatedBy: "\n") {
                result.append(DiffLine(prefix: "-", text: line))
            }
        }

        if result.isEmpty {
            _ = maxCount // suppress unused warning
            return [DiffLine(prefix: " ", text: "acp.diff.noChanges".localized)]
        }
        return result
    }
}
