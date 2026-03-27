//
//  AcpConfigPanelView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Configuration panel for ACP session settings.
///
/// Allows users to configure agent mode, auto-approve rules,
/// max turns, and other session parameters.
struct AcpConfigPanelView: View {

    @ObservedObject var viewModel: AcpSessionViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            // Mode selection
            Section {
                Picker("acp.mode".localized, selection: $viewModel.config.mode) {
                    ForEach([AcpMode.autonomous, .supervised, .manual, .planReview], id: \.self) { mode in
                        Label(mode.displayName, systemImage: mode.icon)
                            .tag(mode)
                    }
                }
            } header: {
                Text("acp.modeSection".localized)
            } footer: {
                Text(modeDescription)
                    .font(.caption)
            }

            // Auto-approve rules
            Section("acp.autoApprove".localized) {
                ForEach(viewModel.config.autoApprove, id: \.self) { rule in
                    HStack {
                        Image(systemName: "checkmark.shield")
                            .foregroundStyle(.green)
                        Text(rule)
                    }
                }

                if viewModel.config.autoApprove.isEmpty {
                    Text("acp.noAutoApproveRules".localized)
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                }
            }

            // Advanced settings
            Section("acp.advanced".localized) {
                if let model = viewModel.config.model {
                    HStack {
                        Text("acp.model".localized)
                        Spacer()
                        Text(model)
                            .foregroundStyle(.secondary)
                    }
                }

                if let maxTurns = viewModel.config.maxTurns {
                    HStack {
                        Text("acp.maxTurns".localized)
                        Spacer()
                        Text("\(maxTurns)")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("acp.configuration".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("common.done".localized) {
                    dismiss()
                }
            }
        }
    }

    private var modeDescription: String {
        switch viewModel.config.mode {
        case .autonomous:
            return NSLocalizedString("acp.mode.autonomousDescription", comment: "")
        case .supervised:
            return NSLocalizedString("acp.mode.supervisedDescription", comment: "")
        case .manual:
            return NSLocalizedString("acp.mode.manualDescription", comment: "")
        case .planReview:
            return NSLocalizedString("acp.mode.planReviewDescription", comment: "")
        }
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        AcpConfigPanelView(viewModel: AcpSessionViewModel())
    }
}
