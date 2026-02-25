//
//  AcpStreamingTextView.swift
//  Happy
//
//  Renders streaming Markdown text using AttributedString.
//

import SwiftUI

/// Renders streaming Markdown text content using iOS 16+ AttributedString.
struct AcpStreamingTextView: View {

    let text: String

    @Environment(\.colorScheme) private var colorScheme

    // MARK: - Body

    var body: some View {
        if text.isEmpty {
            EmptyView()
        } else if containsBlockElements {
            blockContent
                .textSelection(.enabled)
        } else {
            inlineMarkdownText(text)
                .textSelection(.enabled)
        }
    }

    // MARK: - Block Content

    private var blockContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(Array(parseBlocks().enumerated()), id: \.offset) { _, block in
                blockView(for: block)
            }
        }
    }

    // MARK: - Block Types

    private enum TextBlock {
        case heading(level: Int, text: String)
        case codeBlock(code: String)
        case paragraph(text: String)
    }

    @ViewBuilder
    private func blockView(for block: TextBlock) -> some View {
        switch block {
        case .heading(let level, let content):
            inlineMarkdownText(content)
                .font(headingFont(level: level))
                .fontWeight(.bold)
                .padding(.top, level <= 2 ? 4 : 2)

        case .codeBlock(let code):
            Text(code)
                .font(.system(.callout, design: .monospaced))
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(codeBackgroundColor)
                .cornerRadius(6)

        case .paragraph(let content):
            inlineMarkdownText(content)
        }
    }

    // MARK: - Inline Markdown

    private func inlineMarkdownText(_ source: String) -> Text {
        if let attributed = try? AttributedString(
            markdown: source,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        ) {
            return Text(attributed)
        }
        return Text(source)
    }

    private func headingFont(level: Int) -> Font {
        switch level {
        case 1: return .title
        case 2: return .title2
        case 3: return .title3
        default: return .headline
        }
    }

    // MARK: - Parsing

    private var containsBlockElements: Bool {
        text.contains("\n") && text.split(separator: "\n").contains { line in
            let t = line.trimmingCharacters(in: .whitespaces)
            return t.hasPrefix("#") || t.hasPrefix("```")
        }
    }

    private func parseBlocks() -> [TextBlock] {
        let lines = text.components(separatedBy: "\n")
        var blocks: [TextBlock] = []
        var i = 0
        var paragraphLines: [String] = []

        func flushParagraph() {
            guard !paragraphLines.isEmpty else { return }
            blocks.append(.paragraph(text: paragraphLines.joined(separator: "\n")))
            paragraphLines.removeAll()
        }

        while i < lines.count {
            let line = lines[i]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            if let h = matchHeading(trimmed) {
                flushParagraph()
                blocks.append(.heading(level: h.level, text: h.text))
                i += 1
            } else if trimmed.hasPrefix("```") {
                flushParagraph()
                var codeLines: [String] = []
                i += 1
                while i < lines.count {
                    if lines[i].trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                        i += 1
                        break
                    }
                    codeLines.append(lines[i])
                    i += 1
                }
                blocks.append(.codeBlock(code: codeLines.joined(separator: "\n")))
            } else if trimmed.isEmpty {
                flushParagraph()
                i += 1
            } else {
                paragraphLines.append(line)
                i += 1
            }
        }
        flushParagraph()
        return blocks
    }

    private func matchHeading(_ line: String) -> (level: Int, text: String)? {
        var level = 0
        var remaining = line[...]
        while remaining.hasPrefix("#") && level < 6 {
            level += 1
            remaining = remaining.dropFirst()
        }
        guard level > 0, remaining.hasPrefix(" ") else { return nil }
        return (level, String(remaining.dropFirst()).trimmingCharacters(in: .whitespaces))
    }

    private var codeBackgroundColor: Color {
        colorScheme == .dark
            ? Color(red: 0.11, green: 0.12, blue: 0.14)
            : Color(red: 0.95, green: 0.96, blue: 0.97)
    }
}
