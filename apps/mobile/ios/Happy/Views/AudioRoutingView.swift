//
//  AudioRoutingView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View for selecting audio output routing.
///
/// Displays available audio output options (speaker, earpiece, Bluetooth,
/// headphones) and allows the user to switch between them.
struct AudioRoutingView: View {

    @ObservedObject var viewModel: VoiceChatViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(viewModel.availableRoutes) { route in
                        Button {
                            viewModel.selectRoute(route)
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: route.iconName)
                                    .font(.title3)
                                    .foregroundStyle(.blue)
                                    .frame(width: 32)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(route.displayName)
                                        .font(.body)
                                        .foregroundStyle(.primary)
                                }

                                Spacer()

                                if viewModel.currentRoute == route {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.blue)
                                        .fontWeight(.semibold)
                                }
                            }
                        }
                    }
                } header: {
                    Text("audioRoute.available".localized)
                } footer: {
                    Text("audioRoute.footer".localized)
                }

                Section {
                    HStack {
                        Text("audioRoute.currentOutput".localized)
                            .foregroundStyle(.secondary)
                        Spacer()
                        HStack(spacing: 4) {
                            Image(systemName: viewModel.currentRoute.iconName)
                            Text(viewModel.currentRoute.displayName)
                        }
                        .foregroundStyle(.blue)
                    }
                } header: {
                    Text("audioRoute.status".localized)
                }
            }
            .navigationTitle("audioRoute.title".localized)
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
}

// MARK: - Preview

#Preview {
    AudioRoutingView(viewModel: VoiceChatViewModel())
}
