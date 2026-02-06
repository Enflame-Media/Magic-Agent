//
//  ArtifactListView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Displays a list of artifacts for a session.
///
/// Supports filtering by type, search, and navigation to artifact detail views.
struct ArtifactListView: View {

    @StateObject private var viewModel: ArtifactViewModel

    init(sessionId: String) {
        _viewModel = StateObject(wrappedValue: ArtifactViewModel(sessionId: sessionId))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                loadingView
            } else if viewModel.isEmptyState {
                emptyStateView
            } else {
                artifactListContent
            }
        }
        .navigationTitle("artifacts.title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .searchable(
            text: $viewModel.searchText,
            placement: .navigationBarDrawer(displayMode: .automatic),
            prompt: "artifacts.searchPlaceholder".localized
        )
        .refreshable {
            await viewModel.refresh()
        }
        .alert("common.error".localized, isPresented: $viewModel.showError) {
            Button("common.ok".localized) {
                viewModel.dismissError()
            }
        } message: {
            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
            }
        }
        .task {
            await viewModel.loadArtifacts()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("artifacts.loading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State View

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("artifacts.empty".localized)
                .font(.title2)
                .fontWeight(.semibold)

            Text("artifacts.emptyDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Artifact List Content

    private var artifactListContent: some View {
        List {
            // Filter picker
            Section {
                Picker("artifacts.filter".localized, selection: $viewModel.typeFilter) {
                    ForEach(ArtifactTypeFilter.allCases) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
            }

            // Summary
            if viewModel.totalCount > 0 {
                Section {
                    HStack {
                        Label("\(viewModel.totalCount)", systemImage: "doc.on.doc")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        if viewModel.codeCount > 0 {
                            Label("\(viewModel.codeCount)", systemImage: "chevron.left.forwardslash.chevron.right")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if viewModel.documentCount > 0 {
                            Label("\(viewModel.documentCount)", systemImage: "doc.text")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            // Artifact rows
            Section {
                ForEach(viewModel.filteredArtifacts) { artifact in
                    NavigationLink {
                        ArtifactDetailView(artifact: artifact)
                    } label: {
                        ArtifactRowView(artifact: artifact)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Artifact Row View

/// A single row in the artifact list.
struct ArtifactRowView: View {
    let artifact: Artifact

    var body: some View {
        HStack(spacing: 12) {
            // Type icon
            Image(systemName: artifact.type.iconName)
                .font(.title3)
                .foregroundStyle(iconColor)
                .frame(width: 32, height: 32)

            // Info
            VStack(alignment: .leading, spacing: 4) {
                Text(artifact.displayName)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if let language = artifact.language, language != .unknown {
                        Text(language.displayName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.systemGray6))
                            .cornerRadius(4)
                    }

                    if let size = artifact.formattedSize {
                        Text(size)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text(String(format: "artifacts.lineCount".localized, artifact.lineCount))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Updated time
            Text(artifact.updatedAt, style: .relative)
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }

    private var iconColor: Color {
        switch artifact.type {
        case .code:
            return .blue
        case .document:
            return .green
        case .image:
            return .purple
        case .config:
            return .orange
        case .unknown:
            return .gray
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        ArtifactListView(sessionId: "sample-123")
    }
}
