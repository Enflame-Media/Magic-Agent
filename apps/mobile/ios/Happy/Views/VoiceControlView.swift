//
//  VoiceControlView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Compact voice playback controls for use within the session detail view.
///
/// Provides play/pause/stop controls and displays the current playback state.
/// Can be embedded as a toolbar item or overlay in the session detail view.
struct VoiceControlView: View {

    @ObservedObject var viewModel: VoiceViewModel

    /// Optional text to speak when the play button is tapped (e.g., last message).
    var textToSpeak: String?

    /// Callback invoked when the settings button is tapped.
    var onSettingsTapped: (() -> Void)?

    var body: some View {
        HStack(spacing: 12) {
            // Provider indicator
            providerBadge

            Spacer()

            // Auto-play toggle
            autoPlayButton

            // Playback controls
            if viewModel.canStop {
                stopButton
            }

            playPauseButton

            // Settings button
            settingsButton
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
        .cornerRadius(12)
    }

    // MARK: - Provider Badge

    private var providerBadge: some View {
        HStack(spacing: 4) {
            Image(systemName: providerIcon)
                .font(.caption2)
            Text(viewModel.providerDisplayName)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .foregroundStyle(.secondary)
    }

    private var providerIcon: String {
        switch viewModel.settings.provider {
        case .system:
            return "speaker.wave.2"
        case .elevenLabs:
            return "waveform"
        }
    }

    // MARK: - Auto-play Button

    private var autoPlayButton: some View {
        Button {
            viewModel.toggleAutoPlay()
        } label: {
            Image(systemName: viewModel.isAutoPlayEnabled ? "text.badge.checkmark" : "text.badge.xmark")
                .font(.body)
                .foregroundStyle(viewModel.isAutoPlayEnabled ? .blue : .secondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            viewModel.isAutoPlayEnabled
                ? "voice.autoPlay.disable".localized
                : "voice.autoPlay.enable".localized
        )
    }

    // MARK: - Play/Pause Button

    private var playPauseButton: some View {
        Button {
            if viewModel.playbackState == .idle {
                if let text = textToSpeak {
                    Task {
                        await viewModel.speak(text)
                    }
                }
            } else {
                viewModel.togglePlayPause()
            }
        } label: {
            Group {
                switch viewModel.playbackState {
                case .idle:
                    Image(systemName: "play.circle.fill")
                case .speaking:
                    Image(systemName: "pause.circle.fill")
                case .paused:
                    Image(systemName: "play.circle.fill")
                case .loading:
                    ProgressView()
                        .scaleEffect(0.8)
                }
            }
            .font(.title2)
            .foregroundStyle(.blue)
        }
        .buttonStyle(.plain)
        .disabled(viewModel.playbackState == .loading)
        .accessibilityLabel(playPauseAccessibilityLabel)
    }

    private var playPauseAccessibilityLabel: String {
        switch viewModel.playbackState {
        case .idle:
            return "voice.play".localized
        case .speaking:
            return "voice.pause".localized
        case .paused:
            return "voice.resume".localized
        case .loading:
            return "voice.loading".localized
        }
    }

    // MARK: - Stop Button

    private var stopButton: some View {
        Button {
            viewModel.stop()
        } label: {
            Image(systemName: "stop.circle.fill")
                .font(.title2)
                .foregroundStyle(.red)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("voice.stop".localized)
    }

    // MARK: - Settings Button

    private var settingsButton: some View {
        Button {
            onSettingsTapped?()
        } label: {
            Image(systemName: "gearshape")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("voice.settings".localized)
    }
}

// MARK: - Inline Voice Button

/// A minimal voice button for individual messages.
///
/// Shows a small speaker icon that speaks the message content when tapped.
struct MessageVoiceButton: View {

    @ObservedObject var viewModel: VoiceViewModel
    let message: Message

    var body: some View {
        Button {
            Task {
                if viewModel.isSpeaking {
                    viewModel.stop()
                } else {
                    await viewModel.speakMessage(message)
                }
            }
        } label: {
            Image(systemName: viewModel.isSpeaking ? "speaker.slash.fill" : "speaker.wave.2.fill")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(
            viewModel.isSpeaking
                ? "voice.stopMessage".localized
                : "voice.speakMessage".localized
        )
    }
}

// MARK: - Preview

#Preview("Voice Controls - Idle") {
    VoiceControlView(
        viewModel: VoiceViewModel(settings: .default),
        textToSpeak: "Hello, world!"
    )
    .padding()
}
