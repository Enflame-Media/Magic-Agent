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
/// For code artifacts, the content is displayed with syntax highlighting
/// using `CodeHighlightView`. For other types, plain text is shown.
struct ArtifactDetailView: View {

    let artifact: Artifact

    @State private var showCopiedToast: Bool = false
    @State private var showShareSheet: Bool = false
    @State private var showLineNumbers: Bool = true

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Metadata header
                metadataHeader

                Divider()

                // Content
                contentView
            }
        }
        .navigationTitle(artifact.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .navigationBarTrailing) {
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
            ShareSheet(items: [artifact.content])
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
                Text("\(artifact.lineCount) lines")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
    }

    // MARK: - Content View

    @ViewBuilder
    private var contentView: some View {
        switch artifact.type {
        case .code, .config:
            CodeHighlightView(
                source: artifact.content,
                language: artifact.language ?? .unknown,
                showLineNumbers: showLineNumbers
            )
        case .document:
            // For markdown/document artifacts, show as plain text with monospaced font
            ScrollView(.horizontal, showsIndicators: true) {
                Text(artifact.content)
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)
                    .padding()
            }
        case .image:
            // Placeholder for image artifact support
            VStack(spacing: 16) {
                Image(systemName: "photo")
                    .font(.system(size: 64))
                    .foregroundStyle(.secondary)
                Text("artifacts.imageNotSupported".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 40)
        case .unknown:
            ScrollView(.horizontal, showsIndicators: true) {
                Text(artifact.content)
                    .font(.system(.body, design: .monospaced))
                    .textSelection(.enabled)
                    .padding()
            }
        }
    }

    // MARK: - Actions

    private func copyContent() {
        UIPasteboard.general.string = artifact.content

        withAnimation {
            showCopiedToast = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showCopiedToast = false
            }
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
