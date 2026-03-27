//
//  AcpSessionView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Container view composing all ACP components into a cohesive session display.
//  Integrates into existing NavigationSplitView detail pane.
//

import SwiftUI

/// Main container view for displaying an ACP agent session.
///
/// Composes all ACP display components into a cohesive session view:
/// - Header with mode indicator and usage widget
/// - Scrollable message list with thoughts, tool calls, and content blocks
/// - Execution plan overlay
/// - Command palette (Cmd+K)
/// - Config panel
///
/// Designed to integrate into the existing NavigationSplitView detail pane.
struct AcpSessionView: View {
    /// The ACP session view model.
    @State var viewModel: AcpSessionViewModel

    /// Initialize with an ACP session.
    init(session: AcpSession) {
        self._viewModel = State(initialValue: AcpSessionViewModel(session: session))
    }

    var body: some View {
        ZStack {
            // Main content
            VStack(spacing: 0) {
                // Header
                headerSection

                Divider()

                // Messages
                if viewModel.messages.isEmpty {
                    emptyView
                } else {
                    messagesSection
                }

                Divider()

                // Footer
                footerSection
            }

            // Command palette overlay
            if viewModel.isCommandPaletteVisible {
                commandPaletteOverlay
            }

            // Config panel overlay
            if viewModel.isConfigPanelVisible {
                configPanelOverlay
            }
        }
        .navigationTitle(viewModel.session.title.isEmpty ? "acp.session.untitled".localized : viewModel.session.title)
        .toolbar {
            ToolbarItemGroup {
                modeIndicatorButton
                configButton
                commandPaletteButton
                autoScrollButton
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .acpToggleCommandPalette)) { _ in
            viewModel.toggleCommandPalette()
        }
    }

    // MARK: - Header Section

