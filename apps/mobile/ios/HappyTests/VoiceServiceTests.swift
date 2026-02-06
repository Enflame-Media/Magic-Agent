//
//  VoiceServiceTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Combine
import XCTest
@testable import Happy

// MARK: - Mock Voice Service

/// Mock implementation of VoiceServiceProtocol for testing.
final class MockVoiceService: VoiceServiceProtocol {
    private let _playbackState = CurrentValueSubject<VoicePlaybackState, Never>(.idle)
    private let _errors = PassthroughSubject<VoiceServiceError, Never>()

    var playbackState: VoicePlaybackState { _playbackState.value }
    var playbackStatePublisher: AnyPublisher<VoicePlaybackState, Never> {
        _playbackState.eraseToAnyPublisher()
    }
    var errorPublisher: AnyPublisher<VoiceServiceError, Never> {
        _errors.eraseToAnyPublisher()
    }

    var speakCallCount = 0
    var lastSpokenText: String?
    var stopCallCount = 0
    var pauseCallCount = 0
    var resumeCallCount = 0
    var lastUpdatedSettings: VoiceSettings?
    var providerAvailable = true

    func speak(_ text: String) async {
        speakCallCount += 1
        lastSpokenText = text
        _playbackState.send(.speaking)
    }

    func stop() {
        stopCallCount += 1
        _playbackState.send(.idle)
    }

    func pause() {
        pauseCallCount += 1
        _playbackState.send(.paused)
    }

    func resume() {
        resumeCallCount += 1
        _playbackState.send(.speaking)
    }

    func updateSettings(_ settings: VoiceSettings) {
        lastUpdatedSettings = settings
    }

    func isProviderAvailable() -> Bool {
        providerAvailable
    }

    // Test helpers
    func simulateError(_ error: VoiceServiceError) {
        _errors.send(error)
    }

    func simulatePlaybackFinished() {
        _playbackState.send(.idle)
    }
}

// MARK: - VoiceSettings Tests

final class VoiceSettingsTests: XCTestCase {

    func testDefaultSettings() {
        let settings = VoiceSettings.default

        XCTAssertEqual(settings.provider, .system)
        XCTAssertEqual(settings.speechRate, 1.0)
        XCTAssertEqual(settings.volume, 1.0)
        XCTAssertFalse(settings.autoPlayAssistantMessages)
        XCTAssertTrue(settings.skipToolOutputs)
        XCTAssertEqual(settings.elevenLabsVoiceId, "21m00Tcm4TlvDq8ikWAM")
        XCTAssertEqual(settings.elevenLabsVoiceName, "Rachel")
        XCTAssertEqual(settings.elevenLabsModelId, "eleven_monolingual_v1")
    }

    func testVoiceProviderDisplayNames() {
        XCTAssertEqual(VoiceProvider.system.displayName, "System (Apple)")
        XCTAssertEqual(VoiceProvider.elevenLabs.displayName, "ElevenLabs")
    }

    func testVoiceProviderDescriptions() {
        XCTAssertFalse(VoiceProvider.system.description.isEmpty)
        XCTAssertFalse(VoiceProvider.elevenLabs.description.isEmpty)
    }

    func testVoiceProviderCaseIterable() {
        XCTAssertEqual(VoiceProvider.allCases.count, 2)
        XCTAssertTrue(VoiceProvider.allCases.contains(.system))
        XCTAssertTrue(VoiceProvider.allCases.contains(.elevenLabs))
    }

    func testElevenLabsDefaultVoices() {
        let voices = ElevenLabsVoice.defaultVoices
        XCTAssertGreaterThan(voices.count, 0)

        // All voices should have non-empty IDs and names
        for voice in voices {
            XCTAssertFalse(voice.id.isEmpty)
            XCTAssertFalse(voice.name.isEmpty)
            XCTAssertFalse(voice.description.isEmpty)
        }

        // Check for Rachel (default voice)
        XCTAssertTrue(voices.contains(where: { $0.name == "Rachel" }))
    }

    func testSettingsEquatable() {
        let a = VoiceSettings.default
        var b = VoiceSettings.default
        XCTAssertEqual(a, b)

        b.speechRate = 1.5
        XCTAssertNotEqual(a, b)
    }

    func testSettingsCodable() throws {
        let original = VoiceSettings(
            provider: .elevenLabs,
            elevenLabsVoiceId: "test-voice-id",
            elevenLabsVoiceName: "TestVoice",
            hasElevenLabsApiKey: true,
            systemVoiceIdentifier: "com.apple.ttsbundle.siri_Aaron_en-US_compact",
            speechRate: 1.5,
            volume: 0.8,
            autoPlayAssistantMessages: true,
            skipToolOutputs: false,
            elevenLabsModelId: "eleven_multilingual_v2"
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(VoiceSettings.self, from: data)

        XCTAssertEqual(original, decoded)
    }
}

// MARK: - VoiceViewModel Tests

final class VoiceViewModelTests: XCTestCase {

