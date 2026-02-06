//
//  SessionListView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// The main session list view showing all Claude Code sessions.
///
/// Displays sessions grouped by status with pull-to-refresh, search,
/// and filtering capabilities. Sessions are updated in real-time via
/// WebSocket sync.
struct SessionListView: View {

    @StateObject private var viewModel: SessionListViewModel
    @ObservedObject private var authViewModel: AuthenticationViewModel

    init(authViewModel: AuthenticationViewModel, viewModel: SessionListViewModel? = nil) {
        self.authViewModel = authViewModel
        _viewModel = StateObject(wrappedValue: viewModel ?? SessionListViewModel())
    }

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                loadingView
            } else if viewModel.isEmptyState {
                emptyStateView
            } else {
                sessionListContent
            }
        }
        .navigationTitle("sessionList.title".localized)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                connectionStatusIndicator
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                settingsMenu
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "sessionList.searchPrompt".localized)
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
            await viewModel.loadSessions()
            await viewModel.connectSync()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("sessionList.loading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "tray")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            if viewModel.searchText.isEmpty && viewModel.filter == .all {
                Text("sessionList.noSessions".localized)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("sessionList.noSessionsDescription".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            } else {
                Text("sessionList.noMatching".localized)
                    .font(.title2)
                    .fontWeight(.semibold)

                Text("sessionList.noMatchingDescription".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Session List Content

    private var sessionListContent: some View {
        VStack(spacing: 0) {
            // Filter picker
            Picker("common.filter".localized, selection: $viewModel.filter) {
                ForEach(SessionFilter.allCases) { filter in
                    Text(filter.rawValue).tag(filter)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.vertical, 8)

            // Session list
            List {
                // Usage limits widget at the top
                Section {
                    UsageLimitsWidget()
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                }

                // Sessions
                ForEach(viewModel.filteredSessions) { session in
                    NavigationLink(value: session) {
                        SessionRowView(session: session)
                    }
                }
            }
            .listStyle(.plain)
            .navigationDestination(for: Session.self) { session in
                SessionDetailView(session: session)
            }
        }
    }

    // MARK: - Connection Status Indicator

    private var connectionStatusIndicator: some View {
        Group {
            switch viewModel.connectionStatus {
            case .connected:
                Image(systemName: "wifi")
                    .foregroundStyle(.green)
                    .font(.caption)
            case .connecting:
                ProgressView()
                    .scaleEffect(0.7)
            case .disconnected:
                Image(systemName: "wifi.slash")
                    .foregroundStyle(.secondary)
                    .font(.caption)
            case .reconnecting:
                Image(systemName: "wifi.exclamationmark")
                    .foregroundStyle(.orange)
                    .font(.caption)
            }
        }
    }

    // MARK: - Settings Menu

    private var settingsMenu: some View {
        Menu {
            NavigationLink(destination: FriendsListView()) {
                Label("friends.title".localized, systemImage: "person.2")
            }

            NavigationLink(destination: NotificationSettingsView()) {
                Label("notifications.title".localized, systemImage: "bell")
            }

            Divider()

            Button(role: .destructive) {
                authViewModel.logout()
            } label: {
                Label("sessionList.disconnect".localized, systemImage: "link.badge.xmark")
            }
        } label: {
            Image(systemName: "ellipsis.circle")
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SessionListView(authViewModel: AuthenticationViewModel())
    }
}
