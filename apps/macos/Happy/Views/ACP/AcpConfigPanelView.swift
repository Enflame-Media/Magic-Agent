//
//  AcpConfigPanelView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Configuration panel with Picker/Toggle/TextField based on option type.
//

import SwiftUI

/// Configuration panel for ACP session settings.
///
/// Renders each config option with the appropriate control type:
/// - Toggle for boolean options
/// - Picker for options with predefined choices
/// - TextField for free-form text/number options
struct AcpConfigPanelView: View {
    /// The view model providing config options.
    @Bindable var viewModel: AcpSessionViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Image(systemName: "gearshape")
                    .foregroundStyle(.secondary)

                Text("acp.config.title".localized)
                    .font(.headline)

                Spacer()

                Button {
                    viewModel.toggleConfigPanel()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding()

            Divider()

            // Options list
            Form {
                ForEach(viewModel.configOptions) { option in
                    configRow(option)
                }
            }
            .formStyle(.grouped)
            .scrollContentBackground(.hidden)
        }
        .frame(width: 360)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Config Row

    @ViewBuilder
    private func configRow(_ option: AcpConfigOption) -> some View {
        switch option.type {
        case .toggle:
            Toggle(isOn: Binding(
                get: { option.value == "true" },
                set: { newValue in
                    viewModel.updateConfigOption(id: option.id, value: newValue ? "true" : "false")
                }
            )) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(option.name)
                        .font(.body)
                    if let description = option.description {
                        Text(description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

        case .picker:
            if let choices = option.choices {
                Picker(selection: Binding(
                    get: { option.value },
                    set: { newValue in
                        viewModel.updateConfigOption(id: option.id, value: newValue)
                    }
                )) {
                    ForEach(choices, id: \.self) { choice in
                        Text(choice).tag(choice)
                    }
                } label: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(option.name)
                            .font(.body)
                        if let description = option.description {
                            Text(description)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

        case .text:
            VStack(alignment: .leading, spacing: 4) {
                Text(option.name)
                    .font(.body)
                if let description = option.description {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                TextField(option.name, text: Binding(
                    get: { option.value },
                    set: { newValue in
                        viewModel.updateConfigOption(id: option.id, value: newValue)
                    }
                ))
                .textFieldStyle(.roundedBorder)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    AcpConfigPanelView(
        viewModel: AcpSessionViewModel(session: .sample)
    )
    .padding()
    .frame(width: 500, height: 500)
}
