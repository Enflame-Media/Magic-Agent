//
//  VoiceChatView.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// View for real-time voice chat within a session.
///
/// Provides controls for connecting/disconnecting from voice chat,
/// push-to-talk, VAD mode selection, audio routing, and displays
/// active participants with speaking indicators.
struct VoiceChatView: View {

    @ObservedObject var viewModel: VoiceChatViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Status header
                statusHeader
                    .padding(.horizontal)
                    .padding(.top, 8)

                // Participants list
                participantsSection

                Spacer()

                // Voice controls
                controlsSection
                    .padding(.horizontal)
                    .padding(.bottom, 16)
            }
            .navigationTitle("voiceChat.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("common.done".localized) {
                        dismiss()
                    }
                }
            }
            .alert("common.error".localized, isPresented: $viewModel.showError) {
                Button("common.ok".localized) {
                    viewModel.dismissError()
                }
            } message: {
                if let errorMessage = viewModel.errorMessage {
                    Text(errorMessage)
                }
            }
        }
    }

    // MARK: - Status Header

    private var statusHeader: some View {
        HStack {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            Text(statusText)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            if viewModel.chatState == .connected {
                audioRouteButton
            }
        }
        .padding(.vertical, 8)
    }

    private var statusColor: Color {
        switch viewModel.chatState {
        case .connected: return .green
        case .connecting, .reconnecting: return .orange
        case .disconnected: return .gray
        case .error: return .red
        }
    }

    private var statusText: String {
        switch viewModel.chatState {
        case .connected: return "voiceChat.status.connected".localized
        case .connecting: return "voiceChat.status.connecting".localized
        case .reconnecting: return "voiceChat.status.reconnecting".localized
        case .disconnected: return "voiceChat.status.disconnected".localized
        case .error(let msg): return msg
        }
    }

    // MARK: - Audio Route Button

    private var audioRouteButton: some View {
        Menu {
            ForEach(viewModel.availableRoutes) { route in
                Button {
                    viewModel.selectRoute(route)
                } label: {
                    HStack {
                        Image(systemName: route.iconName)
                        Text(route.displayName)
                        if viewModel.currentRoute == route {
                            Spacer()
                            Image(systemName: "checkmark")
                        }
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: viewModel.currentRoute.iconName)
                    .font(.caption)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.caption2)
            }
            .foregroundStyle(.blue)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.blue.opacity(0.1))
            .cornerRadius(8)
        }
    }

    // MARK: - Participants Section

    @ViewBuilder
    private var participantsSection: some View {
        if viewModel.chatState == .disconnected {
            disconnectedPlaceholder
        } else if viewModel.participants.isEmpty && viewModel.chatState == .connected {
            emptyParticipantsPlaceholder
        } else {
            participantsList
        }
    }

    private var disconnectedPlaceholder: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "mic.slash")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("voiceChat.notConnected".localized)
                .font(.headline)
                .foregroundStyle(.secondary)
            Text("voiceChat.notConnectedDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding()
    }

    private var emptyParticipantsPlaceholder: some View {
        VStack(spacing: 12) {
            Spacer()
            Image(systemName: "person.wave.2")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)
            Text("voiceChat.noParticipants".localized)
                .font(.headline)
                .foregroundStyle(.secondary)
            Text("voiceChat.noParticipantsDescription".localized)
                .font(.subheadline)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
            Spacer()
        }
        .padding()
    }

    private var participantsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                // Local participant
                localParticipantRow
                    .padding(.horizontal)
                    .padding(.vertical, 8)

                Divider()
                    .padding(.leading, 68)

                // Remote participants
                ForEach(viewModel.participants) { participant in
                    remoteParticipantRow(participant)
                        .padding(.horizontal)
                        .padding(.vertical, 8)

                    if participant.id != viewModel.participants.last?.id {
                        Divider()
                            .padding(.leading, 68)
                    }
                }
            }
        }
    }

    private var localParticipantRow: some View {
        HStack(spacing: 12) {
            participantAvatar(name: "voiceChat.you".localized, isSpeaking: viewModel.isVoiceDetected)

            VStack(alignment: .leading, spacing: 2) {
                Text("voiceChat.you".localized)
                    .font(.body)
                    .fontWeight(.medium)
                Text(viewModel.isMuted ? "voiceChat.muted".localized : "voiceChat.unmuted".localized)
                    .font(.caption)
                    .foregroundStyle(viewModel.isMuted ? .red : .green)
            }

            Spacer()

            if viewModel.isMuted {
                Image(systemName: "mic.slash.fill")
                    .foregroundStyle(.red)
            } else {
                Image(systemName: "mic.fill")
                    .foregroundStyle(.green)
            }
        }
    }

    private func remoteParticipantRow(_ participant: VoiceChatParticipant) -> some View {
        HStack(spacing: 12) {
            participantAvatar(name: participant.name, isSpeaking: participant.isSpeaking)

            VStack(alignment: .leading, spacing: 2) {
                Text(participant.name)
                    .font(.body)
                Text(participant.isMuted ? "voiceChat.muted".localized : "voiceChat.active".localized)
                    .font(.caption)
                    .foregroundColor(participant.isMuted ? .secondary : .green)
            }

            Spacer()

            if participant.isSpeaking {
                voiceIndicator
            } else if participant.isMuted {
                Image(systemName: "mic.slash")
                    .foregroundStyle(.secondary)
                    .font(.caption)
            }
        }
    }

    private func participantAvatar(name: String, isSpeaking: Bool) -> some View {
        ZStack {
            Circle()
                .fill(.blue.opacity(0.2))
                .frame(width: 44, height: 44)

            Text(String(name.prefix(1)).uppercased())
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(.blue)

            if isSpeaking {
                Circle()
                    .stroke(.green, lineWidth: 2)
                    .frame(width: 48, height: 48)
                    .scaleEffect(1.1)
                    .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: isSpeaking)
            }
        }
    }

    private var voiceIndicator: some View {
        HStack(spacing: 2) {
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 1)
                    .fill(.green)
                    .frame(width: 3, height: CGFloat.random(in: 6...16))
            }
        }
    }

    // MARK: - Controls Section

    private var controlsSection: some View {
        VStack(spacing: 16) {
            // VAD mode selector
            if viewModel.chatState == .connected {
                Picker("voiceChat.vadMode".localized, selection: $viewModel.selectedVADMode) {
                    ForEach(VoiceActivityMode.allCases) { mode in
                        Text(mode.displayName).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
            }

            // Main controls row
            HStack(spacing: 24) {
                if viewModel.chatState == .connected {
                    // Mute button
                    Button {
                        viewModel.toggleMute()
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: viewModel.isMuted ? "mic.slash.circle.fill" : "mic.circle.fill")
                                .font(.system(size: 44))
                                .foregroundStyle(viewModel.isMuted ? .red : .green)
                            Text(viewModel.isMuted ? "voiceChat.unmute".localized : "voiceChat.mute".localized)
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .buttonStyle(.plain)
                    .disabled(viewModel.selectedVADMode == .pushToTalk)

                    // Push-to-talk button (only in PTT mode)
                    if viewModel.selectedVADMode == .pushToTalk {
                        Button {} label: {
                            VStack(spacing: 4) {
                                Image(systemName: "hand.tap.fill")
                                    .font(.system(size: 44))
                                    .foregroundStyle(viewModel.isPushToTalkActive ? .green : .blue)
                                Text("voiceChat.pushToTalk".localized)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .buttonStyle(.plain)
                        .simultaneousGesture(
                            DragGesture(minimumDistance: 0)
                                .onChanged { _ in viewModel.startPushToTalk() }
                                .onEnded { _ in viewModel.endPushToTalk() }
                        )
                    }
                }

                // Connect/Disconnect button
                Button {
                    Task {
                        if viewModel.chatState == .connected {
                            await viewModel.disconnect()
                        } else {
                            await viewModel.connect()
                        }
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: connectionButtonIcon)
                            .font(.system(size: 44))
                            .foregroundStyle(connectionButtonColor)
                        Text(connectionButtonLabel)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)
                .disabled(viewModel.chatState == .connecting || viewModel.chatState == .reconnecting)
            }
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 24)
        .background(.ultraThinMaterial)
        .cornerRadius(20)
    }

    private var connectionButtonIcon: String {
        switch viewModel.chatState {
        case .connected:
            return "phone.down.circle.fill"
        case .connecting, .reconnecting:
            return "phone.circle"
        default:
            return "phone.circle.fill"
        }
    }

    private var connectionButtonColor: Color {
        switch viewModel.chatState {
        case .connected:
            return .red
        case .connecting, .reconnecting:
            return .orange
        default:
            return .green
        }
    }

    private var connectionButtonLabel: String {
        switch viewModel.chatState {
        case .connected:
            return "voiceChat.disconnect".localized
        case .connecting:
            return "voiceChat.connecting".localized
        case .reconnecting:
            return "voiceChat.reconnecting".localized
        default:
            return "voiceChat.connect".localized
        }
    }
}

// MARK: - Preview

#Preview {
    VoiceChatView(viewModel: VoiceChatViewModel())
}
