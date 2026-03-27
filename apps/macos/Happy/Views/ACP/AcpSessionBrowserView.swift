//
//  AcpSessionBrowserView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Session browser for listing and managing ACP sessions.
///
/// Displays sessions available from the agent's `session/list` capability.
/// Provides context menu actions for Load, Resume, and Fork operations,
/// gated by the agent's advertised capabilities.
///
/// ## Features
/// - Session list with title, agent name, date, status
/// - Context menu with Load, Resume, Fork actions (capability-gated)
/// - Active session highlighted with accent color
/// - Toolbar refresh button
/// - Confirmation alert before switching sessions
struct AcpSessionBrowserView: View {
    @State private var viewModel = AcpSessionViewModel.shared

    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerBar

            Divider()

            // Content
            if viewModel.isLoadingSessions {
                loadingView
            } else if viewModel.availableSessions.isEmpty {
                emptyView
            } else {
                sessionsList
            }
        }
        .frame(minWidth: 300)
        .alert(
            "Switch Session",
            isPresented: $viewModel.showSessionSwitchConfirmation,
            presenting: viewModel.pendingSessionAction
        ) { pending in
            Button("Cancel", role: .cancel) {
                viewModel.cancelSessionAction()
            }
            Button(pending.action.label) {
                viewModel.confirmSessionAction()
            }
        } message: { pending in
            Text(pending.action.actionDescription)
        }
        .alert(
            "Session Error",
            isPresented: .init(
                get: { viewModel.sessionError != nil },
                set: { if !$0 { viewModel.sessionError = nil } }
            )
        ) {
            Button("OK", role: .cancel) {
                viewModel.sessionError = nil
            }
        } message: {
            if let error = viewModel.sessionError {
                Text(error)
            }
        }
        .task {
            await viewModel.refreshSessions()
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var headerBar: some View {
        HStack {
            Label("Sessions", systemImage: "list.bullet.rectangle")
                .font(.headline)

            Spacer()

            if viewModel.isPerformingSessionAction {
                ProgressView()
                    .controlSize(.small)
                    .padding(.trailing, 4)
            }

            Button {
                Task {
                    await viewModel.refreshSessions()
                }
            } label: {
                Image(systemName: "arrow.clockwise")
            }
            .buttonStyle(.borderless)
            .disabled(viewModel.isLoadingSessions)
            .help("Refresh sessions")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.bar)
    }

    // MARK: - Sessions List

    @ViewBuilder
    private var sessionsList: some View {
        List {
            ForEach(viewModel.availableSessions) { session in
                AcpSessionRow(
                    session: session,
                    isActive: session.sessionId == viewModel.activeSessionId,
                    capabilities: viewModel.activeAgent?.capabilities ?? .none,
                    onAction: { action in
                        viewModel.requestSessionAction(action, sessionId: session.sessionId)
                    }
                )
            }
        }
        .listStyle(.inset(alternatesRowBackgrounds: true))
        .overlay {
            if viewModel.isPerformingSessionAction {
                Color.black.opacity(0.1)
                    .overlay {
                        VStack(spacing: 8) {
                            ProgressView()
                            Text("Switching session...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding(16)
                        .background(.regularMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
            }
        }
    }

    // MARK: - Loading View

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading sessions...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty View

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "tray")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)

            Text("No Sessions Available")
                .font(.headline)

            if viewModel.activeAgent?.capabilities.listSessions == false {
                Text("The current agent does not support session listing.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            } else {
                Text("Sessions from the agent will appear here.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                Task {
                    await viewModel.refreshSessions()
                }
            } label: {
                Label("Refresh", systemImage: "arrow.clockwise")
            }
            .buttonStyle(.bordered)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Session Row

/// A single session row in the browser list.
struct AcpSessionRow: View {
    let session: AcpSessionInfo
    let isActive: Bool
    let capabilities: AcpAgentCapabilities
    let onAction: (AcpSessionAction) -> Void

    var body: some View {
        HStack(spacing: 10) {
            // Active indicator
            Circle()
                .fill(isActive ? Color.accentColor : .clear)
                .frame(width: 8, height: 8)

            // Session info
            VStack(alignment: .leading, spacing: 2) {
                Text(session.displayTitle)
                    .font(.subheadline)
                    .fontWeight(isActive ? .semibold : .regular)
                    .lineLimit(1)

                HStack(spacing: 6) {
                    // Working directory
                    Label(session.shortCwd, systemImage: "folder")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    // Updated time
                    if let date = session.updatedDate {
                        Text(date, style: .relative)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer()

            // Session ID (abbreviated)
            Text(String(session.sessionId.prefix(8)))
                .font(.system(.caption2, design: .monospaced))
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
        .padding(.horizontal, 4)
        .background(isActive ? Color.accentColor.opacity(0.08) : .clear)
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .contextMenu {
            sessionContextMenu
        }
    }

    @ViewBuilder
    private var sessionContextMenu: some View {
        if capabilities.loadSession {
            Button {
                onAction(.load)
            } label: {
                Label(AcpSessionAction.load.label, systemImage: AcpSessionAction.load.sfSymbolName)
            }
        }

        if capabilities.resumeSession {
            Button {
                onAction(.resume)
            } label: {
                Label(AcpSessionAction.resume.label, systemImage: AcpSessionAction.resume.sfSymbolName)
            }
        }

        if capabilities.forkSession {
            Button {
                onAction(.fork)
            } label: {
                Label(AcpSessionAction.fork.label, systemImage: AcpSessionAction.fork.sfSymbolName)
            }
        }

        if !capabilities.loadSession && !capabilities.resumeSession && !capabilities.forkSession {
            Text("No session actions available")
                .foregroundStyle(.secondary)
        }
    }
}

// MARK: - Preview

#Preview {
    AcpSessionBrowserView()
}
