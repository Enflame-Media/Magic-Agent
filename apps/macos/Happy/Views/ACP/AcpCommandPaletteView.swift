//
//  AcpCommandPaletteView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Filterable command list with macOS-native search (Cmd+K trigger).
//

import SwiftUI

/// A command palette for ACP slash commands, triggered by Cmd+K.
///
/// Displays a searchable list of available commands grouped by category.
/// Uses the macOS-native search field pattern.
struct AcpCommandPaletteView: View {
    /// The view model providing commands and search state.
    @Bindable var viewModel: AcpSessionViewModel

    /// Focus state for the search field.
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            // Search field
            searchField

            Divider()

            // Command list
            if viewModel.filteredCommands.isEmpty {
                emptyState
            } else {
                commandList
            }
        }
        .frame(width: 400, height: 360)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.2), radius: 20, y: 10)
        .onAppear {
            isSearchFocused = true
        }
        .onExitCommand {
            viewModel.hideCommandPalette()
        }
    }

    // MARK: - Search Field

    @ViewBuilder
    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("acp.commands.search".localized, text: $viewModel.commandSearchQuery)
                .textFieldStyle(.plain)
                .font(.body)
                .focused($isSearchFocused)
                .onSubmit {
                    // Execute the first matching command
                    if let first = viewModel.filteredCommands.first {
                        viewModel.executeCommand(first)
                    }
                }

            if !viewModel.commandSearchQuery.isEmpty {
                Button {
                    viewModel.commandSearchQuery = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            // Escape hint
            Text("esc")
                .font(.caption2)
                .fontDesign(.monospaced)
                .padding(.horizontal, 4)
                .padding(.vertical, 2)
                .background(Color(.controlBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 3))
                .foregroundStyle(.tertiary)
        }
        .padding(12)
    }

    // MARK: - Command List

    @ViewBuilder
    private var commandList: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                ForEach(viewModel.groupedCommands, id: \.category) { group in
                    // Category header
                    Text(group.category)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.tertiary)
                        .textCase(.uppercase)
                        .padding(.horizontal, 12)
                        .padding(.top, 8)
                        .padding(.bottom, 4)

                    ForEach(group.commands) { command in
                        commandRow(command)
                    }
                }
            }
            .padding(.vertical, 4)
        }
    }

    @ViewBuilder
    private func commandRow(_ command: AcpCommand) -> some View {
        Button {
            viewModel.executeCommand(command)
        } label: {
            HStack(spacing: 8) {
                Text(command.name)
                    .font(.body)
                    .fontDesign(.monospaced)
                    .fontWeight(.medium)

                Text(command.description)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)

                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .onHover { isHovered in
            if isHovered {
                NSCursor.pointingHand.push()
            } else {
                NSCursor.pop()
            }
        }
    }

    // MARK: - Empty State

    @ViewBuilder
    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "text.magnifyingglass")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)

            Text("acp.commands.empty".localized)
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Preview

#Preview {
    AcpCommandPaletteView(
        viewModel: AcpSessionViewModel(session: .sample)
    )
    .padding(40)
    .frame(width: 600, height: 500)
}
