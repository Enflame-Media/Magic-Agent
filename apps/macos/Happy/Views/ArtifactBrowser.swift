//
//  ArtifactBrowser.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI
import UniformTypeIdentifiers

/// Threshold for switching to optimized flat list rendering.
/// Below this count, use OutlineGroup (better UX).
/// Above this count, use LazyVStack (better performance).
private let largeTreeThreshold = 100

/// A native macOS artifact browser with file tree navigation.
///
/// Features:
/// - OutlineGroup-based file tree for small collections
/// - LazyVStack-based flat tree for large collections (HAP-873)
/// - QuickLook integration
/// - Drag and drop to Finder
/// - Syntax-highlighted code viewing
/// - Image preview with native controls
///
/// Performance Optimizations (HAP-873):
/// - Lazy loading of tree nodes for 1000+ artifacts
/// - Efficient expansion state management
/// - Minimal view invalidation with @State isolation
struct ArtifactBrowser: View {
    /// The session ID to show artifacts for (optional, shows all if nil).
    let sessionId: String?

    @State private var viewModel = ArtifactViewModel()
    @State private var selectedNode: FileTreeNode?
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    /// Expanded directory paths for the flat tree view.
    @State private var expandedPaths: Set<String> = []

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
            } else if viewModel.count > largeTreeThreshold {
                // Use optimized flat list for large collections (HAP-873)
                optimizedFileTreeView
            } else {
                // Use OutlineGroup for smaller collections
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

    /// Optimized file tree for large artifact collections.
    ///
    /// Uses LazyVStack with manual expansion state for better performance
    /// when rendering 1000+ artifacts.
    @ViewBuilder
    private var optimizedFileTreeView: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(flattenedNodes, id: \.node.id) { item in
                    OptimizedFileTreeRow(
                        node: item.node,
                        depth: item.depth,
                        isExpanded: item.node.isDirectory && expandedPaths.contains(item.node.path),
                        isSelected: viewModel.selectedArtifactId == item.node.artifactId
                    )
                    .onTapGesture {
                        handleNodeTap(item.node)
                    }
                    .draggable(item.node) {
                        FileTreeRow(node: item.node, isSelected: false)
                            .padding(4)
                            .background(.regularMaterial)
                            .cornerRadius(4)
                    }
                }
            }
            .padding(.vertical, 4)
        }
        .listStyle(.sidebar)
    }

    /// Flattened nodes for the optimized view.
    private var flattenedNodes: [(node: FileTreeNode, depth: Int)] {
        flattenTree(viewModel.fileTree, expanded: expandedPaths, depth: 0)
    }

    /// Flatten tree nodes, respecting expansion state.
    private func flattenTree(
        _ nodes: [FileTreeNode],
        expanded: Set<String>,
        depth: Int
    ) -> [(node: FileTreeNode, depth: Int)] {
        var result: [(node: FileTreeNode, depth: Int)] = []

        for node in nodes {
            result.append((node: node, depth: depth))

            if node.isDirectory, let children = node.children, expanded.contains(node.path) {
                result.append(contentsOf: flattenTree(children, expanded: expanded, depth: depth + 1))
            }
        }

        return result
    }

    /// Handle tap on a file tree node.
    private func handleNodeTap(_ node: FileTreeNode) {
        if node.isDirectory {
            // Toggle expansion
            if expandedPaths.contains(node.path) {
                expandedPaths.remove(node.path)
            } else {
                expandedPaths.insert(node.path)
            }
        } else {
            // Select artifact
            viewModel.selectFromNode(node)
        }
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

// MARK: - Optimized File Tree Row (HAP-873)

/// An optimized row for the flat tree view with depth-based indentation.
///
/// Used in the LazyVStack-based tree view for large artifact collections.
/// Includes expansion indicator for directories.
struct OptimizedFileTreeRow: View {
    let node: FileTreeNode
    let depth: Int
    let isExpanded: Bool
    let isSelected: Bool

    /// Row height for consistent layout.
    private let rowHeight: CGFloat = 24
    /// Indentation per depth level.
    private let indentPerLevel: CGFloat = 16

    var body: some View {
        HStack(spacing: 4) {
            // Indentation spacer
            Spacer()
                .frame(width: CGFloat(depth) * indentPerLevel)

            // Expansion indicator for directories
            if node.isDirectory {
                Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
                    .frame(width: 12)
            } else {
                Spacer()
                    .frame(width: 12)
            }

            // Icon
            Image(systemName: node.systemImage)
                .foregroundStyle(iconColor)
                .frame(width: 16)

            // Name
            Text(node.name)
                .lineLimit(1)
                .truncationMode(.middle)

            Spacer()

            // File extension badge
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
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .frame(height: rowHeight)
        .background(isSelected ? Color.accentColor.opacity(0.15) : Color.clear)
        .cornerRadius(4)
        .contentShape(Rectangle())
    }

    private var iconColor: Color {
        if node.isDirectory {
            return isExpanded ? .accentColor : .accentColor.opacity(0.8)
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
