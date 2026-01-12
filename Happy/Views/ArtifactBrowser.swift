//
//  ArtifactBrowser.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI
import UniformTypeIdentifiers

/// A native macOS artifact browser with file tree navigation.
///
/// Features:
/// - OutlineGroup-based file tree
/// - QuickLook integration
/// - Drag and drop to Finder
/// - Syntax-highlighted code viewing
/// - Image preview with native controls
struct ArtifactBrowser: View {
    /// The session ID to show artifacts for (optional, shows all if nil).
    let sessionId: String?

    @State private var viewModel = ArtifactViewModel()
    @State private var selectedNode: FileTreeNode?
    @State private var columnVisibility: NavigationSplitViewVisibility = .all

    init(sessionId: String? = nil) {
        self.sessionId = sessionId
    }

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            sidebar
        } detail: {
            detailView
        }
        .navigationTitle("Artifacts")
        .toolbar {
            toolbarContent
        }
        .searchable(text: $viewModel.searchQuery, prompt: "Search artifacts...")
        .task {
            await loadArtifacts()
        }
    }

    // MARK: - Sidebar

    @ViewBuilder
    private var sidebar: some View {
        Group {
            if viewModel.isLoading && viewModel.count == 0 {
                loadingView
            } else if viewModel.count == 0 {
                emptyView
            } else {
                fileTreeView
            }
        }
        .frame(minWidth: 200)
        .navigationSplitViewColumnWidth(min: 200, ideal: 250, max: 400)
    }

    @ViewBuilder
    private var fileTreeView: some View {
        List(selection: $viewModel.selectedArtifactId) {
            OutlineGroup(viewModel.fileTree, id: \.id, children: \.children) { node in
                FileTreeRow(
                    node: node,
                    isSelected: viewModel.selectedArtifactId == node.artifactId
                )
                .tag(node.artifactId ?? node.id)
                .onTapGesture {
                    if !node.isDirectory {
                        viewModel.selectFromNode(node)
                    }
                }
                .draggable(node) {
                    FileTreeRow(node: node, isSelected: false)
                        .padding(4)
                        .background(.regularMaterial)
                        .cornerRadius(4)
                }
            }
        }
        .listStyle(.sidebar)
    }

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading artifacts...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No Artifacts")
                .font(.headline)

            Text("Artifacts will appear here as Claude generates them")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Detail View

    @ViewBuilder
    private var detailView: some View {
        if let artifact = viewModel.selectedArtifact {
            ArtifactDetailView(
                artifact: artifact,
                isLoading: viewModel.isBodyLoading(artifact.id)
            )
        } else {
            noSelectionView
        }
    }

    @ViewBuilder
    private var noSelectionView: some View {
        VStack(spacing: 16) {
            Image(systemName: "sidebar.left")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Select an Artifact")
                .font(.headline)

            Text("Choose a file from the sidebar to preview")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Toolbar

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup {
            // Toggle code-only filter
            Toggle(isOn: $viewModel.showCodeOnly) {
                Label("Code Only", systemImage: "doc.text")
            }
            .help("Show only code files")

            // Refresh button
            Button {
                Task { await loadArtifacts() }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .help("Refresh artifacts")
            .keyboardShortcut("r", modifiers: .command)

            // Statistics
            if viewModel.count > 0 {
                Text("\(viewModel.count) artifacts")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Actions

    private func loadArtifacts() async {
        if let sessionId = sessionId {
            await viewModel.loadArtifacts(for: sessionId)
        } else {
            await viewModel.loadAllArtifacts()
        }
    }
}

// MARK: - File Tree Row

/// A row in the file tree showing a file or folder.
struct FileTreeRow: View {
    let node: FileTreeNode
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: node.systemImage)
                .foregroundStyle(iconColor)
                .frame(width: 16)

            Text(node.name)
                .lineLimit(1)
                .truncationMode(.middle)

            Spacer()

            if !node.isDirectory, let ext = node.fileExtension {
                Text(ext.uppercased())
                    .font(.caption2)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 1)
                    .background(.quaternary)
                    .foregroundStyle(.secondary)
                    .cornerRadius(2)
            }
        }
        .contentShape(Rectangle())
    }

    private var iconColor: Color {
        if node.isDirectory {
            return .accentColor
        }

        switch node.fileType {
        case .code:
            return .blue
        case .image:
            return .green
        case .document:
            return .orange
        case .data:
            return .purple
        case .unknown, .none:
            return .gray
        }
    }
}

// MARK: - Transferable Support for Drag and Drop

extension FileTreeNode: Transferable {
    static var transferRepresentation: some TransferRepresentation {
        ProxyRepresentation { node in
            // For drag and drop, return the file path as a string
            node.path
        }
    }
}

// MARK: - Preview

#Preview("With Artifacts") {
    ArtifactBrowser()
        .frame(width: 800, height: 600)
}

#Preview("Empty State") {
    ArtifactBrowser(sessionId: "nonexistent")
        .frame(width: 800, height: 600)
}