    @ViewBuilder
    private var headerSection: some View {
        VStack(spacing: 8) {
            HStack(alignment: .top) {
                // Session info
                VStack(alignment: .leading, spacing: 4) {
                    Text(viewModel.session.title.isEmpty ? "acp.session.untitled".localized : viewModel.session.title)
                        .font(.headline)

                    HStack(spacing: 8) {
                        AcpModeIndicator(mode: viewModel.currentMode)

                        if viewModel.isStreaming {
                            HStack(spacing: 4) {
                                ProgressView()
                                    .scaleEffect(0.5)
                                    .frame(width: 12, height: 12)
                                Text("acp.streaming".localized)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Spacer()

                // Cost display
                VStack(alignment: .trailing, spacing: 2) {
                    Text(viewModel.formattedTotalCost)
                        .font(.title3)
                        .fontWeight(.medium)
                        .fontDesign(.monospaced)

                    Text("\(viewModel.totalInputTokens + viewModel.totalOutputTokens) tokens")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Usage widget
            if let usage = viewModel.usage {
                AcpUsageWidget(usage: usage)
            }

            // Plan
            if let plan = viewModel.currentPlan {
                AcpPlanView(plan: plan)
            }
        }
        .padding()
        .background(.bar)
    }

    // MARK: - Messages Section

    @ViewBuilder
    private var messagesSection: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.messages) { message in
                        AcpMessageView(message: message)
                            .id(message.id)
                    }
                }
                .padding()
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                if viewModel.autoScrollEnabled, let lastId = viewModel.messages.last?.id {
                    withAnimation {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Empty View

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.text.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("acp.session.empty.title".localized)
                .font(.headline)

            Text("acp.session.empty.subtitle".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Footer Section

    @ViewBuilder
    private var footerSection: some View {
        HStack {
            Label("\(viewModel.messages.count) \("acp.session.messages".localized)", systemImage: "bubble.left.and.bubble.right")
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()

            HStack(spacing: 12) {
                Label("\(viewModel.totalInputTokens) in", systemImage: "arrow.down.circle")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Label("\(viewModel.totalOutputTokens) out", systemImage: "arrow.up.circle")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(.bar)
    }

    // MARK: - Toolbar Items

    @ViewBuilder
    private var modeIndicatorButton: some View {
        AcpModeIndicator(mode: viewModel.currentMode)
    }

    @ViewBuilder
    private var configButton: some View {
        Button {
            viewModel.toggleConfigPanel()
        } label: {
            Image(systemName: "gearshape")
        }
        .help("acp.config.title".localized)
    }

    @ViewBuilder
    private var commandPaletteButton: some View {
        Button {
            viewModel.toggleCommandPalette()
        } label: {
            Image(systemName: "command")
        }
        .help("acp.commands.title".localized)
        .keyboardShortcut("k", modifiers: .command)
    }

    @ViewBuilder
    private var autoScrollButton: some View {
        Button {
            viewModel.toggleAutoScroll()
        } label: {
            Image(systemName: viewModel.autoScrollEnabled ? "arrow.down.circle.fill" : "arrow.down.circle")
        }
        .help(viewModel.autoScrollEnabled ? "acp.autoScroll.enabled".localized : "acp.autoScroll.disabled".localized)
    }

    // MARK: - Overlays

    @ViewBuilder
    private var commandPaletteOverlay: some View {
        Color.black.opacity(0.3)
            .ignoresSafeArea()
            .onTapGesture {
                viewModel.hideCommandPalette()
            }

        AcpCommandPaletteView(viewModel: viewModel)
    }

    @ViewBuilder
    private var configPanelOverlay: some View {
        HStack {
            Spacer()
            AcpConfigPanelView(viewModel: viewModel)
                .shadow(color: .black.opacity(0.15), radius: 15, x: -5)
        }
        .transition(.move(edge: .trailing))
    }
}

// MARK: - ACP Message View

/// Displays a single ACP message with all its content.
private struct AcpMessageView: View {
    let message: AcpMessage

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Role icon
            roleIcon

            VStack(alignment: .leading, spacing: 8) {
                // Header
                messageHeader

                // Thoughts
                AcpThoughtListView(thoughts: message.thoughts)

                // Main text content
                if !message.text.isEmpty {
                    AcpStreamingTextView(text: message.text, isStreaming: message.isStreaming)
                }

                // Content blocks
                AcpContentBlockListView(blocks: message.contentBlocks)

                // Tool calls
                AcpToolCallListView(toolCalls: message.toolCalls)

                // Cost
                if let cost = message.cost {
                    costBadge(cost)
                }
            }
        }
        .padding()
        .background(backgroundColor)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color(.separatorColor).opacity(0.3), lineWidth: 1)
        )
    }

    // MARK: - Role Icon

    @ViewBuilder
    private var roleIcon: some View {
        ZStack {
            Circle()
                .fill(roleIconBackground)
                .frame(width: 32, height: 32)

            Image(systemName: roleIconName)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(roleIconForeground)
        }
    }

    private var roleIconName: String {
        switch message.role {
        case .user: return "person.fill"
        case .assistant: return "sparkles"
        case .system: return "gearshape.fill"
        }
    }

    private var roleIconBackground: Color {
        switch message.role {
        case .user: return .blue.opacity(0.15)
        case .assistant: return .purple.opacity(0.15)
        case .system: return .gray.opacity(0.15)
        }
    }

    private var roleIconForeground: Color {
        switch message.role {
        case .user: return .blue
        case .assistant: return .purple
        case .system: return .gray
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var messageHeader: some View {
        HStack {
            Text(roleName)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Spacer()

            if message.isStreaming {
                HStack(spacing: 4) {
                    ProgressView()
                        .scaleEffect(0.5)
                    Text("acp.streaming".localized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text(formattedTime)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var roleName: String {
        switch message.role {
        case .user: return "acp.role.user".localized
        case .assistant: return "acp.role.assistant".localized
        case .system: return "acp.role.system".localized
        }
    }

    // MARK: - Cost Badge

    @ViewBuilder
    private func costBadge(_ cost: AcpMessageCost) -> some View {
        HStack(spacing: 8) {
            Label("\(cost.inputTokens)", systemImage: "arrow.down.circle")
                .font(.caption2)
            Label("\(cost.outputTokens)", systemImage: "arrow.up.circle")
                .font(.caption2)
            if let totalCost = cost.totalCostUSD {
                Text(String(format: "$%.4f", totalCost))
                    .font(.caption2)
                    .fontWeight(.medium)
                    .fontDesign(.monospaced)
            }
        }
        .foregroundStyle(.secondary)
        .padding(.top, 4)
    }

    // MARK: - Styling

    private var backgroundColor: Color {
        switch message.role {
        case .user: return Color(.controlBackgroundColor)
        case .assistant: return Color(.windowBackgroundColor)
        case .system: return Color(.controlBackgroundColor).opacity(0.5)
        }
    }

    private var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: message.createdAt)
    }
}

// MARK: - Notification Names

extension Notification.Name {
    /// Posted when the ACP command palette should be toggled (Cmd+K).
    static let acpToggleCommandPalette = Notification.Name("acpToggleCommandPalette")
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AcpSessionView(session: .sample)
    }
    .frame(width: 800, height: 700)
}
