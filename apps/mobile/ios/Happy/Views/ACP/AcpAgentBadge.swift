//
//  AcpAgentBadge.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// A compact badge showing the active ACP agent.
///
/// Displays the agent name and status indicator. Designed to be placed
/// in navigation bar toolbars. Fires `onTap` when tapped.
struct AcpAgentBadge: View {

    let agent: AcpAgent?
    var onTap: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: 6) {
                // Status dot
                Circle()
                    .fill(statusColor)
                    .frame(width: 8, height: 8)

                // Agent name
                Text(agent?.name ?? "acp.noAgent".localized)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Image(systemName: "chevron.down")
                    .font(.system(size: 8, weight: .bold))
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(
                Capsule()
                    .fill(Color(.systemGray6))
            )
        }
        .buttonStyle(.plain)
    }

    private var statusColor: Color {
        guard let agent = agent else { return .gray }
        switch agent.status {
        case .available:
            return .green
        case .busy:
            return .orange
        case .offline:
            return .gray
        }
    }
}

// MARK: - Preview

#Preview {
    HStack(spacing: 16) {
        AcpAgentBadge(agent: .sample)
        AcpAgentBadge(agent: nil)
    }
    .padding()
}
