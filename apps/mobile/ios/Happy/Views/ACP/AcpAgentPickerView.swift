//
//  AcpAgentPickerView.swift
//  Happy
//
//  Sheet for browsing and switching ACP agents.
//

import SwiftUI
import UIKit

/// Sheet modal for selecting and switching ACP agents.
struct AcpAgentPickerView: View {

    let registry: AcpAgentRegistryState
    let onSwitch: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var confirmAgentId: String?

    // MARK: - Body

    var body: some View {
        NavigationView {
            ZStack {
                List {
                    ForEach(sortedAgents, id: \.id) { agent in
                        agentRow(agent)
                    }
                }

                // Loading overlay
                if registry.switching {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView("acp.agents.switching".localized)
                        .padding()
                        .background(.regularMaterial)
                        .cornerRadius(12)
                }

                // Error banner
                if let error = registry.switchError {
                    VStack {
                        errorBanner(error)
                        Spacer()
                    }
                }
            }
            .navigationTitle("acp.agents.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel".localized) {
                        dismiss()
                    }
                }
            }
            .confirmationDialog(
                "acp.agents.switchConfirm".localized,
                isPresented: .init(
                    get: { confirmAgentId != nil },
                    set: { if !$0 { confirmAgentId = nil } }
                ),
                titleVisibility: .visible
            ) {
                if let agentId = confirmAgentId {
                    Button("acp.agents.switchAction".localized) {
                        let generator = UIImpactFeedbackGenerator(style: .medium)
                        generator.impactOccurred()
                        onSwitch(agentId)
                    }
                    Button("common.cancel".localized, role: .cancel) {}
                }
            }
        }
    }

    // MARK: - Agent Row

    private func agentRow(_ agent: AcpRegisteredAgent) -> some View {
        HStack(spacing: 12) {
            // Status dot
            Circle()
                .fill(statusColor(agent.status))
                .frame(width: 10, height: 10)
                .accessibilityLabel(agent.status.rawValue)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text(agent.name)
                        .font(.callout)
                        .fontWeight(.medium)

                    if let version = agent.version {
                        Text("v\(version)")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                if let desc = agent.description {
                    Text(desc)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            if agent.id == registry.activeAgentId {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.accentColor)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            guard agent.id != registry.activeAgentId else { return }
            confirmAgentId = agent.id
        }
        .padding(.vertical, 2)
    }

    // MARK: - Error Banner

    private func errorBanner(_ error: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle")
            Text(error)
                .font(.callout)
            Spacer()
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .foregroundColor(.red)
        .cornerRadius(8)
        .padding()
    }

    // MARK: - Helpers

    private var sortedAgents: [AcpRegisteredAgent] {
        Array(registry.agents.values).sorted { a, b in
            if a.id == registry.activeAgentId { return true }
            if b.id == registry.activeAgentId { return false }
            return a.name < b.name
        }
    }

    private func statusColor(_ status: AcpAgentStatus) -> Color {
        switch status {
        case .connected: return .green
        case .available: return .blue
        case .unavailable: return .red
        case .error: return .red
        }
    }
}
