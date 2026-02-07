//
//  LiveKitVoiceChatService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import AVFoundation
import Combine
import Foundation
#if canImport(LiveKit)
import LiveKit
#endif

// MARK: - Voice Chat State

/// Represents the current state of a voice chat session.
enum VoiceChatState: Equatable {
    /// Not connected to any voice chat room.
    case disconnected

    /// Attempting to connect to a voice chat room.
    case connecting

    /// Connected and active in a voice chat room.
    case connected

    /// Reconnecting after a transient failure.
    case reconnecting

    /// An error occurred during the voice chat session.
    case error(String)

    static func == (lhs: VoiceChatState, rhs: VoiceChatState) -> Bool {
        switch (lhs, rhs) {
        case (.disconnected, .disconnected),
             (.connecting, .connecting),
             (.connected, .connected),
             (.reconnecting, .reconnecting):
            return true
        case (.error(let l), .error(let r)):
            return l == r
        default:
            return false
        }
    }
}

// MARK: - Voice Activity Detection Mode

/// Mode for voice activity detection.
enum VoiceActivityMode: String, Codable, CaseIterable, Identifiable {
    /// Push-to-talk: microphone only active while holding the button.
    case pushToTalk

    /// Auto-detect: microphone activates when speech is detected.
    case autoDetect

    /// Always on: microphone is continuously active.
    case alwaysOn

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .pushToTalk:
            return "voiceChat.vadMode.pushToTalk".localized
        case .autoDetect:
            return "voiceChat.vadMode.autoDetect".localized
        case .alwaysOn:
            return "voiceChat.vadMode.alwaysOn".localized
        }
    }

    var description: String {
        switch self {
        case .pushToTalk:
            return "voiceChat.vadMode.pushToTalkDescription".localized
        case .autoDetect:
            return "voiceChat.vadMode.autoDetectDescription".localized
        case .alwaysOn:
            return "voiceChat.vadMode.alwaysOnDescription".localized
        }
    }
}

// MARK: - Audio Route

/// Represents an available audio output route.
enum AudioOutputRoute: Equatable, Identifiable {
    case builtInSpeaker
    case builtInReceiver
    case bluetooth(name: String)
    case headphones
    case airPlay(name: String)
    case carPlay(name: String)

    var id: String {
        switch self {
        case .builtInSpeaker: return "speaker"
        case .builtInReceiver: return "receiver"
        case .bluetooth(let name): return "bluetooth-\(name)"
        case .headphones: return "headphones"
        case .airPlay(let name): return "airplay-\(name)"
        case .carPlay(let name): return "carplay-\(name)"
        }
    }

    var displayName: String {
        switch self {
        case .builtInSpeaker:
            return "audioRoute.speaker".localized
        case .builtInReceiver:
            return "audioRoute.receiver".localized
        case .bluetooth(let name):
            return name
        case .headphones:
            return "audioRoute.headphones".localized
        case .airPlay(let name):
            return name
        case .carPlay(let name):
            return name
        }
    }

    var iconName: String {
        switch self {
        case .builtInSpeaker: return "speaker.wave.3.fill"
        case .builtInReceiver: return "phone.fill"
        case .bluetooth: return "wave.3.right"
        case .headphones: return "headphones"
        case .airPlay: return "airplayaudio"
        case .carPlay: return "car.fill"
        }
    }
}

// MARK: - Voice Chat Participant

/// Represents a participant in a voice chat room.
struct VoiceChatParticipant: Identifiable, Equatable {
    let id: String
    let name: String
    var isSpeaking: Bool
    var isMuted: Bool
    var audioLevel: Float
}

// MARK: - LiveKitVoiceChatServiceProtocol

/// Protocol for voice chat services, enabling dependency injection and testing.
protocol LiveKitVoiceChatServiceProtocol: AnyObject {
    /// Current voice chat state.
    var chatState: VoiceChatState { get }

    /// Publisher for voice chat state changes.
    var chatStatePublisher: AnyPublisher<VoiceChatState, Never> { get }

    /// Whether the local microphone is muted.
    var isMuted: Bool { get }

