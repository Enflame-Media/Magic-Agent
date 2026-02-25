//
//  AcpCommandPaletteView.swift
//  Happy
//
//  Searchable sheet for available slash commands.
//

import SwiftUI

/// Sheet modal displaying available ACP slash commands with search filtering.
struct AcpCommandPaletteView: View {

    let commands: [AcpAvailableCommand]
    let onSelect: (AcpAvailableCommand) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    // MARK: - Body

    var body: some View {
        NavigationView {
            List {
                if filteredCommands.isEmpty {
                    Text("acp.commands.empty".localized)
                        .foregroundColor(.secondary)
                        .font(.callout)
                } else {
                    ForEach(Array(filteredCommands.enumerated()), id: \.offset) { _, cmd in
                        Button {
                            onSelect(cmd)
                            dismiss()
                        } label: {
                            commandRow(cmd)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .searchable(text: $searchText, prompt: "acp.commands.search".localized)
            .navigationTitle("acp.commands.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("common.cancel".localized) {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Command Row

    private func commandRow(_ cmd: AcpAvailableCommand) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(cmd.name)
                .font(.system(.callout, design: .monospaced))
                .foregroundColor(.primary)

            if !cmd.description.isEmpty {
                Text(cmd.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Filtering

    private var filteredCommands: [AcpAvailableCommand] {
        guard !searchText.isEmpty else { return commands }
        let query = searchText.lowercased()
        return commands.filter { cmd in
            cmd.name.lowercased().contains(query)
            || cmd.description.lowercased().contains(query)
        }
    }
}
