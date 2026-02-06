//
//  SessionDetailView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Detail view for a single Claude Code session.
///
/// Displays the message history with real-time streaming updates,
/// session metadata, and cost information.
struct SessionDetailView: View {

    @StateObject private var viewModel: SessionDetailViewModel
    @StateObject private var voiceViewModel = VoiceViewModel()
    @State private var showVoiceSettings = false

    init(session: Session) {
        _viewModel = StateObject(wrappedValue: SessionDetailViewModel(session: session))
    }

    var body: some View {
        Group {
            if viewModel.isLoading && !viewModel.hasLoaded {
                loadingView
            } else if !viewModel.hasMessages && viewModel.hasLoaded {
                emptyMessagesView
            } else {
                messageListContent
            }
        }
        .navigationTitle(viewModel.session.title.isEmpty ? "sessionDetail.session".localized : viewModel.session.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                HStack(spacing: 12) {
                    NavigationLink {
                        ArtifactListView(sessionId: viewModel.session.id)
                    } label: {
                        Image(systemName: "doc.text.magnifyingglass")
                    }

                    sessionStatusBadge
                }
            }
        }
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
        .safeAreaInset(edge: .bottom) {
            VoiceControlView(
                viewModel: voiceViewModel,
                textToSpeak: viewModel.messages.last(where: { $0.role == .assistant })?.content,
                onSettingsTapped: {
                    showVoiceSettings = true
                }
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }
        .sheet(isPresented: $showVoiceSettings) {
            VoiceSettingsView(viewModel: voiceViewModel)
        }
        .task {
            await viewModel.loadMessages()
            await viewModel.subscribeToUpdates()
        }
        .onChange(of: viewModel.messages.count) { _ in
            // Auto-play new assistant messages if enabled
            if let lastMessage = viewModel.messages.last {
                Task {
                    await voiceViewModel.handleNewMessage(lastMessage)
                }
            }
        }
        .onDisappear {
            voiceViewModel.stop()
            voiceViewModel.clearAutoPlayHistory()
            Task {
                await viewModel.unsubscribeFromUpdates()
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("sessionDetail.loading".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Empty Messages View

    private var emptyMessagesView: some View {
        VStack(spacing: 20) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("sessionDetail.noMessages".localized)
                .font(.title2)
                .fontWeight(.semibold)

            Text("sessionDetail.noMessagesDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            if viewModel.session.isActive {
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("sessionDetail.waitingForActivity".localized)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Message List Content

    private var messageListContent: some View {
        ScrollViewReader { proxy in
            List {
                // Session info header
                sessionInfoSection

                // Messages
                ForEach(viewModel.messages) { message in
                    MessageBubbleView(message: message, voiceViewModel: voiceViewModel)
                        .id(message.id)
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                }

                // Streaming indicator
                if viewModel.isStreaming {
                    streamingIndicator
                        .id("streaming-indicator")
                        .listRowSeparator(.hidden)
                }
            }
            .listStyle(.plain)
            .onChange(of: viewModel.messages.count) { _ in
                if let lastMessage = viewModel.messages.last {
                    withAnimation(.easeOut(duration: 0.3)) {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
        }
    }

    // MARK: - Session Info Section

    private var sessionInfoSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("sessionDetail.machineLabel".localized, systemImage: "desktopcomputer")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(viewModel.session.machineId)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack {
                    Label("sessionDetail.startedLabel".localized, systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Spacer()
                    Text(viewModel.session.createdAt, style: .relative)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if viewModel.totalCost > 0 {
                    HStack {
                        Label("sessionDetail.costLabel".localized, systemImage: "dollarsign.circle")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text(viewModel.formattedTotalCost)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                if viewModel.totalInputTokens > 0 || viewModel.totalOutputTokens > 0 {
                    HStack {
                        Label("sessionDetail.tokensLabel".localized, systemImage: "number")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("\(viewModel.totalInputTokens) in / \(viewModel.totalOutputTokens) out")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    // MARK: - Session Status Badge

    private var sessionStatusBadge: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
            Text(viewModel.session.status.rawValue.capitalized)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var statusColor: Color {
        switch viewModel.session.status {
        case .active:
            return .green
        case .paused:
            return .orange
        case .completed:
            return .blue
        case .error:
            return .red
        }
    }

    // MARK: - Streaming Indicator

    private var streamingIndicator: some View {
        HStack(spacing: 8) {
            ProgressView()
                .scaleEffect(0.8)
            Text("sessionDetail.streaming".localized)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Message Bubble View

/// Displays a single message in the conversation.
struct MessageBubbleView: View {
    let message: Message
    @ObservedObject var voiceViewModel: VoiceViewModel

    var body: some View {
        VStack(alignment: alignment, spacing: 4) {
            // Role label with voice button
            HStack(spacing: 4) {
                Image(systemName: roleIcon)
                    .font(.caption2)
                Text(message.role.rawValue.capitalized)
                    .font(.caption2)
                    .fontWeight(.medium)

                if message.role == .assistant {
                    Spacer()
                    MessageVoiceButton(viewModel: voiceViewModel, message: message)
                }
            }
            .foregroundStyle(roleColor)

            // Message content
            Text(message.content)
                .font(.body)
                .padding(12)
                .background(backgroundColor)
                .cornerRadius(12)
                .frame(maxWidth: .infinity, alignment: frameAlignment)

            // Tool uses
            if let toolUses = message.toolUses, !toolUses.isEmpty {
                ForEach(toolUses) { tool in
                    ToolUseView(tool: tool)
                }
            }

            // Cost info
            if let cost = message.cost {
                Text(cost.formattedCost)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var alignment: HorizontalAlignment {
        message.role == .user ? .trailing : .leading
    }

    private var frameAlignment: Alignment {
        message.role == .user ? .trailing : .leading
    }

    private var roleIcon: String {
        switch message.role {
        case .user:
            return "person.fill"
        case .assistant:
            return "sparkles"
        case .system:
            return "gear"
        case .tool:
            return "wrench.fill"
        }
    }

    private var roleColor: Color {
        switch message.role {
        case .user:
            return .blue
        case .assistant:
            return .purple
        case .system:
            return .gray
        case .tool:
            return .orange
        }
    }

    private var backgroundColor: Color {
        switch message.role {
        case .user:
            return Color.blue.opacity(0.1)
        case .assistant:
            return Color.purple.opacity(0.1)
        case .system:
            return Color.gray.opacity(0.1)
        case .tool:
            return Color.orange.opacity(0.1)
        }
    }
}

// MARK: - Tool Use View

/// Displays a tool use within a message.
struct ToolUseView: View {
    let tool: ToolUse

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: toolStatusIcon)
                    .font(.caption2)
                    .foregroundStyle(toolStatusColor)

                Text(tool.name)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.primary)

                Spacer()

                Text(tool.status.rawValue)
                    .font(.caption2)
                    .foregroundStyle(toolStatusColor)
            }

            if let output = tool.output, !output.isEmpty {
                Text(output)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
        .padding(8)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    private var toolStatusIcon: String {
        switch tool.status {
        case .pending:
            return "clock"
        case .running:
            return "arrow.triangle.2.circlepath"
        case .completed:
            return "checkmark.circle.fill"
        case .failed:
            return "xmark.circle.fill"
        }
    }

    private var toolStatusColor: Color {
        switch tool.status {
        case .pending:
            return .gray
        case .running:
            return .blue
        case .completed:
            return .green
        case .failed:
            return .red
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SessionDetailView(session: .sample)
    }
}
