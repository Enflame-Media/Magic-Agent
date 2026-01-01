//
//  SettingsView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// The settings/preferences view for the Happy app.
///
/// Accessible via Preferences menu item (⌘,) using the Settings scene.
struct SettingsView: View {
    @State private var viewModel = SettingsViewModel()

    var body: some View {
        TabView(selection: $viewModel.selectedTab) {
            generalTab
                .tabItem {
                    Label("General", systemImage: "gearshape")
                }
                .tag(SettingsTab.general)

            accountTab
                .tabItem {
                    Label("Account", systemImage: "person.circle")
                }
                .tag(SettingsTab.account)

            notificationsTab
                .tabItem {
                    Label("Notifications", systemImage: "bell")
                }
                .tag(SettingsTab.notifications)

            advancedTab
                .tabItem {
                    Label("Advanced", systemImage: "wrench.and.screwdriver")
                }
                .tag(SettingsTab.advanced)
        }
        .frame(width: 450, height: 300)
        .fixedSize()
    }

    // MARK: - General Tab

    @ViewBuilder
    private var generalTab: some View {
        Form {
            Section {
                Toggle("Launch Happy at login", isOn: $viewModel.launchAtLogin)

                Picker("Appearance", selection: $viewModel.themePreference) {
                    ForEach(ThemePreference.allCases) { theme in
                        Text(theme.displayName).tag(theme)
                    }
                }
            }

            Section {
                Toggle("Play sounds", isOn: $viewModel.soundsEnabled)
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    // MARK: - Account Tab

    @ViewBuilder
    private var accountTab: some View {
        Form {
            if viewModel.isAuthenticated {
                authenticatedAccountSection
            } else {
                unauthenticatedSection
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    @ViewBuilder
    private var authenticatedAccountSection: some View {
        Section("Connected Machine") {
            if let machine = viewModel.machine {
                LabeledContent("Machine ID", value: machine.id)
                LabeledContent("Connected", value: formattedDate(machine.connectedAt))
            } else {
                Text("No machine information available")
                    .foregroundStyle(.secondary)
            }
        }

        Section {
            Button("Disconnect", role: .destructive) {
                viewModel.logout()
            }
        }
    }

    @ViewBuilder
    private var unauthenticatedSection: some View {
        Section {
            VStack(spacing: 16) {
                Image(systemName: "qrcode.viewfinder")
                    .font(.system(size: 48))
                    .foregroundStyle(.secondary)

                Text("Not Connected")
                    .font(.headline)

                Text("Scan a QR code from Claude Code CLI to connect")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding()
        }
    }

    // MARK: - Notifications Tab

    @ViewBuilder
    private var notificationsTab: some View {
        Form {
            Section {
                Toggle("Enable notifications", isOn: $viewModel.notificationsEnabled)

                if viewModel.notificationsEnabled {
                    Text("You'll receive notifications when Claude completes tasks or needs input")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    // MARK: - Advanced Tab

    @ViewBuilder
    private var advancedTab: some View {
        Form {
            Section("Server") {
                TextField("Server URL", text: $viewModel.serverURL)
                    .textFieldStyle(.roundedBorder)

                Text("Change this only if you're running a custom Happy server")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section {
                Button("Reset to Defaults") {
                    viewModel.resetToDefaults()
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    // MARK: - Helpers

    private func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Preview

#Preview {
    SettingsView()
}
