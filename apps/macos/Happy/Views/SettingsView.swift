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
    @State private var purchaseViewModel = PurchaseViewModel()

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

            subscriptionTab
                .tabItem {
                    Label("Subscription", systemImage: "creditcard")
                }
                .tag(SettingsTab.subscription)

            voiceTab
                .tabItem {
                    Label("Voice", systemImage: "waveform")
                }
                .tag(SettingsTab.voice)

            languageTab
                .tabItem {
                    Label("Language", systemImage: "globe")
                }
                .tag(SettingsTab.language)

            privacyTab
                .tabItem {
                    Label("Privacy", systemImage: "eye.slash")
                }
                .tag(SettingsTab.privacy)

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
        .frame(width: 500, height: 360)
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

    // MARK: - Voice Tab (HAP-901)

    @State private var voiceViewModel = VoiceViewModel()

    @ViewBuilder
    private var voiceTab: some View {
        Form {
            Section("Voice Assistant") {
                Toggle("Enable Voice Assistant", isOn: $viewModel.voiceAssistantEnabled)

                if viewModel.voiceAssistantEnabled {
                    Text("Voice features are active. Use Cmd+Shift+V in a session to start voice.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("Voice features are turned off. Enable to use voice interactions.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            if viewModel.voiceAssistantEnabled {
                Section("Voice Language") {
                    Picker("Language", selection: $voiceViewModel.voiceLanguage) {
                        ForEach(VoiceViewModel.supportedLanguages, id: \.code) { language in
                            Text(language.name).tag(language.code)
                        }
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()

                    Text("The language used for voice conversations with the assistant.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Keyboard Shortcuts") {
                    LabeledContent("Toggle Voice", value: "Cmd+Shift+V")
                        .foregroundStyle(.secondary)

                    Text("Use this shortcut while viewing a session to start or stop voice.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Text("When disabled, the voice assistant will not start sessions and microphone permissions will not be requested.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    // MARK: - Language Tab (HAP-724)

    @ViewBuilder
    private var languageTab: some View {
        Form {
            Section {
                Text("settings.language.description".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Section("settings.language.current".localized) {
                Picker("settings.language.title".localized, selection: $viewModel.selectedLanguage) {
                    ForEach(viewModel.supportedLanguages, id: \.code) { language in
                        HStack {
                            Text(language.name)
                            if language.code == "auto" {
                                Text("settings.language.automaticDescription".localized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .tag(language.code)
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
            }

            if viewModel.languageChangeRequiresRestart {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("settings.language.restartRequired".localized, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)

                        Text("settings.language.restartMessage".localized)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        HStack {
                            Spacer()

                            Button("settings.language.restartLater".localized) {
                                viewModel.languageChangeRequiresRestart = false
                            }

                            Button("settings.language.restartNow".localized) {
                                viewModel.restartApp()
                            }
                            .buttonStyle(.borderedProminent)
                        }
                        .padding(.top, 4)
                    }
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }

    // MARK: - Privacy Tab (HAP-727, HAP-768)

    @ViewBuilder
    private var privacyTab: some View {
        Form {
            Section("Online Status") {
                Toggle("Show online status to friends", isOn: $viewModel.showOnlineStatus)
                    .disabled(viewModel.isSyncingPrivacy)

                if viewModel.showOnlineStatus {
                    Text("Friends can see when you're online")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("You appear offline to all friends")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Section("Profile Visibility") {
                Picker("Who can view your profile", selection: $viewModel.profileVisibility) {
                    ForEach(ProfileVisibility.allCases) { option in
                        Text(option.displayName).tag(option)
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
                .disabled(viewModel.isSyncingPrivacy)

                Text(viewModel.profileVisibility.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Section("Friend Requests") {
                Picker("Who can send you friend requests", selection: $viewModel.friendRequestPermission) {
                    ForEach(FriendRequestPermission.allCases) { option in
                        Text(option.displayName).tag(option)
                    }
                }
                .pickerStyle(.inline)
                .labelsHidden()
                .disabled(viewModel.isSyncingPrivacy)

                Text(viewModel.friendRequestPermission.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if viewModel.isSyncingPrivacy {
                Section {
                    HStack {
                        ProgressView()
                            .controlSize(.small)
                        Text("Syncing...")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if let error = viewModel.privacySyncError {
                Section {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
        .task {
            await viewModel.loadPrivacySettings()
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

    // MARK: - Subscription Tab

    @ViewBuilder
    private var subscriptionTab: some View {
        Form {
            if purchaseViewModel.isPro {
                proStatusSection
            } else {
                freeStatusSection
            }
        }
        .formStyle(.grouped)
        .padding()
        .task {
            await purchaseViewModel.loadOfferings()
        }
    }

    @ViewBuilder
    private var proStatusSection: some View {
        Section("Subscription Status") {
            HStack {
                Image(systemName: "checkmark.seal.fill")
                    .foregroundStyle(.green)
                    .font(.title2)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Happy Pro")
                        .font(.headline)
                    Text("All premium features unlocked")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
        }

        Section {
            if let subscriptions = purchaseViewModel.customerInfo?.activeSubscriptions,
               !subscriptions.isEmpty {
                ForEach(subscriptions, id: \.self) { subscription in
                    LabeledContent("Product", value: subscription)
                }
            }

            Button("Manage Subscription") {
                // Open App Store subscription management
                if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
                    NSWorkspace.shared.open(url)
                }
            }
        }
    }

    @ViewBuilder
    private var freeStatusSection: some View {
        Section("Subscription Status") {
            HStack {
                Image(systemName: "sparkles")
                    .foregroundStyle(.blue)
                    .font(.title2)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Free Plan")
                        .font(.headline)
                    Text("Upgrade to unlock all features")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
        }

        Section {
            Button {
                purchaseViewModel.showingPaywall = true
            } label: {
                Label("Upgrade to Pro", systemImage: "arrow.up.circle.fill")
            }

            Button {
                Task {
                    await purchaseViewModel.restore()
                }
            } label: {
                if purchaseViewModel.isRestoring {
                    HStack {
                        ProgressView()
                            .controlSize(.small)
                        Text("Restoring...")
                    }
                } else {
                    Text("Restore Purchases")
                }
            }
            .disabled(purchaseViewModel.isRestoring)
        }
        .sheet(isPresented: $purchaseViewModel.showingPaywall) {
            PaywallView()
        }
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