    /// Publisher for mute state changes.
    var isMutedPublisher: AnyPublisher<Bool, Never> { get }

    /// Current voice activity detection mode.
    var vadMode: VoiceActivityMode { get }

    /// Whether voice activity is currently detected (for auto-detect mode).
    var isVoiceDetected: Bool { get }

    /// Publisher for voice detection state changes.
    var isVoiceDetectedPublisher: AnyPublisher<Bool, Never> { get }

    /// Currently connected participants.
    var participants: [VoiceChatParticipant] { get }

    /// Publisher for participant list changes.
    var participantsPublisher: AnyPublisher<[VoiceChatParticipant], Never> { get }

    /// Available audio output routes.
    var availableRoutes: [AudioOutputRoute] { get }

    /// Publisher for available route changes.
    var availableRoutesPublisher: AnyPublisher<[AudioOutputRoute], Never> { get }

    /// Currently selected audio output route.
    var currentRoute: AudioOutputRoute { get }

    /// Publisher for current route changes.
    var currentRoutePublisher: AnyPublisher<AudioOutputRoute, Never> { get }

    /// Connect to a voice chat room.
    func connect(roomURL: String, token: String) async throws

    /// Disconnect from the current voice chat room.
    func disconnect() async

    /// Mute or unmute the local microphone.
    func setMuted(_ muted: Bool)

    /// Set the voice activity detection mode.
    func setVADMode(_ mode: VoiceActivityMode)

    /// Start push-to-talk (activate microphone while holding).
    func startPushToTalk()

    /// End push-to-talk (deactivate microphone on release).
    func endPushToTalk()

    /// Select an audio output route.
    func selectAudioRoute(_ route: AudioOutputRoute) throws
}

// MARK: - LiveKit Voice Chat Errors

/// Errors that can occur during voice chat operations.
enum VoiceChatError: LocalizedError, Equatable {
    case connectionFailed(String)
    case microphonePermissionDenied
    case audioSessionError(String)
    case invalidToken
    case roomNotFound
    case alreadyConnected
    case notConnected
    case tokenFetchFailed(String)

    var errorDescription: String? {
        switch self {
        case .connectionFailed(let message):
            return "voiceChat.error.connectionFailed".localized + ": \(message)"
        case .microphonePermissionDenied:
            return "voiceChat.error.microphonePermission".localized
        case .audioSessionError(let message):
            return "voiceChat.error.audioSession".localized + ": \(message)"
        case .invalidToken:
            return "voiceChat.error.invalidToken".localized
        case .roomNotFound:
            return "voiceChat.error.roomNotFound".localized
        case .alreadyConnected:
            return "voiceChat.error.alreadyConnected".localized
        case .notConnected:
            return "voiceChat.error.notConnected".localized
        case .tokenFetchFailed(let message):
            return "voiceChat.error.tokenFetchFailed".localized + ": \(message)"
        }
    }
}

// MARK: - LiveKitVoiceChatService

/// Service for real-time voice chat using the LiveKit Swift SDK with WebRTC transport.
///
/// Provides bidirectional audio communication for voice chat rooms using
/// LiveKit's Room and Participant APIs for low-latency WebRTC audio with
/// built-in echo cancellation, noise suppression, and adaptive bitrate.
///
/// ## Architecture
/// - LiveKit Room API for WebRTC-based audio transport
/// - RoomDelegate for participant and track event handling
/// - Built-in Voice Activity Detection via LiveKit's isSpeaking events
/// - AVAudioSession for audio routing (speaker/earpiece/Bluetooth)
/// - Combine publishers for reactive state updates
///
/// ## Usage
/// ```swift
/// let service = LiveKitVoiceChatService.shared
/// try await service.connect(roomURL: "wss://...", token: "...")
/// service.setMuted(false)
/// ```
final class LiveKitVoiceChatService: NSObject, LiveKitVoiceChatServiceProtocol {

    // MARK: - Singleton

    static let shared = LiveKitVoiceChatService()

    // MARK: - Published State

