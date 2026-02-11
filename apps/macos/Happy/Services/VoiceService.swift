import Foundation
import AVFoundation
import Combine

// MARK: - Voice Configuration

/// Voice configuration for the ElevenLabs integration
enum VoiceConfig {
    /// Development agent ID
    static let agentIdDev = "agent_7801k2c0r5hjfraa1kdbytpvs6yt"

    /// Production agent ID
    static let agentIdProd = "agent_6701k211syvvegba4kt7m68nxjmw"

    /// Get the appropriate agent ID based on build configuration
    static var agentId: String {
        #if DEBUG
        return agentIdDev
        #else
        return agentIdProd
        #endif
    }

    /// ElevenLabs Conversational AI WebSocket URL
    static let conversationalAIURL = "wss://api.elevenlabs.io/v1/convai/conversation"

    /// ElevenLabs API base URL
    static let apiBaseURL = "https://api.elevenlabs.io/v1"

    /// Default TTS model
    static let ttsModel = "eleven_turbo_v2"

    /// Default voice ID (Rachel - conversational)
    static let defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"

    /// Audio sample rate for capture (ElevenLabs expects 16kHz)
    static let captureAudioSampleRate: Double = 16000.0

    /// Audio playback sample rate
    static let playbackAudioSampleRate: Double = 16000.0

    /// Voice Activity Detection polling interval in seconds
    static let vadPollingInterval: TimeInterval = 0.1

    /// Volume threshold for detecting voice activity (0-1)
    static let vadVolumeThreshold: Float = 0.1

    /// Enable debug logging
    static var enableDebugLogging: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
}

// MARK: - Voice Status

/// Voice connection status
enum VoiceStatus: String {
    case disconnected
    case connecting
    case connected
    case error
}

/// Voice conversation mode
enum VoiceMode: String {
    case speaking
    case listening
    case idle
}

// MARK: - Voice State

/// Voice session state
struct VoiceState {
    var status: VoiceStatus = .disconnected
    var mode: VoiceMode = .idle
    var isMuted: Bool = false
    var activeSessionId: String? = nil
    var conversationId: String? = nil
    var error: String? = nil
    var voiceLanguage: String = "en"
    var inputVolume: Float = 0.0
    var outputVolume: Float = 0.0
}

// MARK: - Voice Session Config

/// Configuration for starting a voice session
struct VoiceSessionConfig {
    let sessionId: String
    var initialContext: String?
    var token: String?
    var agentId: String?
}

// MARK: - ElevenLabs WebSocket Message Types

/// Client events sent to ElevenLabs
enum ElevenLabsClientEvent {
    /// Audio chunk from microphone
    case userAudioChunk(audioBase64: String)

    /// Text message from user
    case userMessage(text: String)

    /// Contextual update (non-interrupting)
    case contextualUpdate(text: String)

    /// Ping for keepalive
    case ping

    /// Client configuration on connect
    case clientConfig(sessionId: String, initialContext: String?, language: String)

    var jsonData: Data? {
        var dict: [String: Any] = [:]

        switch self {
        case .userAudioChunk(let audioBase64):
            dict["type"] = "user_audio_chunk"
            dict["user_audio_chunk"] = audioBase64

        case .userMessage(let text):
            dict["type"] = "user_message"
            dict["text"] = text

        case .contextualUpdate(let text):
            dict["type"] = "contextual_update"
            dict["text"] = text

        case .ping:
            dict["type"] = "ping"

        case .clientConfig(let sessionId, let initialContext, let language):
            dict["type"] = "conversation_initiation_client_data"
            var dynamicVariables: [String: Any] = ["sessionId": sessionId]
            if let context = initialContext {
                dynamicVariables["initialConversationContext"] = context
            }
            dict["dynamic_variables"] = dynamicVariables
            dict["conversation_config_override"] = [
                "agent": [
                    "language": language
                ]
            ]
        }

        return try? JSONSerialization.data(withJSONObject: dict)
    }
}