    private var mockService: MockVoiceService!
    private var viewModel: VoiceViewModel!
    private var cancellables: Set<AnyCancellable>!

    @MainActor
    override func setUp() {
        super.setUp()
        mockService = MockVoiceService()
        viewModel = VoiceViewModel(voiceService: mockService, settings: .default)
        cancellables = Set<AnyCancellable>()
    }

    override func tearDown() {
        cancellables = nil
        viewModel = nil
        mockService = nil
        super.tearDown()
    }

    @MainActor
    func testInitialState() {
        XCTAssertEqual(viewModel.playbackState, .idle)
        XCTAssertFalse(viewModel.isSpeaking)
        XCTAssertFalse(viewModel.isPaused)
        XCTAssertTrue(viewModel.canPlay)
        XCTAssertFalse(viewModel.canStop)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    @MainActor
    func testSpeak() async {
        await viewModel.speak("Hello, world!")

        XCTAssertEqual(mockService.speakCallCount, 1)
        XCTAssertEqual(mockService.lastSpokenText, "Hello, world!")
    }

    @MainActor
    func testSpeakEmptyText() async {
        await viewModel.speak("")

        XCTAssertEqual(mockService.speakCallCount, 0)
    }

    @MainActor
    func testStop() {
        viewModel.stop()

        XCTAssertEqual(mockService.stopCallCount, 1)
    }

    @MainActor
    func testPause() {
        viewModel.pause()

        XCTAssertEqual(mockService.pauseCallCount, 1)
    }

    @MainActor
    func testResume() {
        viewModel.resume()

        XCTAssertEqual(mockService.resumeCallCount, 1)
    }

    @MainActor
    func testTogglePlayPause_WhenSpeaking() async {
        // Start speaking
        await viewModel.speak("Test")

        // Wait for state propagation
        let expectation = XCTestExpectation(description: "State becomes speaking")
        viewModel.$playbackState
            .filter { $0 == .speaking }
            .first()
            .sink { _ in expectation.fulfill() }
            .store(in: &cancellables)
        await fulfillment(of: [expectation], timeout: 2.0)

        viewModel.togglePlayPause()

        XCTAssertEqual(mockService.pauseCallCount, 1)
    }

    @MainActor
    func testTogglePlayPause_WhenPaused() async {
        // Start speaking then pause
        await viewModel.speak("Test")
        viewModel.pause()

        // Wait for state propagation
        let expectation = XCTestExpectation(description: "State becomes paused")
        viewModel.$playbackState
            .filter { $0 == .paused }
            .first()
            .sink { _ in expectation.fulfill() }
            .store(in: &cancellables)
        await fulfillment(of: [expectation], timeout: 2.0)

        viewModel.togglePlayPause()

        XCTAssertEqual(mockService.resumeCallCount, 1)
    }

    @MainActor
    func testSpeakMessage_AssistantOnly() async {
        let userMessage = Message(
            id: "msg-1",
            role: .user,
            content: "Hello",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: nil
        )

        await viewModel.speakMessage(userMessage)
        XCTAssertEqual(mockService.speakCallCount, 0, "Should not speak user messages")

        let assistantMessage = Message(
            id: "msg-2",
            role: .assistant,
            content: "Hi there!",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: nil
        )

        await viewModel.speakMessage(assistantMessage)
        XCTAssertEqual(mockService.speakCallCount, 1)
        XCTAssertEqual(mockService.lastSpokenText, "Hi there!")
    }

    @MainActor
    func testSpeakMessage_SkipsToolOutputs() async {
        let message = Message(
            id: "msg-1",
            role: .assistant,
            content: "Let me check that.",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: [
                ToolUse(id: "t1", name: "Read", input: nil, output: "file contents", status: .completed)
            ]
        )

        // Default settings skip tool outputs
        await viewModel.speakMessage(message)
        XCTAssertEqual(mockService.lastSpokenText, "Let me check that.")
    }

    @MainActor
    func testSpeakMessage_IncludesToolOutputs() async {
        var settings = VoiceSettings.default
        settings.skipToolOutputs = false
        viewModel.updateSettings(settings)

        let message = Message(
            id: "msg-1",
            role: .assistant,
            content: "Let me check that.",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: [
                ToolUse(id: "t1", name: "Read", input: nil, output: "file contents", status: .completed)
            ]
        )

        await viewModel.speakMessage(message)
        XCTAssertTrue(mockService.lastSpokenText?.contains("Read: file contents") == true)
    }

    @MainActor
    func testAutoPlay_EnabledForAssistantMessages() async {
        var settings = VoiceSettings.default
        settings.autoPlayAssistantMessages = true
        viewModel.updateSettings(settings)

        let message = Message(
            id: "msg-auto-1",
            role: .assistant,
            content: "Auto-played message",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: nil
        )

        await viewModel.handleNewMessage(message)
        XCTAssertEqual(mockService.speakCallCount, 1)
    }

    @MainActor
    func testAutoPlay_DoesNotRepeat() async {
        var settings = VoiceSettings.default
        settings.autoPlayAssistantMessages = true
        viewModel.updateSettings(settings)

        let message = Message(
            id: "msg-auto-2",
            role: .assistant,
            content: "Only play once",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: nil
        )

        await viewModel.handleNewMessage(message)
        await viewModel.handleNewMessage(message)
        XCTAssertEqual(mockService.speakCallCount, 1, "Should not auto-play the same message twice")
    }

    @MainActor
    func testAutoPlay_SkipsStreamingMessages() async {
        var settings = VoiceSettings.default
        settings.autoPlayAssistantMessages = true
        viewModel.updateSettings(settings)

        let streamingMessage = Message(
            id: "msg-streaming",
            role: .assistant,
            content: "Still typing...",
            createdAt: Date(),
            cost: nil,
            isStreaming: true,
            toolUses: nil
        )

        await viewModel.handleNewMessage(streamingMessage)
        XCTAssertEqual(mockService.speakCallCount, 0, "Should not auto-play streaming messages")
    }

    @MainActor
    func testAutoPlay_Disabled() async {
        // Default settings have autoPlay disabled
        let message = Message(
            id: "msg-no-auto",
            role: .assistant,
            content: "Should not auto-play",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: nil
        )

        await viewModel.handleNewMessage(message)
        XCTAssertEqual(mockService.speakCallCount, 0)
    }

    @MainActor
    func testUpdateSettings() {
        var newSettings = VoiceSettings.default
        newSettings.provider = .elevenLabs
        newSettings.speechRate = 1.5

        viewModel.updateSettings(newSettings)

        XCTAssertEqual(viewModel.settings.provider, .elevenLabs)
        XCTAssertEqual(viewModel.settings.speechRate, 1.5)
        XCTAssertEqual(mockService.lastUpdatedSettings?.provider, .elevenLabs)
    }

    @MainActor
    func testToggleAutoPlay() {
        XCTAssertFalse(viewModel.isAutoPlayEnabled)

        viewModel.toggleAutoPlay()
        XCTAssertTrue(viewModel.isAutoPlayEnabled)

        viewModel.toggleAutoPlay()
        XCTAssertFalse(viewModel.isAutoPlayEnabled)
    }

    @MainActor
    func testErrorHandling() {
        let expectation = XCTestExpectation(description: "Error received")

        viewModel.$showError
            .filter { $0 }
            .first()
            .sink { _ in expectation.fulfill() }
            .store(in: &cancellables)

        mockService.simulateError(.apiKeyMissing)

        wait(for: [expectation], timeout: 2.0)
        XCTAssertTrue(viewModel.showError)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    @MainActor
    func testDismissError() {
        viewModel.errorMessage = "Test error"
        viewModel.showError = true

        viewModel.dismissError()

        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.showError)
    }

    @MainActor
    func testClearAutoPlayHistory() async {
        var settings = VoiceSettings.default
        settings.autoPlayAssistantMessages = true
        viewModel.updateSettings(settings)

        let message = Message(
            id: "msg-clear-test",
            role: .assistant,
            content: "Test",
            createdAt: Date(),
            cost: nil,
            isStreaming: false,
            toolUses: nil
        )

        await viewModel.handleNewMessage(message)
        XCTAssertEqual(mockService.speakCallCount, 1)

        viewModel.clearAutoPlayHistory()

        // Should be able to auto-play the same message again after clearing
        await viewModel.handleNewMessage(message)
        XCTAssertEqual(mockService.speakCallCount, 2)
    }

    @MainActor
    func testProviderDisplayName() {
        XCTAssertEqual(viewModel.providerDisplayName, "System (Apple)")

        var settings = VoiceSettings.default
        settings.provider = .elevenLabs
        viewModel.updateSettings(settings)
        XCTAssertEqual(viewModel.providerDisplayName, "ElevenLabs")
    }

    @MainActor
    func testIsVoiceAvailable_SystemAlwaysAvailable() {
        mockService.providerAvailable = true
        viewModel.updateSettings(.default)
        XCTAssertTrue(viewModel.isVoiceAvailable)
    }

    @MainActor
    func testIsVoiceAvailable_ElevenLabsRequiresApiKey() {
        mockService.providerAvailable = false
        var settings = VoiceSettings.default
        settings.provider = .elevenLabs
        viewModel.updateSettings(settings)
        XCTAssertFalse(viewModel.isVoiceAvailable)
    }

    @MainActor
    func testComputedStates_Speaking() async {
        await viewModel.speak("Test")

        let expectation = XCTestExpectation(description: "State becomes speaking")
        viewModel.$playbackState
            .filter { $0 == .speaking }
            .first()
            .sink { _ in expectation.fulfill() }
            .store(in: &cancellables)
        await fulfillment(of: [expectation], timeout: 2.0)

        XCTAssertTrue(viewModel.isSpeaking)
        XCTAssertFalse(viewModel.isPaused)
        XCTAssertFalse(viewModel.canPlay)
        XCTAssertTrue(viewModel.canStop)
    }
}

// MARK: - VoiceServiceError Tests

final class VoiceServiceErrorTests: XCTestCase {

