//
//  AcpAgentBadge.swift
//  Happy
//
//  Compact inline badge showing the active ACP agent.
//

import SwiftUI

/// Compact capsule badge for displaying the active agent in navigation bars.
struct AcpAgentBadge: View {

    let agent: AcpRegisteredAgent?
    let onTap: () -> Void

    // MARK: - Body

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 6, height: 6)

                Text(agent?.name ?? "acp.agent.none".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(Color(.systemGray5)))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(String.localized("acp.agent.badge", arguments: agent?.name ?? "none"))
    }

    // MARK: - Status Color

    private var statusColor: Color {
        guard let status = agent?.status else { return .gray }
        switch status {
        case .connected: return .green
        case .available: return .blue
        case .unavailable: return .red
        case .error: return .red
        }
    }
}