/// Server events received from ElevenLabs
enum ElevenLabsServerEvent {
    case conversationInitiated(conversationId: String)
    case audioChunk(audioBase64: String)
    case userTranscript(text: String, isFinal: Bool)
    case agentResponse(text: String, isFinal: Bool)
    case agentResponseCorrection(text: String)
    case modeChange(mode: String)
    case interrupt
    case pong
    case error(message: String, code: String?)
    case disconnection(reason: String)
    case unknown(type: String, data: [String: Any])

    static func parse(from data: Data) -> ElevenLabsServerEvent? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else {
            return nil
        }

        switch type {
        case "conversation_initiation_metadata":
            if let conversationId = json["conversation_id"] as? String {
                return .conversationInitiated(conversationId: conversationId)
            }

        case "audio":
            if let audio = json["audio"] as? [String: Any],
               let chunk = audio["chunk"] as? String {
                return .audioChunk(audioBase64: chunk)
            }

        case "user_transcript":
            if let transcript = json["user_transcript"] as? [String: Any],
               let text = transcript["text"] as? String {
                let isFinal = transcript["is_final"] as? Bool ?? false
                return .userTranscript(text: text, isFinal: isFinal)
            }

        case "agent_response":
            if let text = json["text"] as? String {
                let isFinal = json["is_final"] as? Bool ?? false
                return .agentResponse(text: text, isFinal: isFinal)
            }

        case "agent_response_correction":
            if let text = json["text"] as? String {
                return .agentResponseCorrection(text: text)
            }

        case "mode_change":
            if let mode = json["mode"] as? String {
                return .modeChange(mode: mode)
            }

        case "interruption":
            return .interrupt

        case "pong":
            return .pong

        case "error":
            let message = json["message"] as? String ?? "Unknown error"
            let code = json["code"] as? String
            return .error(message: message, code: code)

        case "disconnection":
            let reason = json["reason"] as? String ?? "Unknown"
            return .disconnection(reason: reason)

        default:
            return .unknown(type: type, data: json)
        }

        return nil
    }
}

// MARK: - Audio Buffer Manager

/// Manages audio playback buffer for streaming audio
private class AudioBufferManager {
    private var audioQueue: DispatchQueue
    private var audioEngine: AVAudioEngine?
    private var playerNode: AVAudioPlayerNode?
    private var audioFormat: AVAudioFormat?
    private var pendingBuffers: [AVAudioPCMBuffer] = []
    private var isPlaying = false

    init() {
        audioQueue = DispatchQueue(label: "com.happy.voice.audio", qos: .userInteractive)
    }

    func setupPlayback() {
        audioQueue.async { [weak self] in
            self?.audioEngine = AVAudioEngine()
            self?.playerNode = AVAudioPlayerNode()

            guard let engine = self?.audioEngine,
                  let player = self?.playerNode else { return }

            // Create audio format for 16kHz mono 16-bit PCM
            self?.audioFormat = AVAudioFormat(
                commonFormat: .pcmFormatInt16,
                sampleRate: VoiceConfig.playbackAudioSampleRate,
                channels: 1,
                interleaved: true
            )

            engine.attach(player)

            if let format = self?.audioFormat {
                engine.connect(player, to: engine.mainMixerNode, format: format)
            }

            do {
                try engine.start()
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Audio playback engine started")
                }
            } catch {
                print("[Voice] Failed to start audio engine: \(error)")
            }
        }
    }

    func playAudioChunk(_ base64Audio: String) {
        audioQueue.async { [weak self] in
            guard let self = self,
                  let audioData = Data(base64Encoded: base64Audio),
                  let format = self.audioFormat,
                  let player = self.playerNode,
                  let engine = self.audioEngine else {
                return
            }

            // Ensure engine is running
            if !engine.isRunning {
                do {
                    try engine.start()
                } catch {
                    print("[Voice] Failed to restart audio engine: \(error)")
                    return
                }
            }

            // Convert Data to AVAudioPCMBuffer
            let frameCount = AVAudioFrameCount(audioData.count / 2) // 16-bit = 2 bytes per sample
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
                return
            }

            buffer.frameLength = frameCount

            // Copy audio data to buffer
            audioData.withUnsafeBytes { rawBuffer in
                if let baseAddress = rawBuffer.baseAddress {
                    memcpy(buffer.int16ChannelData?[0], baseAddress, audioData.count)
                }
            }

            // Schedule buffer for playback
            player.scheduleBuffer(buffer, completionHandler: nil)

            if !player.isPlaying {
                player.play()
            }
        }
    }

    func stop() {
        audioQueue.async { [weak self] in
            self?.playerNode?.stop()
            self?.audioEngine?.stop()
        }
    }

    func getOutputVolume() -> Float {
        // Return current output volume from player node
        return playerNode?.volume ?? 0.0
    }
}