    func testErrorDescriptions() {
        XCTAssertNotNil(VoiceServiceError.apiKeyMissing.errorDescription)
        XCTAssertNotNil(VoiceServiceError.networkError("timeout").errorDescription)
        XCTAssertNotNil(VoiceServiceError.apiError(statusCode: 401, message: "unauthorized").errorDescription)
        XCTAssertNotNil(VoiceServiceError.audioDecodingFailed.errorDescription)
        XCTAssertNotNil(VoiceServiceError.audioSessionError("error").errorDescription)
        XCTAssertNotNil(VoiceServiceError.voiceNotAvailable("TestVoice").errorDescription)
        XCTAssertNotNil(VoiceServiceError.synthesisFailed("error").errorDescription)
    }

    func testErrorEquality() {
        XCTAssertEqual(VoiceServiceError.apiKeyMissing, VoiceServiceError.apiKeyMissing)
        XCTAssertEqual(VoiceServiceError.audioDecodingFailed, VoiceServiceError.audioDecodingFailed)
        XCTAssertNotEqual(VoiceServiceError.apiKeyMissing, VoiceServiceError.audioDecodingFailed)
    }
}

// MARK: - ElevenLabs API Types Tests

final class ElevenLabsAPITypesTests: XCTestCase {

    func testTTSRequestEncoding() throws {
        let request = ElevenLabsTTSRequest(
            text: "Hello",
            modelId: "eleven_monolingual_v1",
            voiceSettings: ElevenLabsVoiceSettings(
                stability: 0.5,
                similarityBoost: 0.75,
                style: 0.0,
                useSpeakerBoost: true
            )
        )

        let data = try JSONEncoder().encode(request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]

        XCTAssertEqual(json?["text"] as? String, "Hello")
        XCTAssertEqual(json?["model_id"] as? String, "eleven_monolingual_v1")

        let voiceSettings = json?["voice_settings"] as? [String: Any]
        XCTAssertEqual(voiceSettings?["stability"] as? Double, 0.5)
        XCTAssertEqual(voiceSettings?["similarity_boost"] as? Double, 0.75)
        XCTAssertEqual(voiceSettings?["use_speaker_boost"] as? Bool, true)
    }

    func testVoiceSettingsEncoding() throws {
        let settings = ElevenLabsVoiceSettings(
            stability: 0.3,
            similarityBoost: 0.9,
            style: 0.5,
            useSpeakerBoost: false
        )

        let data = try JSONEncoder().encode(settings)
        let decoded = try JSONDecoder().decode(ElevenLabsVoiceSettings.self, from: data)

        XCTAssertEqual(decoded.stability, 0.3)
        XCTAssertEqual(decoded.similarityBoost, 0.9)
        XCTAssertEqual(decoded.style, 0.5)
        XCTAssertEqual(decoded.useSpeakerBoost, false)
    }
}

// MARK: - VoicePlaybackState Tests

final class VoicePlaybackStateTests: XCTestCase {

    func testEquality() {
        XCTAssertEqual(VoicePlaybackState.idle, VoicePlaybackState.idle)
        XCTAssertEqual(VoicePlaybackState.speaking, VoicePlaybackState.speaking)
        XCTAssertEqual(VoicePlaybackState.paused, VoicePlaybackState.paused)
        XCTAssertEqual(VoicePlaybackState.loading, VoicePlaybackState.loading)
        XCTAssertNotEqual(VoicePlaybackState.idle, VoicePlaybackState.speaking)
    }
}
