//
//  MarkdownRenderView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view that renders markdown content with proper formatting.
///
/// Uses iOS 15+ `AttributedString` with markdown parsing to render:
/// - Headings (H1-H6)
/// - Bold, italic, strikethrough text
/// - Code spans and fenced code blocks
/// - Links
/// - Lists (ordered and unordered)
/// - Block quotes
///
/// Falls back to plain text rendering if markdown parsing fails.
struct MarkdownRenderView: View {

    /// The raw markdown string to render.
    let content: String

    /// Optional search term to highlight in the rendered content.
    var searchTerm: String?

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(Array(parseBlocks().enumerated()), id: \.offset) { _, block in
                    blockView(for: block)
                }
            }
            .padding()
        }
    }

    // MARK: - Block Types

    private enum MarkdownBlock {
        case heading(level: Int, text: String)
        case paragraph(text: String)
        case codeBlock(language: String?, code: String)
        case blockquote(text: String)
        case unorderedList(items: [String])
        case orderedList(items: [String])
        case horizontalRule
        case empty
    }

    // MARK: - Block Views

    @ViewBuilder
    private func blockView(for block: MarkdownBlock) -> some View {
        switch block {
        case .heading(let level, let text):
            headingView(level: level, text: text)
        case .paragraph(let text):
            inlineMarkdownText(text)
                .textSelection(.enabled)
        case .codeBlock(_, let code):
            codeBlockView(code: code)
        case .blockquote(let text):
            blockquoteView(text: text)
        case .unorderedList(let items):
            unorderedListView(items: items)
        case .orderedList(let items):
            orderedListView(items: items)
        case .horizontalRule:
            Divider()
                .padding(.vertical, 4)
        case .empty:
            EmptyView()
        }
    }

    // MARK: - Heading View

    private func headingView(level: Int, text: String) -> some View {
        let font: Font = {
            switch level {
            case 1: return .title.bold()
            case 2: return .title2.bold()
            case 3: return .title3.bold()
            case 4: return .headline
            case 5: return .subheadline.bold()
            default: return .subheadline.bold()
            }
        }()

        return VStack(alignment: .leading, spacing: 4) {
            inlineMarkdownText(text)
                .font(font)
            if level <= 2 {
                Divider()
            }
        }
        .padding(.top, level <= 2 ? 8 : 4)
    }

    // MARK: - Code Block View

    private func codeBlockView(code: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Spacer()
                Button {
                    UIPasteboard.general.string = code
                } label: {
                    Image(systemName: "doc.on.doc")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.trailing, 8)
                .padding(.top, 6)
            }

            Text(code)
                .font(.system(.callout, design: .monospaced))
                .textSelection(.enabled)
                .padding(.horizontal, 12)
                .padding(.bottom, 12)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(codeBackgroundColor)
        .cornerRadius(8)
    }

    // MARK: - Blockquote View

    private func blockquoteView(text: String) -> some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(Color.accentColor.opacity(0.5))
                .frame(width: 3)

            inlineMarkdownText(text)
                .foregroundStyle(.secondary)
                .padding(.leading, 12)
                .padding(.vertical, 4)
        }
        .padding(.leading, 4)
    }

    // MARK: - List Views

    private func unorderedListView(items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\u{2022}")
                        .foregroundStyle(.secondary)
                    inlineMarkdownText(item)
                }
            }
        }
        .padding(.leading, 8)
    }

    private func orderedListView(items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(items.enumerated()), id: \.offset) { index, item in
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\(index + 1).")
                        .foregroundStyle(.secondary)
                        .frame(minWidth: 20, alignment: .trailing)
                    inlineMarkdownText(item)
                }
            }
        }
        .padding(.leading, 8)
    }

    // MARK: - Inline Markdown Text

    /// Renders inline markdown (bold, italic, code spans, links) using AttributedString.
    private func inlineMarkdownText(_ text: String) -> Text {
        if let attributed = try? AttributedString(markdown: text, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)) {
            return Text(attributed)
        }
        return Text(text)
    }

    // MARK: - Colors

    private var codeBackgroundColor: Color {
        colorScheme == .dark
            ? Color(red: 0.11, green: 0.12, blue: 0.14)
            : Color(red: 0.95, green: 0.96, blue: 0.97)
    }

    // MARK: - Parser

    /// Parses the markdown content into an array of `MarkdownBlock` values.
    ///
    /// This is a lightweight line-by-line parser that handles the most common
    /// markdown constructs. It does not aim to be a full CommonMark parser.
    private func parseBlocks() -> [MarkdownBlock] {
        let lines = content.components(separatedBy: "\n")
        var blocks: [MarkdownBlock] = []
        var index = 0

        while index < lines.count {
            let line = lines[index]
            let trimmed = line.trimmingCharacters(in: .whitespaces)

            // Empty line
            if trimmed.isEmpty {
                index += 1
                continue
            }

            // Horizontal rule
            if trimmed.count >= 3 && (
                trimmed.allSatisfy({ $0 == "-" || $0 == " " }) && trimmed.filter({ $0 == "-" }).count >= 3 ||
                trimmed.allSatisfy({ $0 == "*" || $0 == " " }) && trimmed.filter({ $0 == "*" }).count >= 3 ||
                trimmed.allSatisfy({ $0 == "_" || $0 == " " }) && trimmed.filter({ $0 == "_" }).count >= 3
            ) {
                blocks.append(.horizontalRule)
                index += 1
                continue
            }

            // Heading
            if let headingMatch = matchHeading(trimmed) {
                blocks.append(.heading(level: headingMatch.level, text: headingMatch.text))
                index += 1
                continue
            }

            // Fenced code block
            if trimmed.hasPrefix("```") {
                let language = String(trimmed.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                var codeLines: [String] = []
                index += 1
                while index < lines.count {
                    let codeLine = lines[index]
                    if codeLine.trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                        index += 1
                        break
                    }
                    codeLines.append(codeLine)
                    index += 1
                }
                blocks.append(.codeBlock(
                    language: language.isEmpty ? nil : language,
                    code: codeLines.joined(separator: "\n")
                ))
                continue
            }

            // Blockquote
            if trimmed.hasPrefix(">") {
                var quoteLines: [String] = []
                while index < lines.count {
                    let quoteLine = lines[index].trimmingCharacters(in: .whitespaces)
                    guard quoteLine.hasPrefix(">") else { break }
                    let text = String(quoteLine.dropFirst()).trimmingCharacters(in: .whitespaces)
                    quoteLines.append(text)
                    index += 1
                }
                blocks.append(.blockquote(text: quoteLines.joined(separator: " ")))
                continue
            }

            // Unordered list
            if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") || trimmed.hasPrefix("+ ") {
                var items: [String] = []
                while index < lines.count {
                    let listLine = lines[index].trimmingCharacters(in: .whitespaces)
                    if listLine.hasPrefix("- ") || listLine.hasPrefix("* ") || listLine.hasPrefix("+ ") {
                        items.append(String(listLine.dropFirst(2)))
                    } else if listLine.isEmpty {
                        break
                    } else {
                        // Continuation of previous item
                        if !items.isEmpty {
                            items[items.count - 1] += " " + listLine
                        }
                    }
                    index += 1
                }
                blocks.append(.unorderedList(items: items))
                continue
            }

            // Ordered list
            if let _ = trimmed.range(of: #"^\d+\.\s"#, options: .regularExpression) {
                var items: [String] = []
                while index < lines.count {
                    let listLine = lines[index].trimmingCharacters(in: .whitespaces)
                    if let range = listLine.range(of: #"^\d+\.\s"#, options: .regularExpression) {
                        items.append(String(listLine[range.upperBound...]))
                    } else if listLine.isEmpty {
                        break
                    } else {
                        // Continuation of previous item
                        if !items.isEmpty {
                            items[items.count - 1] += " " + listLine
                        }
                    }
                    index += 1
                }
                blocks.append(.orderedList(items: items))
                continue
            }

            // Paragraph (collect consecutive non-empty lines)
            var paragraphLines: [String] = []
            while index < lines.count {
                let pLine = lines[index]
                let pTrimmed = pLine.trimmingCharacters(in: .whitespaces)
                if pTrimmed.isEmpty || pTrimmed.hasPrefix("#") || pTrimmed.hasPrefix("```") ||
                   pTrimmed.hasPrefix(">") || pTrimmed.hasPrefix("- ") || pTrimmed.hasPrefix("* ") {
                    break
                }
                paragraphLines.append(pTrimmed)
                index += 1
            }
            if !paragraphLines.isEmpty {
                blocks.append(.paragraph(text: paragraphLines.joined(separator: " ")))
            }
        }

        return blocks
    }

    /// Matches a markdown heading line (e.g., "## Title").
    private func matchHeading(_ line: String) -> (level: Int, text: String)? {
        var level = 0
        var remaining = line[...]
        while remaining.hasPrefix("#") && level < 6 {
            level += 1
            remaining = remaining.dropFirst()
        }
        guard level > 0, remaining.hasPrefix(" ") else { return nil }
        let text = String(remaining.dropFirst()).trimmingCharacters(in: .whitespaces)
        return (level: level, text: text)
    }
}

// MARK: - Preview

#Preview {
    MarkdownRenderView(content: """
    # Setup Guide

    ## Prerequisites

    - Xcode 15.0+
    - iOS 16.0+ deployment target
    - Swift 5.9+

    ## Installation

    1. Clone the repository
    2. Open `Happy.xcodeproj`
    3. Build and run

    > This is a blockquote with some important information.

    ### Code Example

    ```swift
    let greeting = "Hello, World!"
    print(greeting)
    ```

    ---

    Here is some **bold** and *italic* text with `inline code`.
    """)
}