// MARK: - Audio Capture Manager

/// Manages microphone audio capture
private class AudioCaptureManager {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var captureFormat: AVAudioFormat?
    private var converter: AVAudioConverter?
    private var targetFormat: AVAudioFormat?
    private var onAudioCaptured: ((String) -> Void)?
    private var isMuted = false
    private var currentInputVolume: Float = 0.0

    func setupCapture(onAudioCaptured: @escaping (String) -> Void) {
        self.onAudioCaptured = onAudioCaptured

        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else { return }

        inputNode = engine.inputNode

        // Get native input format
        guard let inputNode = inputNode else { return }
        let nativeFormat = inputNode.inputFormat(forBus: 0)

        // Target format: 16kHz mono 16-bit PCM
        targetFormat = AVAudioFormat(
            commonFormat: .pcmFormatInt16,
            sampleRate: VoiceConfig.captureAudioSampleRate,
            channels: 1,
            interleaved: true
        )

        guard let targetFmt = targetFormat else { return }

        // Create converter from native format to target format
        converter = AVAudioConverter(from: nativeFormat, to: targetFmt)

        // Install tap on input node
        let bufferSize: AVAudioFrameCount = 1024
        inputNode.installTap(onBus: 0, bufferSize: bufferSize, format: nativeFormat) { [weak self] buffer, _ in
            self?.processAudioBuffer(buffer)
        }

        do {
            try engine.start()
            if VoiceConfig.enableDebugLogging {
                print("[Voice] Audio capture engine started")
            }
        } catch {
            print("[Voice] Failed to start capture engine: \(error)")
        }
    }

    private func processAudioBuffer(_ buffer: AVAudioPCMBuffer) {
        guard !isMuted,
              let converter = converter,
              let targetFormat = targetFormat,
              let onAudioCaptured = onAudioCaptured else {
            return
        }

        // Calculate input volume (RMS)
        if let channelData = buffer.floatChannelData {
            var sum: Float = 0.0
            let count = Int(buffer.frameLength)
            for i in 0..<count {
                let sample = channelData[0][i]
                sum += sample * sample
            }
            currentInputVolume = sqrt(sum / Float(count))
        }

        // Convert to target format
        let frameCount = AVAudioFrameCount(
            Double(buffer.frameLength) * VoiceConfig.captureAudioSampleRate / buffer.format.sampleRate
        )
        guard let convertedBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: frameCount) else {
            return
        }

        var error: NSError?
        let status = converter.convert(to: convertedBuffer, error: &error) { _, outStatus in
            outStatus.pointee = .haveData
            return buffer
        }

        guard status != .error, error == nil else {
            if VoiceConfig.enableDebugLogging {
                print("[Voice] Audio conversion error: \(error?.localizedDescription ?? "unknown")")
            }
            return
        }

