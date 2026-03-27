//
//  AcpSessionBrowserView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Browse and manage ACP sessions.
///
/// Displays a list of all ACP sessions with filtering, search, and
/// session management actions (load, resume, fork).
struct AcpSessionBrowserView: View {

    @ObservedObject var viewModel: AcpSessionViewModel
    @State private var searchText = ""

    var filteredSessions: [AcpSession] {
        if searchText.isEmpty {
            return viewModel.sessions
        }
        return viewModel.sessions.filter {
            $0.title.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        Group {
            if viewModel.sessions.isEmpty {
                emptyStateView
            } else {
                sessionList
            }
        }
        .navigationTitle("acp.sessionBrowser".localized)
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "acp.searchSessions".localized)
        .refreshable {
            await viewModel.refresh()
        }
        .task {
            await viewModel.loadSessions()
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("acp.noSessions".localized)
                .font(.title2)
                .fontWeight(.semibold)

            Text("acp.noSessionsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Session List

    private var sessionList: some View {
        List {
            ForEach(filteredSessions) { session in
                NavigationLink {
                    AcpSessionView(sessionId: session.id, viewModel: viewModel)
                } label: {
                    AcpSessionRowView(session: session)
                }
            }
        }
        .listStyle(.plain)
    }
}

/// A row in the ACP session browser list.
struct AcpSessionRowView: View {
    let session: AcpSession

    var body: some View {
        HStack(spacing: 12) {
            // Status indicator
            ZStack {
                Circle()
                    .fill(statusColor.opacity(0.15))
                    .frame(width: 36, height: 36)

                Image(systemName: statusIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(statusColor)
            }

            // Session info
            VStack(alignment: .leading, spacing: 4) {
                Text(session.title.isEmpty ? "acp.untitledSession".localized : session.title)
                    .font(.body)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    if let agentName = session.agentName {
                        Label(agentName, systemImage: "cpu")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Text(session.updatedAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Pending permissions badge
            if session.hasPendingPermissions {
                ZStack {
                    Circle()
                        .fill(.orange)
                        .frame(width: 20, height: 20)
                    Text("\(session.pendingPermissions.count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch session.status {
        case .running:
            return .green
        case .waiting:
            return .orange
        case .completed:
            return .blue
        case .error:
            return .red
        case .paused:
            return .yellow
        case .idle:
            return .gray
        }
    }

    private var statusIcon: String {
        switch session.status {
        case .running:
            return "play.circle.fill"
        case .waiting:
            return "hourglass"
        case .completed:
            return "checkmark.circle.fill"
        case .error:
            return "exclamationmark.circle.fill"
        case .paused:
            return "pause.circle.fill"
        case .idle:
            return "circle"
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AcpSessionBrowserView(viewModel: AcpSessionViewModel())
    }
}
