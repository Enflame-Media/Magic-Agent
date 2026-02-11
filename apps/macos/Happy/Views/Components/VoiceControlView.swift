//
//  VoiceControlView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// A floating voice control indicator that shows voice session status.
///
/// Displays the current voice mode with visual indicators for speaking/listening states,
/// mute controls, and volume levels.
///
/// Example usage:
/// ```swift
/// VoiceControlView(sessionId: session.id)
///     .padding()
/// ```
struct VoiceControlView: View {
    /// The session ID for the voice session.
    let sessionId: String

    /// Whether to show as a compact button (toolbar) or expanded view.
    var isCompact: Bool = false

    @State private var viewModel = VoiceViewModel()
    @State private var isHovering = false

    var body: some View {
        if isCompact {
            compactView
        } else {
            expandedView
        }
    }

    // MARK: - Compact View (Toolbar Button)

    @ViewBuilder
    private var compactView: some View {
        Button {
            viewModel.toggleSession(sessionId: sessionId)
        } label: {
            HStack(spacing: 4) {
                voiceIcon
                    .font(.body)

                if viewModel.isActive {
                    volumeIndicator
                        .frame(width: 20, height: 12)
                }
            }
        }
        .buttonStyle(.borderless)
        .help(viewModel.statusMessage)
        .disabled(!viewModel.isEnabled)
        .contextMenu {
            contextMenuContent
        }
    }

    // MARK: - Expanded View (Floating Indicator)

    @ViewBuilder
    private var expandedView: some View {
        VStack(spacing: 8) {
            // Main control button
            Button {
                viewModel.toggleSession(sessionId: sessionId)
            } label: {
                HStack(spacing: 8) {
                    voiceIcon
                        .font(.title2)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(viewModel.isActive ? "Voice Active" : "Voice")
                            .font(.headline)

                        Text(viewModel.statusMessage)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if viewModel.isActive {
                        volumeIndicator
                            .frame(width: 30, height: 16)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(viewModel.indicatorColor.opacity(0.15))
                        .overlay {
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(viewModel.indicatorColor.opacity(0.3), lineWidth: 1)
                        }
                }
            }
            .buttonStyle(.plain)
            .disabled(!viewModel.isEnabled)

            // Controls when active
            if viewModel.isActive {
                HStack(spacing: 12) {
                    // Mute button
                    Button {
                        viewModel.toggleMute()
                    } label: {
                        Image(systemName: viewModel.isMuted ? "mic.slash.fill" : "mic.fill")
                            .foregroundStyle(viewModel.isMuted ? .red : .primary)
                    }
                    .buttonStyle(.borderless)
                    .help(viewModel.isMuted ? "Unmute" : "Mute")

                    Divider()
                        .frame(height: 16)

                    // Mode indicator
                    HStack(spacing: 4) {
                        Circle()
                            .fill(modeIndicatorColor)
                            .frame(width: 8, height: 8)

                        Text(modeText)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    // End session button
                    Button {
                        viewModel.endSession()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                    .buttonStyle(.borderless)
                    .help("End voice session")
                }
                .padding(.horizontal, 12)
            }

            // Error display
            if viewModel.hasError, let error = viewModel.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.orange)

                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.horizontal, 12)
            }
        }
        .padding(8)
        .background {
            RoundedRectangle(cornerRadius: 12)
                .fill(.regularMaterial)
                .shadow(radius: 4, y: 2)
        }
        .contextMenu {
            contextMenuContent
        }
    }

    // MARK: - Subviews

    @ViewBuilder
    private var voiceIcon: some View {
        Image(systemName: viewModel.iconName)
            .foregroundStyle(viewModel.indicatorColor)
            .symbolEffect(.pulse, isActive: viewModel.isConnecting)
            .symbolEffect(.variableColor.iterative, isActive: viewModel.isSpeaking)
    }

    @ViewBuilder
    private var volumeIndicator: some View {
        GeometryReader { geometry in
            HStack(spacing: 1) {
                // Input volume bars
                ForEach(0..<3, id: \.self) { index in
                    let threshold = Float(index + 1) / 3.0
                    Rectangle()
                        .fill(viewModel.inputVolume > threshold ? Color.green : Color.gray.opacity(0.3))
                        .frame(width: geometry.size.width / 7)
                }

                Spacer()
                    .frame(width: geometry.size.width / 7)

                // Output volume bars
                ForEach(0..<3, id: \.self) { index in
                    let threshold = Float(index + 1) / 3.0
                    Rectangle()
                        .fill(viewModel.outputVolume > threshold ? Color.blue : Color.gray.opacity(0.3))
                        .frame(width: geometry.size.width / 7)
                }
            }
        }
    }

    @ViewBuilder
    private var contextMenuContent: some View {
        if viewModel.isActive {
            Button {
                viewModel.toggleMute()
            } label: {
                Label(viewModel.isMuted ? "Unmute" : "Mute", systemImage: viewModel.isMuted ? "mic.fill" : "mic.slash.fill")
            }

            Divider()

            Button(role: .destructive) {
                viewModel.endSession()
            } label: {
                Label("End Voice Session", systemImage: "xmark.circle")
            }
        } else {
            Button {
                viewModel.toggleSession(sessionId: sessionId)
            } label: {
                Label("Start Voice Session", systemImage: "mic")
            }
            .disabled(!viewModel.isEnabled)
        }

        Divider()

        // Language submenu
        Menu("Voice Language") {
            ForEach(VoiceViewModel.supportedLanguages, id: \.code) { language in
                Button {
                    viewModel.voiceLanguage = language.code
                } label: {
                    HStack {
                        Text(language.name)
                        if viewModel.voiceLanguage == language.code {
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private var modeIndicatorColor: Color {
        switch viewModel.mode {
        case .speaking:
            return .blue
        case .listening:
            return .green
        case .idle:
            return .gray
        }
    }

    private var modeText: String {
        switch viewModel.mode {
        case .speaking:
            return "Speaking"
        case .listening:
            return "Listening"
        case .idle:
            return "Ready"
        }
    }
}

// MARK: - Voice Button

/// A simple voice toggle button for toolbars.
struct VoiceButton: View {
    /// The session ID for the voice session.
    let sessionId: String

    @State private var viewModel = VoiceViewModel()

    var body: some View {
        Button {
            viewModel.toggleSession(sessionId: sessionId)
        } label: {
            Image(systemName: viewModel.iconName)
                .foregroundStyle(viewModel.indicatorColor)
                .symbolEffect(.pulse, isActive: viewModel.isConnecting)
        }
        .help(viewModel.statusMessage)
        .disabled(!viewModel.isEnabled)
    }
}

// MARK: - Preview

#Preview("Compact") {
    VoiceControlView(sessionId: "preview-session", isCompact: true)
        .padding()
}

#Preview("Expanded - Disconnected") {
    VoiceControlView(sessionId: "preview-session", isCompact: false)
        .frame(width: 280)
        .padding()
}
