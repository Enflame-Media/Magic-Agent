//
//  VoiceSettings.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation

/// Configuration model for voice/text-to-speech settings.
///
/// Stores user preferences for voice playback including the TTS provider,
/// voice selection, speed, and auto-play behavior. Persisted to UserDefaults.
struct VoiceSettings: Codable, Equatable {

    /// The TTS provider to use.
    var provider: VoiceProvider

    /// The selected voice identifier for ElevenLabs.
    /// Example: "21m00Tcm4TlvDq8ikWAM" (Rachel)
    var elevenLabsVoiceId: String

    /// Display name of the selected ElevenLabs voice.
    var elevenLabsVoiceName: String

    /// The ElevenLabs API key (stored separately in Keychain for security).
    /// This property is transient and not persisted with the rest of the settings.
    var hasElevenLabsApiKey: Bool

    /// The selected system voice identifier for AVSpeechSynthesizer.
    var systemVoiceIdentifier: String?

    /// Speech rate multiplier (0.5 = half speed, 1.0 = normal, 2.0 = double).
    var speechRate: Float

    /// Volume level (0.0 to 1.0).
    var volume: Float

    /// Whether to automatically read aloud new assistant messages.
    var autoPlayAssistantMessages: Bool

    /// Whether to skip reading tool use outputs.
    var skipToolOutputs: Bool

    /// The ElevenLabs model to use for TTS.
    var elevenLabsModelId: String

    // MARK: - Defaults

    static let `default` = VoiceSettings(
        provider: .system,
        elevenLabsVoiceId: "21m00Tcm4TlvDq8ikWAM",
        elevenLabsVoiceName: "Rachel",
        hasElevenLabsApiKey: false,
        systemVoiceIdentifier: nil,
        speechRate: 1.0,
        volume: 1.0,
        autoPlayAssistantMessages: false,
        skipToolOutputs: true,
        elevenLabsModelId: "eleven_monolingual_v1"
    )

    // MARK: - Persistence

    private static let userDefaultsKey = "voice_settings"

    /// Load settings from UserDefaults, falling back to defaults.
    static func load() -> VoiceSettings {
        guard let data = UserDefaults.standard.data(forKey: userDefaultsKey),
              let settings = try? JSONDecoder().decode(VoiceSettings.self, from: data) else {
            return .default
        }
        // Refresh the API key presence flag from Keychain
        var loaded = settings
        loaded.hasElevenLabsApiKey = KeychainHelper.exists(.elevenLabsApiKey)
        return loaded
    }

    /// Save settings to UserDefaults.
    func save() {
        if let data = try? JSONEncoder().encode(self) {
            UserDefaults.standard.set(data, forKey: VoiceSettings.userDefaultsKey)
        }
    }
}

// MARK: - Voice Provider

/// Available text-to-speech providers.
enum VoiceProvider: String, Codable, CaseIterable, Identifiable {
    /// Apple's built-in AVSpeechSynthesizer (always available, no API key needed).
    case system

    /// ElevenLabs high-quality AI voices (requires API key).
    case elevenLabs

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .system:
            return "System (Apple)"
        case .elevenLabs:
            return "ElevenLabs"
        }
    }

    var description: String {
        switch self {
        case .system:
            return "Built-in iOS text-to-speech. No API key required."
        case .elevenLabs:
            return "High-quality AI voices. Requires an ElevenLabs API key."
        }
    }
}

// MARK: - Available ElevenLabs Voices

/// Pre-defined ElevenLabs voice options.
struct ElevenLabsVoice: Identifiable, Equatable {
    let id: String
    let name: String
    let description: String
    let previewURL: URL?

    /// Default voice options available in ElevenLabs.
    static let defaultVoices: [ElevenLabsVoice] = [
        ElevenLabsVoice(
            id: "21m00Tcm4TlvDq8ikWAM",
            name: "Rachel",
            description: "Calm, clear female voice",
            previewURL: nil
        ),
        ElevenLabsVoice(
            id: "29vD33N1CtxCmqQRPOHJ",
            name: "Drew",
            description: "Warm, confident male voice",
            previewURL: nil
        ),
        ElevenLabsVoice(
            id: "EXAVITQu4vr4xnSDxMaL",
            name: "Bella",
            description: "Soft, friendly female voice",
            previewURL: nil
        ),
        ElevenLabsVoice(
            id: "ErXwobaYiN019PkySvjV",
            name: "Antoni",
            description: "Articulate, expressive male voice",
            previewURL: nil
        ),
        ElevenLabsVoice(
            id: "MF3mGyEYCl7XYWbV9V6O",
            name: "Elli",
            description: "Youthful, energetic female voice",
            previewURL: nil
        ),
        ElevenLabsVoice(
            id: "TxGEqnHWrfWFTfGW9XjX",
            name: "Josh",
            description: "Deep, resonant male voice",
            previewURL: nil
        )
    ]
}
