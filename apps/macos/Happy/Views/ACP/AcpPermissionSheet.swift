//
//  AcpPermissionSheet.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Sheet/panel displaying an ACP tool permission request.
///
/// Displays the tool details (name, kind, affected files, raw input preview)
/// and four action buttons for the user to approve or deny the tool execution.
/// Includes a timeout countdown and permission history.
///
/// ## Features
/// - Tool name with SF Symbol icon based on kind
/// - File paths / locations affected
/// - Collapsible raw input preview (DisclosureGroup)
/// - Allow Once, Allow Always, Reject Once, Reject Always buttons
/// - Timeout countdown with ProgressView
/// - Queue badge when multiple requests pending
/// - Permission history section
struct AcpPermissionSheet: View {
    @State private var viewModel = AcpSessionViewModel.shared
    @State private var showRawInput = false
    @State private var secondsRemaining: Int?
    @State private var showHistory = false

    /// Timer for updating the countdown.
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        VStack(spacing: 0) {
            if let request = viewModel.currentPermission {
                permissionContent(request)
            } else {
                noPermissionsView
            }

            Divider()

            // History toggle
            historySection
        }
        .frame(width: 480, minHeight: 300)
        .onReceive(timer) { _ in
            updateCountdown()
        }
    }

    // MARK: - Permission Content

    @ViewBuilder
    private func permissionContent(_ request: AcpPermissionRequest) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header
                header(for: request)

                // Expired banner
                if request.isExpired {
                    expiredBanner
                }

                // Tool details
                toolDetails(for: request)

                // Action buttons (only if not expired)
                if !request.isExpired {
                    actionButtons(for: request)
                }
            }
            .padding(20)
        }
    }

    // MARK: - Header

    @ViewBuilder
    private func header(for request: AcpPermissionRequest) -> some View {
        HStack {
            // Shield icon
            Image(systemName: "shield.checkered")
                .font(.title2)
                .foregroundStyle(.blue)
                .frame(width: 36, height: 36)
                .background(.blue.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text("Permission Request")
                    .font(.headline)

                if viewModel.pendingPermissionCount > 1 {
                    Text("\(viewModel.pendingPermissionCount) requests pending")
                        .font(.caption)
                        .foregroundStyle(.blue)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(.blue.opacity(0.1))
                        .clipShape(Capsule())
                }
            }

            Spacer()

            // Timeout countdown
            if let seconds = secondsRemaining, !request.isExpired {
                HStack(spacing: 4) {
                    Image(systemName: "clock")
                        .font(.caption)
                    Text("\(seconds)s")
                        .font(.system(.caption, design: .monospaced))
                        .fontWeight(.semibold)
                }
                .foregroundStyle(seconds <= 10 ? .red : .secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(.quaternary)
                .clipShape(Capsule())
            }
        }
    }

    // MARK: - Expired Banner

    @ViewBuilder
    private var expiredBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "clock.badge.xmark")
                .foregroundStyle(.red)
            Text("This permission request has expired.")
                .font(.subheadline)
                .foregroundStyle(.red)
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.red.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Tool Details

    @ViewBuilder
    private func toolDetails(for request: AcpPermissionRequest) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Tool header with icon and title
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: request.toolCall.kind?.sfSymbolName ?? "wrench")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .frame(width: 32, height: 32)
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                VStack(alignment: .leading, spacing: 2) {
                    Text(request.toolCall.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .lineLimit(3)

                    if let kind = request.toolCall.kind {
                        Text(kind.rawValue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .textCase(.uppercase)
                    }
                }
            }

            // File locations
            if let locations = request.toolCall.locations, !locations.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(locations, id: \.path) { location in
                        HStack(spacing: 4) {
                            Image(systemName: "doc")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                            Text(location.displayString)
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                                .truncationMode(.middle)
                        }
                    }
                }
                .padding(.leading, 42)
            }

            // Raw input preview (collapsible)
            if let rawInput = request.toolCall.rawInput, !rawInput.isEmpty {
                DisclosureGroup("Raw Input", isExpanded: $showRawInput) {
                    ScrollView {
                        Text(rawInput)
                            .font(.system(.caption2, design: .monospaced))
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(maxHeight: 120)
                    .padding(8)
                    .background(.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(.quaternary, lineWidth: 1)
        )
    }

    // MARK: - Action Buttons

    @ViewBuilder
    private func actionButtons(for request: AcpPermissionRequest) -> some View {
        let sortedOptions = request.options.sorted {
            optionSortOrder($0.kind) < optionSortOrder($1.kind)
        }

        VStack(spacing: 8) {
            // Allow buttons (primary actions)
            HStack(spacing: 8) {
                ForEach(sortedOptions.filter { $0.isAllow }) { option in
                    Button {
                        viewModel.selectPermissionOption(
                            requestId: request.requestId,
                            optionId: option.optionId
                        )
                    } label: {
                        Label(option.name, systemImage: option.kind.sfSymbolName)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .tint(option.kind == .allowAlways ? .green : .blue)
                }
            }

            // Reject buttons (secondary actions)
            HStack(spacing: 8) {
                ForEach(sortedOptions.filter { !$0.isAllow }) { option in
                    Button(role: .destructive) {
                        viewModel.selectPermissionOption(
                            requestId: request.requestId,
                            optionId: option.optionId
                        )
                    } label: {
                        Label(option.name, systemImage: option.kind.sfSymbolName)
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }
            }
        }
    }

    // MARK: - No Permissions View

    @ViewBuilder
    private var noPermissionsView: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.shield")
                .font(.system(size: 40))
                .foregroundStyle(.green)

            Text("No Pending Permissions")
                .font(.headline)

            Text("Permission requests from agents will appear here.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - History Section

    @ViewBuilder
    private var historySection: some View {
        DisclosureGroup("Permission History", isExpanded: $showHistory) {
            if viewModel.permissionHistory.isEmpty {
                Text("No permission history yet.")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    .padding(.vertical, 8)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(viewModel.permissionHistory.prefix(20))) { entry in
                        HStack(spacing: 8) {
                            Image(systemName: entry.wasAllowed ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(entry.wasAllowed ? .green : .red)
                                .font(.caption)

                            VStack(alignment: .leading, spacing: 1) {
                                Text(entry.toolTitle)
                                    .font(.caption)
                                    .lineLimit(1)

                                Text("\(entry.selectedOption) - \(entry.timestamp, style: .relative) ago")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if let kind = entry.toolKind {
                                Image(systemName: kind.sfSymbolName)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    // MARK: - Helpers

    private func updateCountdown() {
        secondsRemaining = viewModel.currentPermission?.secondsRemaining
    }

    private func optionSortOrder(_ kind: AcpPermissionOptionKind) -> Int {
        switch kind {
        case .allowOnce: return 0
        case .allowAlways: return 1
        case .rejectOnce: return 2
        case .rejectAlways: return 3
        }
    }
}

// MARK: - Preview

#Preview {
    AcpPermissionSheet()
}