        // Convert buffer to base64
        let audioData = Data(
            bytes: convertedBuffer.int16ChannelData![0],
            count: Int(convertedBuffer.frameLength) * 2
        )
        let base64Audio = audioData.base64EncodedString()

        // Send to callback
        onAudioCaptured(base64Audio)
    }

    func setMuted(_ muted: Bool) {
        isMuted = muted
    }

    func stop() {
        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()
    }

    func getInputVolume() -> Float {
        return currentInputVolume
    }
}

// MARK: - Voice Service

/// Voice service for macOS using ElevenLabs Conversational AI
///
/// Uses AVFoundation for audio capture/playback and URLSession WebSocket for communication.
/// Provides real-time voice communication with Claude Code sessions.
///
/// Example usage:
/// ```swift
/// let voiceService = VoiceService.shared
///
/// // Start a voice session
/// await voiceService.startSession(config: VoiceSessionConfig(
///     sessionId: "session-123",
///     initialContext: "User is viewing a coding session"
/// ))
///
/// // Send a contextual update
/// voiceService.sendContextualUpdate("User clicked on file.ts")
///
/// // End the session
/// await voiceService.endSession()
/// ```
@MainActor
class VoiceService: NSObject, ObservableObject {

    // MARK: - Singleton

    static let shared = VoiceService()

    // MARK: - Published State

    @Published private(set) var state = VoiceState()

    // MARK: - Private Properties

    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private var audioBufferManager: AudioBufferManager?
    private var audioCaptureManager: AudioCaptureManager?
    private var pingTimer: Timer?
    private var vadTimer: Timer?
    private var cancellables = Set<AnyCancellable>()
    private var sessionConfig: VoiceSessionConfig?

    // MARK: - Computed Properties

    /// Whether a voice session is currently active
    var isActive: Bool {
        state.status == .connected
    }

    /// Whether currently connecting
    var isConnecting: Bool {
        state.status == .connecting
    }

    /// Whether there's an error
    var hasError: Bool {
        state.status == .error && state.error != nil
    }

    /// Human-readable status message
    var statusMessage: String {
        switch state.status {
        case .disconnected:
            return "Voice assistant offline"
        case .connecting:
            return "Connecting..."
        case .connected:
            if state.isMuted {
                return "Muted"
            }
            switch state.mode {
            case .speaking:
                return "Speaking..."
            case .listening:
                return "Listening..."
            case .idle:
                return "Ready"
            }
        case .error:
            return state.error ?? "Connection error"
        }
    }

    // MARK: - Initialization

    private override init() {
        super.init()
        setupURLSession()
    }