    private let _chatState = CurrentValueSubject<VoiceChatState, Never>(.disconnected)
    private let _isMuted = CurrentValueSubject<Bool, Never>(true)
    private let _isVoiceDetected = CurrentValueSubject<Bool, Never>(false)
    private let _participants = CurrentValueSubject<[VoiceChatParticipant], Never>([])
    private let _availableRoutes = CurrentValueSubject<[AudioOutputRoute], Never>([.builtInSpeaker])
    private let _currentRoute = CurrentValueSubject<AudioOutputRoute, Never>(.builtInSpeaker)

    var chatState: VoiceChatState { _chatState.value }
    var chatStatePublisher: AnyPublisher<VoiceChatState, Never> { _chatState.eraseToAnyPublisher() }

    var isMuted: Bool { _isMuted.value }
    var isMutedPublisher: AnyPublisher<Bool, Never> { _isMuted.eraseToAnyPublisher() }

    var vadMode: VoiceActivityMode { _vadMode }

    var isVoiceDetected: Bool { _isVoiceDetected.value }
    var isVoiceDetectedPublisher: AnyPublisher<Bool, Never> { _isVoiceDetected.eraseToAnyPublisher() }

    var participants: [VoiceChatParticipant] { _participants.value }
    var participantsPublisher: AnyPublisher<[VoiceChatParticipant], Never> { _participants.eraseToAnyPublisher() }

    var availableRoutes: [AudioOutputRoute] { _availableRoutes.value }
    var availableRoutesPublisher: AnyPublisher<[AudioOutputRoute], Never> { _availableRoutes.eraseToAnyPublisher() }

    var currentRoute: AudioOutputRoute { _currentRoute.value }
    var currentRoutePublisher: AnyPublisher<AudioOutputRoute, Never> { _currentRoute.eraseToAnyPublisher() }

    // MARK: - Private Properties

    private var _vadMode: VoiceActivityMode = .pushToTalk
    private var isPushToTalkActive = false
    private var cancellables = Set<AnyCancellable>()

    #if canImport(LiveKit)
    /// The LiveKit room instance for WebRTC communication.
    private var room: Room?
    #endif

    /// Current room URL for reconnection.
    private var currentRoomURL: String?
    private var currentToken: String?

    // MARK: - Initialization

    override init() {
        super.init()
        setupRouteChangeNotifications()
        updateAvailableRoutes()
    }

    deinit {
        #if canImport(LiveKit)
        room = nil
        #endif
    }

    // MARK: - Public Methods

    func connect(roomURL: String, token: String) async throws {
        switch chatState {
        case .disconnected, .reconnecting, .error:
            break // Allowed states for connection
        case .connecting, .connected:
            throw VoiceChatError.alreadyConnected
        }

        guard !token.isEmpty else {
            throw VoiceChatError.invalidToken
        }

        // Request microphone permission
        let granted = await requestMicrophonePermission()
        guard granted else {
            throw VoiceChatError.microphonePermissionDenied
        }

        _chatState.send(.connecting)
        currentRoomURL = roomURL
        currentToken = token

        #if canImport(LiveKit)
        do {
            // Create a new Room with this service as delegate
            let newRoom = Room(delegate: self)
            self.room = newRoom

            // Connect to the LiveKit server with WebRTC transport
            try await newRoom.connect(
                url: roomURL,
                token: token,
                connectOptions: ConnectOptions(
                    autoSubscribe: true
                ),
                roomOptions: RoomOptions(
                    defaultAudioCaptureOptions: AudioCaptureOptions(
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    )
                )
            )

            // Enable microphone (starts muted based on VAD mode)
            let shouldEnableMic = _vadMode != .pushToTalk
            try await newRoom.localParticipant.setMicrophone(enabled: shouldEnableMic)

            _chatState.send(.connected)
            _isMuted.send(!shouldEnableMic)

            // Refresh remote participants
            refreshParticipants()

            #if DEBUG
            print("[LiveKitVoiceChatService] Connected to LiveKit room via WebRTC: \(roomURL)")
            #endif
        } catch {
            _chatState.send(.error(error.localizedDescription))
            self.room = nil
            throw VoiceChatError.connectionFailed(error.localizedDescription)
        }
        #else
        // LiveKit SDK not available — report error
        _chatState.send(.error("LiveKit SDK not available"))
        throw VoiceChatError.connectionFailed("LiveKit SDK is not integrated. Add the LiveKit Swift SDK via SPM.")
        #endif
    }

