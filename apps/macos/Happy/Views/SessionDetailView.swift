//
//  SessionDetailView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI
import Combine

/// Detailed view of a session showing messages and tools.
struct SessionDetailView: View {
    let session: Session

    @State private var viewModel: SessionDetailViewModel
    @State private var voiceViewModel = VoiceViewModel()
    @State private var showingShareSheet = false
    @State private var showingVoiceControl = false

    init(session: Session) {
        self.session = session
        self._viewModel = State(initialValue: SessionDetailViewModel(session: session))
    }

    var body: some View {
        VStack(spacing: 0) {
            // Header
            header

            Divider()

            // Messages list
            if viewModel.isLoading && viewModel.messages.isEmpty {
                loadingView
            } else if viewModel.messages.isEmpty {
                emptyView
            } else {
                messagesView
            }

            Divider()

            // Footer with stats
            footer
        }
        .navigationTitle(session.title.isEmpty ? "Session" : session.title)
        .toolbar {
            ToolbarItemGroup {
                voiceButton
                shareButton
                autoScrollToggle
                copyButton
            }
        }
        .task {
            await viewModel.loadMessages()
        }
        .onDisappear {
            Task {
                await viewModel.unsubscribe()
            }
        }
        .sheet(isPresented: $showingShareSheet) {
            ShareSessionSheet(sessionId: session.id)
        }
        .onReceive(NotificationCenter.default.publisher(for: .shareSession)) { _ in
            showingShareSheet = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .toggleVoice)) { _ in
            voiceViewModel.toggleSession(sessionId: session.id)
        }
        .onReceive(NotificationCenter.default.publisher(for: .toggleVoiceMute)) { _ in
            voiceViewModel.toggleMute()
        }
        .onReceive(NotificationCenter.default.publisher(for: .endVoiceSession)) { _ in
            voiceViewModel.endSession()
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(session.title.isEmpty ? "Untitled Session" : session.title)
                    .font(.headline)

                HStack(spacing: 8) {
                    StatusBadge(status: session.status)

                    Text("Updated \(formattedTime)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
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
        .padding()
        .background(.bar)
    }

    // MARK: - Messages

    @ViewBuilder
    private var messagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.messages) { message in
                        MessageView(message: message)
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

    @ViewBuilder
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
            Text("Loading messages...")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: "bubble.left.and.bubble.right")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No Messages")
                .font(.headline)

            Text("Messages will appear here as they stream in")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Footer

    @ViewBuilder
    private var footer: some View {
        HStack {
            // Message count
            Label("\(viewModel.messages.count) messages", systemImage: "bubble.left.and.bubble.right")
                .font(.caption)
                .foregroundStyle(.secondary)

            Spacer()

            // Token breakdown
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

    // MARK: - Toolbar

    @ViewBuilder
    private var voiceButton: some View {
        Button {
            voiceViewModel.toggleSession(sessionId: session.id)
        } label: {
            Image(systemName: voiceViewModel.iconName)
                .foregroundStyle(voiceViewModel.indicatorColor)
                .symbolEffect(.pulse, isActive: voiceViewModel.isConnecting)
        }
        .help(voiceViewModel.statusMessage)
        .disabled(!voiceViewModel.isEnabled)
        .keyboardShortcut("v", modifiers: [.command, .shift])
        .popover(isPresented: $showingVoiceControl) {
            VoiceControlView(sessionId: session.id, isCompact: false)
                .frame(width: 280)
        }
        .contextMenu {
            if voiceViewModel.isActive {
                Button {
                    voiceViewModel.toggleMute()
                } label: {
                    Label(voiceViewModel.isMuted ? "Unmute" : "Mute", systemImage: voiceViewModel.isMuted ? "mic.fill" : "mic.slash.fill")
                }

                Divider()

                Button(role: .destructive) {
                    voiceViewModel.endSession()
                } label: {
                    Label("End Voice Session", systemImage: "xmark.circle")
                }
            } else {
                Button {
                    voiceViewModel.toggleSession(sessionId: session.id)
                } label: {
                    Label("Start Voice Session", systemImage: "mic")
                }
                .disabled(!voiceViewModel.isEnabled)
            }
        }
    }

    @ViewBuilder
    private var shareButton: some View {
        Button {
            showingShareSheet = true
        } label: {
            Image(systemName: "square.and.arrow.up")
        }
        .help("Share Session")
        .keyboardShortcut("s", modifiers: [.command, .shift])
    }

    @ViewBuilder
    private var autoScrollToggle: some View {
        Button {
            viewModel.toggleAutoScroll()
        } label: {
            Image(systemName: viewModel.autoScrollEnabled ? "arrow.down.circle.fill" : "arrow.down.circle")
        }
        .help(viewModel.autoScrollEnabled ? "Auto-scroll enabled" : "Auto-scroll disabled")
    }

    @ViewBuilder
    private var copyButton: some View {
        Button {
            copySessionToClipboard()
        } label: {
            Image(systemName: "doc.on.doc")
        }
        .help("Copy session to clipboard")
        .keyboardShortcut("c", modifiers: [.command, .shift])
    }

    // MARK: - Helpers

    private var formattedTime: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: session.updatedAt, relativeTo: Date())
    }

    private func copySessionToClipboard() {
        let content = viewModel.messages.map { msg in
            "[\(msg.role.rawValue.uppercased())]\n\(msg.content)"
        }.joined(separator: "\n\n---\n\n")

        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(content, forType: .string)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        SessionDetailView(session: .sample)
    }
}
