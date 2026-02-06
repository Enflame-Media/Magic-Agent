//
//  VoiceSettingsView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import AVFoundation
import SwiftUI

/// Settings view for configuring voice/text-to-speech preferences.
///
/// Allows the user to select a TTS provider (System or ElevenLabs),
/// configure voice selection, speech rate, volume, and auto-play behavior.
struct VoiceSettingsView: View {

    @ObservedObject var viewModel: VoiceViewModel
    @Environment(\.dismiss) private var dismiss

    /// Local copy of settings for editing before applying.
    @State private var editingSettings: VoiceSettings
    @State private var apiKeyInput: String = ""
    @State private var showApiKeyField: Bool = false
    @State private var showDeleteApiKeyConfirmation: Bool = false

    init(viewModel: VoiceViewModel) {
        self.viewModel = viewModel
        _editingSettings = State(initialValue: viewModel.settings)
    }

    var body: some View {
        NavigationStack {
            Form {
                providerSection
                voiceSection
                playbackSection
                autoPlaySection
                apiKeySection
                testSection
            }
            .navigationTitle("voice.settings.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common.cancel".localized) {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.save".localized) {
                        viewModel.updateSettings(editingSettings)
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .alert("common.error".localized, isPresented: $viewModel.showError) {
                Button("common.ok".localized) {
                    viewModel.dismissError()
                }
            } message: {
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                }
            }
        }
    }

    // MARK: - Provider Section

