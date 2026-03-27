//
//  AcpModeIndicator.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import SwiftUI

/// Compact indicator showing the current ACP operating mode.
///
/// Displays the mode icon and name in a capsule badge,
/// suitable for toolbar or header placement.
struct AcpModeIndicator: View {

    let mode: AcpMode

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: mode.icon)
                .font(.caption2)
            Text(mode.displayName)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .foregroundStyle(modeColor)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(modeColor.opacity(0.12))
        )
    }

    private var modeColor: Color {
        switch mode {
        case .autonomous: return .red
        case .supervised: return .blue
        case .manual: return .green
        case .planReview: return .purple
        }
    }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 12) {
        AcpModeIndicator(mode: .autonomous)
        AcpModeIndicator(mode: .supervised)
        AcpModeIndicator(mode: .manual)
        AcpModeIndicator(mode: .planReview)
    }
    .padding()
}
