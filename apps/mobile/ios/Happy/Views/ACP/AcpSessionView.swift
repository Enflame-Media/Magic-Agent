//
//  AcpSessionView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Main ACP session view displaying agent activity, content blocks, and controls.
///
/// This is the primary view for monitoring and interacting with an ACP session.
/// It shows streaming content blocks (thoughts, tool calls, plans, text),
/// session status, and provides access to permissions and configuration.
struct AcpSessionView: View {

    let sessionId: String
    @ObservedObject var viewModel: AcpSessionViewModel
    @State private var showConfig = false
    @State private var showPermissionHistory = false
    @State private var showCommandPalette = false

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                loadingView
            } else if viewModel.currentContentBlocks.isEmpty && viewModel.hasLoaded {
                emptyStateView
            } else {
                contentView
            }
        }
        .navigationTitle(viewModel.currentSession?.title.isEmpty == false
            ? viewModel.currentSession!.title
            : "acp.session".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    // Mode indicator
                    AcpModeIndicator(mode: viewModel.config.mode)

                    // Config button
                    Button {
                        showConfig = true
                    } label: {
                        Image(systemName: "gear")
                    }
                }
            }
        }
        .sheet(isPresented: $showConfig) {
            NavigationStack {
                AcpConfigPanelView(viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showPermissionHistory) {
            NavigationStack {
                AcpPermissionHistoryView(viewModel: viewModel)
            }
        }
        .sheet(isPresented: $showCommandPalette) {
            AcpCommandPaletteView(viewModel: viewModel)
        }
        .sheet(isPresented: $viewModel.showPermissionRequest) {
            if let permission = viewModel.activePermissionRequest {
                AcpPermissionRequestView(
                    permission: permission,
                    viewModel: viewModel
                )
            }
        }
        .task {
            await viewModel.loadSession(for: sessionId)
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("acp.loading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "cpu")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("acp.noActivity".localized)
                .font(.title2)
                .fontWeight(.semibold)

            Text("acp.noActivityDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            if viewModel.currentSession?.isActive == true {
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("acp.waitingForAgent".localized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Content View

    private var contentView: some View {
        ScrollViewReader { proxy in
            List {
                // Usage widget
                if let usage = viewModel.currentUsage {
                    Section {
                        AcpUsageWidget(usage: usage)
                    }
                }

                // Permission alert banner
                if viewModel.pendingPermissionCount > 0 {
                    Section {
                        permissionBanner
                    }
                }

                // Content blocks
                Section {
                    ForEach(viewModel.currentContentBlocks) { block in
                        AcpContentBlockRenderer(block: block)
                            .id(block.id)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                }

                // Bottom actions
                Section {
                    HStack(spacing: 16) {
                        Button {
                            showPermissionHistory = true
                        } label: {
                            Label("acp.permissionHistory".localized, systemImage: "clock.arrow.circlepath")
                                .font(.subheadline)
                        }

                        Spacer()

                        Button {
                            showCommandPalette = true
                        } label: {
                            Label("acp.commands".localized, systemImage: "command")
                                .font(.subheadline)
                        }
                    }
                    .listRowSeparator(.hidden)
                }
            }
            .listStyle(.plain)
            .onChange(of: viewModel.currentContentBlocks.count) { _ in
                if let lastBlock = viewModel.currentContentBlocks.last {
                    withAnimation(.easeOut(duration: 0.3)) {
                        proxy.scrollTo(lastBlock.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Permission Banner

    private var permissionBanner: some View {
        Button {
            viewModel.presentNextPermission()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.shield.fill")
                    .foregroundStyle(.orange)
                    .font(.title3)

                VStack(alignment: .leading, spacing: 2) {
                    Text("acp.permissionRequired".localized)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.primary)

                    Text(String(format: NSLocalizedString("acp.pendingPermissions", comment: ""),
                                viewModel.pendingPermissionCount))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AcpSessionView(
            sessionId: "sample-123",
            viewModel: AcpSessionViewModel()
        )
    }
}
