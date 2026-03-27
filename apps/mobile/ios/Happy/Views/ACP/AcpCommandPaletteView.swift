//
//  AcpCommandPaletteView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Command palette for quick ACP actions.
///
/// Provides a searchable list of commands for controlling the agent,
/// such as pausing, resuming, changing mode, or sending instructions.
struct AcpCommandPaletteView: View {

    @ObservedObject var viewModel: AcpSessionViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    private var commands: [AcpCommand] {
        let all: [AcpCommand] = [
            AcpCommand(id: "pause", name: "acp.command.pause".localized, icon: "pause.fill", category: .session),
            AcpCommand(id: "resume", name: "acp.command.resume".localized, icon: "play.fill", category: .session),
            AcpCommand(id: "stop", name: "acp.command.stop".localized, icon: "stop.fill", category: .session),
            AcpCommand(id: "mode-auto", name: "acp.command.modeAutonomous".localized, icon: "bolt.fill", category: .mode),
            AcpCommand(id: "mode-supervised", name: "acp.command.modeSupervised".localized, icon: "eye.fill", category: .mode),
            AcpCommand(id: "mode-manual", name: "acp.command.modeManual".localized, icon: "hand.raised.fill", category: .mode),
            AcpCommand(id: "approve-all", name: "acp.command.approveAll".localized, icon: "checkmark.circle.fill", category: .permissions),
            AcpCommand(id: "deny-all", name: "acp.command.denyAll".localized, icon: "xmark.circle.fill", category: .permissions),
        ]

        if searchText.isEmpty {
            return all
        }
        return all.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        NavigationStack {
            List {
                ForEach(AcpCommandCategory.allCases, id: \.self) { category in
                    let categoryCommands = commands.filter { $0.category == category }
                    if !categoryCommands.isEmpty {
                        Section(category.displayName) {
                            ForEach(categoryCommands) { command in
                                Button {
                                    executeCommand(command)
                                } label: {
                                    Label(command.name, systemImage: command.icon)
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
            .navigationTitle("acp.commands".localized)
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "acp.searchCommands".localized)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) {
                        dismiss()
                    }
                }
            }
        }
    }

    private func executeCommand(_ command: AcpCommand) {
        switch command.id {
        case "mode-auto":
            viewModel.updateMode(.autonomous)
        case "mode-supervised":
            viewModel.updateMode(.supervised)
        case "mode-manual":
            viewModel.updateMode(.manual)
        default:
            break
        }
        dismiss()
    }
}

// MARK: - Command Model

struct AcpCommand: Identifiable {
    let id: String
    let name: String
    let icon: String
    let category: AcpCommandCategory
}

enum AcpCommandCategory: CaseIterable {
    case session
    case mode
    case permissions

    var displayName: String {
        switch self {
        case .session: return NSLocalizedString("acp.category.session", comment: "")
        case .mode: return NSLocalizedString("acp.category.mode", comment: "")
        case .permissions: return NSLocalizedString("acp.category.permissions", comment: "")
        }
    }
}

// MARK: - Preview

#Preview {
    AcpCommandPaletteView(viewModel: AcpSessionViewModel())
}
