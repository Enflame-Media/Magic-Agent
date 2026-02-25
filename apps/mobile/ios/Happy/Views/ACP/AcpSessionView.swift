//
//  AcpSessionView.swift
//  Happy
//
//  Main ACP session container composing all display components.
//

import SwiftUI

/// Main ACP session view that composes all display components into a session detail.
struct AcpSessionView: View {

    let sessionId: String
    @ObservedObject var viewModel: AcpSessionViewModel

    @State private var showCommandPalette = false
    @State private var showConfigPanel = false

    // MARK: - Body

    var body: some View {
        let state = viewModel.state(for: sessionId)

        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                // Top bar: mode + usage
                topBar(state: state)

                // Agent message
                if !state.agentMessage.isEmpty {
                    Section {
                        AcpStreamingTextView(text: state.agentMessage)
                    } header: {
                        sectionHeader("acp.session.agentMessage".localized, icon: "bubble.left.fill")
                    }
                }

                // Thought
                if !state.agentThought.isEmpty {
                    AcpThoughtView(thought: state.agentThought)
                }

                // Plan
                if !state.plan.isEmpty {
                    AcpPlanView(entries: state.plan)
                }

                // Tool calls
                if !state.toolCalls.isEmpty {
                    Section {
                        ForEach(sortedToolCalls(state.toolCalls), id: \.toolCallId) { tc in
                            AcpToolCallView(toolCall: tc)
                        }
                    } header: {
                        sectionHeader("acp.session.toolCalls".localized, icon: "wrench.and.screwdriver")
                    }
                }

                // User message
                if !state.userMessage.isEmpty {
                    Section {
                        AcpStreamingTextView(text: state.userMessage)
                            .foregroundColor(.secondary)
                    } header: {
                        sectionHeader("acp.session.userMessage".localized, icon: "person.fill")
                    }
                }
            }
            .padding()
        }
        .toolbar {
            ToolbarItemGroup(placement: .bottomBar) {
                Button {
                    showCommandPalette = true
                } label: {
                    Image(systemName: "slash.circle")
                        .accessibilityLabel("acp.session.commands".localized)
                }

                Spacer()

                Button {
                    showConfigPanel = true
                } label: {
                    Image(systemName: "gearshape")
                        .accessibilityLabel("acp.session.config".localized)
                }
            }
        }
        .sheet(isPresented: $showCommandPalette) {
            AcpCommandPaletteView(
                commands: state.availableCommands,
                onSelect: { _ in /* Command execution handled by sync service */ }
            )
        }
        .sheet(isPresented: $showConfigPanel) {
            AcpConfigPanelView(
                configOptions: state.configOptions,
                onUpdate: { _, _ in /* Config update handled by sync service */ }
            )
        }
        .navigationTitle(state.sessionTitle ?? "acp.session.untitled".localized)
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: - Top Bar

    private func topBar(state: AcpSessionState) -> some View {
        HStack(spacing: 8) {
            if let modeId = state.currentModeId {
                AcpModeIndicator(modeId: modeId)
            }

            Spacer()

            if let usage = state.usage {
                AcpUsageWidget(usage: usage)
                    .frame(maxWidth: 200)
            }
        }
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String, icon: String) -> some View {
        Label(title, systemImage: icon)
            .font(.caption)
            .fontWeight(.medium)
            .foregroundColor(.secondary)
            .padding(.top, 4)
    }

    // MARK: - Tool Call Sorting

    private func sortedToolCalls(_ toolCalls: [String: AcpToolCall]) -> [AcpToolCall] {
        toolCalls.values.sorted { a, b in
            let aActive = a.status == .inProgress || a.status == .pending
            let bActive = b.status == .inProgress || b.status == .pending
            if aActive != bActive { return aActive }
            return a.toolCallId < b.toolCallId
        }
    }
}
