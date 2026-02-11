//
//  VoiceViewModel.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Combine
import SwiftUI

/// ViewModel for voice control UI.
///
/// Bridges VoiceService to SwiftUI views, providing reactive state and actions.
/// Respects the voice assistant enabled setting from SettingsViewModel.
///
/// Example usage:
/// ```swift
/// struct VoiceControlView: View {
///     @State private var viewModel = VoiceViewModel()
///
///     var body: some View {
///         Button(action: viewModel.toggleSession) {
///             Image(systemName: viewModel.iconName)
///         }
///         .disabled(!viewModel.isEnabled)
///     }
/// }
/// ```
@Observable
final class VoiceViewModel {
    // MARK: - State

    /// Current voice status.
    private(set) var status: VoiceStatus = .disconnected

    /// Current voice mode (speaking/listening/idle).
    private(set) var mode: VoiceMode = .idle

    /// Whether the microphone is muted.
    private(set) var isMuted: Bool = false

    /// Error message if connection failed.
    private(set) var errorMessage: String?

    /// Current input (microphone) volume level (0-1).
    private(set) var inputVolume: Float = 0.0

    /// Current output (speaker) volume level (0-1).
    private(set) var outputVolume: Float = 0.0

    /// The session ID for the current voice session.
    private(set) var activeSessionId: String?

    /// Selected voice language code.
    var voiceLanguage: String {
        get { voiceService.state.voiceLanguage }
        set { voiceService.setVoiceLanguage(newValue) }
    }

    // MARK: - Computed Properties

    /// Whether voice features are enabled in settings.
    var isEnabled: Bool {
        // Check user preference from UserDefaults (HAP-692)
        if UserDefaults.standard.object(forKey: "voiceAssistantEnabled") == nil {
            return true // Default to enabled
        }
        return UserDefaults.standard.bool(forKey: "voiceAssistantEnabled")
    }

    /// Whether a voice session is currently active.
    var isActive: Bool {
        status == .connected
    }

    /// Whether currently connecting.
    var isConnecting: Bool {
        status == .connecting
    }

    /// Whether there's an error.
    var hasError: Bool {
        status == .error && errorMessage != nil
    }

    /// Whether the assistant is currently speaking.
    var isSpeaking: Bool {
        mode == .speaking
    }

    /// Whether the assistant is currently listening.
    var isListening: Bool {
        mode == .listening
    }

    /// SF Symbol icon name based on current state.
    var iconName: String {
        if !isEnabled {
            return "mic.slash"
        }

        switch status {
        case .disconnected:
            return "mic"
        case .connecting:
            return "mic.badge.ellipsis"
        case .connected:
            if isMuted {
                return "mic.slash.fill"
            }
            switch mode {
            case .speaking:
                return "waveform"
            case .listening:
                return "mic.fill"
            case .idle:
                return "mic.fill"
            }
        case .error:
            return "mic.badge.xmark"
        }
    }

    /// Human-readable status message.
    var statusMessage: String {
        if !isEnabled {
            return "Voice assistant disabled"
        }
        return voiceService.statusMessage
    }

    /// Color for the voice indicator based on state.
    var indicatorColor: Color {
        switch status {
        case .disconnected:
            return .secondary
        case .connecting:
            return .orange
        case .connected:
            if isMuted {
                return .gray
            }
            switch mode {
            case .speaking:
                return .blue
            case .listening:
                return .green
            case .idle:
                return .green
            }
        case .error:
            return .red
        }
    }

    /// Supported voice languages for picker.
    static let supportedLanguages: [(code: String, name: String)] = [
        ("en", "English"),
        ("es", "Spanish"),
        ("ru", "Russian"),
        ("pl", "Polish"),
        ("pt", "Portuguese"),
        ("ca", "Catalan"),
        ("zh-Hans", "Chinese (Simplified)")
    ]

    // MARK: - Private Properties

    private let voiceService: VoiceService
    private var cancellables = Set<AnyCancellable>()
    private var currentSessionId: String?

    // MARK: - Initialization

    init(voiceService: VoiceService = .shared) {
        self.voiceService = voiceService
        setupSubscriptions()
        syncState()
    }

    // MARK: - Public Methods

    /// Start a voice session for the given session ID.
    /// - Parameter sessionId: The Claude Code session ID to associate with voice.
    func startSession(sessionId: String) {
        guard isEnabled else {
            errorMessage = "Voice assistant is disabled in settings"
            return
        }

        guard status != .connecting && status != .connected else {
            return
        }

        currentSessionId = sessionId

        Task { @MainActor in
            let config = VoiceSessionConfig(
                sessionId: sessionId,
                initialContext: "User is viewing Claude Code session"
            )
            await voiceService.startSession(config: config)
        }
    }

    /// End the current voice session.
    func endSession() {
        Task { @MainActor in
            await voiceService.endSession()
            currentSessionId = nil
        }
    }

    /// Toggle the voice session (start if disconnected, end if connected).
    /// - Parameter sessionId: The session ID to use when starting.
    func toggleSession(sessionId: String) {
        if isActive || isConnecting {
            endSession()
        } else {
            startSession(sessionId: sessionId)
        }
    }

    /// Toggle mute state.
    func toggleMute() {
        voiceService.toggleMute()
    }

    /// Set mute state.
    /// - Parameter muted: Whether to mute the microphone.
    func setMuted(_ muted: Bool) {
        voiceService.setMuted(muted)
    }

    /// Send a contextual update to the voice assistant.
    /// - Parameter context: The context update to send.
    func sendContextualUpdate(_ context: String) {
        voiceService.sendContextualUpdate(context)
    }

    /// Send a text message to the voice assistant.
    /// - Parameter message: The message to send.
    func sendTextMessage(_ message: String) {
        voiceService.sendTextMessage(message)
    }

    // MARK: - Private Methods

    private func setupSubscriptions() {
        // Subscribe to VoiceService state changes
        voiceService.$state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateFromServiceState(state)
            }
            .store(in: &cancellables)
    }

    private func syncState() {
        updateFromServiceState(voiceService.state)
    }

    private func updateFromServiceState(_ state: VoiceState) {
        status = state.status
        mode = state.mode
        isMuted = state.isMuted
        errorMessage = state.error
        inputVolume = state.inputVolume
        outputVolume = state.outputVolume
        activeSessionId = state.activeSessionId
    }
}