    private func setupURLSession() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 300
        urlSession = URLSession(configuration: config, delegate: nil, delegateQueue: nil)
    }

    // MARK: - Session Management

    /// Start a voice session
    /// - Parameter config: Configuration for the voice session
    func startSession(config: VoiceSessionConfig) async {
        // Check if voice assistant is enabled in settings (HAP-903)
        guard isVoiceAssistantEnabled() else {
            if VoiceConfig.enableDebugLogging {
                print("[Voice] Voice assistant is disabled in settings")
            }
            return
        }

        // Request microphone permission
        guard await requestMicrophonePermission() else {
            updateState { $0.status = .error; $0.error = "Microphone permission denied" }
            return
        }

        updateState {
            $0.status = .connecting
            $0.activeSessionId = config.sessionId
            $0.error = nil
        }

        sessionConfig = config
        let agentId = config.agentId ?? VoiceConfig.agentId

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Starting session with agent: \(agentId)")
            print("[Voice] Language: \(state.voiceLanguage)")
        }

        do {
            try await connectToVoiceService(config: config, agentId: agentId)
        } catch {
            print("[Voice] Failed to start session: \(error)")
            updateState {
                $0.status = .error
                $0.error = error.localizedDescription
            }
        }
    }

    /// Connect to the voice service via WebSocket
    private func connectToVoiceService(config: VoiceSessionConfig, agentId: String) async throws {
        // Build WebSocket URL
        var urlComponents = URLComponents(string: VoiceConfig.conversationalAIURL)!
        urlComponents.queryItems = [URLQueryItem(name: "agent_id", value: agentId)]

        guard let url = urlComponents.url else {
            throw VoiceServiceError.invalidURL
        }

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Connecting to: \(url.absoluteString)")
        }

        // Create WebSocket task
        var request = URLRequest(url: url)
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        guard let session = urlSession else {
            throw VoiceServiceError.sessionNotInitialized
        }

        webSocketTask = session.webSocketTask(with: request)
        webSocketTask?.resume()

        // Send initial configuration
        let language = getElevenLabsLanguageCode(state.voiceLanguage)
        let clientConfig = ElevenLabsClientEvent.clientConfig(
            sessionId: config.sessionId,
            initialContext: config.initialContext,
            language: language
        )
        try await sendEvent(clientConfig)

        // Set up audio components
        setupAudioPlayback()
        setupAudioCapture()

        // Start message receive loop
        Task { [weak self] in
            await self?.receiveMessages()
        }

        // Start ping timer for keepalive
        startPingTimer()

        // Start VAD polling
        startVadPolling()

        if VoiceConfig.enableDebugLogging {
            print("[Voice] WebSocket connection established")
        }
    }

    /// Set up audio playback components
    private func setupAudioPlayback() {
        audioBufferManager = AudioBufferManager()
        audioBufferManager?.setupPlayback()
    }

    /// Set up audio capture components
    private func setupAudioCapture() {
        audioCaptureManager = AudioCaptureManager()
        audioCaptureManager?.setupCapture { [weak self] base64Audio in
            guard let self = self else { return }
            Task { @MainActor in
                if self.state.status == .connected && !self.state.isMuted {
                    self.sendAudioChunk(base64Audio)
                }
            }
        }
    }

    /// Receive messages from WebSocket
    private func receiveMessages() async {
        guard let task = webSocketTask else { return }

        do {
            while task.state == .running {
                let message = try await task.receive()

                switch message {
                case .string(let text):
                    if let data = text.data(using: .utf8) {
                        await handleServerEvent(data)
                    }
                case .data(let data):
                    await handleServerEvent(data)
                @unknown default:
                    break
                }
            }
        } catch {
            if VoiceConfig.enableDebugLogging {
                print("[Voice] WebSocket receive error: \(error)")
            }
            await handleDisconnection(reason: error.localizedDescription)
        }
    }

    /// Handle server events
    private func handleServerEvent(_ data: Data) async {
        guard let event = ElevenLabsServerEvent.parse(from: data) else {
            if VoiceConfig.enableDebugLogging {
                print("[Voice] Failed to parse server event")
            }
            return
        }

        await MainActor.run {
            switch event {
            case .conversationInitiated(let conversationId):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Conversation initiated: \(conversationId)")
                }
                updateState {
                    $0.conversationId = conversationId
                    $0.status = .connected
                    $0.mode = .listening
                }

            case .audioChunk(let audioBase64):
                audioBufferManager?.playAudioChunk(audioBase64)

            case .userTranscript(let text, let isFinal):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] User transcript\(isFinal ? " (final)" : ""): \(text)")
                }

            case .agentResponse(let text, let isFinal):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Agent response\(isFinal ? " (final)" : ""): \(text)")
                }

            case .agentResponseCorrection(let text):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Agent response correction: \(text)")
                }

            case .modeChange(let mode):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Mode changed to: \(mode)")
                }
                updateState {
                    switch mode {
                    case "speaking":
                        $0.mode = .speaking
                    case "listening":
                        $0.mode = .listening
                    default:
                        $0.mode = .idle
                    }
                }

            case .interrupt:
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Interrupt received")
                }
                audioBufferManager?.stop()
                audioBufferManager?.setupPlayback()

            case .pong:
                // Keepalive response received
                break

            case .error(let message, let code):
                print("[Voice] Error from server: \(message) (code: \(code ?? "none"))")
                updateState {
                    $0.status = .error
                    $0.error = message
                }

            case .disconnection(let reason):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Disconnection: \(reason)")
                }
                Task {
                    await self.handleDisconnection(reason: reason)
                }

            case .unknown(let type, _):
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Unknown event type: \(type)")
                }
            }
        }
    }

    /// Handle WebSocket disconnection
    private func handleDisconnection(reason: String) async {
        await MainActor.run {
            stopPingTimer()
            stopVadPolling()
            audioCaptureManager?.stop()
            audioBufferManager?.stop()

            updateState {
                $0.status = .disconnected
                $0.mode = .idle
                $0.conversationId = nil
            }

            if VoiceConfig.enableDebugLogging {
                print("[Voice] Disconnected: \(reason)")
            }
        }
    }

    /// End the current voice session
    func endSession() async {
        stopPingTimer()
        stopVadPolling()

        // Stop audio components
        audioCaptureManager?.stop()
        audioCaptureManager = nil

        audioBufferManager?.stop()
        audioBufferManager = nil

        // Close WebSocket connection
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil

        sessionConfig = nil

        updateState {
            $0.status = .disconnected
            $0.mode = .idle
            $0.activeSessionId = nil
            $0.conversationId = nil
            $0.inputVolume = 0.0
            $0.outputVolume = 0.0
        }

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Session ended")
        }
    }

    // MARK: - Messaging

    /// Send an event to the WebSocket
    private func sendEvent(_ event: ElevenLabsClientEvent) async throws {
        guard let task = webSocketTask,
              let data = event.jsonData else {
            return
        }

        let message = URLSessionWebSocketTask.Message.data(data)
        try await task.send(message)
    }

    /// Send audio chunk to the WebSocket
    private func sendAudioChunk(_ base64Audio: String) {
        Task {
            do {
                try await sendEvent(.userAudioChunk(audioBase64: base64Audio))
            } catch {
                if VoiceConfig.enableDebugLogging {
                    print("[Voice] Failed to send audio chunk: \(error)")
                }
            }
        }
    }

    /// Send a text message to the voice assistant
    /// - Parameter message: The message to send
    func sendTextMessage(_ message: String) {
        guard state.status == .connected else {
            print("[Voice] No active session")
            return
        }

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Sending text message: \(message)")
        }

        Task {
            do {
                try await sendEvent(.userMessage(text: message))
            } catch {
                print("[Voice] Failed to send text message: \(error)")
            }
        }
    }

    /// Send a contextual update to the voice assistant
    /// - Parameter update: The contextual update to send
    func sendContextualUpdate(_ update: String) {
        guard state.status == .connected else {
            if VoiceConfig.enableDebugLogging {
                print("[Voice] No active session, skipping context update")
            }
            return
        }

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Sending contextual update: \(update)")
        }

        Task {
            do {
                try await sendEvent(.contextualUpdate(text: update))
            } catch {
                print("[Voice] Failed to send contextual update: \(error)")
            }
        }
    }

    // MARK: - Controls

    /// Toggle mute state
    func toggleMute() {
        let newMuted = !state.isMuted
        setMuted(newMuted)
    }

    /// Set mute state
    /// - Parameter muted: Whether to mute
    func setMuted(_ muted: Bool) {
        updateState { $0.isMuted = muted }
        audioCaptureManager?.setMuted(muted)

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Microphone \(muted ? "muted" : "unmuted")")
        }
    }

    /// Set voice language preference
    /// - Parameter language: The language code (e.g., "en", "es")
    func setVoiceLanguage(_ language: String) {
        updateState { $0.voiceLanguage = language }
    }

    // MARK: - Volume Levels

    /// Get current input (microphone) volume level
    /// - Returns: Volume level (0-1)
    func getInputVolume() -> Float {
        return audioCaptureManager?.getInputVolume() ?? 0.0
    }

    /// Get current output (speaker) volume level
    /// - Returns: Volume level (0-1)
    func getOutputVolume() -> Float {
        return audioBufferManager?.getOutputVolume() ?? 0.0
    }

    /// Check if voice activity is detected on input (user speaking)
    func isInputVoiceActive() -> Bool {
        return getInputVolume() > VoiceConfig.vadVolumeThreshold
    }

    /// Check if voice activity is detected on output (AI speaking)
    func isOutputVoiceActive() -> Bool {
        return state.mode == .speaking
    }

    // MARK: - Timers

    /// Start ping timer for WebSocket keepalive
    private func startPingTimer() {
        pingTimer = Timer.scheduledTimer(withTimeInterval: 25.0, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self, self.state.status == .connected else { return }
                do {
                    try await self.sendEvent(.ping)
                } catch {
                    if VoiceConfig.enableDebugLogging {
                        print("[Voice] Failed to send ping: \(error)")
                    }
                }
            }
        }
    }

    /// Stop ping timer
    private func stopPingTimer() {
        pingTimer?.invalidate()
        pingTimer = nil
    }

    /// Start Voice Activity Detection polling
    private func startVadPolling() {
        vadTimer = Timer.scheduledTimer(withTimeInterval: VoiceConfig.vadPollingInterval, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self = self else { return }
                self.updateState {
                    $0.inputVolume = self.getInputVolume()
                    $0.outputVolume = self.getOutputVolume()
                }
            }
        }
    }

    /// Stop VAD polling
    private func stopVadPolling() {
        vadTimer?.invalidate()
        vadTimer = nil
    }

    // MARK: - Settings

    /// Check if voice assistant is enabled in user settings (HAP-903)
    /// - Returns: Whether voice assistant is enabled
    private func isVoiceAssistantEnabled() -> Bool {
        // Default to true if not set (matches React Native implementation)
        if UserDefaults.standard.object(forKey: "voiceAssistantEnabled") == nil {
            return true
        }
        return UserDefaults.standard.bool(forKey: "voiceAssistantEnabled")
    }

    // MARK: - Permissions

    /// Request microphone permission
    /// - Returns: Whether permission was granted
    private func requestMicrophonePermission() async -> Bool {
        // On macOS, microphone permission is requested when accessing the input
        // Check current authorization status
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            return true
        case .notDetermined:
            return await withCheckedContinuation { continuation in
                AVCaptureDevice.requestAccess(for: .audio) { granted in
                    continuation.resume(returning: granted)
                }
            }
        case .denied, .restricted:
            return false
        @unknown default:
            return false
        }
    }

    // MARK: - State Updates

    /// Update state with a closure
    private func updateState(_ update: (inout VoiceState) -> Void) {
        var newState = state
        update(&newState)
        state = newState
    }
}

// MARK: - Voice Service Error

/// Errors that can occur in the voice service
enum VoiceServiceError: LocalizedError {
    case invalidURL
    case sessionNotInitialized
    case connectionFailed(String)
    case audioSetupFailed(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid WebSocket URL"
        case .sessionNotInitialized:
            return "URL session not initialized"
        case .connectionFailed(let reason):
            return "Connection failed: \(reason)"
        case .audioSetupFailed(let reason):
            return "Audio setup failed: \(reason)"
        }
    }
}

// MARK: - Voice Language Mapping

/// Map user preference codes to ElevenLabs language codes
func getElevenLabsLanguageCode(_ preference: String) -> String {
    let languageMap: [String: String] = [
        "en": "en",
        "es": "es",
        "ru": "ru",
        "pl": "pl",
        "pt": "pt",
        "ca": "ca",
        "zh-Hans": "zh"
    ]
    return languageMap[preference] ?? "en"
}
