//
//  AcpSessionBrowserView.swift
//  Happy
//
//  Session browser for listing, loading, resuming, and forking ACP sessions.
//

import SwiftUI

/// NavigationStack-based list for browsing and managing ACP sessions.
struct AcpSessionBrowserView: View {

    let sessions: [AcpBrowserSession]
    let capabilities: AcpSessionBrowserCapabilities?
    let activeSessionId: String?
    let onLoad: (String) -> Void
    let onResume: (String) -> Void
    let onFork: (String) -> Void

    @State private var confirmAction: ConfirmAction?

    private enum ConfirmAction: Identifiable {
        case load(String)
        case resume(String)
        case fork(String)

        var id: String {
            switch self {
            case .load(let id): return "load-\(id)"
            case .resume(let id): return "resume-\(id)"
            case .fork(let id): return "fork-\(id)"
            }
        }
    }

    // MARK: - Body

    var body: some View {
        Group {
            if sessions.isEmpty {
                emptyState
            } else {
                sessionList
            }
        }
        .navigationTitle("acp.browser.title".localized)
        .confirmationDialog(
            "acp.browser.confirm".localized,
            isPresented: .init(
                get: { confirmAction != nil },
                set: { if !$0 { confirmAction = nil } }
            ),
            titleVisibility: .visible
        ) {
            if let action = confirmAction {
                confirmButtons(for: action)
            }
        }
    }

    // MARK: - Session List

    private var sessionList: some View {
        List {
            ForEach(Array(sessions.enumerated()), id: \.offset) { _, session in
                sessionRow(session)
                    .swipeActions(edge: .trailing) {
                        swipeActions(for: session)
                    }
            }
        }
        .refreshable {
            // Refresh handled by parent
        }
    }

    // MARK: - Session Row

    private func sessionRow(_ session: AcpBrowserSession) -> some View {
        HStack(spacing: 10) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(session.title)
                        .font(.callout)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    if session.sessionId == activeSessionId {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.accentColor)
                            .font(.caption)
                    }
                }

                HStack(spacing: 8) {
                    Text(session.cwd)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    if let date = session.updatedAt {
                        Text(date)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            if session.isActive {
                Text("acp.browser.active".localized)
                    .font(.caption2)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color(.systemGray5))
                    .cornerRadius(4)
            }
        }
        .padding(.vertical, 2)
        .contentShape(Rectangle())
        .onTapGesture {
            confirmAction = .load(session.sessionId)
        }
    }

    // MARK: - Swipe Actions

    @ViewBuilder
    private func swipeActions(for session: AcpBrowserSession) -> some View {
        if capabilities?.canLoadSession == true {
            Button {
                confirmAction = .load(session.sessionId)
            } label: {
                Label("acp.browser.load".localized, systemImage: "arrow.down.circle")
            }
            .tint(.blue)
        }

        if capabilities?.canResumeSession == true {
            Button {
                confirmAction = .resume(session.sessionId)
            } label: {
                Label("acp.browser.resume".localized, systemImage: "play.circle")
            }
            .tint(.green)
        }

        if capabilities?.canForkSession == true {
            Button {
                confirmAction = .fork(session.sessionId)
            } label: {
                Label("acp.browser.fork".localized, systemImage: "arrow.triangle.branch")
            }
            .tint(.orange)
        }
    }

    // MARK: - Confirm Buttons

    @ViewBuilder
    private func confirmButtons(for action: ConfirmAction) -> some View {
        switch action {
        case .load(let id):
            Button("acp.browser.loadConfirm".localized) { onLoad(id) }
        case .resume(let id):
            Button("acp.browser.resumeConfirm".localized) { onResume(id) }
        case .fork(let id):
            Button("acp.browser.forkConfirm".localized) { onFork(id) }
        }
        Button("common.cancel".localized, role: .cancel) {}
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.largeTitle)
                .foregroundColor(.secondary)
            Text("acp.browser.empty".localized)
                .font(.callout)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
