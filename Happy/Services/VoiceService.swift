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

    /// ElevenLabs API base URL
    static let apiBaseURL = "https://api.elevenlabs.io/v1"

    /// Default TTS model
    static let ttsModel = "eleven_turbo_v2"

    /// Default voice ID (Rachel - conversational)
    static let defaultVoiceId = "EXAVITQu4vr4xnSDxMaL"

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
}

// MARK: - Voice Session Config

/// Configuration for starting a voice session
struct VoiceSessionConfig {
    let sessionId: String
    var initialContext: String?
    var token: String?
    var agentId: String?
}

// MARK: - Voice Service

/// Voice service for macOS using ElevenLabs Conversational AI
///
/// Uses AVFoundation for audio playback and URLSession for API communication.
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

    private var audioPlayer: AVAudioPlayer?
    private var audioEngine: AVAudioEngine?
    private var webSocketTask: URLSessionWebSocketTask?
    private var cancellables = Set<AnyCancellable>()

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
        setupAudioEngine()
    }

    // MARK: - Audio Setup

    private func setupAudioEngine() {
        audioEngine = AVAudioEngine()

        // Configure audio session for voice
        // Note: macOS uses a different API than iOS for audio sessions
    }

    // MARK: - Session Management

    /// Start a voice session
    /// - Parameter config: Configuration for the voice session
    func startSession(config: VoiceSessionConfig) async {
        // Request microphone permission
        guard await requestMicrophonePermission() else {
            updateState { $0.status = .error; $0.error = "Microphone permission denied" }
            return
        }

        updateState {
            $0.status = .connecting
            $0.activeSessionId = config.sessionId
        }

        let agentId = config.agentId ?? VoiceConfig.agentId

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Starting session with agent: \(agentId)")
            print("[Voice] Language: \(state.voiceLanguage)")
        }

        do {
            try await connectToVoiceService(config: config, agentId: agentId)

            updateState {
                $0.status = .connected
                $0.mode = .listening
            }

            if VoiceConfig.enableDebugLogging {
                print("[Voice] Session started successfully")
            }
        } catch {
            print("[Voice] Failed to start session: \(error)")
            updateState {
                $0.status = .error
                $0.error = error.localizedDescription
            }
        }
    }

    /// Connect to the voice service
    private func connectToVoiceService(config: VoiceSessionConfig, agentId: String) async throws {
        // Implementation would:
        // 1. Get signed URL from ElevenLabs
        // 2. Establish WebSocket connection
        // 3. Set up audio capture and playback

        if VoiceConfig.enableDebugLogging {
            print("[Voice] Would connect to voice service with:", [
                "agentId": agentId,
                "sessionId": config.sessionId,
                "language": state.voiceLanguage,
                "hasToken": config.token != nil
            ])
        }

        // For now, simulate successful connection
        // Real implementation would use URLSession WebSocket
    }

    /// End the current voice session
    func endSession() async {
        do {
            // Close WebSocket connection
            webSocketTask?.cancel(with: .normalClosure, reason: nil)
            webSocketTask = nil

            // Stop audio engine
            audioEngine?.stop()
            audioPlayer?.stop()
            audioPlayer = nil

            updateState {
                $0.status = .disconnected
                $0.mode = .idle
                $0.activeSessionId = nil
                $0.conversationId = nil
            }

            if VoiceConfig.enableDebugLogging {
                print("[Voice] Session ended")
            }
        }
    }

    // MARK: - Messaging

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

        // Would send via WebSocket
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

        // Would send via WebSocket
    }

    // MARK: - Controls

    /// Toggle mute state
    func toggleMute() {
        updateState { $0.isMuted.toggle() }

        // Would mute/unmute microphone input
    }

    /// Set mute state
    /// - Parameter muted: Whether to mute
    func setMuted(_ muted: Bool) {
        updateState { $0.isMuted = muted }

        // Would mute/unmute microphone input
    }

    /// Set voice language preference
    /// - Parameter language: The language code (e.g., "en", "es")
    func setVoiceLanguage(_ language: String) {
        updateState { $0.voiceLanguage = language }
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
