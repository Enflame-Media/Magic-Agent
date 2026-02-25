//
//  AcpModeIndicator.swift
//  Happy
//
//  Compact capsule badge showing the current ACP session mode.
//

import SwiftUI

/// Small capsule badge displaying the current session mode (code, ask, architect, etc.).
struct AcpModeIndicator: View {

    let modeId: String

    // MARK: - Body

    var body: some View {
        Text(modeId)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Capsule().fill(modeColor.opacity(0.15)))
            .foregroundColor(modeColor)
            .accessibilityLabel(String.localized("acp.mode.label", arguments: modeId))
    }

    // MARK: - Mode Color

    private var modeColor: Color {
        switch modeId.lowercased() {
        case "code": return .blue
        case "ask": return .green
        case "architect": return .purple
        case "plan": return .orange
        default: return .gray
        }
    }
}