    func disconnect() async {
        #if canImport(LiveKit)
        await room?.disconnect()
        room = nil
        #endif

        _chatState.send(.disconnected)
        _participants.send([])
        _isMuted.send(true)
        _isVoiceDetected.send(false)
        currentRoomURL = nil
        currentToken = nil

        #if DEBUG
        print("[LiveKitVoiceChatService] Disconnected from voice chat")
        #endif
    }

    func setMuted(_ muted: Bool) {
        _isMuted.send(muted)

        if muted {
            _isVoiceDetected.send(false)
        }

        #if canImport(LiveKit)
        Task {
            try? await room?.localParticipant.setMicrophone(enabled: !muted)
        }
        #endif

        #if DEBUG
        print("[LiveKitVoiceChatService] Muted: \(muted)")
        #endif
    }

    func setVADMode(_ mode: VoiceActivityMode) {
        _vadMode = mode

        switch mode {
        case .pushToTalk:
            // Mute unless push-to-talk is active
            if !isPushToTalkActive {
                setMuted(true)
            }

        case .autoDetect:
            // In auto-detect mode, unmute so LiveKit can detect speech
            if chatState == .connected {
                setMuted(false)
            }

        case .alwaysOn:
            setMuted(false)
        }
    }

    func startPushToTalk() {
        guard _vadMode == .pushToTalk else { return }
        isPushToTalkActive = true
        setMuted(false)
    }

    func endPushToTalk() {
        guard _vadMode == .pushToTalk else { return }
        isPushToTalkActive = false
        setMuted(true)
    }

    func selectAudioRoute(_ route: AudioOutputRoute) throws {
        let audioSession = AVAudioSession.sharedInstance()

        do {
            switch route {
            case .builtInSpeaker:
                try audioSession.overrideOutputAudioPort(.speaker)

            case .builtInReceiver:
                try audioSession.overrideOutputAudioPort(.none)

            case .bluetooth(let name), .airPlay(let name), .carPlay(let name):
                guard let availablePorts = audioSession.availableInputs else {
                    throw VoiceChatError.audioSessionError("No available ports for \(name)")
                }

                if let port = availablePorts.first(where: { $0.portName == name }) {
                    try audioSession.setPreferredInput(port)
                }

            case .headphones:
                try audioSession.overrideOutputAudioPort(.none)
            }

            _currentRoute.send(route)

            #if DEBUG
            print("[LiveKitVoiceChatService] Audio route changed to: \(route.displayName)")
            #endif
        } catch let error as VoiceChatError {
            throw error
        } catch {
            throw VoiceChatError.audioSessionError(error.localizedDescription)
        }
    }

    // MARK: - Participant Management

    /// Refresh the participant list from the LiveKit room state.
    private func refreshParticipants() {
        #if canImport(LiveKit)
        guard let room = room else { return }

        let remoteParticipants = room.remoteParticipants.values.map { participant in
            VoiceChatParticipant(
                id: participant.sid?.stringValue ?? participant.identity?.stringValue ?? UUID().uuidString,
                name: participant.name ?? participant.identity?.stringValue ?? "Unknown",
                isSpeaking: participant.isSpeaking,
                isMuted: !participant.isMicrophoneEnabled(),
                audioLevel: participant.audioLevel
            )
        }

        DispatchQueue.main.async { [weak self] in
            self?._participants.send(Array(remoteParticipants))
        }
        #endif
    }

    // MARK: - Microphone Permission

    private func requestMicrophonePermission() async -> Bool {
        let status = AVAudioSession.sharedInstance().recordPermission

        switch status {
        case .granted:
            return true
        case .denied:
            return false
        case .undetermined:
            return await withCheckedContinuation { continuation in
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        @unknown default:
            return false
        }
    }

    // MARK: - Audio Routing

    private func setupRouteChangeNotifications() {
        NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateAvailableRoutes()
            }
            .store(in: &cancellables)
    }

