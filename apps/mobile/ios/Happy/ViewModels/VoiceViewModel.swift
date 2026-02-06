//
//  VoiceViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Combine
import Foundation

/// ViewModel for voice playback controls.
///
/// Manages the voice service state and provides a reactive interface for
/// SwiftUI views to control text-to-speech playback.
/// Uses `ObservableObject` for iOS 16 compatibility.
final class VoiceViewModel: ObservableObject {

    // MARK: - Published Properties

    /// Current playback state.
    @Published private(set) var playbackState: VoicePlaybackState = .idle

    /// Current voice settings.
    @Published private(set) var settings: VoiceSettings

    /// The last error that occurred, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    /// Whether voice features are enabled (provider is available).
    @Published private(set) var isVoiceAvailable: Bool = true

    // MARK: - Computed Properties

    /// Whether speech is currently in progress (speaking or loading).
    var isSpeaking: Bool {
        playbackState == .speaking || playbackState == .loading
    }

    /// Whether speech is paused.
    var isPaused: Bool {
        playbackState == .paused
    }

    /// Whether the play button should be enabled.
    var canPlay: Bool {
        playbackState == .idle || playbackState == .paused
    }

    /// Whether the stop button should be enabled.
    var canStop: Bool {
        playbackState != .idle
    }

    /// Whether auto-play is enabled.
    var isAutoPlayEnabled: Bool {
        settings.autoPlayAssistantMessages
    }

    /// Display name for the current provider.
    var providerDisplayName: String {
        settings.provider.displayName
    }

    // MARK: - Dependencies

    private let voiceService: VoiceServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    /// Set of message IDs that have already been auto-played.
    private var autoPlayedMessageIds = Set<String>()

    // MARK: - Initialization

    /// Creates a new voice view model.
    ///
    /// - Parameters:
    ///   - voiceService: The voice service for TTS. Defaults to the shared instance.
    ///   - settings: Initial voice settings. Defaults to loading from UserDefaults.
    init(
        voiceService: VoiceServiceProtocol = VoiceService.shared,
        settings: VoiceSettings? = nil
    ) {
        self.voiceService = voiceService
        self.settings = settings ?? VoiceSettings.load()

        // Apply loaded settings to the service
        voiceService.updateSettings(self.settings)
        isVoiceAvailable = voiceService.isProviderAvailable()

        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Speak the given text.
    ///
    /// - Parameter text: The text to speak aloud.
    @MainActor
    func speak(_ text: String) async {
        guard !text.isEmpty else { return }
        await voiceService.speak(text)
    }

    /// Speak the content of a message.
    ///
    /// Filters out tool outputs if configured to skip them.
    ///
    /// - Parameter message: The message to speak.
    @MainActor
    func speakMessage(_ message: Message) async {
        // Only speak assistant messages
        guard message.role == .assistant else { return }

        var textToSpeak = message.content

        // Optionally append tool outputs
        if !settings.skipToolOutputs, let toolUses = message.toolUses {
            for tool in toolUses {
                if let output = tool.output {
                    textToSpeak += "\n\(tool.name): \(output)"
                }
            }
        }

        await speak(textToSpeak)
    }

    /// Handle a new message for auto-play.
    ///
    /// If auto-play is enabled and the message is from the assistant,
    /// automatically speaks the message content.
    ///
    /// - Parameter message: The new message received.
    @MainActor
    func handleNewMessage(_ message: Message) async {
        guard settings.autoPlayAssistantMessages,
              message.role == .assistant,
              !message.isStreaming,
              !autoPlayedMessageIds.contains(message.id) else {
            return
        }

        autoPlayedMessageIds.insert(message.id)
        await speakMessage(message)
    }

    /// Stop any current speech.
    @MainActor
    func stop() {
        voiceService.stop()
    }

    /// Pause current speech.
    @MainActor
    func pause() {
        voiceService.pause()
    }

    /// Resume paused speech.
    @MainActor
    func resume() {
        voiceService.resume()
    }

    /// Toggle play/pause state.
    @MainActor
    func togglePlayPause() {
        switch playbackState {
        case .speaking:
            pause()
        case .paused:
            resume()
        default:
            break
        }
    }

    /// Update voice settings and persist them.
    ///
    /// - Parameter newSettings: The updated settings.
    @MainActor
    func updateSettings(_ newSettings: VoiceSettings) {
        settings = newSettings
        settings.save()
        voiceService.updateSettings(newSettings)
        isVoiceAvailable = voiceService.isProviderAvailable()
    }

    /// Toggle auto-play for assistant messages.
    @MainActor
    func toggleAutoPlay() {
        var updated = settings
        updated.autoPlayAssistantMessages.toggle()
        updateSettings(updated)
    }

    /// Dismiss the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    /// Clear the auto-played message history (e.g., when switching sessions).
    func clearAutoPlayHistory() {
        autoPlayedMessageIds.removeAll()
    }

    // MARK: - Private Methods

    /// Set up Combine subscriptions for state observation.
    private func setupSubscriptions() {
        voiceService.playbackStatePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.playbackState = state
            }
            .store(in: &cancellables)

        voiceService.errorPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                self?.errorMessage = error.errorDescription
                self?.showError = true
            }
            .store(in: &cancellables)
    }
}
