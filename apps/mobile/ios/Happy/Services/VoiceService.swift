//
//  VoiceService.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import AVFoundation
import Combine
import Foundation

// MARK: - VoiceServiceProtocol

/// Protocol for text-to-speech services, enabling dependency injection and testing.
protocol VoiceServiceProtocol: AnyObject {
    /// Current playback state.
    var playbackState: VoicePlaybackState { get }

    /// Publisher for playback state changes.
    var playbackStatePublisher: AnyPublisher<VoicePlaybackState, Never> { get }

    /// Publisher for errors.
    var errorPublisher: AnyPublisher<VoiceServiceError, Never> { get }

    /// Speak the given text aloud.
    func speak(_ text: String) async

    /// Stop any current speech.
    func stop()

    /// Pause current speech.
    func pause()

    /// Resume paused speech.
    func resume()

    /// Update the voice settings.
    func updateSettings(_ settings: VoiceSettings)

    /// Check if the current provider is available and configured.
    func isProviderAvailable() -> Bool
}

// MARK: - Playback State

/// Represents the current state of voice playback.
enum VoicePlaybackState: Equatable {
    /// No speech in progress.
    case idle

    /// Speech is in progress.
    case speaking

    /// Speech is paused.
    case paused

    /// Loading audio from ElevenLabs API.
    case loading
}

// MARK: - VoiceServiceError

/// Errors that can occur during voice operations.
enum VoiceServiceError: LocalizedError, Equatable {
    /// ElevenLabs API key is not configured.
    case apiKeyMissing

    /// Network request to ElevenLabs failed.
    case networkError(String)

    /// ElevenLabs API returned an error.
    case apiError(statusCode: Int, message: String)

    /// Failed to decode audio data.
    case audioDecodingFailed

    /// Audio session configuration failed.
    case audioSessionError(String)

    /// The selected voice is not available.
    case voiceNotAvailable(String)

    /// Speech synthesis failed.
    case synthesisFailed(String)

    var errorDescription: String? {
        switch self {
        case .apiKeyMissing:
            return "ElevenLabs API key is not configured. Please add it in Voice Settings."
        case .networkError(let message):
            return "Network error: \(message)"
        case .apiError(let statusCode, let message):
            return "ElevenLabs API error (\(statusCode)): \(message)"
        case .audioDecodingFailed:
            return "Failed to decode audio data from ElevenLabs."
        case .audioSessionError(let message):
            return "Audio session error: \(message)"
        case .voiceNotAvailable(let name):
            return "Voice '\(name)' is not available on this device."
        case .synthesisFailed(let message):
            return "Speech synthesis failed: \(message)"
        }
    }
}

// MARK: - VoiceService

/// Service for text-to-speech using either ElevenLabs or Apple's AVSpeechSynthesizer.
///
/// This service provides a unified interface for TTS that abstracts the underlying
/// provider. It uses AVSpeechSynthesizer as a built-in fallback when ElevenLabs
/// is not configured or unavailable.
///
/// ## Architecture
/// - Uses protocol-based abstraction for testability
/// - AVSpeechSynthesizer for system TTS (always available)
/// - ElevenLabs REST API for high-quality AI voices (requires API key)
/// - Audio playback via AVAudioPlayer for ElevenLabs-generated audio
/// - Combine publishers for reactive state updates
///
/// ## Usage
/// ```swift
/// let service = VoiceService.shared
/// service.updateSettings(VoiceSettings.load())
/// await service.speak("Hello from Claude Code!")
/// ```
final class VoiceService: NSObject, VoiceServiceProtocol {

    // MARK: - Singleton

    static let shared = VoiceService()

    // MARK: - Published State

    private let _playbackState = CurrentValueSubject<VoicePlaybackState, Never>(.idle)
    private let _errors = PassthroughSubject<VoiceServiceError, Never>()

    var playbackState: VoicePlaybackState {
        _playbackState.value
    }

    var playbackStatePublisher: AnyPublisher<VoicePlaybackState, Never> {
        _playbackState.eraseToAnyPublisher()
    }

    var errorPublisher: AnyPublisher<VoiceServiceError, Never> {
        _errors.eraseToAnyPublisher()
    }

    // MARK: - Private Properties

    private var settings: VoiceSettings = .default
    private let synthesizer = AVSpeechSynthesizer()
    private var audioPlayer: AVAudioPlayer?
    private let urlSession: URLSession

    /// Queue of text chunks waiting to be spoken.
    private var speechQueue: [String] = []

    /// Whether we are currently processing the queue.
    private var isProcessingQueue = false

    // MARK: - ElevenLabs Configuration

