//
//  AcpConfigPanelView.swift
//  Happy
//
//  Form for ACP session config options (model selection, etc.).
//

import SwiftUI

/// Form displaying ACP session config options with type-aware controls.
struct AcpConfigPanelView: View {

    let configOptions: [AcpSessionConfigOption]
    let onUpdate: (String, String) -> Void

    @Environment(\.dismiss) private var dismiss

    // MARK: - Body

    var body: some View {
        NavigationView {
            Form {
                ForEach(Array(configOptions.enumerated()), id: \.offset) { _, option in
                    configSection(for: option)
                }
            }
            .navigationTitle("acp.config.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("common.done".localized) {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Config Section

    @ViewBuilder
    private func configSection(for option: AcpSessionConfigOption) -> some View {
        Section(header: Text(option.name)) {
            switch option.options {
            case .flat(let options):
                flatPicker(option: option, choices: options)

            case .grouped(let groups):
                groupedPicker(option: option, groups: groups)
            }
        }
    }

    // MARK: - Flat Picker

    private func flatPicker(option: AcpSessionConfigOption, choices: [AcpConfigSelectOption]) -> some View {
        ForEach(Array(choices.enumerated()), id: \.offset) { _, choice in
            Button {
                onUpdate(option.id, choice.value)
            } label: {
                HStack {
                    Text(choice.name)
                        .foregroundColor(.primary)
                    Spacer()
                    if option.currentValue == choice.value {
                        Image(systemName: "checkmark")
                            .foregroundColor(.accentColor)
                    }
                }
            }
        }
    }

    // MARK: - Grouped Picker

    private func groupedPicker(option: AcpSessionConfigOption, groups: [AcpConfigSelectGroup]) -> some View {
        ForEach(Array(groups.enumerated()), id: \.offset) { _, group in
            Section(header: Text(group.name)) {
                ForEach(Array(group.options.enumerated()), id: \.offset) { _, choice in
                    Button {
                        onUpdate(option.id, choice.value)
                    } label: {
                        HStack {
                            Text(choice.name)
                                .foregroundColor(.primary)
                            Spacer()
                            if option.currentValue == choice.value {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.accentColor)
                            }
                        }
                    }
                }
            }
        }
    }
}
