//
//  AcpPermissionRequestView.swift
//  Happy
//
//  Full permission approval UI for ACP tool permission requests.
//

import SwiftUI
import UIKit

/// Displays an ACP permission request with tool details and 4 action buttons.
struct AcpPermissionRequestView: View {

    let request: AcpPermissionRequestState
    let pendingCount: Int
    let onResolve: (AcpPermissionOutcome, String?) -> Void

    @State private var timeRemaining: TimeInterval = 0
    @State private var isExpired = false

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    // MARK: - Body

    var body: some View {
        VStack(spacing: 16) {
            // Queue indicator
            if pendingCount > 1 {
                Text(String.localized("acp.permission.queue", arguments: 1, pendingCount))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Tool info header
            toolInfoHeader

            // Locations
            if let locations = request.toolCall.locations, !locations.isEmpty {
                locationsSection(locations)
            }

            // Timeout countdown
            if let timeoutAt = request.timeoutAt {
                timeoutIndicator(timeoutAt: timeoutAt)
            }

            // Action buttons (2x2 grid)
            actionButtons

            Spacer()
        }
        .padding()
        .onAppear {
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.warning)
        }
        .onReceive(timer) { _ in
            updateTimeout()
        }
    }

    // MARK: - Tool Info Header

    private var toolInfoHeader: some View {
        VStack(spacing: 8) {
            Image(systemName: toolKindIcon)
                .font(.system(size: 40))
                .foregroundColor(.orange)
                .accessibilityHidden(true)

            Text("acp.permission.title".localized)
                .font(.title2)
                .fontWeight(.bold)

            Text(request.toolCall.title)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)

            if let kind = request.toolCall.kind {
                Text(kind)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color(.systemGray5))
                    .cornerRadius(4)
            }
        }
    }

    // MARK: - Locations

    private func locationsSection(_ locations: [AcpToolCallLocation]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("acp.permission.locations".localized)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.secondary)

            ScrollView {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(locations.enumerated()), id: \.offset) { _, loc in
                        HStack(spacing: 4) {
                            Image(systemName: "mappin.circle")
                                .font(.caption2)
                            Text(loc.path + (loc.line.map { ":\($0)" } ?? ""))
                                .font(.system(.caption, design: .monospaced))
                        }
                        .foregroundColor(.secondary)
                    }
                }
            }
            .frame(maxHeight: 120)
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    // MARK: - Timeout

    private func timeoutIndicator(timeoutAt: TimeInterval) -> some View {
        let now = Date().timeIntervalSince1970 * 1000
        let remaining = max(0, (timeoutAt - now) / 1000)

        return HStack(spacing: 8) {
            ProgressView(value: min(remaining / 60, 1.0))
                .tint(remaining < 10 ? .red : .orange)
                .frame(width: 40, height: 40)
                .progressViewStyle(.circular)

            Text(String(format: "%.0fs", remaining))
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(remaining < 10 ? .red : .secondary)
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        VStack(spacing: 10) {
            HStack(spacing: 10) {
                permissionButton(
                    title: "acp.permission.allowOnce".localized,
                    icon: "shield.checkmark",
                    color: .blue,
                    kind: .allowOnce
                )
                permissionButton(
                    title: "acp.permission.allowAlways".localized,
                    icon: "shield.lefthalf.filled",
                    color: .green,
                    kind: .allowAlways
                )
            }
            HStack(spacing: 10) {
                permissionButton(
                    title: "acp.permission.rejectOnce".localized,
                    icon: "xmark.shield",
                    color: .orange,
                    kind: .rejectOnce
                )
                permissionButton(
                    title: "acp.permission.rejectAlways".localized,
                    icon: "shield.slash",
                    color: .red,
                    kind: .rejectAlways
                )
            }
        }
        .disabled(isExpired)
        .opacity(isExpired ? 0.5 : 1.0)
    }

    private func permissionButton(
        title: String,
        icon: String,
        color: Color,
        kind: AcpPermissionOptionKind
    ) -> some View {
        Button {
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.impactOccurred()

            let optionId = request.options.first { $0.kind == kind }?.optionId
            onResolve(.selected, optionId)
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title3)
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .frame(minHeight: 60)
            .foregroundColor(.white)
            .background(color)
            .cornerRadius(12)
        }
        .accessibilityLabel(title)
    }

    // MARK: - Tool Kind Icon

    private var toolKindIcon: String {
        guard let kind = request.toolCall.kind else { return "shield.lefthalf.filled" }
        switch kind {
        case "read": return "doc.text.magnifyingglass"
        case "edit": return "pencil.and.outline"
        case "delete": return "trash"
        case "execute": return "terminal"
        case "search": return "magnifyingglass"
        default: return "shield.lefthalf.filled"
        }
    }

    // MARK: - Timeout Update

    private func updateTimeout() {
        guard let timeoutAt = request.timeoutAt else { return }
        let now = Date().timeIntervalSince1970 * 1000
        if now >= timeoutAt && !isExpired {
            isExpired = true
            onResolve(.expired, nil)
        }
    }
}
