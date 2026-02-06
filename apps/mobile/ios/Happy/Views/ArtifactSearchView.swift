//
//  ArtifactSearchView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A view that provides in-content search functionality for artifact content.
///
/// Displays a search bar and highlights matching text within the artifact content.
/// Supports navigating between matches with previous/next buttons and shows
/// the current match index and total count.
struct ArtifactSearchBar: View {

    /// Binding to the current search query text.
    @Binding var searchText: String

    /// The total number of matches found.
    let matchCount: Int

    /// The index of the currently focused match (0-based).
    let currentMatchIndex: Int

    /// Callback when the user taps the "previous" button.
    var onPrevious: () -> Void

    /// Callback when the user taps the "next" button.
    var onNext: () -> Void

    /// Callback when the user taps the dismiss button.
    var onDismiss: () -> Void

    @FocusState private var isSearchFocused: Bool

    var body: some View {
        HStack(spacing: 8) {
            // Search field
            HStack(spacing: 6) {
                Image(systemName: "magnifyingglass")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                TextField("artifacts.searchInContent".localized, text: $searchText)
                    .font(.callout)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($isSearchFocused)

                if !searchText.isEmpty {
                    // Match count indicator
                    Text(matchCountText)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    Button {
                        searchText = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .background(Color(.systemGray6))
            .cornerRadius(8)

            // Navigation buttons (visible when there are matches)
            if !searchText.isEmpty && matchCount > 0 {
                HStack(spacing: 4) {
                    Button {
                        onPrevious()
                    } label: {
                        Image(systemName: "chevron.up")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .disabled(matchCount <= 1)

                    Button {
                        onNext()
                    } label: {
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .disabled(matchCount <= 1)
                }
            }

            // Dismiss button
            Button {
                onDismiss()
            } label: {
                Text("common.done".localized)
                    .font(.callout)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.bar)
        .onAppear {
            isSearchFocused = true
        }
    }

    private var matchCountText: String {
        if matchCount == 0 {
            return "artifacts.searchNoResults".localized
        }
        return "\(currentMatchIndex + 1)/\(matchCount)"
    }
}

// MARK: - Search Result Model

/// Represents a single search match within content.
struct ContentSearchMatch: Identifiable {
    let id = UUID()

    /// The range of the match within the content string.
    let range: Range<String.Index>

    /// The line number where the match occurs (1-based).
    let lineNumber: Int

    /// A snippet of context around the match.
    let contextSnippet: String
}

// MARK: - Content Search Engine

/// A lightweight search engine for finding text matches within artifact content.
struct ContentSearchEngine {

    /// Finds all occurrences of the query in the content.
    ///
    /// - Parameters:
    ///   - query: The text to search for.
    ///   - content: The content to search within.
    ///   - caseInsensitive: Whether the search is case-insensitive. Defaults to `true`.
    /// - Returns: An array of `ContentSearchMatch` values.
    static func search(
        query: String,
        in content: String,
        caseInsensitive: Bool = true
    ) -> [ContentSearchMatch] {
        guard !query.isEmpty, !content.isEmpty else { return [] }

        let options: String.CompareOptions = caseInsensitive ? [.caseInsensitive] : []
        var matches: [ContentSearchMatch] = []
        var searchRange = content.startIndex..<content.endIndex

        // Pre-compute line number offsets
        let lines = content.components(separatedBy: "\n")
        var lineStartOffsets: [(startIndex: String.Index, lineNumber: Int)] = []
        var currentLineStart = content.startIndex
        for (lineIndex, line) in lines.enumerated() {
            lineStartOffsets.append((startIndex: currentLineStart, lineNumber: lineIndex + 1))
            currentLineStart = content.index(currentLineStart, offsetBy: line.count + 1, limitedBy: content.endIndex) ?? content.endIndex
        }

        while let range = content.range(of: query, options: options, range: searchRange) {
            // Find the line number for this match
            let lineNumber = lineStartOffsets.last(where: { $0.startIndex <= range.lowerBound })?.lineNumber ?? 1

            // Build context snippet (up to 40 chars before and after)
            let contextStart = content.index(range.lowerBound, offsetBy: -40, limitedBy: content.startIndex) ?? content.startIndex
            let contextEnd = content.index(range.upperBound, offsetBy: 40, limitedBy: content.endIndex) ?? content.endIndex
            let snippet = String(content[contextStart..<contextEnd])
                .replacingOccurrences(of: "\n", with: " ")

            matches.append(ContentSearchMatch(
                range: range,
                lineNumber: lineNumber,
                contextSnippet: snippet
            ))

            // Advance past this match
            guard let nextStart = content.index(range.lowerBound, offsetBy: 1, limitedBy: content.endIndex) else {
                break
            }
            searchRange = nextStart..<content.endIndex
        }

        return matches
    }

    /// Creates a highlighted `AttributedString` with search matches emphasized.
    ///
    /// - Parameters:
    ///   - content: The full content string.
    ///   - matches: The matches to highlight.
    ///   - currentIndex: The index of the currently focused match.
    ///   - highlightColor: The color for highlighted matches.
    ///   - currentHighlightColor: The color for the currently focused match.
    /// - Returns: An `AttributedString` with highlights applied.
    static func highlightedContent(
        content: String,
        matches: [ContentSearchMatch],
        currentIndex: Int,
        highlightColor: Color = .yellow.opacity(0.3),
        currentHighlightColor: Color = .yellow.opacity(0.7)
    ) -> AttributedString {
        var attributed = AttributedString(content)
        attributed.font = .system(.body, design: .monospaced)

        for (index, match) in matches.enumerated() {
            // Convert String.Index range to AttributedString range
            let nsRange = NSRange(match.range, in: content)
            guard let attrRange = Range<AttributedString.Index>(nsRange, in: attributed) else { continue }

            if index == currentIndex {
                attributed[attrRange].backgroundColor = currentHighlightColor
            } else {
                attributed[attrRange].backgroundColor = highlightColor
            }
        }

        return attributed
    }
}

// MARK: - Preview

#Preview {
    VStack {
        ArtifactSearchBar(
            searchText: .constant("func"),
            matchCount: 5,
            currentMatchIndex: 2,
            onPrevious: {},
            onNext: {},
            onDismiss: {}
        )
        Spacer()
    }
}
