//
//  AcpModeIndicator.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//
//  Compact capsule badge showing the current agent mode.
//

import SwiftUI

/// Compact capsule badge showing the current ACP agent mode.
///
/// Displays the mode name with a contextual SF Symbol icon.
/// Modes: code, ask, architect, plan.
struct AcpModeIndicator: View {
    /// The current agent mode.
    let mode: AcpMode

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: mode.iconName)
                .font(.system(size: 10, weight: .medium))

            Text(mode.displayName)
                .font(.caption2)
                .fontWeight(.semibold)
                .textCase(.uppercase)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(modeColor.opacity(0.15))
        .foregroundStyle(modeColor)
        .clipShape(Capsule())
    }

    // MARK: - Colors

    private var modeColor: Color {
        switch mode {
        case .code: return .blue
        case .ask: return .green
        case .architect: return .orange
        case .plan: return .purple
        }
    }
}

// MARK: - Preview

#Preview {
    HStack(spacing: 12) {
        AcpModeIndicator(mode: .code)
        AcpModeIndicator(mode: .ask)
        AcpModeIndicator(mode: .architect)
        AcpModeIndicator(mode: .plan)
    }
    .padding()
}