    private var providerSection: some View {
        Section {
            ForEach(VoiceProvider.allCases) { provider in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(provider.displayName)
                            .font(.body)
                        Text(provider.description)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if editingSettings.provider == provider {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.blue)
                            .fontWeight(.semibold)
                    }
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    editingSettings.provider = provider
                }
            }
        } header: {
            Text("voice.settings.provider".localized)
        } footer: {
            Text("voice.settings.providerFooter".localized)
        }
    }

    // MARK: - Voice Section

    private var voiceSection: some View {
        Section {
            if editingSettings.provider == .elevenLabs {
                elevenLabsVoiceList
            } else {
                systemVoicePicker
            }
        } header: {
            Text("voice.settings.voice".localized)
        }
    }

    private var elevenLabsVoiceList: some View {
        ForEach(ElevenLabsVoice.defaultVoices) { voice in
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(voice.name)
                        .font(.body)
                    Text(voice.description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if editingSettings.elevenLabsVoiceId == voice.id {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.blue)
                        .fontWeight(.semibold)
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                editingSettings.elevenLabsVoiceId = voice.id
                editingSettings.elevenLabsVoiceName = voice.name
            }
        }
    }

    private var systemVoicePicker: some View {
        let voices = AVSpeechSynthesisVoice.speechVoices()
            .filter { $0.language.hasPrefix(Locale.current.language.languageCode?.identifier ?? "en") }
            .sorted { $0.name < $1.name }

        return Group {
            if voices.isEmpty {
                Text("voice.settings.noVoices".localized)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(voices, id: \.identifier) { voice in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(voice.name)
                                .font(.body)
                            Text(qualityLabel(for: voice))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        if editingSettings.systemVoiceIdentifier == voice.identifier {
                            Image(systemName: "checkmark")
                                .foregroundStyle(.blue)
                                .fontWeight(.semibold)
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        editingSettings.systemVoiceIdentifier = voice.identifier
                    }
                }
            }
        }
    }

    private func qualityLabel(for voice: AVSpeechSynthesisVoice) -> String {
        switch voice.quality {
        case .enhanced:
            return "Enhanced quality"
        case .premium:
            return "Premium quality"
        default:
            return "Default quality"
        }
    }

    // MARK: - Playback Section

    private var playbackSection: some View {
        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("voice.settings.speed".localized)
                    Spacer()
                    Text(String(format: "%.1fx", editingSettings.speechRate))
                        .foregroundStyle(.secondary)
                }

                Slider(value: $editingSettings.speechRate, in: 0.5...2.0, step: 0.1)
            }

            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("voice.settings.volume".localized)
                    Spacer()
                    Text(String(format: "%.0f%%", editingSettings.volume * 100))
                        .foregroundStyle(.secondary)
                }

                Slider(value: $editingSettings.volume, in: 0.0...1.0, step: 0.05)
            }
        } header: {
            Text("voice.settings.playback".localized)
        }
    }

    // MARK: - Auto-play Section

    private var autoPlaySection: some View {
        Section {
            Toggle(
                "voice.settings.autoPlay".localized,
                isOn: $editingSettings.autoPlayAssistantMessages
            )

            Toggle(
                "voice.settings.skipToolOutputs".localized,
                isOn: $editingSettings.skipToolOutputs
            )
        } header: {
            Text("voice.settings.behavior".localized)
        } footer: {
            Text("voice.settings.behaviorFooter".localized)
        }
    }

    // MARK: - API Key Section

    private var apiKeySection: some View {
        Section {
            if editingSettings.provider == .elevenLabs {
                if KeychainHelper.exists(.elevenLabsApiKey) {
                    HStack {
                        Label("voice.settings.apiKeyConfigured".localized, systemImage: "checkmark.shield.fill")
                            .foregroundStyle(.green)
                        Spacer()
                        Button("voice.settings.removeApiKey".localized, role: .destructive) {
                            showDeleteApiKeyConfirmation = true
                        }
                        .font(.caption)
                    }
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("voice.settings.apiKeyRequired".localized)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if showApiKeyField {
                            SecureField("voice.settings.apiKeyPlaceholder".localized, text: $apiKeyInput)
                                .textContentType(.password)
                                .autocorrectionDisabled()

                            Button("voice.settings.saveApiKey".localized) {
                                saveApiKey()
                            }
                            .disabled(apiKeyInput.isEmpty)
                        } else {
                            Button("voice.settings.addApiKey".localized) {
                                showApiKeyField = true
                            }
                        }
                    }
                }
            }
        } header: {
            if editingSettings.provider == .elevenLabs {
                Text("voice.settings.apiKey".localized)
            }
        } footer: {
            if editingSettings.provider == .elevenLabs {
                Text("voice.settings.apiKeyFooter".localized)
            }
        }
        .confirmationDialog(
            "voice.settings.removeApiKeyConfirm".localized,
            isPresented: $showDeleteApiKeyConfirmation,
            titleVisibility: .visible
        ) {
            Button("voice.settings.removeApiKey".localized, role: .destructive) {
                deleteApiKey()
            }
            Button("common.cancel".localized, role: .cancel) {}
        }
    }

    // MARK: - Test Section

    private var testSection: some View {
        Section {
            Button {
                Task {
                    // Apply current editing settings temporarily for the test
                    viewModel.updateSettings(editingSettings)
                    await viewModel.speak("voice.settings.testPhrase".localized)
                }
            } label: {
                Label("voice.settings.testVoice".localized, systemImage: "speaker.wave.2")
            }
            .disabled(viewModel.isSpeaking)
        } header: {
            Text("voice.settings.test".localized)
        }
    }

    // MARK: - API Key Management

    private func saveApiKey() {
        guard !apiKeyInput.isEmpty else { return }

        do {
            try KeychainHelper.save(apiKeyInput, for: .elevenLabsApiKey)
            editingSettings.hasElevenLabsApiKey = true
            apiKeyInput = ""
            showApiKeyField = false
        } catch {
            viewModel.errorMessage = "Failed to save API key: \(error.localizedDescription)"
            viewModel.showError = true
        }
    }

    private func deleteApiKey() {
        do {
            try KeychainHelper.delete(.elevenLabsApiKey)
            editingSettings.hasElevenLabsApiKey = false
            editingSettings.provider = .system
        } catch {
            viewModel.errorMessage = "Failed to delete API key: \(error.localizedDescription)"
            viewModel.showError = true
        }
    }
}

// MARK: - Preview

#Preview {
    VoiceSettingsView(viewModel: VoiceViewModel(settings: .default))
}