    private static let elevenLabsBaseURL = "https://api.elevenlabs.io/v1"

    // MARK: - Initialization

    override init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.urlSession = URLSession(configuration: config)

        super.init()
        synthesizer.delegate = self
    }

    /// Initializer for testing with a custom URLSession.
    init(urlSession: URLSession) {
        self.urlSession = urlSession
        super.init()
        synthesizer.delegate = self
    }

    // MARK: - Public Methods

    func speak(_ text: String) async {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return
        }

        // Stop any current speech first
        stop()

        switch settings.provider {
        case .system:
            speakWithSystem(text)
        case .elevenLabs:
            await speakWithElevenLabs(text)
        }
    }

    func stop() {
        speechQueue.removeAll()
        isProcessingQueue = false

        if synthesizer.isSpeaking {
            synthesizer.stopSpeaking(at: .immediate)
        }

        audioPlayer?.stop()
        audioPlayer = nil

        _playbackState.send(.idle)
    }

    func pause() {
        if synthesizer.isSpeaking {
            synthesizer.pauseSpeaking(at: .word)
            _playbackState.send(.paused)
        } else if let player = audioPlayer, player.isPlaying {
            player.pause()
            _playbackState.send(.paused)
        }
    }

    func resume() {
        if synthesizer.isPaused {
            synthesizer.continueSpeaking()
            _playbackState.send(.speaking)
        } else if let player = audioPlayer, !player.isPlaying {
            player.play()
            _playbackState.send(.speaking)
        }
    }

    func updateSettings(_ settings: VoiceSettings) {
        self.settings = settings
    }

    func isProviderAvailable() -> Bool {
        switch settings.provider {
        case .system:
            return true
        case .elevenLabs:
            return KeychainHelper.exists(.elevenLabsApiKey)
        }
    }

    // MARK: - System TTS (AVSpeechSynthesizer)

    /// Speak text using Apple's built-in AVSpeechSynthesizer.
    private func speakWithSystem(_ text: String) {
        configureAudioSession()

        let utterance = AVSpeechUtterance(string: text)

        // Apply settings
        utterance.rate = mapSpeechRate(settings.speechRate)
        utterance.volume = settings.volume

        // Select voice
        if let voiceId = settings.systemVoiceIdentifier,
           let voice = AVSpeechSynthesisVoice(identifier: voiceId) {
            utterance.voice = voice
        } else {
            // Default to the device's preferred language
            utterance.voice = AVSpeechSynthesisVoice(language: Locale.current.language.languageCode?.identifier ?? "en-US")
        }

        _playbackState.send(.speaking)
        synthesizer.speak(utterance)
    }

    /// Map a user-facing speech rate (0.5-2.0) to AVSpeechUtterance rate range.
    ///
    /// AVSpeechUtterance rate ranges from 0.0 to 1.0 where:
    /// - 0.0 = AVSpeechUtteranceMinimumSpeechRate
    /// - 0.5 = AVSpeechUtteranceDefaultSpeechRate
    /// - 1.0 = AVSpeechUtteranceMaximumSpeechRate
    private func mapSpeechRate(_ rate: Float) -> Float {
        // Map 0.5-2.0 user range to 0.3-0.7 AVSpeechUtterance range
        let minRate: Float = AVSpeechUtteranceMinimumSpeechRate
        let maxRate: Float = AVSpeechUtteranceMaximumSpeechRate
        let defaultRate: Float = AVSpeechUtteranceDefaultSpeechRate

        if rate <= 1.0 {
            // Map 0.5-1.0 to minRate-defaultRate
            let normalized = (rate - 0.5) / 0.5
            return minRate + normalized * (defaultRate - minRate)
        } else {
            // Map 1.0-2.0 to defaultRate-maxRate
            let normalized = (rate - 1.0) / 1.0
            return defaultRate + normalized * (maxRate - defaultRate)
        }
    }

    // MARK: - ElevenLabs TTS

    /// Speak text using ElevenLabs API.
    private func speakWithElevenLabs(_ text: String) async {
        guard let apiKey = KeychainHelper.readString(.elevenLabsApiKey) else {
            let error = VoiceServiceError.apiKeyMissing
            _errors.send(error)
            // Fall back to system TTS
            speakWithSystem(text)
            return
        }

        _playbackState.send(.loading)

        do {
            let audioData = try await requestElevenLabsAudio(
                text: text,
                voiceId: settings.elevenLabsVoiceId,
                modelId: settings.elevenLabsModelId,
                apiKey: apiKey
            )

            try await playAudioData(audioData)
        } catch let error as VoiceServiceError {
            _errors.send(error)
            // Fall back to system TTS on ElevenLabs failure
            #if DEBUG
            print("[VoiceService] ElevenLabs failed, falling back to system TTS: \(error)")
            #endif
            speakWithSystem(text)
        } catch {
            let voiceError = VoiceServiceError.synthesisFailed(error.localizedDescription)
            _errors.send(voiceError)
            speakWithSystem(text)
        }
    }

    /// Request audio from ElevenLabs Text-to-Speech API.
    ///
    /// - Parameters:
    ///   - text: The text to convert to speech.
    ///   - voiceId: The ElevenLabs voice identifier.
    ///   - modelId: The ElevenLabs model identifier.
    ///   - apiKey: The ElevenLabs API key.
    /// - Returns: Raw audio data (MP3 format).
    private func requestElevenLabsAudio(
        text: String,
        voiceId: String,
        modelId: String,
        apiKey: String
    ) async throws -> Data {
        let urlString = "\(Self.elevenLabsBaseURL)/text-to-speech/\(voiceId)"
        guard let url = URL(string: urlString) else {
            throw VoiceServiceError.networkError("Invalid URL: \(urlString)")
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")

        let body = ElevenLabsTTSRequest(
            text: text,
            modelId: modelId,
            voiceSettings: ElevenLabsVoiceSettings(
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0.0,
                useSpeakerBoost: true
            )
        )

        request.httpBody = try JSONEncoder().encode(body)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await urlSession.data(for: request)
        } catch {
            throw VoiceServiceError.networkError(error.localizedDescription)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw VoiceServiceError.networkError("Invalid response")
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw VoiceServiceError.apiError(
                statusCode: httpResponse.statusCode,
                message: errorMessage
            )
        }

        guard !data.isEmpty else {
            throw VoiceServiceError.audioDecodingFailed
        }

        return data
    }

    /// Play raw audio data using AVAudioPlayer.
    @MainActor
    private func playAudioData(_ data: Data) throws {
        configureAudioSession()

        do {
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.volume = settings.volume
            audioPlayer?.prepareToPlay()

            guard audioPlayer?.play() == true else {
                throw VoiceServiceError.synthesisFailed("AVAudioPlayer failed to start playback")
            }

            _playbackState.send(.speaking)
        } catch let error as VoiceServiceError {
            throw error
        } catch {
            throw VoiceServiceError.audioDecodingFailed
        }
    }

    // MARK: - Audio Session

    /// Configure the audio session for speech playback.
    private func configureAudioSession() {
        do {
            let audioSession = AVAudioSession.sharedInstance()
            try audioSession.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
            try audioSession.setActive(true)
        } catch {
            #if DEBUG
            print("[VoiceService] Failed to configure audio session: \(error)")
            #endif
            _errors.send(.audioSessionError(error.localizedDescription))
        }
    }

    /// Deactivate the audio session when speech completes.
    private func deactivateAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            #if DEBUG
            print("[VoiceService] Failed to deactivate audio session: \(error)")
            #endif
        }
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension VoiceService: AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance) {
        _playbackState.send(.speaking)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        _playbackState.send(.idle)
        deactivateAudioSession()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        _playbackState.send(.idle)
        deactivateAudioSession()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didPause utterance: AVSpeechUtterance) {
        _playbackState.send(.paused)
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didContinue utterance: AVSpeechUtterance) {
        _playbackState.send(.speaking)
    }
}

// MARK: - AVAudioPlayerDelegate

extension VoiceService: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        audioPlayer = nil
        _playbackState.send(.idle)
        deactivateAudioSession()
    }

    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        audioPlayer = nil
        _playbackState.send(.idle)
        if let error = error {
            _errors.send(.audioDecodingFailed)
            #if DEBUG
            print("[VoiceService] Audio decode error: \(error)")
            #endif
        }
        deactivateAudioSession()
    }
}

// MARK: - ElevenLabs API Types

/// Request body for ElevenLabs Text-to-Speech API.
struct ElevenLabsTTSRequest: Codable {
    let text: String
    let modelId: String
    let voiceSettings: ElevenLabsVoiceSettings

    enum CodingKeys: String, CodingKey {
        case text
        case modelId = "model_id"
        case voiceSettings = "voice_settings"
    }
}

/// Voice settings for ElevenLabs TTS.
struct ElevenLabsVoiceSettings: Codable {
    let stability: Float
    let similarityBoost: Float
    let style: Float
    let useSpeakerBoost: Bool

    enum CodingKeys: String, CodingKey {
        case stability
        case similarityBoost = "similarity_boost"
        case style
        case useSpeakerBoost = "use_speaker_boost"
    }
}
