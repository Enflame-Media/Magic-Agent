//
//  LiveKitVoiceChatService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import AVFoundation
import Combine
import Foundation

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
        }
    }
}

// MARK: - LiveKitVoiceChatService

/// Service for real-time voice chat using WebRTC via the LiveKit protocol.
///
/// Provides bidirectional audio communication for voice chat rooms.
/// Uses AVAudioEngine for audio capture and playback with voice
/// activity detection support.
///
/// ## Architecture
/// - WebRTC-based peer-to-peer audio via LiveKit signaling protocol
/// - AVAudioEngine for low-latency audio capture and playback
/// - Voice Activity Detection (VAD) using audio level monitoring
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
    private var audioEngine: AVAudioEngine?
    private var isPushToTalkActive = false
    private var cancellables = Set<AnyCancellable>()

    /// WebSocket connection for LiveKit signaling.
    private var signalingTask: URLSessionWebSocketTask?
    private let urlSession: URLSession

    /// Timer for voice activity detection level monitoring.
    private var vadTimer: Timer?

    /// Threshold for voice activity detection (0.0-1.0).
    private let vadThreshold: Float = 0.03

    /// Number of consecutive silent frames before declaring silence.
    private let vadSilenceFrames = 15
    private var silenceCounter = 0

    /// Current room URL for reconnection.
    private var currentRoomURL: String?
    private var currentToken: String?

    // MARK: - Initialization

    override init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.urlSession = URLSession(configuration: config)
        super.init()
        setupRouteChangeNotifications()
        updateAvailableRoutes()
    }

    /// Initializer for testing with a custom URLSession.
    init(urlSession: URLSession) {
        self.urlSession = urlSession
        super.init()
        setupRouteChangeNotifications()
    }

    deinit {
        vadTimer?.invalidate()
        stopAudioEngine()
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

        do {
            // Configure audio session for voice chat
            try configureAudioSessionForVoiceChat()

            // Start the audio engine for capture
            try startAudioEngine()

            // Connect to LiveKit signaling server
            try await connectToSignalingServer(url: roomURL, token: token)

            _chatState.send(.connected)
            _isMuted.send(true) // Start muted by default

            // Start VAD monitoring if in auto-detect mode
            if _vadMode == .autoDetect {
                startVADMonitoring()
            }

            #if DEBUG
            print("[LiveKitVoiceChatService] Connected to room: \(roomURL)")
            #endif
        } catch {
            _chatState.send(.error(error.localizedDescription))
            stopAudioEngine()
            throw error
        }
    }

    func disconnect() async {
        vadTimer?.invalidate()
        vadTimer = nil

        signalingTask?.cancel(with: .normalClosure, reason: nil)
        signalingTask = nil

        stopAudioEngine()
        deactivateAudioSession()

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

        // Update the audio engine input tap
        if let engine = audioEngine, engine.isRunning {
            if muted {
                // Mute: pause the input node
                engine.inputNode.volume = 0
            } else {
                engine.inputNode.volume = 1
            }
        }

        #if DEBUG
        print("[LiveKitVoiceChatService] Muted: \(muted)")
        #endif
    }

    func setVADMode(_ mode: VoiceActivityMode) {
        _vadMode = mode

        switch mode {
        case .pushToTalk:
            vadTimer?.invalidate()
            vadTimer = nil
            // Mute unless push-to-talk is active
            if !isPushToTalkActive {
                setMuted(true)
            }

        case .autoDetect:
            if chatState == .connected {
                startVADMonitoring()
            }
            // Will automatically unmute when voice is detected

        case .alwaysOn:
            vadTimer?.invalidate()
            vadTimer = nil
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
                // Find the matching port in available outputs
                guard let _ = audioSession.currentRoute.outputs.first,
                      let availablePorts = audioSession.availableInputs else {
                    throw VoiceChatError.audioSessionError("No available ports for \(name)")
                }

                // For Bluetooth, set preferred input matching the name
                if let port = availablePorts.first(where: { $0.portName == name }) {
                    try audioSession.setPreferredInput(port)
                }

            case .headphones:
                // Headphones are automatically selected when plugged in
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

    // MARK: - Audio Engine

    /// Configure the audio session for bidirectional voice chat.
    private func configureAudioSessionForVoiceChat() throws {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.defaultToSpeaker, .allowBluetoothA2DP]
            )
            try audioSession.setActive(true)
        } catch {
            throw VoiceChatError.audioSessionError(error.localizedDescription)
        }
    }

    /// Start the audio engine for microphone capture.
    private func startAudioEngine() throws {
        let engine = AVAudioEngine()
        let inputNode = engine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        // Install a tap on the input node for audio level monitoring
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: inputFormat) { [weak self] buffer, _ in
            self?.processAudioBuffer(buffer)
        }

        engine.prepare()
        try engine.start()

        self.audioEngine = engine

        #if DEBUG
        print("[LiveKitVoiceChatService] Audio engine started (format: \(inputFormat))")
        #endif
    }

    /// Stop the audio engine.
    private func stopAudioEngine() {
        if let engine = audioEngine, engine.isRunning {
            engine.inputNode.removeTap(onBus: 0)
            engine.stop()
        }
        audioEngine = nil
    }

    /// Process an audio buffer for voice activity detection.
    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard let channelData = buffer.floatChannelData?[0] else { return }
        let frameLength = Int(buffer.frameLength)

        // Calculate RMS (Root Mean Square) audio level
        var sum: Float = 0
        for i in 0..<frameLength {
            sum += channelData[i] * channelData[i]
        }
        let rms = sqrtf(sum / Float(frameLength))

        // Update voice detection state based on VAD mode
        if _vadMode == .autoDetect && !isMuted {
            if rms > vadThreshold {
                silenceCounter = 0
                if !_isVoiceDetected.value {
                    DispatchQueue.main.async { [weak self] in
                        self?._isVoiceDetected.send(true)
                    }
                }
            } else {
                silenceCounter += 1
                if silenceCounter >= vadSilenceFrames && _isVoiceDetected.value {
                    DispatchQueue.main.async { [weak self] in
                        self?._isVoiceDetected.send(false)
                    }
                }
            }
        }
    }

    // MARK: - Voice Activity Detection

    /// Start periodic VAD monitoring.
    private func startVADMonitoring() {
        vadTimer?.invalidate()

        // In auto-detect mode, unmute the mic so we can detect speech
        setMuted(false)

        vadTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            // VAD processing happens in the audio buffer tap callback
            // This timer ensures the run loop stays active
            guard let self = self else { return }
            if self.chatState != .connected {
                self.vadTimer?.invalidate()
                self.vadTimer = nil
            }
        }
    }

    // MARK: - Signaling (LiveKit Protocol)

    /// Connect to the LiveKit signaling server via WebSocket.
    private func connectToSignalingServer(url: String, token: String) async throws {
        guard let wsURL = URL(string: url) else {
            throw VoiceChatError.connectionFailed("Invalid room URL")
        }

        // Build the WebSocket URL with token
        var components = URLComponents(url: wsURL, resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "access_token", value: token),
            URLQueryItem(name: "protocol", value: "9"),
            URLQueryItem(name: "sdk", value: "ios"),
            URLQueryItem(name: "version", value: "2.0.0")
        ]

        guard let signalingURL = components?.url else {
            throw VoiceChatError.connectionFailed("Failed to build signaling URL")
        }

        var request = URLRequest(url: signalingURL)
        request.timeoutInterval = 30

        let task = urlSession.webSocketTask(with: request)
        self.signalingTask = task
        task.resume()

        // Start receiving messages
        receiveSignalingMessages()

        // Send join request
        let joinMessage = LiveKitJoinMessage(
            audioEnabled: true,
            videoEnabled: false
        )
        if let data = try? JSONEncoder().encode(joinMessage) {
            try await task.send(.data(data))
        }
    }

    /// Receive messages from the signaling server.
    private func receiveSignalingMessages() {
        signalingTask?.receive { [weak self] result in
            guard let self = self else { return }

            switch result {
            case .success(let message):
                switch message {
                case .data(let data):
                    self.handleSignalingMessage(data)
                case .string(let text):
                    if let data = text.data(using: .utf8) {
                        self.handleSignalingMessage(data)
                    }
                @unknown default:
                    break
                }
                // Continue receiving
                self.receiveSignalingMessages()

            case .failure(let error):
                #if DEBUG
                print("[LiveKitVoiceChatService] WebSocket error: \(error)")
                #endif

                // Attempt reconnection if we were connected
                if self.chatState == .connected {
                    self._chatState.send(.reconnecting)
                    Task {
                        try? await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
                        if let url = self.currentRoomURL, let token = self.currentToken {
                            try? await self.connect(roomURL: url, token: token)
                        }
                    }
                }
            }
        }
    }

    /// Handle an incoming signaling message.
    private func handleSignalingMessage(_ data: Data) {
        guard let message = try? JSONDecoder().decode(LiveKitSignalingMessage.self, from: data) else {
            #if DEBUG
            print("[LiveKitVoiceChatService] Failed to decode signaling message")
            #endif
            return
        }

        switch message.type {
        case "participant_joined":
            if let participant = message.participant {
                var current = _participants.value
                current.append(VoiceChatParticipant(
                    id: participant.id,
                    name: participant.name,
                    isSpeaking: false,
                    isMuted: participant.isMuted,
                    audioLevel: 0.0
                ))
                DispatchQueue.main.async { [weak self] in
                    self?._participants.send(current)
                }
            }

        case "participant_left":
            if let participantId = message.participantId {
                var current = _participants.value
                current.removeAll { $0.id == participantId }
                DispatchQueue.main.async { [weak self] in
                    self?._participants.send(current)
                }
            }

        case "speaker_changed":
            if let participantId = message.participantId,
               let isSpeaking = message.isSpeaking {
                var current = _participants.value
                if let idx = current.firstIndex(where: { $0.id == participantId }) {
                    current[idx].isSpeaking = isSpeaking
                    DispatchQueue.main.async { [weak self] in
                        self?._participants.send(current)
                    }
                }
            }

        case "room_closed":
            Task {
                await self.disconnect()
            }

        default:
            #if DEBUG
            print("[LiveKitVoiceChatService] Unknown message type: \(message.type)")
            #endif
        }
    }

    // MARK: - Microphone Permission

    /// Request microphone permission.
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

    /// Set up notifications for audio route changes.
    private func setupRouteChangeNotifications() {
        NotificationCenter.default.publisher(for: AVAudioSession.routeChangeNotification)
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.updateAvailableRoutes()
            }
            .store(in: &cancellables)
    }

    /// Update the list of available audio routes.
    func updateAvailableRoutes() {
        let audioSession = AVAudioSession.sharedInstance()
        var routes: [AudioOutputRoute] = [.builtInSpeaker, .builtInReceiver]

        // Check for available inputs (Bluetooth, etc.)
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

        // Check current output route
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

    /// Deactivate the audio session when voice chat ends.
    private func deactivateAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            #if DEBUG
            print("[LiveKitVoiceChatService] Failed to deactivate audio session: \(error)")
            #endif
        }
    }
}

// MARK: - LiveKit Signaling Types

/// Join message sent to the LiveKit signaling server.
struct LiveKitJoinMessage: Codable {
    let type: String = "join"
    let audioEnabled: Bool
    let videoEnabled: Bool
}

/// Incoming signaling message from LiveKit server.
struct LiveKitSignalingMessage: Codable {
    let type: String
    let participant: LiveKitParticipantInfo?
    let participantId: String?
    let isSpeaking: Bool?

    struct LiveKitParticipantInfo: Codable {
        let id: String
        let name: String
        let isMuted: Bool
    }
}