    func updateAvailableRoutes() {
        let audioSession = AVAudioSession.sharedInstance()
        var routes: [AudioOutputRoute] = [.builtInSpeaker, .builtInReceiver]

        if let availableInputs = audioSession.availableInputs {
            for input in availableInputs {
                switch input.portType {
                case .bluetoothHFP, .bluetoothLE, .bluetoothA2DP:
                    routes.append(.bluetooth(name: input.portName))
                case .headphones, .headsetMic:
                    if !routes.contains(.headphones) {
                        routes.append(.headphones)
                    }
                case .carAudio:
                    routes.append(.carPlay(name: input.portName))
                default:
                    break
                }
            }
        }

        let currentOutput = audioSession.currentRoute.outputs.first
        let current: AudioOutputRoute

        switch currentOutput?.portType {
        case .builtInSpeaker:
            current = .builtInSpeaker
        case .builtInReceiver:
            current = .builtInReceiver
        case .bluetoothHFP, .bluetoothLE, .bluetoothA2DP:
            current = .bluetooth(name: currentOutput?.portName ?? "Bluetooth")
        case .headphones, .headsetMic:
            current = .headphones
        case .airPlay:
            current = .airPlay(name: currentOutput?.portName ?? "AirPlay")
        case .carAudio:
            current = .carPlay(name: currentOutput?.portName ?? "CarPlay")
        default:
            current = .builtInSpeaker
        }

        _availableRoutes.send(routes)
        _currentRoute.send(current)
    }
}

// MARK: - LiveKit RoomDelegate

#if canImport(LiveKit)
extension LiveKitVoiceChatService: RoomDelegate {

    func room(_ room: Room, didUpdate connectionState: ConnectionState, from oldValue: ConnectionState) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            switch connectionState {
            case .disconnected:
                // Only update if we didn't intentionally disconnect
                if self.chatState != .disconnected {
                    self._chatState.send(.disconnected)
                    self._participants.send([])
                }
            case .connecting:
                self._chatState.send(.connecting)
            case .reconnecting:
                self._chatState.send(.reconnecting)
            case .connected:
                self._chatState.send(.connected)
                self.refreshParticipants()
            }
        }
    }

    func room(_ room: Room, participantDidJoin participant: RemoteParticipant) {
        #if DEBUG
        print("[LiveKitVoiceChatService] Participant joined: \(participant.name ?? "unknown")")
        #endif
        refreshParticipants()
    }

    func room(_ room: Room, participantDidLeave participant: RemoteParticipant) {
        #if DEBUG
        print("[LiveKitVoiceChatService] Participant left: \(participant.name ?? "unknown")")
        #endif
        refreshParticipants()
    }

    func room(_ room: Room, participant: Participant, didUpdate isSpeaking: Bool) {
        if participant is LocalParticipant {
            DispatchQueue.main.async { [weak self] in
                self?._isVoiceDetected.send(isSpeaking)
            }
        }
        refreshParticipants()
    }

    func room(_ room: Room, participant: RemoteParticipant, didSubscribe publication: RemoteTrackPublication, track: Track) {
        #if DEBUG
        print("[LiveKitVoiceChatService] Subscribed to track: \(track.kind) from \(participant.name ?? "unknown")")
        #endif
        refreshParticipants()
    }

    func room(_ room: Room, participant: RemoteParticipant, didUnsubscribe publication: RemoteTrackPublication, track: Track) {
        #if DEBUG
        print("[LiveKitVoiceChatService] Unsubscribed from track: \(track.kind) from \(participant.name ?? "unknown")")
        #endif
        refreshParticipants()
    }

    func room(_ room: Room, participant: Participant, didUpdate metadata: String?) {
        refreshParticipants()
    }

    func room(_ room: Room, participant: Participant, didUpdate connectionQuality: ConnectionQuality) {
        #if DEBUG
        print("[LiveKitVoiceChatService] Connection quality for \(participant.name ?? "unknown"): \(connectionQuality)")
        #endif
    }
}
#endif
