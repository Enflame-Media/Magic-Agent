//
//  VoiceChatViewModel.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Combine
import Foundation

/// ViewModel for voice chat controls and state management.
///
/// Manages the LiveKit voice chat service state and provides a reactive
/// interface for SwiftUI views to control real-time voice communication.
/// Uses `ObservableObject` for iOS 16 compatibility.
final class VoiceChatViewModel: ObservableObject {

    // MARK: - Published Properties

    /// Current voice chat connection state.
    @Published private(set) var chatState: VoiceChatState = .disconnected

    /// Whether the local microphone is muted.
    @Published private(set) var isMuted: Bool = true

    /// Whether voice activity is currently detected.
    @Published private(set) var isVoiceDetected: Bool = false

    /// List of participants in the voice chat room.
    @Published private(set) var participants: [VoiceChatParticipant] = []

    /// Available audio output routes.
    @Published private(set) var availableRoutes: [AudioOutputRoute] = [.builtInSpeaker]

    /// Currently selected audio output route.
    @Published private(set) var currentRoute: AudioOutputRoute = .builtInSpeaker

    /// Selected VAD mode (two-way binding for picker).
    @Published var selectedVADMode: VoiceActivityMode = .pushToTalk {
        didSet {
            voiceChatService.setVADMode(selectedVADMode)
        }
    }

    /// The last error that occurred, if any.
    @Published var errorMessage: String?

    /// Whether to show the error alert.
    @Published var showError: Bool = false

    // MARK: - Computed Properties

    /// Whether the user is currently in a voice chat.
    var isConnected: Bool {
        chatState == .connected
    }

    /// Whether push-to-talk is currently active.
    var isPushToTalkActive: Bool {
        !isMuted && selectedVADMode == .pushToTalk
    }

    // MARK: - Dependencies

    private let voiceChatService: LiveKitVoiceChatServiceProtocol
    private var cancellables = Set<AnyCancellable>()

    /// Room URL for the current session's voice chat.
    private var roomURL: String?

    /// Authentication token for voice chat.
    private var voiceChatToken: String?

    // MARK: - Initialization

    /// Creates a new voice chat view model.
    ///
    /// - Parameters:
    ///   - voiceChatService: The voice chat service. Defaults to the shared instance.
    ///   - roomURL: The LiveKit room URL for connection.
    ///   - token: The authentication token for the voice chat room.
    init(
        voiceChatService: LiveKitVoiceChatServiceProtocol = LiveKitVoiceChatService.shared,
        roomURL: String? = nil,
        token: String? = nil
    ) {
        self.voiceChatService = voiceChatService
        self.roomURL = roomURL
        self.voiceChatToken = token

        setupSubscriptions()
    }

    // MARK: - Public Methods

    /// Connect to the voice chat room.
    @MainActor
    func connect() async {
        guard let url = roomURL, let token = voiceChatToken else {
            errorMessage = "voiceChat.error.noRoom".localized
            showError = true
            return
        }

        do {
            try await voiceChatService.connect(roomURL: url, token: token)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Disconnect from the voice chat room.
    @MainActor
    func disconnect() async {
        await voiceChatService.disconnect()
    }

    /// Toggle the microphone mute state.
    @MainActor
    func toggleMute() {
        voiceChatService.setMuted(!isMuted)
    }

    /// Start push-to-talk.
    @MainActor
    func startPushToTalk() {
        voiceChatService.startPushToTalk()
    }

    /// End push-to-talk.
    @MainActor
    func endPushToTalk() {
        voiceChatService.endPushToTalk()
    }

    /// Select an audio output route.
    @MainActor
    func selectRoute(_ route: AudioOutputRoute) {
        do {
            try voiceChatService.selectAudioRoute(route)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    /// Configure the room URL and token for connection.
    func configure(roomURL: String, token: String) {
        self.roomURL = roomURL
        self.voiceChatToken = token
    }

    /// Dismiss the current error.
    @MainActor
    func dismissError() {
        errorMessage = nil
        showError = false
    }

    // MARK: - Private Methods

    /// Set up Combine subscriptions for state observation.
    private func setupSubscriptions() {
        voiceChatService.chatStatePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.chatState = state
            }
            .store(in: &cancellables)

        voiceChatService.isMutedPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] muted in
                self?.isMuted = muted
            }
            .store(in: &cancellables)

        voiceChatService.isVoiceDetectedPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] detected in
                self?.isVoiceDetected = detected
            }
            .store(in: &cancellables)

        voiceChatService.participantsPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] participants in
                self?.participants = participants
            }
            .store(in: &cancellables)

        voiceChatService.availableRoutesPublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] routes in
                self?.availableRoutes = routes
            }
            .store(in: &cancellables)

        voiceChatService.currentRoutePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] route in
                self?.currentRoute = route
            }
            .store(in: &cancellables)
    }
}
