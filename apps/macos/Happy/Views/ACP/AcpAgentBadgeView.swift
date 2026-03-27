//
//  AcpAgentBadgeView.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import SwiftUI

/// Compact toolbar item showing the active agent name and status icon.
///
/// This badge is displayed in the toolbar and opens the agent picker
/// popover when clicked. Shows the agent name with a colored status dot.
struct AcpAgentBadgeView: View {
    @State private var viewModel = AcpSessionViewModel.shared
    @State private var showingAgentPicker = false

    var body: some View {
        Button {
            showingAgentPicker.toggle()
        } label: {
            if let agent = viewModel.activeAgent {
                HStack(spacing: 6) {
                    Circle()
                        .fill(statusColor(for: agent.status))
                        .frame(width: 8, height: 8)

                    Text(agent.displayTitle)
                        .font(.caption)
                        .lineLimit(1)
                }
            } else {
                HStack(spacing: 6) {
                    Image(systemName: "cpu")
                        .font(.caption)
                    Text("No Agent")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .buttonStyle(.bordered)
        .controlSize(.small)
        .popover(isPresented: $showingAgentPicker) {
            AcpAgentPickerView()
        }
        .help("Switch Agent")
    }

    private func statusColor(for status: AcpAgentStatus) -> Color {
        switch status {
        case .online: return .green
        case .offline: return .gray
        case .busy: return .orange
        case .error: return .red
        }
    }
}

// MARK: - Permission Badge

/// Badge showing the count of pending permission requests.
///
/// Displayed in the toolbar or menu bar to alert the user
/// about pending permission requests.
struct AcpPermissionBadgeView: View {
    @State private var viewModel = AcpSessionViewModel.shared

    var body: some View {
        Button {
            viewModel.showPermissionSheet = true
        } label: {
            ZStack(alignment: .topTrailing) {
                Image(systemName: "shield.checkered")
                    .font(.body)

                if viewModel.pendingPermissionCount > 0 {
                    Text("\(viewModel.pendingPermissionCount)")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(.white)
                        .padding(3)
                        .background(.red)
                        .clipShape(Circle())
                        .offset(x: 6, y: -6)
                }
            }
        }
        .buttonStyle(.borderless)
        .help(viewModel.pendingPermissionCount > 0
              ? "\(viewModel.pendingPermissionCount) pending permissions"
              : "No pending permissions")
    }
}

// MARK: - Preview

#Preview("Agent Badge") {
    AcpAgentBadgeView()
        .padding()
}

#Preview("Permission Badge") {
    AcpPermissionBadgeView()
        .padding()
}
