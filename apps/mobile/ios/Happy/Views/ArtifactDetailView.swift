//
//  ArtifactDetailView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI
import UIKit

/// Displays the contents of a single artifact.
///
/// Supports rendering for different artifact types:
/// - **Code/Config**: Syntax-highlighted code with tap-to-copy on code blocks
/// - **Document**: Full markdown rendering with headings, lists, code blocks
/// - **Image**: Actual image rendering with pinch-to-zoom and pan
/// - **Unknown**: Plain text display
///
/// Also provides:
/// - In-content search with match navigation
/// - Copy-to-clipboard with visual feedback
/// - iOS share sheet integration
struct ArtifactDetailView: View {

    let artifact: Artifact

    @State private var showCopiedToast: Bool = false
    @State private var showShareSheet: Bool = false
    @State private var showLineNumbers: Bool = true
    @State private var showSearch: Bool = false
    @State private var searchText: String = ""
    @State private var searchMatches: [ContentSearchMatch] = []
    @State private var currentMatchIndex: Int = 0
    @State private var codeCopiedBlockId: String?

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 0) {
            // Search bar (conditionally shown)
            if showSearch {
                ArtifactSearchBar(
                    searchText: $searchText,
                    matchCount: searchMatches.count,
                    currentMatchIndex: currentMatchIndex,
                    onPrevious: previousMatch,
                    onNext: nextMatch,
                    onDismiss: dismissSearch
                )
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Content
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Metadata header
                    metadataHeader

                    Divider()

                    // Content
                    contentView
                }
            }
        }
        .navigationTitle(artifact.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
                // Search button
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        showSearch.toggle()
                        if !showSearch {
                            searchText = ""
                            searchMatches = []
                            currentMatchIndex = 0
                        }
                    }
                } label: {
                    Image(systemName: showSearch ? "magnifyingglass.circle.fill" : "magnifyingglass")
                }

                // Toggle line numbers
                if artifact.type == .code || artifact.type == .config {
                    Button {
                        showLineNumbers.toggle()
                    } label: {
                        Image(systemName: showLineNumbers ? "list.number" : "list.bullet")
                    }
                }

                // Copy button
                Button {
                    copyContent()
                } label: {
                    Image(systemName: showCopiedToast ? "checkmark" : "doc.on.doc")
                }

                // Share button
                Button {
                    showShareSheet = true
                } label: {
                    Image(systemName: "square.and.arrow.up")
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(items: shareItems)
        }
        .overlay(alignment: .bottom) {
            if showCopiedToast {
                copiedToastView
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .onChange(of: searchText) { newValue in
            performSearch(query: newValue)
        }
    }

    // MARK: - Metadata Header

    private var metadataHeader: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            Text(artifact.title)
                .font(.headline)

            // File path
            if let filePath = artifact.filePath {
                HStack(spacing: 4) {
                    Image(systemName: "folder")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(filePath)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }

            // Metadata row
            HStack(spacing: 16) {
                // Type badge
                Label(artifact.type.label, systemImage: artifact.type.iconName)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                // Language badge
                if let language = artifact.language, language != .unknown {
                    Text(language.displayName)
                        .font(.caption)
                        .foregroundStyle(.blue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(4)
                }

                Spacer()

                // Size
                if let size = artifact.formattedSize {
                    Text(size)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Line count
                if artifact.type != .image {
                    Text(String(format: "artifacts.lineCount".localized, artifact.lineCount))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
    }

    // MARK: - Content View

    @ViewBuilder
    private var contentView: some View {
        switch artifact.type {
        case .code, .config:
            codeContentView
        case .document:
            documentContentView
        case .image:
            imageContentView
        case .unknown:
            plainTextContentView
        }
    }

    // MARK: - Code Content View

    private var codeContentView: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Tap-to-copy overlay
            ZStack(alignment: .topTrailing) {
                if !searchText.isEmpty, !searchMatches.isEmpty {
                    // Show search-highlighted content
                    ScrollView(.horizontal, showsIndicators: true) {
                        Text(ContentSearchEngine.highlightedContent(
                            content: artifact.content,
                            matches: searchMatches,
                            currentIndex: currentMatchIndex
                        ))
                        .textSelection(.enabled)
                        .padding()
                    }
                    .background(codeBackgroundColor)
                } else {
                    CodeHighlightView(
                        source: artifact.content,
                        language: artifact.language ?? .unknown,
                        showLineNumbers: showLineNumbers
                    )
                }

                // Copy code button overlay
                Button {
                    copyCodeBlock(id: "main")
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: codeCopiedBlockId == "main" ? "checkmark" : "doc.on.doc")
                            .font(.caption2)
                        Text(codeCopiedBlockId == "main" ? "artifacts.copied".localized : "artifacts.copyCode".localized)
                            .font(.caption2)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.ultraThinMaterial)
                    .cornerRadius(6)
                }
                .padding(8)
            }
        }
    }

    // MARK: - Document Content View

    private var documentContentView: some View {
        Group {
            if artifact.language == .markdown || isMarkdownContent {
                if !searchText.isEmpty, !searchMatches.isEmpty {
                    // Show plain text with search highlighting for search mode
                    ScrollView(.horizontal, showsIndicators: true) {
                        Text(ContentSearchEngine.highlightedContent(
                            content: artifact.content,
                            matches: searchMatches,
                            currentIndex: currentMatchIndex
                        ))
                        .textSelection(.enabled)
                        .padding()
                    }
                } else {
                    MarkdownRenderView(content: artifact.content)
                }
            } else {
                plainTextWithSearch
            }
        }
    }

    // MARK: - Image Content View

    private var imageContentView: some View {
        ImageViewerView(
            content: artifact.content,
            title: artifact.title
        )
        .frame(minHeight: 300)
    }

    // MARK: - Plain Text Content View

    private var plainTextContentView: some View {
        plainTextWithSearch
    }

    private var plainTextWithSearch: some View {
        ScrollView(.horizontal, showsIndicators: true) {
            if !searchText.isEmpty, !searchMatches.isEmpty {
                Text(ContentSearchEngine.highlightedContent(
                    content: artifact.content,
                    matches: searchMatches,
                    currentIndex: currentMatchIndex
                ))
                .textSelection(.enabled)
                .padding()
            } else {
                Text(artifact.content)
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)
                    .padding()
            }
        }
    }

    // MARK: - Copied Toast

    private var copiedToastView: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("artifacts.copiedToClipboard".localized)
                .font(.subheadline)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
        .cornerRadius(20)
        .padding(.bottom, 16)
    }

    // MARK: - Share Items

    private var shareItems: [Any] {
        switch artifact.type {
        case .image:
            // Try to share as image data
            var base64 = artifact.content
            if let commaIndex = base64.firstIndex(of: ","),
               base64.hasPrefix("data:image") {
                base64 = String(base64[base64.index(after: commaIndex)...])
            }
            if let data = Data(base64Encoded: base64.trimmingCharacters(in: .whitespacesAndNewlines)),
               let image = UIImage(data: data) {
                return [image]
            }
            return [artifact.content]
        default:
            return [artifact.content]
        }
    }

    // MARK: - Helper Properties

    private var isMarkdownContent: Bool {
        let content = artifact.content
        // Heuristic: check for common markdown patterns
        return content.contains("# ") ||
               content.contains("## ") ||
               content.contains("- ") ||
               content.contains("```") ||
               content.contains("**") ||
               content.contains("1. ")
    }

    private var codeBackgroundColor: Color {
        colorScheme == .dark
            ? Color(red: 0.11, green: 0.12, blue: 0.14)
            : Color(red: 0.98, green: 0.98, blue: 0.99)
    }

    // MARK: - Actions

    private func copyContent() {
        UIPasteboard.general.string = artifact.content

        withAnimation(.easeInOut(duration: 0.2)) {
            showCopiedToast = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation(.easeInOut(duration: 0.2)) {
                showCopiedToast = false
            }
        }
    }

    private func copyCodeBlock(id: String) {
        UIPasteboard.general.string = artifact.content

        withAnimation(.easeInOut(duration: 0.2)) {
            codeCopiedBlockId = id
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation(.easeInOut(duration: 0.2)) {
                codeCopiedBlockId = nil
            }
        }
    }

    // MARK: - Search

    private func performSearch(query: String) {
        guard !query.isEmpty else {
            searchMatches = []
            currentMatchIndex = 0
            return
        }

        searchMatches = ContentSearchEngine.search(query: query, in: artifact.content)
        currentMatchIndex = 0
    }

    private func nextMatch() {
        guard !searchMatches.isEmpty else { return }
        currentMatchIndex = (currentMatchIndex + 1) % searchMatches.count
    }

    private func previousMatch() {
        guard !searchMatches.isEmpty else { return }
        currentMatchIndex = (currentMatchIndex - 1 + searchMatches.count) % searchMatches.count
    }

    private func dismissSearch() {
        withAnimation(.easeInOut(duration: 0.2)) {
            showSearch = false
            searchText = ""
            searchMatches = []
            currentMatchIndex = 0
        }
    }
}

// MARK: - Share Sheet

/// A UIKit-backed share sheet for sharing artifact content.
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ArtifactDetailView(artifact: .sampleCode)
    }
}
