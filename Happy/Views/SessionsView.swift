//
//  SessionsView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// The main sessions list view with sidebar navigation.
///
/// Uses NavigationSplitView for a proper macOS sidebar layout with
/// a list of sessions and a detail pane.
struct SessionsView: View {
    @State private var viewModel = SessionsViewModel()
    @State private var columnVisibility = NavigationSplitViewVisibility.all

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            sidebar
        } detail: {
            detail
        }
        .navigationSplitViewStyle(.balanced)
        .task {
            await viewModel.connect()
        }
    }

    // MARK: - Sidebar

    @ViewBuilder
    private var sidebar: some View {
        VStack(spacing: 0) {
            // Search bar
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search sessions", text: $viewModel.searchQuery)
                    .textFieldStyle(.plain)

                if !viewModel.searchQuery.isEmpty {
                    Button {
                        viewModel.searchQuery = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(8)
            .background(.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .padding()

            Divider()

            // Sessions list
            if viewModel.isLoading && viewModel.sessions.isEmpty {
                loadingView
            } else if viewModel.filteredSessions.isEmpty {
                emptyView
            } else {
                sessionsList
            }
        }
        .navigationTitle("Sessions")
        .toolbar {
            ToolbarItemGroup {
                connectionStatusButton
                refreshButton
            }
        }
        .frame(minWidth: 250, idealWidth: 300)
    }

    @ViewBuilder
    private var sessionsList: some View {
        List(selection: $viewModel.selectedSession) {
            ForEach(viewModel.filteredSessions) { session in
                SessionRow(session: session)
                    .tag(session)
            }
        }
        .listStyle(.sidebar)
    }

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Connecting...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No Sessions")
                .font(.headline)

            Text(viewModel.searchQuery.isEmpty
                 ? "Sessions from Claude Code will appear here"
                 : "No sessions match your search")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Detail

    @ViewBuilder
    private var detail: some View {
        if let session = viewModel.selectedSession {
            SessionDetailView(session: session)
        } else {
            emptyDetailView
        }
    }

    @ViewBuilder
    private var emptyDetailView: some View {
        VStack(spacing: 16) {
            Image(systemName: "sidebar.left")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("Select a Session")
                .font(.title2)
                .foregroundStyle(.secondary)

            Text("Choose a session from the sidebar to view its details")
                .font(.subheadline)
                .foregroundStyle(.tertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Toolbar Items

    @ViewBuilder
    private var connectionStatusButton: some View {
        Button {
            Task {
                if viewModel.syncStatus == .connected {
                    await viewModel.disconnect()
                } else {
                    await viewModel.connect()
                }
            }
        } label: {
            HStack(spacing: 6) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)
                Text(statusText)
                    .font(.caption)
            }
        }
        .buttonStyle(.bordered)
    }

    @ViewBuilder
    private var refreshButton: some View {
        Button {
            Task {
                await viewModel.refresh()
            }
        } label: {
            Image(systemName: "arrow.clockwise")
        }
        .disabled(viewModel.isLoading)
        .keyboardShortcut("r", modifiers: .command)
        .help("Refresh sessions (⌘R)")
    }

    // MARK: - Helpers

    private var statusColor: Color {
        switch viewModel.syncStatus {
        case .connected: return .green
        case .connecting: return .orange
        case .disconnected: return .red
        }
    }

    private var statusText: String {
        switch viewModel.syncStatus {
        case .connected: return "Connected"
        case .connecting: return "Connecting"
        case .disconnected: return "Disconnected"
        }
    }
}

// MARK: - Preview

#Preview {
    SessionsView()
}
