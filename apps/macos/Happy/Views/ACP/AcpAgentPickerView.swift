//
//  AcpAgentPickerView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Agent picker popover for switching between registered agents.
///
/// Displays a list of agents with their name, status indicator, and version.
/// The currently active agent is highlighted with a checkmark.
/// Click to switch with a confirmation alert and loading overlay.
///
/// ## Features
/// - Agent list with name, status indicator (colored circle), version
/// - Current agent highlighted with checkmark
/// - Click to switch with confirmation alert
/// - Loading overlay during switch
/// - Error alert with rollback info on failure
struct AcpAgentPickerView: View {
    @State private var viewModel = AcpSessionViewModel.shared

    var body: some View {
        VStack(spacing: 0) {
            // Header
            headerBar

            Divider()

            // Agent list
            if viewModel.agents.isEmpty {
                emptyView
            } else {
                agentList
            }
        }
        .frame(width: 280, minHeight: 200)
        .alert(
            "Switch Agent",
            isPresented: $viewModel.showAgentSwitchConfirmation,
            presenting: agentToSwitch
        ) { agent in
            Button("Cancel", role: .cancel) {
                viewModel.cancelAgentSwitch()
            }
            Button("Switch to \(agent.displayTitle)") {
                viewModel.confirmAgentSwitch()
            }
        } message: { agent in
            Text("Switch from \(viewModel.activeAgent?.displayTitle ?? "current agent") to \(agent.displayTitle)?")
        }
        .alert(
            "Agent Switch Failed",
            isPresented: .init(
                get: { viewModel.agentSwitchError != nil },
                set: { if !$0 { viewModel.agentSwitchError = nil } }
            )
        ) {
            Button("OK", role: .cancel) {
                viewModel.agentSwitchError = nil
            }
        } message: {
            if let error = viewModel.agentSwitchError {
                Text(error)
            }
        }
    }

    // MARK: - Header

    @ViewBuilder
    private var headerBar: some View {
        HStack {
            Label("Agents", systemImage: "cpu")
                .font(.headline)

            Spacer()

            if viewModel.isSwitchingAgent {
                ProgressView()
                    .controlSize(.small)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.bar)
    }

    // MARK: - Agent List

    @ViewBuilder
    private var agentList: some View {
        List {
            ForEach(viewModel.agents) { agent in
                AcpAgentRow(
                    agent: agent,
                    isActive: agent.id == viewModel.activeAgentId,
                    onSelect: {
                        viewModel.requestAgentSwitch(agentId: agent.id)
                    }
                )
            }
        }
        .listStyle(.inset)
        .overlay {
            if viewModel.isSwitchingAgent {
                Color.black.opacity(0.1)
                    .overlay {
                        VStack(spacing: 8) {
                            ProgressView()
                            Text("Switching agent...")
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

    // MARK: - Empty View

    @ViewBuilder
    private var emptyView: some View {
        VStack(spacing: 12) {
            Image(systemName: "cpu")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)

            Text("No Agents")
                .font(.subheadline)
                .fontWeight(.medium)

            Text("No agents are currently registered.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Helpers

    private var agentToSwitch: AcpAgent? {
        guard let id = viewModel.pendingAgentSwitchId else { return nil }
        return viewModel.agents.first { $0.id == id }
    }
}

// MARK: - Agent Row

/// A single agent row in the picker list.
struct AcpAgentRow: View {
    let agent: AcpAgent
    let isActive: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: 10) {
                // Status indicator
                Circle()
                    .fill(statusColor)
                    .frame(width: 10, height: 10)

                // Agent info
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(agent.displayTitle)
                            .font(.subheadline)
                            .fontWeight(isActive ? .semibold : .regular)

                        if isActive {
                            Image(systemName: "checkmark")
                                .font(.caption)
                                .foregroundStyle(.blue)
                        }
                    }

                    HStack(spacing: 8) {
                        Text(agent.name)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("v\(agent.version)")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer()

                // Status text
                Text(agent.status.displayText)
                    .font(.caption2)
                    .foregroundStyle(statusColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(statusColor.opacity(0.1))
                    .clipShape(Capsule())
            }
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(agent.status == .offline)
        .opacity(agent.status == .offline ? 0.5 : 1.0)
    }

    private var statusColor: Color {
        switch agent.status {
        case .online: return .green
        case .offline: return .gray
        case .busy: return .orange
        case .error: return .red
        }
    }
}

// MARK: - Preview

#Preview {
    AcpAgentPickerView()
}
