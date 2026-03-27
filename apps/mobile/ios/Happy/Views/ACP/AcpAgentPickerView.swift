//
//  AcpAgentPickerView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Picker for selecting an ACP agent from the registry.
///
/// Presented as a sheet when the `AcpAgentBadge` is tapped. Shows
/// available agents with their status, model, and capabilities.
struct AcpAgentPickerView: View {

    @ObservedObject var viewModel: AcpSessionViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                if viewModel.agents.isEmpty {
                    emptyStateView
                } else {
                    ForEach(viewModel.agents) { agent in
                        Button {
                            viewModel.selectAgent(agent)
                            dismiss()
                        } label: {
                            agentRow(agent)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("acp.selectAgent".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "cpu.fill")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)

            Text("acp.noAgents".localized)
                .font(.headline)
                .foregroundStyle(.secondary)

            Text("acp.noAgentsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .listRowBackground(Color.clear)
    }

    // MARK: - Agent Row

    private func agentRow(_ agent: AcpAgent) -> some View {
        HStack(spacing: 12) {
            // Agent icon with status
            ZStack {
                Circle()
                    .fill(statusColor(for: agent).opacity(0.15))
                    .frame(width: 44, height: 44)

                Image(systemName: "cpu.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(statusColor(for: agent))
            }

            // Agent details
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(agent.name)
                        .font(.body)
                        .fontWeight(.medium)

                    if agent.id == viewModel.activeAgent?.id {
                        Text("acp.active".localized)
                            .font(.caption2)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(.blue))
                    }
                }

                if let model = agent.model {
                    Text(model)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if !agent.capabilities.isEmpty {
                    HStack(spacing: 4) {
                        ForEach(agent.capabilities.prefix(3), id: \.self) { cap in
                            Text(cap)
                                .font(.caption2)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule()
                                        .fill(Color(.systemGray5))
                                )
                        }
                    }
                }
            }

            Spacer()

            // Status indicator
            Circle()
                .fill(statusColor(for: agent))
                .frame(width: 10, height: 10)
        }
        .padding(.vertical, 4)
    }

    private func statusColor(for agent: AcpAgent) -> Color {
        switch agent.status {
        case .available:
            return .green
        case .busy:
            return .orange
        case .offline:
            return .gray
        }
    }
}

// MARK: - Preview

#Preview {
    AcpAgentPickerView(viewModel: AcpSessionViewModel())
}
