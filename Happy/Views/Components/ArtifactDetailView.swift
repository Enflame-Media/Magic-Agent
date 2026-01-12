//
//  ArtifactDetailView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI
import QuickLook
import AppKit
import UniformTypeIdentifiers

/// Detail view for displaying artifact content.
///
/// Features:
/// - QuickLook integration for file preview
/// - Code syntax highlighting (using native AttributedString)
/// - Image viewer with native macOS controls
/// - Drag and drop support for saving files
/// - Copy to clipboard functionality
struct ArtifactDetailView: View {
    let artifact: Artifact
    let isLoading: Bool

    @State private var quickLookURL: URL?
    @State private var showingSavePanel = false
    @State private var copySuccess = false

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 0) {
            // Header with file info
            header

            Divider()

            // Content area
            if isLoading {
                loadingView
            } else if let body = artifact.body {
                contentView(body: body)
            } else {
                noContentView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .quickLookPreview($quickLookURL)
        .fileExporter(
            isPresented: $showingSavePanel,
            document: ArtifactDocument(artifact: artifact),
            contentType: artifact.uniformTypeIdentifier ?? .plainText,
            defaultFilename: artifact.displayName
        ) { result in
            switch result {
            case .success:
                break
            case .failure(let error):
                print("Save failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        HStack(spacing: 12) {
            // File icon
            Image(systemName: artifact.fileType.systemImage)
                .font(.title2)
                .foregroundStyle(fileIconColor)

            // File info
            VStack(alignment: .leading, spacing: 2) {
                Text(artifact.displayName)
                    .font(.headline)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if let language = artifact.language {
                        Text(language.capitalized)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.blue.opacity(0.1))
                            .foregroundStyle(.blue)
                            .cornerRadius(4)
                    }

                    Text(artifact.fileType.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let filePath = artifact.filePath {
                        Text(filePath)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                            .truncationMode(.head)
                    }
                }
            }

            Spacer()

            // Action buttons
            HStack(spacing: 8) {
                // Copy button
                Button {
                    copyToClipboard()
                } label: {
                    Image(systemName: copySuccess ? "checkmark" : "doc.on.doc")
                }
                .help("Copy to clipboard")
                .keyboardShortcut("c", modifiers: [.command, .shift])
                .disabled(artifact.body == nil)

                // QuickLook button
                Button {
                    openQuickLook()
                } label: {
                    Image(systemName: "eye")
                }
                .help("Quick Look")
                .keyboardShortcut(" ", modifiers: [])
                .disabled(artifact.body == nil)

                // Save button
                Button {
                    showingSavePanel = true
                } label: {
                    Image(systemName: "square.and.arrow.down")
                }
                .help("Save to Finder")
                .keyboardShortcut("s", modifiers: .command)
                .disabled(artifact.body == nil)
            }
        }
        .padding()
        .background(.bar)
    }

    // MARK: - Content Views

    @ViewBuilder
    private func contentView(body: String) -> some View {
        Group {
            switch artifact.fileType {
            case .code, .data:
                codeView(content: body)
            case .image:
                imageView(content: body)
            case .document:
                documentView(content: body)
            case .unknown:
                plainTextView(content: body)
            }
        }
        .draggable(artifact) {
            HStack {
                Image(systemName: artifact.fileType.systemImage)
                Text(artifact.displayName)
            }
            .padding(8)
            .background(.regularMaterial)
            .cornerRadius(8)
        }
    }

    /// Code view with syntax highlighting.
    @ViewBuilder
    private func codeView(content: String) -> some View {
        ScrollView([.horizontal, .vertical]) {
            Text(highlightedCode(content))
                .font(.system(.body, design: .monospaced))
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
        .background(colorScheme == .dark ? Color(white: 0.1) : Color(white: 0.98))
    }

    /// Image viewer with standard macOS controls.
    @ViewBuilder
    private func imageView(content: String) -> some View {
        Group {
            if let imageData = Data(base64Encoded: content),
               let nsImage = NSImage(data: imageData) {
                ScrollView([.horizontal, .vertical]) {
                    Image(nsImage: nsImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                .background(checkerboardPattern)
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "photo.badge.exclamationmark")
                        .font(.system(size: 48))
                        .foregroundStyle(.secondary)

                    Text("Unable to display image")
                        .font(.headline)

                    Text("The image data could not be decoded")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }

    /// Document view for markdown and rich text.
    @ViewBuilder
    private func documentView(content: String) -> some View {
        if artifact.language == "markdown" || artifact.fileExtension == "md" {
            // Render markdown
            ScrollView {
                Text(try! AttributedString(markdown: content, options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
            }
        } else {
            // Plain text for other documents
            plainTextView(content: content)
        }
    }

    /// Plain text view.
    @ViewBuilder
    private func plainTextView(content: String) -> some View {
        ScrollView {
            Text(content)
                .font(.body)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
        }
    }

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading content...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var noContentView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No Content Available")
                .font(.headline)

            Text("The artifact body has not been loaded")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private var fileIconColor: Color {
        switch artifact.fileType {
        case .code: return .blue
        case .image: return .green
        case .document: return .orange
        case .data: return .purple
        case .unknown: return .gray
        }
    }

    /// Simple checkerboard pattern for image backgrounds.
    private var checkerboardPattern: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                let cellSize: CGFloat = 10
                let lightColor = Color(white: 0.9)
                let darkColor = Color(white: 0.8)

                for row in 0..<Int(size.height / cellSize) + 1 {
                    for col in 0..<Int(size.width / cellSize) + 1 {
                        let isLight = (row + col) % 2 == 0
                        let rect = CGRect(
                            x: CGFloat(col) * cellSize,
                            y: CGFloat(row) * cellSize,
                            width: cellSize,
                            height: cellSize
                        )
                        context.fill(
                            Path(rect),
                            with: .color(isLight ? lightColor : darkColor)
                        )
                    }
                }
            }
        }
    }

    /// Basic syntax highlighting using AttributedString.
    ///
    /// Note: For production, consider using Highlightr or similar library
    /// for comprehensive syntax highlighting.
    private func highlightedCode(_ content: String) -> AttributedString {
        var attributedString = AttributedString(content)

        // Apply monospaced font
        attributedString.font = .system(.body, design: .monospaced)

        // Basic keyword highlighting for common languages
        let keywords: Set<String> = [
            // Swift/Kotlin/Java
            "func", "let", "var", "class", "struct", "enum", "protocol", "extension",
            "import", "return", "if", "else", "for", "while", "switch", "case", "default",
            "guard", "throw", "throws", "try", "catch", "finally", "async", "await",
            "public", "private", "internal", "static", "final", "override", "init",
            // JavaScript/TypeScript
            "function", "const", "export", "from", "interface", "type", "implements",
            "extends", "new", "this", "super", "typeof", "instanceof",
            // Python
            "def", "self", "None", "True", "False", "and", "or", "not", "in", "is",
            "lambda", "pass", "break", "continue", "yield", "with", "as", "global",
            // Rust
            "fn", "mut", "impl", "trait", "use", "mod", "pub", "crate", "where",
            "match", "loop", "move", "ref", "unsafe"
        ]

        // Simple pattern matching for keywords
        // This is a basic implementation; production code should use proper lexers
        let words = content.components(separatedBy: CharacterSet.alphanumerics.inverted)

        for word in words where keywords.contains(word) {
            var searchRange = content.startIndex..<content.endIndex

            while let range = content.range(of: word, range: searchRange) {
                // Check word boundaries
                let startOK = range.lowerBound == content.startIndex ||
                    !content[content.index(before: range.lowerBound)].isLetter
                let endOK = range.upperBound == content.endIndex ||
                    !content[range.upperBound].isLetter

                if startOK && endOK {
                    if let attrRange = Range(range, in: attributedString) {
                        attributedString[attrRange].foregroundColor = .purple
                        attributedString[attrRange].font = .system(.body, design: .monospaced).bold()
                    }
                }

                searchRange = range.upperBound..<content.endIndex
            }
        }

        // Highlight strings (simple implementation)
        highlightStrings(in: &attributedString, content: content)

        // Highlight comments
        highlightComments(in: &attributedString, content: content)

        return attributedString
    }

    private func highlightStrings(in attributedString: inout AttributedString, content: String) {
        // Simple string highlighting for double-quoted strings
        let pattern = #""[^"\\]*(?:\\.[^"\\]*)*""#

        guard let regex = try? NSRegularExpression(pattern: pattern) else { return }

        let nsRange = NSRange(content.startIndex..<content.endIndex, in: content)
        let matches = regex.matches(in: content, range: nsRange)

        for match in matches {
            guard let range = Range(match.range, in: content),
                  let attrRange = Range(range, in: attributedString) else { continue }

            attributedString[attrRange].foregroundColor = .red
        }
    }

    private func highlightComments(in attributedString: inout AttributedString, content: String) {
        // Line comments (//)
        let lineCommentPattern = #"//.*$"#

        guard let regex = try? NSRegularExpression(pattern: lineCommentPattern, options: .anchorsMatchLines) else { return }

        let nsRange = NSRange(content.startIndex..<content.endIndex, in: content)
        let matches = regex.matches(in: content, range: nsRange)

        for match in matches {
            guard let range = Range(match.range, in: content),
                  let attrRange = Range(range, in: attributedString) else { continue }

            attributedString[attrRange].foregroundColor = .green
        }
    }

    // MARK: - Actions

    private func copyToClipboard() {
        guard let body = artifact.body else { return }

        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(body, forType: .string)

        withAnimation {
            copySuccess = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                copySuccess = false
            }
        }
    }

    private func openQuickLook() {
        guard let body = artifact.body else { return }

        // Create temporary file for QuickLook
        let tempDirectory = FileManager.default.temporaryDirectory
        let fileName = artifact.displayName
        let fileURL = tempDirectory.appendingPathComponent(fileName)

        do {
            // Write content to temp file
            if artifact.fileType == .image,
               let imageData = Data(base64Encoded: body) {
                try imageData.write(to: fileURL)
            } else if let data = body.data(using: .utf8) {
                try data.write(to: fileURL)
            }

            quickLookURL = fileURL
        } catch {
            print("Failed to create temp file for QuickLook: \(error)")
        }
    }
}

// MARK: - Artifact Document (for FileExporter)

/// A document wrapper for saving artifacts via NSSavePanel.
struct ArtifactDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.plainText, .sourceCode, .image, .json, .xml] }

    let artifact: Artifact

    init(artifact: Artifact) {
        self.artifact = artifact
    }

    init(configuration: ReadConfiguration) throws {
        artifact = .empty
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        guard let body = artifact.body else {
            throw ArtifactError.noBodyContent
        }

        let data: Data
        if artifact.fileType == .image,
           let imageData = Data(base64Encoded: body) {
            data = imageData
        } else {
            data = body.data(using: .utf8) ?? Data()
        }

        return FileWrapper(regularFileWithContents: data)
    }
}

// MARK: - Transferable Support

extension Artifact: Transferable {
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .plainText) { artifact in
            artifact.body?.data(using: .utf8) ?? Data()
        }

        FileRepresentation(exportedContentType: .item) { artifact in
            // Create a temporary file for the transfer
            let tempDirectory = FileManager.default.temporaryDirectory
            let fileName = artifact.displayName
            let fileURL = tempDirectory.appendingPathComponent(fileName)

            if let body = artifact.body {
                if artifact.fileType == .image,
                   let imageData = Data(base64Encoded: body) {
                    try imageData.write(to: fileURL)
                } else if let data = body.data(using: .utf8) {
                    try data.write(to: fileURL)
                }
            }

            return SentTransferredFile(fileURL)
        }
    }
}

// MARK: - Preview

#Preview("Code Artifact") {
    ArtifactDetailView(artifact: .sampleCode, isLoading: false)
        .frame(width: 600, height: 400)
}

#Preview("Image Artifact") {
    ArtifactDetailView(artifact: .sampleImage, isLoading: false)
        .frame(width: 600, height: 400)
}

#Preview("Loading State") {
    ArtifactDetailView(artifact: .sampleCode, isLoading: true)
        .frame(width: 600, height: 400)
}
